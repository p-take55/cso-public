/* CSO check — integrity of the record bundle. Browser (window.CSO_CHECK) and Node.js. */
(function (root) {
  "use strict";
  var MARKS = ["fact", "observed", "guess", "unknown", "budget", "actual", "commitment", "decision"];

  function check(bundle, calc) {
    var issues = [];
    function add(code, where, msg) { issues.push({ code: code, where: where, message: msg }); }

    var sources = {};
    (bundle.sources || []).forEach(function (s) { sources[s.id] = s; });

    /* every id across every document, including past versions */
    var allIds = {}, docs = [];
    Object.keys(bundle.versions || {}).forEach(function (kind) {
      (bundle.versions[kind] || []).forEach(function (v) { docs.push({ kind: kind, id: v.id, data: v.data }); });
    });
    (bundle.monthly || []).forEach(function (d) { docs.push({ kind: "cso-monthly", id: d.id, data: d.data }); });
    (bundle.quarterly || []).forEach(function (d) { docs.push({ kind: "cso-quarterly", id: d.id, data: d.data }); });

    docs.forEach(function (doc) {
      var seen = {};
      var items = calc.collect(doc.data, {});
      /* duplicate ids inside one document */
      (function walk(o) {
        if (Array.isArray(o)) return o.forEach(walk);
        if (o && typeof o === "object") {
          if (typeof o.id === "string") {
            if (seen[o.id]) add("duplicate_item_id", doc.kind + "/" + doc.id, "同じ文書の中でid " + o.id + " が重複しています");
            seen[o.id] = true;
          }
          Object.keys(o).forEach(function (k) { walk(o[k]); });
        }
      })(doc.data);
      Object.keys(items).forEach(function (id) { allIds[id] = true; });
    });

    docs.forEach(function (doc) {
      var items = calc.collect(doc.data, {});
      Object.keys(items).forEach(function (id) {
        var it = items[id], where = doc.kind + "/" + doc.id + "#" + id;
        if (it.mark !== undefined && MARKS.indexOf(it.mark) < 0) add("bad_mark", where, "印 " + it.mark + " は使えません");
        if ((it.mark === "fact" || it.mark === "observed") && !(it.evidence && it.evidence.length))
          add("fact_without_evidence", where, "事実・観測に根拠がありません");
        if (it.mark === "observed" && !it.limits) add("observed_without_limits", where, "観測に「まだ言えないこと」がありません");
        if (it.mark === "unknown" && !it.missing) add("unknown_without_missing", where, "未確認に「何が足りないか」がありません");
        if (it.mark === "guess" && !(it.evidence && it.evidence.length) && !it.reason) add("guess_without_reason", where, "推測に理由がありません");
        (it.evidence || []).forEach(function (e) {
          if (!sources[e.source]) add("unknown_source", where, "根拠の材料 " + e.source + " が台帳にありません");
        });
        var links = it.links || {};
        (links.from || []).concat(links.to || []).forEach(function (ref) {
          if (!allIds[ref]) add("broken_link", where, "つながり先 " + ref + " がありません");
        });
        (it.observes || []).forEach(function (ref) {
          var ok = (bundle.versions.strategy || []).some(function (v) { return calc.collect(v.data, {})[ref]; });
          if (!ok) add("broken_observes", where, "観測の対象 " + ref + " が戦略にありません");
        });
      });
    });

    /* current pointers and supersedes chain */
    var cur = (bundle.index && bundle.index.data && bundle.index.data.current) || {};
    Object.keys(cur).forEach(function (kind) {
      var list = bundle.versions[kind] || [];
      var c = list.filter(function (v) { return v.id === cur[kind]; })[0];
      if (!c) { add("missing_current", kind, "目次が指す現在の版 " + cur[kind] + " がありません"); return; }
      var guard = 0, v = c;
      while (v && v.supersedes && guard++ < 100) {
        var prev = list.filter(function (x) { return x.id === v.supersedes; })[0];
        if (!prev) { add("broken_chain", kind + "/" + v.id, "前の版 " + v.supersedes + " がありません"); break; }
        v = prev;
      }
    });
    Object.keys(bundle.versions || {}).forEach(function (kind) {
      var seen = {};
      bundle.versions[kind].forEach(function (v) {
        if (seen[v.id]) add("duplicate_version", kind + "/" + v.id, "同じ版idが2つあります");
        seen[v.id] = true;
      });
    });

    /* strategy rules */
    var st = bundle.current && bundle.current.strategy;
    if (st) {
      var s = st.data;
      if (s.chosen) {
        var t = s.trial;
        if (!t || !t.values || !t.values.weeks || !t.values.hours_per_week || t.values.money_yen == null || !(t.criteria && t.criteria.length))
          add("chosen_without_trial", "cso-strategy/" + st.id, "選んだ候補に、試しの上限と続ける・やめる基準がありません");
      }
    }
    /* plan rules */
    var pl = bundle.current && bundle.current.plan;
    if (pl) pl.data.lines.forEach(function (l) {
      if (l.values.rule === "prior_year_factor" && !(l.links && l.links.from && l.links.from.length))
        add("factor_without_basis", "cso-plan/" + pl.id + "#" + l.id, "係数の根拠がありません");
    });
    /* monthly rules */
    (bundle.monthly || []).forEach(function (d) {
      if ((d.data.decisions || []).length > 3) add("too_many_decisions", "cso-monthly/" + d.id, "決めてほしいことが3つを超えています");
    });
    return issues;
  }

  var api = { check: check };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CSO_CHECK = api;
})(typeof window !== "undefined" ? window : this);
