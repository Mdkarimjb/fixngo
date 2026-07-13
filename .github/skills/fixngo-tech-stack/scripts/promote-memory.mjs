#!/usr/bin/env node
/**
 * FixNGo memory promotion.
 *
 * Moves entries from the agent memory store into the skill's verified-knowledge
 * reference once they are both:
 *   - verified (policy.requireVerified), and
 *   - at least policy.promoteAfterDays old (default 5 days).
 *
 * Promoted entries are grouped by `category` under headings and removed from the
 * memory store so the store only holds unverified / young ("working") memory.
 *
 * Usage:
 *   node scripts/promote-memory.mjs           # promote eligible entries
 *   node scripts/promote-memory.mjs --dry-run # report only, write nothing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, "..");
const storePath = resolve(skillRoot, "memory/entries.json");

const dryRun = process.argv.includes("--dry-run");

const store = JSON.parse(readFileSync(storePath, "utf8"));
const policy = store.policy ?? {};
const promoteAfterDays = policy.promoteAfterDays ?? 5;
const requireVerified = policy.requireVerified ?? true;
const targetPath = resolve(skillRoot, "memory", policy.target ?? "../references/verified-knowledge.md");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Local calendar midnight for a Date, so age is counted in whole calendar days
// and is not skewed by UTC time-of-day.
const localMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const todayMidnight = localMidnight(new Date());

const ageInDays = (createdAt) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(createdAt);
  if (!m) throw new Error(`Invalid createdAt (expected YYYY-MM-DD): ${createdAt}`);
  const created = localMidnight(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Math.round((todayMidnight - created) / MS_PER_DAY);
};

const eligible = [];
const remaining = [];
for (const entry of store.entries ?? []) {
  const okVerified = requireVerified ? entry.verified === true : true;
  const okAge = ageInDays(entry.createdAt) >= promoteAfterDays;
  if (okVerified && okAge) eligible.push(entry);
  else remaining.push(entry);
}

if (eligible.length === 0) {
  console.log("No entries eligible for promotion.");
  process.exit(0);
}

// Group eligible entries by category.
const byCategory = new Map();
for (const e of eligible) {
  const cat = (e.category ?? "General").trim();
  if (!byCategory.has(cat)) byCategory.set(cat, []);
  byCategory.get(cat).push(e);
}

// Build the promoted-block content from existing block + new entries.
const md = readFileSync(targetPath, "utf8");
const START = "<!-- PROMOTED_ENTRIES_START -->";
const END = "<!-- PROMOTED_ENTRIES_END -->";
const startIdx = md.indexOf(START);
const endIdx = md.indexOf(END);
if (startIdx === -1 || endIdx === -1) {
  throw new Error(`Markers ${START} / ${END} not found in ${targetPath}`);
}

const existingBlock = md.slice(startIdx + START.length, endIdx).trim();

// Parse existing sections so we append under the right heading.
const sections = new Map(); // category -> array of bullet lines
let current = null;
for (const line of existingBlock.split("\n")) {
  const h = line.match(/^##\s+(.*)$/);
  if (h) {
    current = h[1].trim();
    if (!sections.has(current)) sections.set(current, []);
  } else if (line.trim().startsWith("- ") && current) {
    sections.get(current).push(line.trim());
  }
}

const _t = new Date();
const today = `${_t.getFullYear()}-${String(_t.getMonth() + 1).padStart(2, "0")}-${String(_t.getDate()).padStart(2, "0")}`;
for (const [cat, entries] of byCategory) {
  if (!sections.has(cat)) sections.set(cat, []);
  for (const e of entries) {
    sections.get(cat).push(`- ${e.note} _(verified, promoted ${today}, id: ${e.id})_`);
  }
}

const rebuilt = [...sections.entries()]
  .filter(([, bullets]) => bullets.length > 0)
  .map(([cat, bullets]) => `## ${cat}\n\n${bullets.join("\n")}`)
  .join("\n\n");

const newMd =
  md.slice(0, startIdx + START.length) + "\n\n" + rebuilt + "\n\n" + md.slice(endIdx);

store.entries = remaining;

if (dryRun) {
  console.log(`[dry-run] Would promote ${eligible.length} entr${eligible.length === 1 ? "y" : "ies"}:`);
  for (const e of eligible) console.log(`  - [${e.category}] ${e.id}`);
  process.exit(0);
}

writeFileSync(targetPath, newMd);
writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");

console.log(`Promoted ${eligible.length} entr${eligible.length === 1 ? "y" : "ies"} to ${policy.target ?? "verified-knowledge.md"}:`);
for (const e of eligible) console.log(`  - [${e.category}] ${e.id}`);
