#!/usr/bin/env node
// Acceptance A1–A8 (calc, check, diff, versions). Run: node tests/unit.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { loadBundle, runCheck, summary, build } from "../scripts/build.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const calc = require(path.join(HERE, "..", "assets", "site", "calc.js"));
const FIX = path.join(HERE, "..", "fixtures");
let failed = 0, passed = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passed++; else { failed++; console.log("FAIL", name, "\n  got ", JSON.stringify(got), "\n  want", JSON.stringify(want)); }
}
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const man = (yen) => (yen == null ? null : Math.round(yen / 1000) / 10);
function copyFixture(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cso-" + name + "-"));
  fs.cpSync(path.join(FIX, name), dir, { recursive: true });
  return dir;
}
function readData(file) { return JSON.parse(fs.readFileSync(file, "utf8").match(/```cso-data\n([\s\S]*?)\n```/)[1]); }
function writeData(file, data, fmPatch) {
  let s = fs.readFileSync(file, "utf8");
  s = s.replace(/```cso-data\n[\s\S]*?\n```/, "```cso-data\n" + JSON.stringify(data, null, 2) + "\n```");
  if (fmPatch) for (const [k, v] of Object.entries(fmPatch)) s = s.replace(new RegExp("^" + k + ":.*$", "m"), k + ": " + v);
  fs.writeFileSync(file, s);
}

/* ---------- A1: Morita reproduces the sample ---------- */
{
  const { bundle } = loadBundle(path.join(FIX, "morita"));
  const S = summary(bundle);
  eq("A1 12か月合計(万円)", man(S.analysis.total.value), 4135);
  eq("A1 月平均", r1(man(S.analysis.avg)), 344.6);
  eq("A1 海外比率", r1(S.analysis.lines.find((l) => l.id === "ovs").share), 39.4);
  eq("A1 海外の半期の伸び", r1(S.analysis.lines.find((l) => l.id === "ovs").halfGrowth), 9.3);
  eq("A1 前年同月比 9月/10月", S.analysis.yoy.map((y) => r1(y.pct)), [1.5, -2.4]);
  const h = calc.actualHistory(bundle);
  const b1 = calc.budget(bundle.versions.plan.find((v) => v.id === "20261218-1"), h);
  const b2 = calc.budget(bundle.current.plan, h);
  eq("A1 来期予算 12月版", man(b1.total.value), 4297.8);
  eq("A1 来期予算 4月版", man(b2.total.value), 4345.8);
  eq("A1 12月の予算", man(b1.totals[0].value), 380);
  const dec = S.monthly.find((m) => m.month === "2026-12").variance;
  eq("A1 12月の差", man(dec.diff), 22);
  eq("A1 12月の海外の差", man(dec.rows.find((r) => r.id === "ovs").diff), 28);
  const q = S.quarterly[0].variance;
  eq("A1 12〜3月 予算/実績/差", [man(q.budgetTotal.value), man(q.actualTotal.value), man(q.diff)], [1391.5, 1426.9, 35.4]);
  eq("A1 12〜3月 国内の差", man(q.rows.find((r) => r.id === "dom").diff), -17);
  eq("A1 12〜3月 海外の差", man(q.rows.find((r) => r.id === "ovs").diff), 33.5);
  eq("A1 1年目(4月版)と粗利", [man(S.plan.threeYear[0].annual), man(S.plan.threeYear[0].gross)], [4345.8, 1651.4]);
}

/* ---------- A2: Cafe — different lines, fiscal April, 2 KPIs, 1 candidate, 2-year plan ---------- */
{
  const { bundle } = loadBundle(path.join(FIX, "cafe"));
  const S = summary(bundle);
  eq("A2 行", bundle.current.plan.data.lines.map((l) => l.line), ["in", "to"]);
  eq("A2 予算の月", [S.plan.months[0], S.plan.months[11]], ["2026-04", "2027-03"]);
  eq("A2 年間予算(円)", S.plan.total.value, 26340000);
  eq("A2 テイクアウト年間予算", S.plan.lines.find((l) => l.id === "to").total.value, 4740000);
  eq("A2 3年の行数(2年計画)", S.plan.threeYear.length, 2);
  eq("A2 1年目粗利", S.plan.threeYear[0].gross, 17121000);
  eq("A2 2年目", S.plan.threeYear[1].annual, 27600000);
  eq("A2 テイクアウト比率", r1(S.analysis.lines.find((l) => l.id === "to").share), 16.4);
  eq("A2 テイクアウト半期の伸び", r1(S.analysis.lines.find((l) => l.id === "to").halfGrowth), -1.5);
  const apr = S.monthly.find((m) => m.month === "2026-04").variance;
  eq("A2 4月 店内/テイクアウト/合計の差", [apr.rows[0].diff, apr.rows[1].diff, apr.diff], [-50000, 50000, 0]);
  eq("A2 KPI数", bundle.current.plan.data.kpis.length, 2);
  eq("A2 候補数", bundle.current.strategy.data.candidates.length, 1);
  /* A3: a missing month never becomes a number */
  const may = S.monthly.find((m) => m.month === "2026-05").variance;
  eq("A3 5月 店内の差はnull", may.rows[0].diff, null);
  eq("A3 5月 テイクアウトの差", may.rows[1].diff, 11000);
  eq("A3 5月 合計はnullで未完", [may.diff, may.actualTotal.incomplete], [null, true]);
  const both = S.variance;
  eq("A3 4〜5月 合計はnull", [both.diff, both.actualTotal.value], [null, null]);
}

