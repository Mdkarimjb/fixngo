#!/usr/bin/env node
/**
 * FixNGo quality-gate hook (deterministic, memory-driven trigger).
 *
 * Runs at the `Stop` lifecycle event. Instead of relying on git, it reads the
 * agent's own memory store — which already logs every file change via the
 * `PostToolUse` capture hook — and triggers the quality gate when application
 * code changed since the last gate run.
 *
 * Flow:
 *   1. Read memory/entries.json.
 *   2. Collect `source: "change"` entries captured after policy.lastGateAt.
 *   3. Gather their code files (ignoring .github/ customization edits).
 *   4. If any code changed, run scripts/quality-check.mjs and surface the verdict
 *      via `systemMessage`; on FAIL, instruct delegation to child-quality.
 *   5. Advance policy.lastGateAt so the same changes are not re-gated.
 *
 * (VS Code hooks run shell commands but cannot launch a subagent, so this runs the
 * checks directly; the child-quality subagent remains the reasoning wrapper.)
 * Non-blocking: never fails the session; on any error it returns continue.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const storePath = resolve(__dirname, "..", "memory", "entries.json");
const qualityScript = resolve(__dirname, "quality-check.mjs");
// Workspace root = the directory that contains `.github`.
const workspaceRoot = __dirname.split("/.github/")[0] || process.cwd();

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$/;

const emit = (obj) => {
  process.stdout.write(JSON.stringify({ continue: true, ...obj }));
  process.exit(0);
};

const filesFromEntry = (e) => {
  if (Array.isArray(e.files) && e.files.length) return e.files;
  // Fallback: parse "tool → a, b" note format.
  const idx = e.note?.indexOf("→") ?? -1;
  if (idx > -1) return e.note.slice(idx + 1).split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};
const isCode = (f) => CODE_EXT.test(f) && !f.includes(".github/");

try {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);

  if (!existsSync(storePath)) emit({});
  const store = JSON.parse(readFileSync(storePath, "utf8"));
  store.policy = store.policy ?? {};
  const lastGateAt = store.policy.lastGateAt ?? "";
  const nowIso = new Date().toISOString();

  const changed = new Set();
  for (const e of store.entries ?? []) {
    if (e.source !== "change") continue;
    if (lastGateAt && (e.capturedAt ?? "") <= lastGateAt) continue;
    for (const f of filesFromEntry(e)) if (isCode(f)) changed.add(f);
  }

  // Advance the watermark regardless, so we never re-gate old changes.
  store.policy.lastGateAt = nowIso;
  try {
    writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
  } catch {}

  if (changed.size === 0) emit({}); // no code changed since last gate → silent

  if (!existsSync(qualityScript)) emit({});
  const r = spawnSync("node", [qualityScript, "--json", "--root", workspaceRoot], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });

  let verdict = "UNKNOWN";
  let fails = [];
  try {
    const j = JSON.parse(r.stdout);
    verdict = j.verdict;
    fails = (j.results || []).filter((x) => x.status === "FAIL").map((x) => `${x.category}/${x.check}: ${x.detail}`);
  } catch {
    emit({}); // gate output unparseable → stay silent
  }

  const scope = [...changed].slice(0, 8).join(", ") + (changed.size > 8 ? ` (+${changed.size - 8} more)` : "");
  const header = `FixNGo quality gate ran on changed code (${scope}).`;

  if (verdict === "FAIL") {
    emit({
      systemMessage:
        `${header}\nVERDICT: FAIL. Blocking issues:\n- ${fails.join("\n- ")}\n` +
        `Delegate to the child-quality subagent to review, fix the blocking issues, and re-run the gate before completing the task.`,
    });
  }

  emit({ systemMessage: `${header} VERDICT: ${verdict}.` });
} catch {
  emit({});
}

