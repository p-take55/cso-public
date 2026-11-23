#!/usr/bin/env node
// CSO build: read docs/cso-*/ records under a Project root, check them, and write html/cso/.
// Usage:
//   node build.mjs build   --root <project root>        check, then write html/cso/ (stops on issues)
//   node build.mjs check   --root <project root>        check only, print issues
//   node build.mjs summary --root <project root>        print derived numbers (for writing replies)
//   node build.mjs next-id --root <project root> --kind <strategy|plan|direction|analysis|quarterly> --date YYYY-MM-DD
//   node build.mjs next-id --root <project root> --kind monthly --month YYYY-MM
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, "..", "assets", "site");
const calc = require(path.join(SITE, "calc.js"));
const { check } = require(path.join(SITE, "check.js"));

export const KINDS = { direction: "cso-direction", analysis: "cso-analysis", strategy: "cso-strategy", plan: "cso-plan", monthly: "cso-monthly", quarterly: "cso-quarterly", source: "cso-source", index: "cso-index" };
const VERSIONED = ["direction", "analysis", "strategy", "plan"];

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > 0 ? process.argv[i + 1] : def;
}

export function parseDoc(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = {};
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if (v === "" || v === "null" || v === "~") v = null;
      else if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
      fm[kv[1]] = v;
    }
  }
  const blocks = [...text.matchAll(/```cso-data\n([\s\S]*?)\n```/g)];
  let data = null, error = null;
  if (blocks.length !== 1) error = blocks.length ? "cso-data ブロックが複数あります" : "cso-data ブロックがありません";
  else {
    try { data = JSON.parse(blocks[0][1]); } catch (e) { error = "cso-data のJSONが読めません: " + e.message; }
  }
  return { id: path.basename(file, ".md"), file, fm, data, error };
}

function listDocs(root, kind) {
  const dir = path.join(root, "docs", KINDS[kind]);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort().map((f) => parseDoc(path.join(dir, f)));
}

export function loadBundle(root) {
  const parseErrors = [];
  const take = (kind) => listDocs(root, kind).filter((d) => {
    if (d.error) parseErrors.push({ code: "parse_error", where: KINDS[kind] + "/" + d.id, message: d.error });
    return !d.error;
  });
  const shape = (d) => ({ id: d.id, title: d.fm.title || null, status: d.fm.status || null, supersedes: d.fm.supersedes || null, changed_by: d.fm.changed_by || null, data: d.data });
  const indexDocs = take("index");
  const index = indexDocs.find((d) => d.id === "current") || null;
  const versions = {};
  for (const k of VERSIONED) versions[k] = take(k).map(shape);
  const current = {};
  const cur = (index && index.data && index.data.current) || {};
  for (const k of VERSIONED) current[k] = cur[k] ? versions[k].find((v) => v.id === cur[k]) || null : null;
  // monthly: latest revision per month is the record in force; all revisions kept for listing
  const monthlyAll = take("monthly").map(shape);
  const byMonth = {};
  for (const d of monthlyAll) {
    const mm = d.id.match(/^(\d{6})-r(\d+)$/);
    if (!mm) { parseErrors.push({ code: "bad_id", where: "cso-monthly/" + d.id, message: "月次のidは YYYYMM-r<n> です" }); continue; }
    if (!byMonth[mm[1]] || Number(mm[2]) > byMonth[mm[1]].rev) byMonth[mm[1]] = { rev: Number(mm[2]), doc: d };
  }
  const monthly = Object.keys(byMonth).sort().map((k) => byMonth[k].doc);
  const quarterly = take("quarterly").map(shape);
  const sources = take("source").map((d) => ({ id: d.id, title: d.fm.title || d.id, data: d.data }));
  for (const k of [...VERSIONED, "quarterly"]) {
    for (const v of k === "quarterly" ? quarterly : versions[k]) {
      if (!/^\d{8}-\d+$/.test(v.id)) parseErrors.push({ code: "bad_id", where: KINDS[k] + "/" + v.id, message: "版のidは YYYYMMDD-<n> です" });
    }
  }
  return {
    bundle: { generated_at: new Date().toISOString(), index: index ? { id: index.id, data: index.data } : null,
      settings: (index && index.data && index.data.settings) || {}, versions, current, monthly, monthly_all: monthlyAll, quarterly, sources },
    parseErrors,
  };
}

export function runCheck(root) {
  const { bundle, parseErrors } = loadBundle(root);
  const issues = parseErrors.concat(bundle.index ? [] : [{ code: "missing_index", where: "cso-index/current", message: "目次の文書がありません" }]);
  if (bundle.index) issues.push(...check(bundle, calc));
  return { bundle, issues };
}