/* ---------- A4: check catches each defect ---------- */
{
  const cases = [
    ["fact_without_evidence", (R) => { const f = path.join(R, "docs/cso-analysis/20261209-1.md"); const d = readData(f); delete d.facts[0].evidence; writeData(f, d); }],
    ["unknown_source", (R) => { const f = path.join(R, "docs/cso-analysis/20261209-1.md"); const d = readData(f); d.facts[0].evidence = [{ source: "src-nope", where: "x" }]; writeData(f, d); }],
    ["broken_link", (R) => { const f = path.join(R, "docs/cso-analysis/20261209-1.md"); const d = readData(f); d.facts[0].links = { to: ["nowhere"] }; writeData(f, d); }],
    ["chosen_without_trial", (R) => { const f = path.join(R, "docs/cso-strategy/20270408-1.md"); const d = readData(f); delete d.trial.criteria; writeData(f, d); }],
    ["broken_observes", (R) => { const f = path.join(R, "docs/cso-monthly/202701-r1.md"); const d = readData(f); d.observations[0].observes = ["st-none"]; writeData(f, d); }],
    ["missing_current", (R) => { const f = path.join(R, "docs/cso-index/current.md"); const d = readData(f); d.current.plan = "20990101-1"; writeData(f, d); }],
    ["broken_chain", (R) => { fs.rmSync(path.join(R, "docs/cso-plan/20261218-1.md")); }],
    ["observed_without_limits", (R) => { const f = path.join(R, "docs/cso-monthly/202702-r1.md"); const d = readData(f); delete d.observations[0].limits; writeData(f, d); }],
    ["too_many_decisions", (R) => { const f = path.join(R, "docs/cso-monthly/202612-r1.md"); const d = readData(f); d.decisions.push({ id: "x4", text: "4つ目", mark: "decision", evidence: d.decisions[0].evidence }); writeData(f, d); }],
    ["bad_id", (R) => { fs.copyFileSync(path.join(R, "docs/cso-plan/20261218-1.md"), path.join(R, "docs/cso-plan/2026-12-18.md")); }],
  ];
  for (const [code, mutate] of cases) {
    const R = copyFixture("morita"); mutate(R);
    const { issues } = runCheck(R);
    eq("A4 " + code + " を検出", issues.some((i) => i.code === code), true);
    const r = build(R);
    eq("A4 " + code + " で書き出しを止める", r.ok, false);
  }
}

/* ---------- A5/A6: version diff on meaningful values ---------- */
{
  const { bundle } = loadBundle(path.join(FIX, "morita"));
  const st = bundle.versions.strategy, d = calc.diffVersions(st[0].data, st[1].data);
  eq("A5 追加", d.added.sort(), ["st-a-partner-engrave", "st-a-value-engrave"]);
  eq("A5 変更に誰に・どう稼ぐか", ["st-a-segment", "st-a-revenue"].every((id) => d.changed.some((c) => c.id === id)), true);
  eq("A5 変更なしの項目は出ない", d.changed.some((c) => c.id === "st-a-act"), false);
  const pl = bundle.versions.plan, dp = calc.diffVersions(pl[0].data, pl[1].data);
  const ws = dp.changed.find((c) => c.id === "pl-ws");
  eq("A5 計画 少量卸の月額の差", ws.values.filter((v) => v.path.startsWith("values.months_yen")).map((v) => v.delta), [60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000]);

  const base = JSON.parse(JSON.stringify(st[0].data));
  const variants = {
    factor: () => { const a = JSON.parse(JSON.stringify(pl[0].data)), b = JSON.parse(JSON.stringify(pl[0].data)); b.lines[1].values.factor = 1.05; return [a, b, "pl-ovs", "values.factor", 1.1, 1.05]; },
    money: () => { const b = JSON.parse(JSON.stringify(base)); b.trial.values.money_yen = 150000; return [base, b, "st-trial-a", "values.money_yen", 100000, 150000]; },
    seats: () => { const b = JSON.parse(JSON.stringify(base)); b.canvas.blocks.segments[0].values.seats_max = 40; return [base, b, "st-a-segment", "values.seats_max", 30, 40]; },
  };
  for (const [name, mk] of Object.entries(variants)) {
    const [a, b, id, p, from, to] = mk();
    const r = calc.diffVersions(a, b), c = r.changed.find((x) => x.id === id);
    eq("A6 " + name + " を変更と判定（文言は同じ）", !!c && c.fields.length === 0, true);
    const v = c && c.values.find((x) => x.path === p);
    eq("A6 " + name + " 前後と差", v && [v.from, v.to, r1(v.delta)], [from, to, r1(to - from)]);
  }
  { const b = JSON.parse(JSON.stringify(base)); b.canvas.blocks.segments[0].evidence = [{ source: "src-conv-1202", where: "別の根拠" }];
    const c = calc.diffVersions(base, b).changed.find((x) => x.id === "st-a-segment");
    eq("A6 根拠だけの変更", !!c && c.evidenceChanged && c.fields.length === 0 && c.values.length === 0, true); }
  { const dv = bundle.versions.direction, a = JSON.parse(JSON.stringify(dv[0].data)), b = JSON.parse(JSON.stringify(dv[0].data));
    const x = b.donts.find((d) => d.id === "di-d-hire"); delete x.values;
    eq("A6 期限なし（null）と期限の欄なしは同じ", calc.diffVersions(a, b).byId["di-d-hire"], undefined); }
  { const h = calc.actualHistory(bundle), a = JSON.parse(JSON.stringify(pl[0])), b = JSON.parse(JSON.stringify(pl[0]));
    b.data.lines[1].values.factor = 1.05;
    const ba = calc.budget(a, h), bb = calc.budget(b, h);
    eq("A6 係数変更で海外の予算合計の差", man(bb.lines[1].total.value - ba.lines[1].total.value), -81.4);
    eq("A6 係数変更で12月の海外予算", [ba.lines[1].months[0], bb.lines[1].months[0]], [1650000, 1575000]); }
}

