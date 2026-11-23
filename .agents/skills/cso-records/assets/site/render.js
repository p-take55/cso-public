/* CSO render — draws the six documents from window.CSO_DATA. Never edits records. */
(function () {
  "use strict";
  var D = window.CSO_DATA, C = window.CSO_CALC, K = window.CSO_CHECK;
  var app = document.getElementById("app");
  if (!D) { app.innerHTML = '<p class="empty-doc">データがまだありません。</p>'; return; }

  /* ---------- formatting ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var UNIT = { man: ["万円", 10000, 1], sen: ["千円", 1000, 0], yen: ["円", 1, 0] }[(D.settings && D.settings.unit) || "man"] || ["万円", 10000, 1];
  function num(x, dec) { return Number(x).toLocaleString("ja-JP", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function money(y) {
    if (y == null) return '<span class="tag unk">未確認</span>';
    var v = y / UNIT[1], dec = UNIT[2] && !Number.isInteger(Math.round(v * 10) / 10) ? 1 : 0;
    return num(Math.round(v * Math.pow(10, UNIT[2])) / Math.pow(10, UNIT[2]), dec);
  }
  function moneyU(y) { if (y == null) return money(y); if (y !== 0 && Math.abs(y) < UNIT[1]) return num(y, 0) + "円"; return money(y) + UNIT[0]; }
  function signedMoney(y) { if (y == null) return '<span class="tag unk">未確認</span>'; return (y > 0 ? "+" : y < 0 ? "−" : "±") + money(Math.abs(y)); }
  function signedMoneyU(y) { if (y == null) return signedMoney(y); return (y > 0 ? "+" : y < 0 ? "−" : "±") + moneyU(Math.abs(y)); }
  function pct(x) { return x == null ? "—" : (x > 0 ? "+" : x < 0 ? "−" : "±") + Math.abs(Math.round(x * 10) / 10).toFixed(1) + "%"; }
  function ym(m) { return Number(m.slice(0, 4)) + "年" + Number(m.slice(5, 7)) + "月"; }
  function md(m) { return Number(m.slice(5, 7)) + "月"; }
  function day(d) { if (!d) return ""; var p = d.split("-"); return Number(p[0]) + "年" + Number(p[1]) + "月" + Number(p[2]) + "日"; }
  function vid(id) { var m = /^(\d{4})(\d{2})(\d{2})-(\d+)$/.exec(id || ""); return m ? Number(m[2]) + "月" + Number(m[3]) + "日" + (m[4] !== "1" ? "（" + m[4] + "回目）" : "") : id; }
  function cls(x) { return x > 0 ? "pos" : x < 0 ? "neg" : ""; }
  var MARK = { fact: ["fact", "事実"], observed: ["obs", "観測"], guess: ["guess", "推測"], unknown: ["unk", "未確認"], budget: ["bud", "予算"], actual: ["act", "実績"], commitment: ["bud", "約束"], decision: ["bud", "決定"] };
  function tag(m) { var t = MARK[m]; return t ? '<span class="tag ' + t[0] + '">' + t[1] + "</span>" : ""; }

  var sources = {}; (D.sources || []).forEach(function (s) { sources[s.id] = s; });
  var H = C.actualHistory(D);

  /* ---------- id → where it lives ---------- */
  var where = {};
  function indexDoc(sec, kind, docId, data, current) {
    var items = C.collect(data, {});
    Object.keys(items).forEach(function (id) { if (!where[id] || current) where[id] = { sec: sec, kind: kind, doc: docId, item: items[id], current: current }; });
  }
  [["direction", "s1"], ["analysis", "s2"], ["strategy", "s3"], ["plan", "s4"]].forEach(function (p) {
    (D.versions[p[0]] || []).forEach(function (v) { indexDoc(p[1], p[0], v.id, v.data, D.current[p[0]] && D.current[p[0]].id === v.id); });
  });
  (D.monthly || []).forEach(function (m) { indexDoc("s5", "monthly", m.id, m.data, true); });
  (D.quarterly || []).forEach(function (q) { indexDoc("s6", "quarterly", q.id, q.data, true); });
  function labelOf(it) { return it.title || it.text || it.name || it.label || it.id; }

  /* ---------- view state ---------- */
  var view = {}, compare = {};
  ["direction", "analysis", "strategy", "plan"].forEach(function (k) { view[k] = D.current[k] ? D.current[k].id : null; compare[k] = true; });
  function verOf(k, id) { return (D.versions[k] || []).filter(function (v) { return v.id === id; })[0] || null; }
  function prevOf(k, v) { return v && v.supersedes ? verOf(k, v.supersedes) : null; }
  function diffFor(k) {
    var v = verOf(k, view[k]), p = prevOf(k, v);
    return v && p && compare[k] ? { prev: p, d: C.diffVersions(p.data, v.data) } : null;
  }

  /* ---------- items ---------- */
  var LABEL = { factor: "係数", money_yen: "お金の上限", seats_max: "席数の上限", unit_price_yen: "単価", weeks: "期間（週）", hours_per_week: "週の時間", avg_monthly_yen: "月平均", orders: "注文", until: "期限", region: "地域", amount_yen: "毎月の金額", rule: "作り方", min_pieces: "最小の本数", avg_monthly_max_yen: "月商の上限", days_per_week: "日数（週）", days: "日数", price_yen: "価格", orders_min: "注文の下限", questions_min: "質問の下限", daily_yen_min: "1日の売上の下限", savings_target_yen: "貯める額", start: "開始日", end: "終了日", money_scope: "お金の枠の数え方", extra_price_yen: "追加の値段", engrave_extra_yen: "名入れの追加", duty_paid_by: "関税を払う側", amount_yen: "金額", month: "月", moq: "最小注文", contacted: "連絡した数", replies: "返事", hours_used: "使った時間", money_used_yen: "使ったお金" };
  var TEXTY = { limits: "まだ言えないこと", missing: "足りないもの", reason: "理由", note: "補足", answer: "決めたこと", region: "地域", basis: "前提" };
  function changeText(c, months, vl) {
    vl = vl || {};
    var out = [];
    c.values.forEach(function (v) {
      var tk = v.path.replace(/^values\./, "");
      if (TEXTY[tk]) { out.push(esc(TEXTY[tk]) + "：" + (v.from == null ? "なし" : esc(v.from)) + " → " + (v.to == null ? "なし" : esc(v.to))); return; }
      var m = /^values\.months_yen\[(\d+)\]$/.exec(v.path);
      var key = v.path.replace(/^values\./, "").replace(/\[\d+\]$/, "");
      var leaf = key.split(".").pop();
      var name = m && months ? md(months[Number(m[1])]) + "の金額" : (vl[key] || vl[leaf] || LABEL[key] || LABEL[leaf] || "値（" + key + "）");
      var isYen = /_yen/.test(v.path);
      var f = function (x) { return x == null ? "なし" : isYen ? moneyU(x) : (typeof x === "object" ? esc(JSON.stringify(x)) : esc(x)); };
      out.push(esc(name) + " " + f(v.from) + " → " + f(v.to) + (v.delta != null ? "（" + (isYen ? signedMoneyU(v.delta) : (v.delta > 0 ? "+" : "") + Math.round(v.delta * 1000) / 1000) + "）" : ""));
    });
    if (c.fields.indexOf("text") >= 0) out.push("文言が変わった");
    if (c.fields.indexOf("mark") >= 0) out.push("印が変わった");
    if (c.evidenceChanged) out.push("根拠が変わった");
    if (c.linksChanged) out.push("つながりが変わった");
    return out;
  }
  function evidenceHtml(ev) {
    return (ev || []).map(function (e) { var s = sources[e.source]; return esc(s ? s.title : e.source) + (e.where ? "・" + esc(e.where) : ""); }).join(" ／ ");
  }
  function linkTo(id, text) {
    var w = where[id];
    if (!w) return esc(text || id);
    if (w.current) return '<a href="#it-' + esc(id) + '">' + esc(text || labelOf(w.item)) + "</a>";
    return '<button type="button" class="btnlink" data-open-ver="' + esc(w.kind) + '" data-ver-id="' + esc(w.doc) + '" data-goto="it-' + esc(id) + '">' + esc(text || labelOf(w.item)) + "（" + vid(w.doc) + "の版）</button>";
  }
  function item(it, opt) {
    opt = opt || {};
    var dd = opt.diff && opt.diff.d.byId[it.id];
    var meta = [];
    if (it.evidence && it.evidence.length) meta.push("<div>根拠：" + evidenceHtml(it.evidence) + "</div>");
    if (it.reason) meta.push("<div>理由：" + esc(it.reason) + "</div>");
    if (it.missing) meta.push("<div>足りないもの：" + esc(it.missing) + "</div>");
    if (it.limits) meta.push("<div>まだ言えないこと：" + esc(it.limits) + "</div>");
    if (it.note) meta.push("<div>" + esc(it.note) + "</div>");
    if (it.answer) meta.push("<div>決めたこと：" + esc(it.answer) + "</div>");
    var lf = (it.links && it.links.from) || [], lt = (it.links && it.links.to) || [];
    if (lf.length) meta.push("<div>もとになった項目：" + lf.map(function (x) { return linkTo(x); }).join("、") + "</div>");
    if (lt.length) meta.push("<div>反映先：" + lt.map(function (x) { return linkTo(x); }).join("、") + "</div>");
    var weak = it.mark === "guess" || it.mark === "unknown" || it.mark === "observed";
    var pill = dd ? (dd.kind === "added" ? ' <span class="pill">追加</span>' : ' <span class="pill">変更</span>') : "";
    var delta = dd && dd.kind === "changed" ? '<div class="delta"><ul><li>' + changeText(dd.detail, opt.months, it.value_labels).join("</li><li>") + "</li></ul></div>" : "";
    var after = "";
    if (opt.obsAfter && opt.obsAfter[it.id]) {
      after = opt.obsAfter[it.id].map(function (o) {
        return '<div class="obs-after"><b>この版の後の観測（' + esc(md(o.month)) + "）</b> " + esc(o.item.text) + (o.item.limits ? "　まだ言えないこと：" + esc(o.item.limits) : "") + ' <a href="#it-' + esc(o.item.id) + '">月次へ</a></div>';
      }).join("");
    }
    return '<details class="item' + (weak ? " weak" : "") + (dd ? " new" : "") + '" id="it-' + esc(it.id) + '"><summary>' + tag(it.mark) + esc(labelOf(it)) + pill + "</summary>" +
      (meta.length ? '<div class="meta">' + meta.join("") + "</div>" : "") + "</details>" + delta + after;
  }
  function list(items, opt) { return (items || []).length ? '<div class="plain-list">' + items.map(function (i) { return item(i, opt); }).join("") + "</div>" : '<p class="empty-doc">なし</p>'; }
  function removedList(diff, filter) {
    if (!diff) return "";
    var r = diff.d.removed.filter(function (id) { return !filter || filter(id); });
    return r.map(function (id) { var it = diff.d.byId[id].item; return '<p class="removed"><span class="pill old-pill">' + vid(diff.prev.id) + "</span><s>" + esc(labelOf(it)) + "</s></p>"; }).join("");
  }

  /* ---------- section frame ---------- */
  function verBar(k) {
    var vs = D.versions[k] || [];
    if (vs.length < 2) return "";
    var v = verOf(k, view[k]), p = prevOf(k, v);
    return '<div class="vbar"><div class="ver" role="group" aria-label="版">' + vs.map(function (x) {
      return '<button type="button" data-ver-kind="' + k + '" data-ver="' + esc(x.id) + '" aria-pressed="' + (x.id === view[k]) + '">' + vid(x.id) + (D.current[k] && D.current[k].id === x.id ? "（現在）" : "") + "</button>";
    }).join("") + "</div>" + (p ? '<button type="button" class="toggle" data-compare="' + k + '" aria-pressed="' + compare[k] + '">前の版（' + vid(p.id) + "）との違いを表示</button>" : "") + "</div>" +
      (v && v.changed_by ? '<p class="changed-by">この版のきっかけ：' + changedBy(v.changed_by) + "</p>" : "");
  }
  function changedBy(c) {
    if ((D.quarterly || []).some(function (q) { return q.id === c; })) return '<a href="#q-' + esc(c) + '">四半期レビュー ' + vid(c) + "</a>";
    if (sources[c]) return esc(sources[c].title || c);
    return esc(c);
  }
  function frame(id, no, title, h2, meta, body) {
    return '<section id="' + id + '" class="doc"><div class="doc-head"><p class="doc-no">資料' + no + "　" + esc(title) + "</p><h2>" + esc(h2) + '</h2><p class="doc-meta">' + meta + "</p></div>" + body + "</section>";
  }
  function emptyFrame(id, no, title, after) {
    return frame(id, no, title, title, "", '<p class="empty-doc">まだありません。' + esc(after) + "に作ります。</p>");
  }
  function srcList(ids) { return (ids || []).map(function (s) { return esc(sources[s] ? sources[s].title : s); }).join("、"); }

  /* ---------- 1 direction ---------- */
  function sDirection() {
    var v = verOf("direction", view.direction);
    var T = "ミッション・ビジョン・経営方針";
    if (!v) return emptyFrame("s1", 1, T, "最初の相談の後");
    var d = v.data, df = diffFor("direction"), o = { diff: df };
    function untilItem(x) {
      var u = x.values && x.values.until, ut = u ? ym(u) : "";
      return item(Object.assign({}, x, { text: x.text + (u && x.text.indexOf(ut) < 0 ? "（" + ut + "まで）" : "") }), o);
    }
    var body = verBar("direction") +
      '<div class="mission-grid"><div class="panel"><h3>ミッション</h3>' + item(d.purpose, o) + '</div><div class="panel"><h3>ビジョン' + (d.vision.horizon ? "（" + ym(d.vision.horizon) + "）" : "") + "</h3>" + list(d.vision.items, o) + "</div></div>" +
      '<div class="panel donts"><h3>経営方針　<span class="note">戦略と計画は、これに沿って考えます</span></h3>' + (d.donts || []).map(untilItem).join("") + removedList(df) + "</div>" +
      ((d.owner_hands || []).length ? '<div class="panel owner-hands"><h3>本人が行うこと</h3>' + d.owner_hands.map(untilItem).join("") + "</div>" : "");
    return frame("s1", 1, T, "事業の目的と進め方", "版 " + vid(v.id), body);
  }

  /* ---------- 2 analysis ---------- */
  function chart(an) {
    var s = an.data.series, lines = Object.keys(s.values), n = s.months.length;
    var totals = s.months.map(function (m, i) { return lines.reduce(function (a, l) { return a + (s.values[l][i] || 0); }, 0); });
    var max = Math.max.apply(null, totals) * 1.12 || 1, W = 720, Hh = 260, L = 46, B = 34, T = 14, bw = (W - L - 10) / n;
    var g = '<svg viewBox="0 0 ' + W + " " + Hh + '" class="chart">';
    (an.data.annotations || []).forEach(function (a) {
      var i0 = s.months.indexOf(a.from), i1 = s.months.indexOf(a.to);
      if (i0 >= 0 && i1 >= 0) g += '<rect class="band" x="' + (L + i0 * bw) + '" y="' + T + '" width="' + (bw * (i1 - i0 + 1)) + '" height="' + (Hh - B - T) + '"></rect>';
    });
    for (var t = 0; t <= 4; t++) { var val = max * t / 4, y = Hh - B - (val / max) * (Hh - B - T); g += '<line class="grid" x1="' + L + '" x2="' + (W - 10) + '" y1="' + y + '" y2="' + y + '"></line><text class="ax" x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + money(val) + "</text>"; }
    s.months.forEach(function (m, i) {
      var x = L + i * bw + bw * 0.18, w = bw * 0.64, yb = Hh - B;
      lines.forEach(function (l, li) { var v = s.values[l][i]; if (v == null) return; var hgt = v / max * (Hh - B - T); yb -= hgt; g += '<rect class="l' + li + '" x="' + x + '" y="' + yb + '" width="' + w + '" height="' + hgt + '"></rect>'; });
      var complete = lines.every(function (l) { return s.values[l][i] != null; });
      g += '<text class="val" x="' + (x + w / 2) + '" y="' + (yb - 4) + '" text-anchor="middle">' + (complete ? money(totals[i]) : "未確認") + "</text>";
      g += '<text class="ax" x="' + (x + w / 2) + '" y="' + (Hh - B + 16) + '" text-anchor="middle">' + md(m) + "</text>";
    });
    g += '<text class="ax" x="' + L + '" y="' + (Hh - 4) + '">' + ym(s.months[0]) + "〜" + ym(s.months[n - 1]) + "（" + UNIT[0] + "）</text></svg>";
    var labels = {}; (an.data.lines || []).forEach(function (l) { labels[l.id] = l.label; });
    var legend = lines.map(function (l, li) { return '<span class="sw l' + li + '"></span>' + esc(labels[l] || l); }).join("　") +
      ((an.data.annotations || []).length ? '　<span class="sw band"></span>' + (an.data.annotations || []).map(function (a) { return esc(a.text); }).join("、") : "");
    return '<div class="chart-wrap" role="img" aria-label="月別の売上">' + g + '</div><p class="legend">' + legend + "</p>";
  }
  function sAnalysis() {
    var v = verOf("analysis", view.analysis);
    if (!v) return emptyFrame("s2", 2, "事業環境分析", "最初の相談");
    var d = v.data, df = diffFor("analysis"), o = { diff: df }, M = C.analysisMetrics(v);
    var labels = {}; (d.lines || []).forEach(function (l) { labels[l.id] = l.label; });
    var kp = '<div class="kpis"><div class="kpi"><span>' + M.months.length + "か月の売上</span><b>" + moneyU(M.total.value) + '</b></div><div class="kpi"><span>月平均</span><b>' + moneyU(M.avg) + "</b></div>" +
      M.lines.map(function (l) { return '<div class="kpi"><span>' + esc(labels[l.id] || l.id) + "の比率・半期の伸び</span><b>" + (l.share == null ? "—" : l.share.toFixed(1) + "%") + "・" + pct(l.halfGrowth) + "</b></div>"; }).join("") + "</div>";
    var yoy = M.yoy.length ? '<p class="note">前年同月比：' + M.yoy.map(function (y) { return md(y.month) + " " + pct(y.pct); }).join("、") + "</p>" : "";
    var voices = d.voices ? '<h3 class="sec">顧客の声（' + ym(d.voices.period.from) + "〜" + ym(d.voices.period.to) + "、" + d.voices.categories.reduce(function (a, c) { return a + c.n; }, 0) + '件）</h3><div class="hbars">' +
      (function () { var mx = Math.max.apply(null, d.voices.categories.map(function (c) { return c.n; })); return d.voices.categories.map(function (c) { return '<div class="hb" id="it-' + esc(c.id) + '"><span class="hb-l">' + esc(c.label) + (c.note ? "<small>" + esc(c.note) + "</small>" : "") + '</span><span class="hb-bar"><i style="width:' + (c.n / mx * 100) + '%"></i></span><b>' + c.n + "件</b></div>"; }).join(""); })() +
      '</div><p class="note">材料：' + srcList([d.voices.source]) + "</p>" : "";
    var body = verBar("analysis") + '<div class="mark-legend"><span class="tag fact">事実</span>材料で確かめたこと <span class="tag guess">推測</span>根拠はあるが確かめていない <span class="tag unk">未確認</span>まだ材料がない <span class="tag obs">観測</span>試した結果</div>' +
      '<h3 class="sec">自社：月別の売上</h3>' + chart(v) + ((d.annotations || []).length ? list(d.annotations, o) : "") + kp + yoy +
      '<div class="facts"><div class="col"><h4>分かっていること</h4>' + list(d.facts, o) + '</div><div class="col"><h4>まだ分からないこと</h4>' + list(d.unknowns, o) + "</div></div>" + voices +
      '<h3 class="sec">市場と競合</h3><div class="mkt"><div class="panel"><h4>市場</h4>' + list(d.market, o) + '</div><div class="panel"><h4>競合</h4>' + list(d.competitors, o) + '</div><div class="panel"><h4>手持ちの力</h4>' + list(d.strengths, o) + "</div></div>" + removedList(df);
    return frame("s2", 2, "事業環境分析", "市場・競合・自社を1枚に", "版 " + vid(v.id) + "　材料：" + srcList(d.series.sources), body);
  }

  /* ---------- 3 strategy ---------- */
  var BLOCKS = [["partners", "組む相手", "キーパートナー"], ["activities", "やること", "主要活動"], ["resources", "手持ちの力", "リソース"], ["value", "何を約束するか", "価値提案"], ["relations", "どう付き合うか", "顧客との関係"], ["channels", "どう届けるか", "チャネル"], ["segments", "誰に", "顧客セグメント"], ["costs", "かかるお金", "コスト構造"], ["revenue", "どう稼ぐか", "収益の流れ"]];
  function obsAfterFor(v) {
    /* observations recorded after this version and before the next one */
    var since = (v.data.as_of || "").slice(0, 7), map = {};
    var next = (D.versions.strategy || []).filter(function (x) { return x.supersedes === v.id; })[0];
    var until = next ? (next.data.as_of || "").slice(0, 7) : null;
    (D.monthly || []).forEach(function (m) {
      if (m.data.month < since || (until && m.data.meeting_date && m.data.meeting_date.slice(0, 10) >= next.data.as_of)) return;
      (m.data.observations || []).forEach(function (o) { (o.observes || []).forEach(function (id) { (map[id] = map[id] || []).push({ month: m.data.month, item: o }); }); });
    });
    return map;
  }
  function sStrategy() {
    var v = verOf("strategy", view.strategy);
    if (!v) return emptyFrame("s3", 3, "事業戦略", "方針と分析の後");
    var d = v.data, df = diffFor("strategy"), o = { diff: df, obsAfter: obsAfterFor(v) };
    var cands = d.candidates || [];
    var cmp = '<h3 class="sec">候補の比較</h3><div class="tbl-wrap"><table class="cmp"><thead><tr><th></th>' + cands.map(function (c) {
      return "<th" + (c.id === d.chosen ? ' class="chosen-h"' : "") + ' id="it-' + esc(c.id) + '">' + esc(c.name) + (c.id === d.chosen ? ' <span class="pill">選んだ</span>' : "") + "</th>";
    }).join("") + "</tr></thead><tbody>" + (d.compare_rows || []).map(function (r, i) {
      return "<tr><th>" + esc(r) + "</th>" + cands.map(function (c) { return "<td>" + esc(c.rows[i]) + "</td>"; }).join("") + "</tr>";
    }).join("") + "<tr><th>もとになった項目</th>" + cands.map(function (c) { return "<td>" + ((c.links && c.links.from) || []).map(function (x) { return linkTo(x); }).join("、") + "</td>"; }).join("") + "</tr></tbody></table></div>";
    var dec = d.decision ? '<p class="decided"><b>決定</b>　' + esc(d.decision.text) + "</p>" : "";
    var t = d.trial, trial = t ? '<div class="panel trial" id="it-' + esc(t.id) + '"><h3>試しの約束（試す前に決めたこと）</h3><div class="trial-grid"><div><span class="lbl">期間</span><b>' + t.values.weeks + "週間</b><span class=\"note\">" + day(t.values.start) + "〜" + day(t.values.end) + '</span></div><div><span class="lbl">時間</span><b>週' + t.values.hours_per_week + '時間まで</b></div><div><span class="lbl">お金</span><b>' + moneyU(t.values.money_yen) + "まで</b></div></div>" +
      '<ul class="rules">' + (t.criteria || []).map(function (c) { return '<li id="it-' + esc(c.id) + '"><span class="r ' + (c.kind === "go" ? "go" : c.kind === "fix" ? "fix" : "stop") + '">' + (c.kind === "go" ? "続ける" : c.kind === "fix" ? "直す" : "やめる") + "</span>" + esc(c.text) + "</li>"; }).join("") + "</ul>" +
      (df && df.d.byId[t.id] && df.d.byId[t.id].kind === "changed" ? '<div class="delta"><ul><li>' + changeText(df.d.byId[t.id].detail, null, t.value_labels).join("</li><li>") + "</li></ul></div>" : "") + "</div>" : "";
    var canv = "";
    if (d.canvas) {
      var cname = (cands.filter(function (c) { return c.id === d.canvas.candidate; })[0] || {}).name || "";
      var prevBlocks = df ? (df.prev.data.canvas || {}).blocks || {} : {};
      canv = '<h3 class="sec" id="bmc">キャンバス：' + esc(cname) + '</h3><div class="bmc-tools"><button type="button" class="toggle" id="weak" aria-pressed="false">確かめていない項目だけ目立たせる</button></div><p class="note">項目を押すと根拠が開きます。' + (Object.keys(o.obsAfter).length ? "青い枠は、この版の後の月次会議で記録した観測です（戦略の記録は四半期レビューまで変えません）。" : "") + '</p><div class="bmc" id="bmc-grid">' +
        BLOCKS.map(function (b) {
          var its = d.canvas.blocks[b[0]] || [];
          var changed = df && (its.some(function (i) { return df.d.byId[i.id]; }) || (prevBlocks[b[0]] || []).some(function (i) { return df.d.byId[i.id] && df.d.byId[i.id].kind === "removed"; }));
          var rem = df ? (prevBlocks[b[0]] || []).filter(function (i) { return df.d.byId[i.id] && df.d.byId[i.id].kind === "removed"; }).map(function (i) { return '<p class="removed"><span class="pill old-pill">' + vid(df.prev.id) + "</span><s>" + esc(i.text) + "</s></p>"; }).join("") : "";
          return '<div class="cell c-' + b[0] + (changed ? " changed" : "") + '"><h4>' + b[1] + "<small>" + b[2] + "</small></h4>" + rem + its.map(function (i) { return item(i, o); }).join("") + "</div>";
        }).join("") + "</div>";
    }
    return frame("s3", 3, "事業戦略", "候補の比較と、選んだ候補のキャンバス", "版 " + vid(v.id), verBar("strategy") + cmp + dec + trial + canv);
  }

  /* ---------- 4 plan ---------- */
  function sPlan() {
    var v = verOf("plan", view.plan);
    if (!v) return emptyFrame("s4", 4, "中期経営計画・年度予算", "戦略を決めた後");
    var d = v.data, df = diffFor("plan"), b = C.budget(v, H), ty = C.threeYear(v, b);
    var pb = df ? C.budget(df.prev, H) : null;
    var three = '<h3 class="sec">' + ty.length + '年の数字　<span class="note">2年目以降は推測</span></h3><div class="tbl-wrap"><table class="num"><thead><tr><th></th><th>年間の売上<br><small>' + UNIT[0] + "</small></th><th>月平均<br><small>" + UNIT[0] + "</small></th><th>粗利（" + esc(d.gross_margin_pct) + "%）<br><small>" + UNIT[0] + "</small></th><th>この数字が成り立つ前提</th></tr></thead><tbody>" +
      ty.map(function (y, i) { return '<tr id="it-' + esc(y.id) + '"><th>' + esc(y.label) + " " + tag(y.row.mark) + "</th><td>" + money(y.annual) + "</td><td>" + money(y.avgMonthly) + "</td><td>" + money(y.gross) + '</td><td class="txt">' + esc(y.row.basis) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    var RULE = { prior_year_factor: function (r) { return "前年同月×" + r.factor; }, flat: function (r) { return "毎月" + moneyU(r.amount_yen); }, manual: function () { return "月ごとに入力"; } };
    var rules = '<ul class="plain-list">' + d.lines.map(function (l) {
      var dd = df && df.d.byId[l.id];
      return '<li id="it-' + esc(l.id) + '"><b>' + esc(l.label) + "</b>：" + esc((RULE[l.values.rule] || function () { return l.values.rule; })(l.values)) +
        ((l.links && l.links.from || []).length ? "　根拠：" + l.links.from.map(function (x) { return linkTo(x); }).join("、") : "") +
        (dd ? ' <span class="pill">' + (dd.kind === "added" ? "追加" : "変更") + "</span>" + (dd.kind === "changed" ? '<div class="delta"><ul><li>' + changeText(dd.detail, b.months, l.value_labels).join("</li><li>") + "</li></ul></div>" : "") : "") + "</li>";
    }).join("") + "</ul>";
    var head = "<thead><tr><th></th>" + b.months.map(function (m, i) { return "<th>" + (i === 0 || m.slice(5) === "01" ? ym(m) : md(m)) + "</th>"; }).join("") + "<th>合計</th></tr></thead>";
    var rows = b.lines.map(function (l) {
      var dd = df && df.d.byId[l.item];
      return "<tr" + (dd ? ' class="changed"' : "") + "><th>" + esc(l.label) + "</th>" + l.months.map(function (x) { return "<td>" + money(x) + "</td>"; }).join("") + "<td><b>" + (l.total.incomplete ? "一部未確認" : money(l.total.value)) + "</b></td></tr>";
    }).join("") + '<tr class="sum"><th>合計</th>' + b.totals.map(function (t) { return "<td>" + (t.incomplete ? "一部未確認" : money(t.value)) + "</td>"; }).join("") + "<td>" + (b.total.incomplete ? "一部未確認" : money(b.total.value)) + "</td></tr>";
    var totalDelta = pb && b.total.value != null && pb.total.value != null && b.total.value !== pb.total.value
      ? '<p class="delta">前の版から：予算の合計 ' + moneyU(pb.total.value) + " → " + moneyU(b.total.value) + "（" + signedMoneyU(b.total.value - pb.total.value) + "）</p>" : "";
    var kpis = '<h3 class="sec">毎月見る数字</h3><ol class="five">' + (d.kpis || []).map(function (k) { return '<li id="it-' + esc(k.id) + '"><b>' + esc(k.label) + "</b><span>" + esc(k.target) + "</span></li>"; }).join("") + "</ol>";
    return frame("s4", 4, "中期経営計画・年度予算", "計画の数字、月次予算、毎月見る数字", "版 " + vid(v.id),
      verBar("plan") + three + '<h3 class="sec" id="budget">月次予算（' + ym(b.months[0]) + "〜" + ym(b.months[b.months.length - 1]) + "、" + UNIT[0] + "）</h3>" + rules + '<div class="tbl-wrap"><table class="num budget">' + head + "<tbody>" + rows + "</tbody></table></div>" + totalDelta + kpis);
  }

  /* ---------- 5 monthly ---------- */
  function planBudget(id) { var p = verOf("plan", id) || D.current.plan; return p ? C.budget(p, H) : null; }
  function monthDetail(m) {
    var d = m.data, b = planBudget(d.plan_version), out = "";
    if ((d.decisions || []).length) out += '<div class="panel ask"><h3>決めてほしいこと（' + d.decisions.length + "つ）と、決めたこと</h3><ol class=\"decide\">" + d.decisions.map(function (x) { return '<li id="it-' + esc(x.id) + '"><p class="q">' + esc(x.text) + '</p><p class="a">' + (x.answer ? "決定：" + esc(x.answer) : "まだ決まっていません") + "</p></li>"; }).join("") + "</ol></div>";
    if (b) {
      var va = C.variance(b, H, [d.month]);
      out += '<h3 class="sec">予算と実績（' + ym(d.month) + "、" + UNIT[0] + '）</h3><div class="tbl-wrap"><table class="num"><thead><tr><th></th><th><span class="tag bud">予算</span></th><th><span class="tag act">実績</span></th><th>差</th><th>差の比率</th></tr></thead><tbody>' +
        va.rows.map(function (r) { return "<tr><th>" + esc(r.label) + "</th><td>" + money(r.budget[0]) + "</td><td>" + money(r.actual[0]) + '</td><td class="' + cls(r.diff) + '">' + signedMoney(r.diff) + "</td><td>" + pct(r.pct) + "</td></tr>"; }).join("") +
        '<tr class="sum"><th>合計</th><td>' + money(va.budgetTotal.value) + "</td><td>" + (va.actualTotal.incomplete ? "一部未確認" : money(va.actualTotal.value)) + '</td><td class="' + cls(va.diff) + '">' + signedMoney(va.diff) + "</td><td>" + pct(va.pct) + "</td></tr></tbody></table></div>" +
        '<p class="note">予算は計画の ' + vid(d.plan_version) + " の版。材料：" + srcList(d.sources) + "</p>";
    }
    if ((d.notes || []).length) out += list(d.notes);
    var st = D.current.strategy;
    if (d.trial && st && st.data.trial) {
      var ts = C.trialStatus(st.data.trial, d.trial.values);
      out += '<h3 class="sec">試しの進み具合（本人申告）</h3><div class="trial-now"><div><span class="lbl">時間</span><b>' + (ts.hoursUsed == null ? "申告なし" : ts.hoursUsed + " / " + ts.hoursLimit + "時間") + '</b></div><div><span class="lbl">お金</span><b>' + (ts.moneyUsed == null ? "申告なし" : money(ts.moneyUsed) + " / " + moneyU(ts.moneyLimit)) + "</b></div>" +
        (d.trial.values.orders != null ? '<div><span class="lbl">注文</span><b>' + d.trial.values.orders + "件</b></div>" : "") + "</div>";
    }
    if ((d.observations || []).length) out += '<h3 class="sec">観測（戦略の項目に結び付けて記録）</h3>' + list(d.observations);
    if ((d.unexpected || []).length) out += '<h3 class="sec">予定外の出来事</h3>' + list(d.unexpected);
    return out;
  }
  function sMonthly() {
    var ms = D.monthly || [];
    if (!ms.length) return emptyFrame("s5", 5, "月次経営会議", "計画を作った翌月");
    var latest = ms[ms.length - 1];
    var body = ms.slice().reverse().map(function (m, i) {
      var b = planBudget(m.data.plan_version), va = b ? C.variance(b, H, [m.data.month]) : null;
      return '<details class="month-block" id="m-' + esc(m.id) + '"' + (i === 0 ? " open" : "") + "><summary>" + ym(m.data.month) + "の実績（会議 " + day(m.data.meeting_date) + "）" + (va ? "　予算比 " + signedMoney(va.diff) + (va.diff != null ? UNIT[0] : "") : "") + (m.id.slice(-2) !== "r1" ? "　訂正 " + esc(m.id.split("-r")[1]) + "回目" : "") + '</summary><div class="inner">' + monthDetail(m) + "</div></details>";
    }).join("");
    return frame("s5", 5, "月次経営会議", "月次経営会議の記録", "最新：" + ym(latest.data.month) + "の実績", body);
  }

  /* ---------- 6 quarterly ---------- */
  function sQuarterly() {
    var qs = D.quarterly || [];
    if (!qs.length) return emptyFrame("s6", 6, "四半期レビュー", "月次会議を3回重ねた後");
    var body = qs.slice().reverse().map(function (q) {
      var d = q.data, b = planBudget(d.plan_version), months = C.monthsFromTo(d.period.from, d.period.to), va = b ? C.variance(b, H, months) : null;
      var prem = '<div class="premises">' + d.premises.map(function (p) {
        return '<div class="pm" id="it-' + esc(p.id) + '"><h4>「' + esc(p.title) + "」</h4><p>" + tag("observed") + esc(p.text) + '</p><p class="note">根拠：' + evidenceHtml(p.evidence) + "</p><p>" + tag("unknown") + "まだ言えない：" + esc(p.limits) + '</p><p class="next">次：' + esc(p.next) + "</p>" +
          (((p.links || {}).from || []).length ? '<p class="note">もとになった観測：' + p.links.from.map(function (x) { return linkTo(x); }).join("、") + "</p>" : "") + "</div>";
      }).join("") + "</div>";
      var tbl = va ? '<h3 class="sec">' + ym(d.period.from) + "〜" + ym(d.period.to) + "の予算と実績（" + UNIT[0] + '）</h3><div class="tbl-wrap"><table class="num"><thead><tr><th></th>' + months.map(function (m) { return "<th>" + ym(m) + "<br><small>予算 / 実績</small></th>"; }).join("") + "<th>予算計</th><th>実績計</th><th>差</th></tr></thead><tbody>" +
        va.rows.map(function (r) { return "<tr><th>" + esc(r.label) + "</th>" + months.map(function (m, i) { return "<td>" + money(r.budget[i]) + " / " + money(r.actual[i]) + "</td>"; }).join("") + "<td>" + money(r.budgetTotal.value) + "</td><td>" + (r.actualTotal.incomplete ? "一部未確認" : money(r.actualTotal.value)) + '</td><td class="' + cls(r.diff) + '">' + signedMoney(r.diff) + "</td></tr>"; }).join("") +
        '<tr class="sum"><th>合計</th>' + va.monthTotals.map(function (t) { return "<td>" + money(t.budget) + " / " + money(t.actual) + "</td>"; }).join("") + "<td>" + money(va.budgetTotal.value) + "</td><td>" + (va.actualTotal.incomplete ? "一部未確認" : money(va.actualTotal.value)) + '</td><td class="' + cls(va.diff) + '">' + signedMoney(va.diff) + "</td></tr></tbody></table></div>" : "";
      var NAME = { strategy: "戦略", plan: "計画", direction: "ミッション・ビジョン・経営方針", analysis: "現状と環境" };
      var ups = (d.updates || []).length ? '<h3 class="sec">この点検で更新した資料</h3><ul class="updates">' + d.updates.map(function (u) {
        return '<li><a href="#s' + ({ direction: 1, analysis: 2, strategy: 3, plan: 4 })[u.resource] + '" data-open-ver="' + esc(u.resource) + '" data-ver-id="' + esc(u.to) + '"><b>' + esc(NAME[u.resource] || u.resource) + "</b>" + esc(u.summary) + "（" + vid(u.to) + "の版、前の版との違いを表示）→</a></li>";
      }).join("") + "</ul>" : "";
      var dec = d.decision ? '<p class="decided" id="it-' + esc(d.decision.id) + '"><b>決定</b>　' + esc(d.decision.text) + "</p>" : "";
      return '<div id="q-' + esc(q.id) + '"><h3 class="sec">' + day(d.date) + "のレビュー（" + ym(d.period.from) + "〜" + ym(d.period.to) + "）</h3>" + prem + tbl + ups + dec + "</div>";
    }).join("");
    return frame("s6", 6, "四半期レビュー", "前提の点検と、戦略・計画の更新", "", body);
  }

  /* ---------- overview & threads ---------- */
  function threads() {
    var edges = {}, indeg = {};
    function add(a, b) { if (!where[a] || !where[b] || a === b) return; edges[a] = edges[a] || {}; if (!edges[a][b]) { edges[a][b] = true; indeg[b] = (indeg[b] || 0) + 1; } }
    Object.keys(where).forEach(function (id) {
      var it = where[id].item, l = it.links || {};
      (l.to || []).forEach(function (t) { add(id, t); });
      (l.from || []).forEach(function (f) { add(f, id); });
      (it.observes || []).forEach(function (t) { add(t, id); });
    });
    var best = {};
    function longest(n, seen) {
      if (best[n]) return best[n];
      var b = [n];
      Object.keys(edges[n] || {}).forEach(function (m) { if (seen[m]) return; seen[m] = true; var p = longest(m, seen); seen[m] = false; if (p.length + 1 > b.length) b = [n].concat(p); });
      return (best[n] = b);
    }
    var starts = Object.keys(edges).filter(function (n) { return !indeg[n]; });
    var chains = starts.map(function (s) { var seen = {}; seen[s] = true; return longest(s, seen); }).filter(function (c) { return c.length >= 3; })
      .sort(function (a, b) { return b.length - a.length; });
    var used = {}, pick = [];
    chains.forEach(function (c) { if (pick.length >= 3) return; var overlap = c.filter(function (x) { return used[x]; }).length; if (overlap > c.length / 2) return; c.forEach(function (x) { used[x] = true; }); pick.push(c); });
    if (!pick.length) return "";
    var SEC = { s1: "経営方針", s2: "分析", s3: "戦略", s4: "計画", s5: "月次", s6: "四半期" };
    return '<h2 class="h-threads">判断は、次の資料にこう引き継がれています</h2><p class="sub">各項目を押すと、その資料の該当箇所に移ります。記録に残したつながりから自動で並べています。</p><div class="threads">' +
      pick.map(function (c) {
        return '<div class="thread"><ol>' + c.map(function (id) { var w = where[id]; return "<li>" + SEC[w.sec] + "：" + linkTo(id) + "</li>"; }).join("") + "</ol></div>";
      }).join("") + "</div>";
  }
  function overview(issues) {
    var S = D.settings || {}, cards = [];
    var cd = D.current;
    function card(no, sec, title, dt, key) { cards.push('<li><a href="#' + sec + '"><span class="c-no">' + no + '</span><span class="c-date">' + esc(dt || "") + "</span><strong>" + title + '</strong><span class="c-key">' + key + "</span></a></li>"); }
    card(1, "s1", "経営方針", cd.direction ? vid(cd.direction.id) : "", cd.direction ? esc((cd.direction.data.donts || []).slice(0, 2).map(function (x) { return "「" + x.text + "」"; }).join("")) : "まだありません");
    if (cd.analysis) { var M = C.analysisMetrics(cd.analysis); card(2, "s2", "分析", vid(cd.analysis.id), M.months.length + "か月の売上 <em>" + moneyU(M.total.value) + "</em>"); } else card(2, "s2", "分析", "", "まだありません");
    card(3, "s3", "戦略", cd.strategy ? vid(cd.strategy.id) : "", cd.strategy ? esc(((cd.strategy.data.candidates || []).filter(function (c) { return c.id === cd.strategy.data.chosen; })[0] || {}).name || "候補を比較中") + "を試す" : "まだありません");
    if (cd.plan) { var b = C.budget(cd.plan, H); card(4, "s4", "計画", vid(cd.plan.id), "予算の合計 <em>" + (b.total.incomplete ? "一部未確認" : moneyU(b.total.value)) + "</em>"); } else card(4, "s4", "計画", "", "まだありません");
    var ms = D.monthly || [];
    if (ms.length) { var lm = ms[ms.length - 1], pb = planBudget(lm.data.plan_version), va = pb ? C.variance(pb, H, [lm.data.month]) : null; card(5, "s5", "月次経営会議", ym(lm.data.month) + "の実績", "予算比 <em>" + (va ? signedMoney(va.diff) + (va.diff != null ? UNIT[0] : "") : "—") + "</em>"); } else card(5, "s5", "月次経営会議", "", "まだありません");
    var qs = D.quarterly || [];
    card(6, "s6", "四半期レビュー", qs.length ? day(qs[qs.length - 1].data.date) : "", qs.length ? "前提を" + qs[qs.length - 1].data.premises.length + "つ点検" : "まだありません");
    return '<section id="overview" class="hero"><h1>' + esc(S.business || "経営の資料") + "</h1>" +
      '<p class="sub">CSOが、渡された資料と会話から作った記録です。数字は記録から計算し、根拠のない数字は「未確認」と表示します。</p>' +
      (issues.length ? '<div class="issues" role="alert"><b>記録に直すところがあります（' + issues.length + "件）</b><ul>" + issues.slice(0, 20).map(function (i) { return "<li>" + esc(i.where) + "：" + esc(i.message) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<ol class="cards">' + cards.join("") + "</ol>" + threads() + "</section>";
  }

  /* ---------- draw ---------- */
  var issues = K.check(D, C);
  function draw() {
    app.innerHTML = overview(issues) + sDirection() + sAnalysis() + sStrategy() + sPlan() + sMonthly() + sQuarterly() +
      '<footer class="foot"><p>この画面は記録の表示です。直したいときはCSOに会話で頼んでください。最終更新 ' + esc((D.generated_at || "").slice(0, 16).replace("T", " ")) + "（UTC）</p></footer>";
    document.getElementById("brand").textContent = (D.settings && D.settings.business) || "経営の資料";
  }
  draw();

  function go(id) {
    var el = document.getElementById(id); if (!el) return;
    var det = el.closest("details"); if (det) det.open = true;
    if (el.tagName === "DETAILS") el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }
  app.addEventListener("click", function (e) {
    var t = e.target.closest("button, a"); if (!t) return;
    if (t.dataset.verKind) { view[t.dataset.verKind] = t.dataset.ver; var y = window.scrollY; draw(); window.scrollTo(0, y); return; }
    if (t.dataset.compare) { compare[t.dataset.compare] = !compare[t.dataset.compare]; var y2 = window.scrollY; draw(); window.scrollTo(0, y2); return; }
    if (t.id === "weak") { var on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", String(on)); document.getElementById("bmc-grid").classList.toggle("weak-only", on); return; }
    if (t.dataset.openVer) {
      e.preventDefault(); view[t.dataset.openVer] = t.dataset.verId; compare[t.dataset.openVer] = true; draw();
      go(t.dataset.goto || ("s" + ({ direction: 1, analysis: 2, strategy: 3, plan: 4 })[t.dataset.openVer])); return;
    }
    var href = t.getAttribute && t.getAttribute("href");
    if (href && href.charAt(0) === "#") { e.preventDefault(); history.replaceState(null, "", href); go(href.slice(1)); }
  });
  document.querySelector(".steps").addEventListener("click", function (e) {
    var a = e.target.closest("a"); if (!a) return; e.preventDefault(); go(a.getAttribute("href").slice(1));
  });
  window.CSO_VIEW = { draw: draw, view: view, compare: compare, issues: issues };
})();