export function summary(bundle) {
  const out = {};
  const h = calc.actualHistory(bundle);
  if (bundle.current.analysis) out.analysis = calc.analysisMetrics(bundle.current.analysis);
  if (bundle.current.plan) {
    const b = calc.budget(bundle.current.plan, h);
    out.plan = { months: b.months, lines: b.lines.map((l) => ({ id: l.id, total: l.total })), total: b.total, threeYear: calc.threeYear(bundle.current.plan, b) };
    const monthsWithRecords = bundle.monthly.map((d) => d.data.month).filter((m) => b.months.includes(m));
    if (monthsWithRecords.length) out.variance = calc.variance(b, h, monthsWithRecords);
    const planFor = (id) => { const v = (bundle.versions.plan || []).find((x) => x.id === id); return v ? calc.budget(v, h) : b; };
    out.monthly = bundle.monthly.map((d) => ({ month: d.data.month, plan_version: d.data.plan_version || bundle.current.plan.id, variance: calc.variance(planFor(d.data.plan_version), h, [d.data.month]) }));
    out.quarterly = bundle.quarterly.map((q) => ({ id: q.id, plan_version: q.data.plan_version || bundle.current.plan.id, variance: calc.variance(planFor(q.data.plan_version), h, calc.monthsFromTo(q.data.period.from, q.data.period.to)) }));
  }
  return out;
}

function nextId(root, kind, key) {
  const dir = path.join(root, "docs", KINDS[kind]);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  if (kind === "monthly") {
    const p = key.replace("-", "");
    const n = files.map((f) => f.match(new RegExp("^" + p + "-r(\\d+)\\.md$"))).filter(Boolean).map((m) => Number(m[1]));
    return p + "-r" + (n.length ? Math.max(...n) + 1 : 1);
  }
  const p = key.replaceAll("-", "");
  const n = files.map((f) => f.match(new RegExp("^" + p + "-(\\d+)\\.md$"))).filter(Boolean).map((m) => Number(m[1]));
  return p + "-" + (n.length ? Math.max(...n) + 1 : 1);
}

function ensureHubLink(root) {
  const hub = path.join(root, "html", "index.html");
  const li = '<li><a href="cso/index.html">経営の資料（CSO）</a></li>';
  if (!fs.existsSync(hub)) {
    fs.writeFileSync(hub, '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Project HTML</title></head><body><main><h1>Project HTML</h1><nav aria-label="Pages"><ul>\n      ' + li + "\n    </ul></nav></main></body></html>\n");
    return "created";
  }
  let s = fs.readFileSync(hub, "utf8");
  if (s.includes('href="cso/index.html"')) return "present";
  if (!s.includes("</ul>")) return "no_list";
  s = s.replace("</ul>", "  " + li + "\n    </ul>");
  s = s.replace(/\s*<p class="empty">[\s\S]*?<\/p>/, "");
  fs.writeFileSync(hub, s);
  return "added";
}

export function build(root) {
  const { bundle, issues } = runCheck(root);
  if (issues.length) return { ok: false, issues };
  const out = path.join(root, "html", "cso");
  fs.mkdirSync(path.join(out, "data"), { recursive: true });
  for (const f of ["index.html", "style.css", "render.js", "calc.js", "check.js"]) fs.copyFileSync(path.join(SITE, f), path.join(out, f));
  fs.writeFileSync(path.join(out, "data", "current.js"), "window.CSO_DATA = " + JSON.stringify(bundle) + ";\n");
  const hub = ensureHubLink(root);
  return { ok: true, written: path.relative(root, out), hub, summary: summary(bundle) };
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const cmd = process.argv[2];
  const root = arg("root");
  if (!root || !fs.existsSync(root)) { console.error("--root <project root> が必要です"); process.exit(2); }
  if (cmd === "check") { const r = runCheck(root); console.log(JSON.stringify({ ok: !r.issues.length, issues: r.issues }, null, 1)); process.exit(r.issues.length ? 1 : 0); }
  if (cmd === "summary") { const r = runCheck(root); console.log(JSON.stringify({ ok: !r.issues.length, issues: r.issues, summary: summary(r.bundle) }, null, 1)); process.exit(0); }
  if (cmd === "build") { const r = build(root); console.log(JSON.stringify(r, null, 1)); process.exit(r.ok ? 0 : 1); }
  if (cmd === "next-id") { const kind = arg("kind"); console.log(nextId(root, kind, kind === "monthly" ? arg("month") : arg("date"))); process.exit(0); }
  console.error("command: build | check | summary | next-id"); process.exit(2);
}