{ const a = { x: { id: "it1", text: "t", mark: "fact" } }, b = { x: { id: "it1", text: "t", mark: "fact", values: { duty: { payer: "shop" }, fee_yen: 1500 } } };
  const c = calc.diffVersions(a, b).changed.find((x) => x.id === "it1");
  eq("A6 値のまとまりが後から加わった変更", c && c.values.map((v) => v.path).sort(), ["values.duty.payer", "values.fee_yen"]); }

/* ---------- A7: same-day versions ---------- */
{
  const R = copyFixture("morita");
  const f1 = path.join(R, "docs/cso-strategy/20270408-1.md"), f2 = path.join(R, "docs/cso-strategy/20270408-2.md");
  const d = readData(f1); d.trial.values.money_yen = 150000;
  fs.copyFileSync(f1, f2); writeData(f2, d, { supersedes: "20270408-1" });
  const fi = path.join(R, "docs/cso-index/current.md"), di = readData(fi); di.current.strategy = "20270408-2"; writeData(fi, di);
  const { bundle, issues } = runCheck(R);
  eq("A7 検査が通る", issues, []);
  eq("A7 版の数", bundle.versions.strategy.map((v) => v.id), ["20261214-1", "20270408-1", "20270408-2"]);
  eq("A7 現在は-2", bundle.current.strategy.id, "20270408-2");
  const c = calc.diffVersions(bundle.versions.strategy[1].data, bundle.versions.strategy[2].data).changed.find((x) => x.id === "st-trial-a");
  eq("A7 -1と-2を比較できる", c && c.values[0].delta, 50000);
  const { execFileSync } = await import("node:child_process");
  const nid = execFileSync("node", [path.join(HERE, "..", "scripts", "build.mjs"), "next-id", "--root", R, "--kind", "strategy", "--date", "2027-04-08"]).toString().trim();
  eq("A7 次のidは-3", nid, "20270408-3");
  const nm = execFileSync("node", [path.join(HERE, "..", "scripts", "build.mjs"), "next-id", "--root", R, "--kind", "monthly", "--month", "2027-03"]).toString().trim();
  eq("A7 月次の訂正idはr2", nm, "202703-r2");
}

/* ---------- A8: monthly observations never touch strategy documents ---------- */
{
  const R = copyFixture("morita");
  const sf = path.join(R, "docs/cso-strategy/20261214-1.md");
  const hash = () => crypto.createHash("sha256").update(fs.readFileSync(sf)).digest("hex");
  const before = hash();
  const r = build(R);
  eq("A8 書き出し成功", r.ok, true);
  eq("A8 戦略の文書は変わらない", hash(), before);
  const js = fs.readFileSync(path.join(R, "html/cso/data/current.js"), "utf8");
  const data = JSON.parse(js.replace(/^window.CSO_DATA = /, "").replace(/;\n$/, ""));
  const obs = data.monthly.flatMap((m) => (m.data.observations || []).filter((o) => (o.observes || []).includes("st-a-segment")).map((o) => o.id));
  eq("A8 誰にへの観測が月次側にある", obs, ["mo-202701-ws-order", "mo-202702-ws-order", "mo-202703-ws-order", "mo-202703-us"]);
  eq("A8 ハブにリンク", fs.readFileSync(path.join(R, "html/index.html"), "utf8").includes('href="cso/index.html"'), true);
}

console.log(JSON.stringify({ passed, failed }));
process.exit(failed ? 1 : 0);
