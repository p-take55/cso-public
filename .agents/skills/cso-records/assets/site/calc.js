/* CSO calc — the only place numbers are derived.
 * Runs in the browser (window.CSO_CALC) and in Node.js (module.exports).
 * Money is integer yen. Missing values are null and are never estimated. */
(function (root) {
  "use strict";

  function addMonths(ym, n) {
    var y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + "-" + String(m + 1).padStart(2, "0");
  }
  function monthRange(start, count) {
    var out = []; for (var i = 0; i < count; i++) out.push(addMonths(start, i)); return out;
  }
  function monthsFromTo(from, to) {
    var out = [], m = from, guard = 0;
    while (m <= to && guard++ < 1200) { out.push(m); m = addMonths(m, 1); }
    return out;
  }
  function isNum(x) { return typeof x === "number" && isFinite(x); }

  /* Sum that refuses to treat null as zero. */
  function sumN(arr) {
    var v = 0, incomplete = false, any = false;
    arr.forEach(function (x) { if (isNum(x)) { v += x; any = true; } else incomplete = true; });
    return { value: incomplete ? null : v, partial: any ? v : null, incomplete: incomplete };
  }

  /* History of actuals: analysis series + monthly records. Monthly records win. */
  function actualHistory(bundle) {
    var h = {};
    var an = bundle.current && bundle.current.analysis;
    if (an && an.data.series) {
      var s = an.data.series;
      s.months.forEach(function (m, i) {
        Object.keys(s.values).forEach(function (line) {
          (h[m] = h[m] || {})[line] = s.values[line][i];
        });
      });
      Object.keys(s.extra_totals || {}).forEach(function (m) {
        (h[m] = h[m] || {}).__total = s.extra_totals[m];
      });
    }
    (bundle.monthly || []).forEach(function (doc) {
      var d = doc.data; if (!d.actuals) return;
      h[d.month] = h[d.month] || {};
      Object.keys(d.actuals).forEach(function (line) { h[d.month][line] = d.actuals[line]; });
    });
    return h;
  }
  function monthTotal(hm, lineIds) {
    if (!hm) return null;
    if (lineIds.every(function (l) { return isNum(hm[l]); })) {
      return lineIds.reduce(function (s, l) { return s + hm[l]; }, 0);
    }
    return isNum(hm.__total) ? hm.__total : null;
  }

  /* Budget for one plan document. History is used for prior-year rules. */
  function budget(plan, history) {
    var p = plan.data, months = monthRange(p.period.start, p.period.months);
    var lines = p.lines.map(function (line) {
      var key = line.line || line.id;
      var r = line.values, vals = months.map(function (m, i) {
        if (r.rule === "prior_year_factor") {
          var prev = history[addMonths(m, -12)];
          var base = prev ? prev[key] : null;
          return isNum(base) ? Math.round(base * r.factor) : null;
        }
        if (r.rule === "flat") return isNum(r.amount_yen) ? r.amount_yen : null;
        if (r.rule === "manual") return isNum(r.months_yen && r.months_yen[i]) ? r.months_yen[i] : null;
        return null;
      });
      return { id: key, item: line.id, label: line.label, rule: r, months: vals, total: sumN(vals) };
    });
    var totals = months.map(function (m, i) { return sumN(lines.map(function (l) { return l.months[i]; })); });
    return { months: months, lines: lines, totals: totals, total: sumN(totals.map(function (t) { return t.value; })) };
  }

  /* Budget vs actual for given months. */
  function variance(b, history, months) {
    var rows = b.lines.map(function (l) {
      var bud = months.map(function (m) { var i = b.months.indexOf(m); return i < 0 ? null : l.months[i]; });
      var act = months.map(function (m) { return history[m] ? (isNum(history[m][l.id]) ? history[m][l.id] : null) : null; });
      var bs = sumN(bud), as = sumN(act);
      var diff = bs.value != null && as.value != null ? as.value - bs.value : null;
      return { id: l.id, label: l.label, budget: bud, actual: act, budgetTotal: bs, actualTotal: as, diff: diff,
        pct: diff != null && bs.value ? diff / bs.value * 100 : null };
    });
    var bAll = sumN(rows.map(function (r) { return r.budgetTotal.value; }));
    var aAll = sumN(rows.map(function (r) { return r.actualTotal.value; }));
    var monthTotals = months.map(function (m, i) {
      var bt = sumN(rows.map(function (r) { return r.budget[i]; })), at = sumN(rows.map(function (r) { return r.actual[i]; }));
      return { month: m, budget: bt.value, actual: at.value, diff: bt.value != null && at.value != null ? at.value - bt.value : null };
    });
    var diffAll = bAll.value != null && aAll.value != null ? aAll.value - bAll.value : null;
    return { months: months, rows: rows, monthTotals: monthTotals, budgetTotal: bAll, actualTotal: aAll, diff: diffAll,
      pct: diffAll != null && bAll.value ? diffAll / bAll.value * 100 : null };
  }

  /* Analysis metrics over the series. */
  function analysisMetrics(analysis) {
    var s = analysis.data.series, lines = Object.keys(s.values), n = s.months.length;
    var totals = s.months.map(function (m, i) { return sumN(lines.map(function (l) { return s.values[l][i]; })).value; });
    var all = sumN(totals);
    var perLine = lines.map(function (l) {
      var v = s.values[l], t = sumN(v), half = Math.floor(n / 2);
      var h1 = sumN(v.slice(0, half)), h2 = sumN(v.slice(n - half));
      return { id: l, total: t.value, share: t.value != null && all.value ? t.value / all.value * 100 : null,
        h1avg: h1.value != null ? h1.value / half : null, h2avg: h2.value != null ? h2.value / half : null,
        halfGrowth: h1.value && h2.value != null ? (h2.value / h1.value - 1) * 100 : null };
    });
    var yoy = (analysis.data.yoy_months || []).map(function (m) {
      var cur = totals[s.months.indexOf(m)], prevM = addMonths(m, -12);
      var pi = s.months.indexOf(prevM);
      var prev = pi >= 0 ? totals[pi] : (s.extra_totals || {})[prevM];
      return { month: m, current: isNum(cur) ? cur : null, prior: isNum(prev) ? prev : null,
        pct: isNum(cur) && isNum(prev) && prev ? (cur / prev - 1) * 100 : null };
    });
    return { months: s.months, totals: totals, total: all, avg: all.value != null ? all.value / n : null,
      min: all.value != null ? Math.min.apply(null, totals) : null, max: all.value != null ? Math.max.apply(null, totals) : null,
      lines: perLine, yoy: yoy };
  }

  function trialStatus(trial, used) {
    var v = trial.values, hoursLimit = v.weeks * v.hours_per_week;
    return { hoursLimit: hoursLimit, hoursUsed: used && isNum(used.hours_used) ? used.hours_used : null,
      moneyLimit: v.money_yen, moneyUsed: used && isNum(used.money_used_yen) ? used.money_used_yen : null };
  }

  /* Three-year rows: year 1 comes from the plan budget, later years from the stated values. */
  function threeYear(plan, b) {
    var gm = plan.data.gross_margin_pct;
    return plan.data.three_year.map(function (y, i) {
      var annual = i === 0 ? b.total.value : (isNum(y.values.avg_monthly_yen) ? y.values.avg_monthly_yen * 12 : null);
      return { id: y.id, label: y.label, annual: annual, avgMonthly: annual != null ? annual / 12 : null,
        gross: annual != null && isNum(gm) ? Math.round(annual * gm / 100) : null, row: y };
    });
  }

  /* ---------- version diff ---------- */
  function collect(obj, out) {
    if (Array.isArray(obj)) { obj.forEach(function (x) { collect(x, out); }); return out; }
    if (obj && typeof obj === "object") {
      if (typeof obj.id === "string") out[obj.id] = obj;
      Object.keys(obj).forEach(function (k) { collect(obj[k], out); });
    }
    return out;
  }
  function own(o) {
    /* Comparable fields of one item: nested id-bearing objects are replaced by their ids. */
    var r = {};
    Object.keys(o).forEach(function (k) { if (k !== "value_labels") r[k] = strip(o[k]); });
    return r;
  }
  function strip(v) {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === "object") {
      if (typeof v.id === "string") return { ref: v.id };
      var r = {}; Object.keys(v).sort().forEach(function (k) { r[k] = strip(v[k]); }); return r;
    }
    return v;
  }
  function numericChanges(a, b, path, out) {
    if (a == null && b == null) return out;
    if (isNum(a) && isNum(b)) { if (a !== b) out.push({ path: path, from: a, to: b, delta: b - a }); return out; }
    if (Array.isArray(a) && Array.isArray(b) && a.every(isNum) && b.every(isNum)) {
      var len = Math.max(a.length, b.length);
      for (var i = 0; i < len; i++) if (a[i] !== b[i]) out.push({ path: path + "[" + i + "]", from: a[i], to: b[i], delta: isNum(a[i]) && isNum(b[i]) ? b[i] - a[i] : null });
      return out;
    }
    if ((a == null && b && typeof b === "object" && !Array.isArray(b)) || (b == null && a && typeof a === "object" && !Array.isArray(a))) {
      return numericChanges(a || {}, b || {}, path, out);
    }
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a)) {
      Object.keys(Object.assign({}, a, b)).forEach(function (k) { numericChanges(a[k], b[k], path ? path + "." + k : k, out); });
      return out;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: path, from: a === undefined ? null : a, to: b === undefined ? null : b, delta: null });
    return out;
  }
  function diffVersions(oldData, newData) {
    var A = collect(oldData, {}), B = collect(newData, {}), res = { added: [], removed: [], changed: [], byId: {} };
    Object.keys(B).forEach(function (id) {
      if (!A[id]) { res.added.push(id); res.byId[id] = { kind: "added" }; return; }
      var a = own(A[id]), b = own(B[id]);
      if (JSON.stringify(a) === JSON.stringify(b)) return;
      var fields = [];
      ["text", "mark", "label", "name"].forEach(function (k) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) fields.push(k); });
      var evidenceChanged = JSON.stringify(a.evidence) !== JSON.stringify(b.evidence);
      var linksChanged = JSON.stringify(a.links && a.links.from) !== JSON.stringify(b.links && b.links.from);
      var nums = numericChanges(a.values, b.values, "values", []);
      Object.keys(a).forEach(function (k) {
        if (["text", "mark", "label", "name", "values", "evidence", "links"].indexOf(k) >= 0) return;
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k]) && !(b[k] && b[k].ref)) numericChanges(a[k], b[k], k, nums);
      });
      Object.keys(b).forEach(function (k) {
        if (!(k in a) && ["text", "mark", "label", "name", "values", "evidence", "links"].indexOf(k) < 0) nums.push({ path: k, from: null, to: b[k], delta: null });
      });
      var c = { id: id, fields: fields, evidenceChanged: evidenceChanged, linksChanged: linksChanged, values: nums };
      if (fields.length || evidenceChanged || linksChanged || nums.length) { res.changed.push(c); res.byId[id] = { kind: "changed", detail: c }; }
    });
    Object.keys(A).forEach(function (id) { if (!B[id]) { res.removed.push(id); res.byId[id] = { kind: "removed", item: A[id] }; } });
    return res;
  }

  var api = { addMonths: addMonths, monthRange: monthRange, monthsFromTo: monthsFromTo, sumN: sumN,
    actualHistory: actualHistory, monthTotal: monthTotal, budget: budget, variance: variance,
    analysisMetrics: analysisMetrics, trialStatus: trialStatus, threeYear: threeYear,
    collect: collect, diffVersions: diffVersions };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CSO_CALC = api;
})(typeof window !== "undefined" ? window : this);
