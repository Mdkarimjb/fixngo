#!/usr/bin/env node
/**
 * FixNGo memory "dreaming" — consolidation of working memory.
 *
 * Raw auto-captures (prompts, changes, events) accumulate fast. Dreaming runs
 * during downtime (e.g. session end) and compresses them so memory does not grow
 * without bound, while preserving the essence:
 *
 *   1. Prune obvious noise (empty/"Unknown" events) when dropNoise is on.
 *   2. Dedupe identical raw notes into one entry with an `occurrences` count.
 *   3. Consolidate raw entries older than dream.consolidateAfterDays into one
 *      per-(category, day) "digest" entry, and archive the originals to
 *      memory/archive/<YYYY-MM>.jsonl for auditability.
 *
 * Never touches curated entries (no `source`), verified entries, or existing
 * `source: "dream"` digests. Promotion rules are unchanged: only verified AND
 * old-enough entries graduate to the skill (see promote-memory.mjs).
 *
 * Usage:
 *   node scripts/dream-memory.mjs            # consolidate
 *   node scripts/dream-memory.mjs --dry-run  # report only, write nothing
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, "..");
const storePath = resolve(skillRoot, "memory", "entries.json");
const archiveDir = resolve(skillRoot, "memory", "archive");

const dryRun = process.argv.includes("--dry-run");

const DEFAULT_DREAM = {
  enabled: true,
  consolidateAfterDays: 2,
  dropNoise: true,
  maxDigestThemes: 3,
  archive: true,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const localMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const todayMidnight = localMidnight(new Date());
const ageInDays = (createdAt) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(createdAt || "");
  if (!m) return 0;
  const created = localMidnight(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Math.round((todayMidnight - created) / MS_PER_DAY);
};
const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();
const rand = () => Math.random().toString(36).slice(2, 6);

const store = JSON.parse(readFileSync(storePath, "utf8"));
const dream = { ...DEFAULT_DREAM, ...((store.policy && store.policy.dream) || {}) };

if (dream.enabled === false) {
  console.log("Dreaming disabled (policy.dream.enabled = false).");
  process.exit(0);
}

const original = store.entries ?? [];

// Partition: keep curated (no source), verified, and existing digests as-is.
const untouched = [];
let raw = [];
for (const e of original) {
  const isRaw = e.source && e.source !== "dream" && e.verified !== true;
  if (isRaw) raw.push(e);
  else untouched.push(e);
}

const archived = [];

// 1. Prune noise.
if (dream.dropNoise) {
  const before = raw.length;
  raw = raw.filter((e) => {
    const noise = e.source === "event" && ["", "unknown", "(empty prompt)"].includes(normalize(e.note));
    if (noise) archived.push({ ...e, _reason: "noise" });
    return !noise;
  });
  void before;
}

// 2. Dedupe identical notes.
const dedupMap = new Map();
for (const e of raw) {
  const key = `${e.source}|${e.category}|${normalize(e.note)}`;
  if (dedupMap.has(key)) {
    const keep = dedupMap.get(key);
    keep.occurrences = (keep.occurrences ?? 1) + (e.occurrences ?? 1);
    if ((e.capturedAt ?? "") > (keep.lastSeen ?? keep.capturedAt ?? "")) keep.lastSeen = e.capturedAt;
    if ((e.createdAt ?? "") < (keep.createdAt ?? "")) keep.createdAt = e.createdAt;
    archived.push({ ...e, _reason: "duplicate" });
  } else {
    dedupMap.set(key, { ...e, occurrences: e.occurrences ?? 1 });
  }
}
let deduped = [...dedupMap.values()];

// 3. Consolidate old raw into per-(category, day) digests.
const toConsolidate = [];
const recent = [];
for (const e of deduped) {
  if (ageInDays(e.createdAt) >= dream.consolidateAfterDays) toConsolidate.push(e);
  else recent.push(e);
}

const groups = new Map(); // `${category}|${createdAt}` -> entries
for (const e of toConsolidate) {
  const k = `${e.category}|${e.createdAt}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(e);
}

const iso = new Date().toISOString();
const digests = [];
for (const [k, entries] of groups) {
  const [category, date] = k.split("|");
  const total = entries.reduce((n, e) => n + (e.occurrences ?? 1), 0);

  // Top themes by occurrence.
  const themeCount = new Map();
  for (const e of entries) {
    const t = e.note;
    themeCount.set(t, (themeCount.get(t) ?? 0) + (e.occurrences ?? 1));
  }
  const themes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, dream.maxDigestThemes)
    .map(([t]) => (t.length > 80 ? t.slice(0, 79) + "…" : t));

  digests.push({
    id: `dream-${date}-${category.toLowerCase()}-${rand()}`,
    category,
    note: `Dream digest — ${total} ${category.toLowerCase()} capture(s) on ${date}. Themes: ${themes.join(" | ") || "n/a"}`,
    verified: false,
    source: "dream",
    occurrences: total,
    createdAt: date,
    dreamedAt: iso,
  });
  for (const e of entries) archived.push({ ...e, _reason: "consolidated" });
}

store.entries = [...untouched, ...recent, ...digests];

const summary = {
  raw: raw.length,
  pruned: archived.filter((a) => a._reason === "noise").length,
  deduped: archived.filter((a) => a._reason === "duplicate").length,
  consolidated: archived.filter((a) => a._reason === "consolidated").length,
  digestsCreated: digests.length,
  remaining: store.entries.length,
};

if (archived.length === 0 && digests.length === 0) {
  console.log("Nothing to dream about — memory already compact.");
  process.exit(0);
}

if (dryRun) {
  console.log("[dry-run] Dream summary:", JSON.stringify(summary, null, 2));
  process.exit(0);
}

// Archive originals (audit trail).
if (dream.archive && archived.length > 0) {
  mkdirSync(archiveDir, { recursive: true });
  const month = iso.slice(0, 7);
  const lines = archived.map((a) => JSON.stringify({ ...a, archivedAt: iso })).join("\n") + "\n";
  appendFileSync(resolve(archiveDir, `${month}.jsonl`), lines);
}

writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
console.log("Dream complete:", JSON.stringify(summary, null, 2));
