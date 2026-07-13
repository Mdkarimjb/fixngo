#!/usr/bin/env node
/**
 * FixNGo memory capture (hook target).
 *
 * Reads a hook payload as JSON on stdin and appends a working-memory entry to
 * memory/entries.json. Intended to be wired to the `UserPromptSubmit` and
 * `PostToolUse` hook events so every prompt and file change is recorded.
 *
 * Captured entries are always `verified: false` and carry a `source` field, so
 * they stay in working memory until a human verifies them. Promotion to the
 * skill's permanent knowledge still requires `verified: true` AND >= promoteAfterDays
 * (see scripts/promote-memory.mjs).
 *
 * The store is capped at policy.maxAutoEntries auto-captured items; the oldest
 * unverified auto entries are dropped first so the file cannot grow without bound.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const storePath = resolve(__dirname, "..", "memory", "entries.json");

const DEFAULT_STORE = {
  $schema: "./entries.schema.json",
  policy: {
    promoteAfterDays: 5,
    requireVerified: true,
    captureEnabled: true,
    maxAutoEntries: 500,
    noteMaxChars: 500,
    target: "../references/verified-knowledge.md",
  },
  entries: [],
};

const readStdin = async () => {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8").trim();
};

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Collect file paths from a tool payload across the tool shapes we may see
// (single-file edits, multi-replace with a `replacements` array, etc.).
const extractFiles = (ti) => {
  const out = [];
  const push = (v) => {
    if (typeof v === "string" && v.trim()) out.push(v.replace(/^file:\/\//, "").trim());
  };
  if (ti && typeof ti === "object") {
    push(ti.filePath); push(ti.path); push(ti.uri); push(ti.file);
    for (const arr of [ti.replacements, ti.edits, ti.files]) {
      if (Array.isArray(arr)) for (const r of arr) push(typeof r === "string" ? r : r?.filePath || r?.path);
    }
  }
  return [...new Set(out)];
};

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const buildEntry = (input, noteMax) => {
  const event = input.hookEventName || input.event || "Unknown";
  const iso = new Date().toISOString();
  const stamp = iso.replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);

  if (event === "UserPromptSubmit") {
    const prompt = input.prompt || input.userPrompt || input.message || input.text || "";
    return {
      id: `${stamp}-${rand}-prompt`,
      category: "Prompt",
      note: truncate(String(prompt).replace(/\s+/g, " ").trim() || "(empty prompt)", noteMax),
      verified: false,
      source: "prompt",
      capturedAt: iso,
      createdAt: todayLocal(),
    };
  }

  if (event === "PostToolUse") {
    const tool = input.toolName || input.tool?.name || input.tool || "tool";
    const ti = input.toolInput || input.tool?.input || input.input || {};
    const files = extractFiles(ti);
    const detail = files.length ? `${tool} → ${files.join(", ")}` : String(tool);
    return {
      id: `${stamp}-${rand}-change`,
      category: "Change",
      note: truncate(detail, noteMax),
      verified: false,
      source: "change",
      files,
      capturedAt: iso,
      createdAt: todayLocal(),
    };
  }

  return {
    id: `${stamp}-${rand}-event`,
    category: "Event",
    note: truncate(`${event}`, noteMax),
    verified: false,
    source: "event",
    capturedAt: iso,
    createdAt: todayLocal(),
  };
};

const main = async () => {
  let input = {};
  try {
    const raw = await readStdin();
    input = raw ? JSON.parse(raw) : {};
  } catch {
    input = {}; // never fail the agent flow on bad/empty payload
  }

  const store = existsSync(storePath)
    ? JSON.parse(readFileSync(storePath, "utf8"))
    : structuredClone(DEFAULT_STORE);
  store.policy = { ...DEFAULT_STORE.policy, ...(store.policy ?? {}) };
  store.entries = store.entries ?? [];

  if (store.policy.captureEnabled === false) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const entry = buildEntry(input, store.policy.noteMaxChars ?? 500);

  // Skip capturing our own promotion/capture tool runs to avoid noise loops.
  if (entry.source === "change" && /(promote|capture)-memory\.mjs/.test(entry.note)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  store.entries.push(entry);

  // Cap auto-captured, still-unverified entries; drop oldest first.
  const max = store.policy.maxAutoEntries ?? 500;
  const isAutoUnverified = (e) => e.source && e.verified !== true;
  const autoUnverified = store.entries.filter(isAutoUnverified);
  if (autoUnverified.length > max) {
    const dropCount = autoUnverified.length - max;
    const dropIds = new Set(autoUnverified.slice(0, dropCount).map((e) => e.id));
    store.entries = store.entries.filter((e) => !dropIds.has(e.id));
  }

  writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ continue: true }));
};

main().catch(() => {
  // Non-blocking: capture must never interrupt the session.
  process.stdout.write(JSON.stringify({ continue: true }));
});
