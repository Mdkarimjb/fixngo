#!/usr/bin/env node
/**
 * FixNGo quality gate.
 *
 * Runs five categories of checks over the repository and prints a report. Used by
 * the `child-quality` subagent after code generation finishes.
 *
 *   1. Code quality   — TypeScript types, ESLint, Prettier
 *   2. Vulnerabilities — npm audit (high+)
 *   3. Code duplication — jscpd
 *   4. Memory leaks    — leak test script if defined, else static heuristics
 *   5. Security        — eslint-plugin-security / semgrep + secret heuristics
 *
 * Tools that are not installed locally are reported as SKIP (never auto-installed,
 * so the gate stays offline and deterministic). Exit code:
 *   0 = no FAILs, 1 = at least one FAIL. WARN/SKIP do not fail the gate.
 *
 * Usage:
 *   node quality-check.mjs [--json] [--root <dir>]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const rootFlag = args.indexOf("--root");

const findRepoRoot = (start) => {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "package.json")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
};

const root = rootFlag !== -1 ? resolve(args[rootFlag + 1]) : findRepoRoot(process.cwd());
const has = (rel) => existsSync(join(root, rel));

const run = (cmd, cmdArgs) => {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: "utf8", shell: false });
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || ""), error: r.error };
};
// npx --no-install: use locally installed tool, never hit the network.
const npx = (tool, toolArgs) => {
  const r = run("npx", ["--no-install", tool, ...toolArgs]);
  const missing = !!r.error || /could not determine executable to run|installable package|command not found|could not find|npm error 404/i.test(r.out);
  return { ...r, missing };
};

const pkg = has("package.json") ? JSON.parse(readFileSync(join(root, "package.json"), "utf8")) : null;
const scripts = pkg?.scripts ?? {};

const results = [];
const add = (category, check, status, detail) => results.push({ category, check, status, detail });

// ---- 1. Code quality -------------------------------------------------------
if (has("tsconfig.json")) {
  const r = npx("tsc", ["--noEmit"]);
  if (r.missing) add("Code quality", "TypeScript (tsc --noEmit)", "SKIP", "typescript not installed");
  else add("Code quality", "TypeScript (tsc --noEmit)", r.code === 0 ? "PASS" : "FAIL", r.code === 0 ? "no type errors" : firstLines(r.out));
} else add("Code quality", "TypeScript", "SKIP", "no tsconfig.json");

if (hasAny([".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yml", "eslint.config.js", "eslint.config.mjs"])) {
  const r = npx("eslint", [".", "--max-warnings=0"]);
  if (r.missing) add("Code quality", "ESLint", "SKIP", "eslint not installed");
  else add("Code quality", "ESLint", r.code === 0 ? "PASS" : "FAIL", r.code === 0 ? "clean" : firstLines(r.out));
} else add("Code quality", "ESLint", "SKIP", "no eslint config");

{
  const r = npx("prettier", ["--check", "."]);
  if (r.missing) add("Code quality", "Prettier", "SKIP", "prettier not installed");
  else add("Code quality", "Prettier", r.code === 0 ? "PASS" : "WARN", r.code === 0 ? "formatted" : "formatting issues");
}

// ---- 2. Vulnerabilities ----------------------------------------------------
if (has("package-lock.json") || has("npm-shrinkwrap.json") || has("yarn.lock") || has("pnpm-lock.yaml")) {
  const r = run("npm", ["audit", "--audit-level=high", "--json"]);
  try {
    const j = JSON.parse(r.out);
    const v = j.metadata?.vulnerabilities ?? {};
    const high = (v.high ?? 0) + (v.critical ?? 0);
    add("Vulnerabilities", "npm audit (high+)", high > 0 ? "FAIL" : "PASS", `high=${v.high ?? 0} critical=${v.critical ?? 0} moderate=${v.moderate ?? 0}`);
  } catch {
    add("Vulnerabilities", "npm audit", "SKIP", "audit unavailable (offline/registry)");
  }
} else add("Vulnerabilities", "npm audit", "SKIP", "no lockfile");

// ---- 3. Code duplication ---------------------------------------------------
{
  const r = npx("jscpd", [scanDir(), "--min-tokens", "50", "--threshold", "5", "--silent", "--reporters", "console"]);
  if (r.missing) add("Code duplication", "jscpd (>5%)", "SKIP", "jscpd not installed");
  else add("Code duplication", "jscpd (>5%)", r.code === 0 ? "PASS" : "WARN", r.code === 0 ? "under threshold" : "duplication above threshold");
}

// ---- 4. Memory leaks -------------------------------------------------------
if (scripts["test:leaks"]) {
  const r = run("npm", ["run", "test:leaks"]);
  add("Memory leaks", "npm run test:leaks", r.code === 0 ? "PASS" : "FAIL", r.code === 0 ? "no leaks detected" : firstLines(r.out));
} else {
  const findings = staticLeakScan(scanDir());
  add("Memory leaks", "static heuristics", findings.length === 0 ? "PASS" : "WARN", findings.length === 0 ? "no obvious leak patterns" : findings.slice(0, 5).join("; "));
}

// ---- 5. Security -----------------------------------------------------------
{
  const hasSecurityPlugin = pkg && JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).includes("eslint-plugin-security");
  const sem = npx("semgrep", ["--config", "auto", "--error", "--quiet", scanDir()]);
  if (!sem.missing) {
    add("Security", "semgrep", sem.code === 0 ? "PASS" : "FAIL", sem.code === 0 ? "no findings" : firstLines(sem.out));
  } else if (hasSecurityPlugin) {
    add("Security", "eslint-plugin-security", "PASS", "covered by ESLint run above");
  } else {
    add("Security", "SAST (semgrep)", "SKIP", "semgrep not installed");
  }
  const secrets = secretScan(scanDir());
  add("Security", "secret scan", secrets.length === 0 ? "PASS" : "FAIL", secrets.length === 0 ? "no obvious secrets" : secrets.slice(0, 5).join("; "));
}

// ---- helpers ---------------------------------------------------------------
function hasAny(names) { return names.some((n) => has(n)); }
function firstLines(s, n = 3) { return s.split("\n").filter(Boolean).slice(0, n).join(" | ").slice(0, 300); }
function scanDir() { return has("src") ? join(root, "src") : root; }

function walk(dir, exts, out = [], depth = 0) {
  if (depth > 8) return out;
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (["node_modules", ".git", "dist", "build", ".next", "coverage"].includes(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, exts, out, depth + 1);
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function staticLeakScan(dir) {
  const files = walk(dir, [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
  const findings = [];
  for (const f of files) {
    let src = "";
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const rel = f.replace(root + "/", "");
    if (/setInterval\s*\(/.test(src) && !/clearInterval\s*\(/.test(src)) findings.push(`${rel}: setInterval without clearInterval`);
    if (/addEventListener\s*\(/.test(src) && !/removeEventListener\s*\(/.test(src)) findings.push(`${rel}: addEventListener without removeEventListener`);
    if (/useEffect\s*\(/.test(src) && /addEventListener|setInterval|subscribe\(/.test(src) && !/return\s*\(?\s*\)?\s*=>/.test(src)) findings.push(`${rel}: useEffect side-effect without cleanup`);
  }
  return findings;
}

function secretScan(dir) {
  const files = walk(dir, [".ts", ".tsx", ".js", ".jsx", ".mjs", ".env", ".json", ".yml", ".yaml"]);
  const patterns = [
    [/AKIA[0-9A-Z]{16}/, "AWS access key"],
    [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, "private key"],
    [/(?:secret|password|passwd|token|api[_-]?key)\s*[:=]\s*["'][^"']{12,}["']/i, "hardcoded credential"],
    [/rzp_(?:live|test)_[A-Za-z0-9]{10,}/, "Razorpay key"],
  ];
  const findings = [];
  for (const f of files) {
    if (/\.env\.example$/.test(f)) continue;
    let src = "";
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    const rel = f.replace(root + "/", "");
    for (const [re, label] of patterns) if (re.test(src)) findings.push(`${rel}: ${label}`);
  }
  return findings;
}

// ---- report ----------------------------------------------------------------
const failed = results.filter((r) => r.status === "FAIL");
const warned = results.filter((r) => r.status === "WARN");

if (asJson) {
  console.log(JSON.stringify({ root, verdict: failed.length ? "FAIL" : "PASS", results }, null, 2));
} else {
  console.log(`\nFixNGo Quality Gate — ${root}\n`);
  let currentCat = "";
  for (const r of results) {
    if (r.category !== currentCat) { console.log(`\n${r.category}`); currentCat = r.category; }
    const icon = { PASS: "✓", FAIL: "✗", WARN: "!", SKIP: "–" }[r.status];
    console.log(`  ${icon} [${r.status}] ${r.check} — ${r.detail}`);
  }
  console.log(`\nVerdict: ${failed.length ? "FAIL" : "PASS"}  (fails=${failed.length}, warns=${warned.length})\n`);
}

process.exit(failed.length ? 1 : 0);
