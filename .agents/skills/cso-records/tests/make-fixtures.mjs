#!/usr/bin/env node
// Regenerates fixtures/morita and fixtures/cafe (fictional businesses) as record documents.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "..", "fixtures");
const man = (x) => Math.round(x * 10000);

function doc(root, kind, id, fm, body, data) {
  const dir = path.join(root, "docs", kind);
  fs.mkdirSync(dir, { recursive: true });
  const head = Object.entries(fm).map(([k, v]) => `${k}: ${v === null ? "null" : v}`).join("\n");
  fs.writeFileSync(path.join(dir, id + ".md"), `---\n${head}\n---\n\n${body}\n\n\`\`\`cso-data\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`);
}
const ev = (source, where) => [{ source, where }];

/* ===================== Morita (retail, fictional) ===================== */
function morita() {
  const R = path.join(FIX, "morita");
  fs.rmSync(R, { recursive: true, force: true });
  const fm = (title, extra = {}) => ({ title, status: "final", ...extra });

  // sources
  const src = [
    ["src-monthly-summary", "月次のまとめ 2025年12月〜2026年11月", { kind: "月次の売上まとめ（CSV）", period: { from: "2025-12", to: "2026-11" }, received: "2026-11-30", used: ["国内・海外の月別売上"], unread: [] }],
    ["src-prior-year", "前年9〜10月の月商", { kind: "会計の月次（PDF）", period: { from: "2025-09", to: "2025-10" }, received: "2026-11-30", used: ["月商の合計のみ"], unread: ["国内・海外の内訳"] }],
    ["src-inquiries-6m", "問い合わせ 2026年6月〜11月", { kind: "問い合わせ記録（テキスト）", period: { from: "2026-06", to: "2026-11" }, received: "2026-12-07", used: ["件名と本文の分類"], unread: [], privacy: "個人名・連絡先は写していない" }],
    ["src-wholesale-mail", "8月の卸のメール", { kind: "メールの書き出し", period: { from: "2026-08", to: "2026-08" }, received: "2026-12-07", used: ["返事の件数", "サンプル希望の店の規模と断念理由"], unread: [] }],
    ["src-conv-1202", "12月2日の会話", { kind: "会話", period: { from: "2026-12-02", to: "2026-12-02" }, received: "2026-12-02", used: ["本人の言葉"], unread: [] }],
    ["src-mall-202612", "12月の明細", { kind: "モールと自社ECの明細（CSV）", period: { from: "2026-12", to: "2026-12" }, received: "2027-01-05", used: ["国内・海外の売上", "3本セットの件数"], unread: ["モールの新形式の手数料列"] }],
    ["src-mall-202701", "1月の明細", { kind: "明細（CSV）", period: { from: "2027-01", to: "2027-01" }, received: "2027-02-03", used: ["売上"], unread: [] }],
    ["src-mall-202702", "2月の明細", { kind: "明細（CSV）", period: { from: "2027-02", to: "2027-02" }, received: "2027-03-03", used: ["売上"], unread: [] }],
    ["src-mall-202703", "3月の明細", { kind: "明細（CSV）", period: { from: "2027-03", to: "2027-03" }, received: "2027-04-06", used: ["売上"], unread: [] }],
    ["src-ws-orders", "少量卸の注文記録", { kind: "注文メール", period: { from: "2027-01", to: "2027-03" }, received: "2027-04-06", used: ["国・本数・金額"], unread: [] }],
    ["src-trial-log", "試しの記録（本人申告）", { kind: "本人申告", period: { from: "2026-12-16", to: "2027-02-10" }, received: "2027-03-04", used: ["使った時間とお金"], unread: [] }],
  ];
  for (const [id, title, data] of src) doc(R, "cso-source", id, { title, status: "final" }, `材料：${title}。`, data);

  // index
  doc(R, "cso-index", "current", { title: "CSOの目次" }, "各資料の現在の版を指す目次。", {
    settings: { business: "森田商店（架空）", owner: "森田さん", unit: "man" },
    current: { direction: "20270408-1", analysis: "20261209-1", strategy: "20270408-1", plan: "20270408-1" },
    next_meeting: null,
  });

  // direction v1, v2
  const dirBase = (extraDonts) => ({
    as_of: null,
    purpose: { id: "di-purpose", text: "日本の台所道具を、ちゃんと使い続けられる形で届ける", mark: "guess", reason: "CSOの案。本人は受け入れたが文言は固めていない" },
    vision: { horizon: "2029-11", items: [
      { id: "di-v-sales", text: "月商は今と同じか、やや上", mark: "commitment", values: { avg_monthly_max_yen: man(380) } },
      { id: "di-v-off", text: "平日に倉庫にいない日が週1日ある", mark: "commitment", values: { days_per_week: 1 } },
      { id: "di-v-trip", text: "年に1回、3日の旅行中も注文と問い合わせが止まらない", mark: "commitment", values: { days: 3 } },
    ] },
    donts: [
      { id: "di-d-hire", text: "増員せずに運営できる事業と計画を選ぶ", mark: "decision", values: { until: null }, evidence: ev("src-conv-1202", "本人の発言") },
      { id: "di-d-double", text: "月商を倍にする計画ではなく、今の規模で続けられる計画を選ぶ", mark: "decision", values: { until: null }, evidence: ev("src-conv-1202", "本人の発言") },
      ...extraDonts,
    ],
    owner_hands: [
      { id: "di-d-hands", text: "値段の変更・メール送信・支払い・公開は社長が自分で行う", mark: "decision", evidence: ev("src-conv-1202", "本人の発言") },
    ],
  });
  const d1 = dirBase([]); d1.as_of = "2026-12-02";
  doc(R, "cso-direction", "20261202-1", fm("ミッション・ビジョン・経営方針 2026-12-02"), "ミッション・ビジョン・経営方針。", d1);
  const d2 = dirBase([{ id: "di-d-pages", text: "商品ページを量産せず、今あるページで売る", mark: "decision", values: { until: "2027-07" }, evidence: ev("src-mall-202703", "12〜3月の国内売上"), links: { from: ["q1-p3"] } }]);
  d2.as_of = "2027-04-08";
  doc(R, "cso-direction", "20270408-1", fm("ミッション・ビジョン・経営方針 2027-04-08", { supersedes: "20261202-1", changed_by: "20270408-1" }), "四半期レビューで、経営方針に期限付きで1つ追加。", d2);

  // analysis
  const months = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
  const dom = [215, 200, 195, 215, 210, 220, 212, 218, 205, 200, 197, 220].map(man);
  const ovs = [150, 120, 115, 130, 128, 135, 130, 140, 135, 135, 135, 175].map(man);
  doc(R, "cso-analysis", "20261209-1", fm("現状と環境 2026-12-09"), "市場・競合・自社を1枚に。", {
    as_of: "2026-12-09",
    lines: [{ id: "dom", label: "国内" }, { id: "ovs", label: "海外" }],
    series: { months, values: { dom, ovs }, extra_totals: { "2025-09": man(330), "2025-10": man(340) }, sources: ["src-monthly-summary", "src-prior-year"] },
    yoy_months: ["2026-09", "2026-10"],
    annotations: [{ id: "an-pages-period", from: "2026-09", to: "2026-10", text: "商品ページを40増やした期間", mark: "fact", evidence: ev("src-conv-1202", "本人の発言") }],
    facts: [
      { id: "an-ovs-growth", text: "海外は直近6か月で前の6か月より伸びている", mark: "fact", evidence: ev("src-monthly-summary", "海外の列"), values: { metric: "half_growth", line: "ovs" } },
      { id: "an-dom-flat", text: "国内は前年並みで推移", mark: "fact", evidence: ev("src-monthly-summary", "国内の列") },
      { id: "an-pages", text: "9〜10月に商品ページを40増やしたが、月商は前年同月比±3%以内", mark: "fact", evidence: [{ source: "src-monthly-summary", where: "9〜10月" }, { source: "src-prior-year", where: "前年9〜10月" }], limits: "", note: "ページが効いていないのか、ほかの要因と打ち消し合ったのかは、この数字だけでは分からない" },
      { id: "an-ws-mail", text: "8月の卸：120社に連絡、返事9件、サンプル希望2件。2件とも席数30前後の店で、50本の最小注文で断念", mark: "fact", evidence: ev("src-wholesale-mail", "返信一覧"), values: { contacted: 120, replies: 9, samples: 2, moq: 50, seats: 30 } },
    ],
    unknowns: [
      { id: "an-u-small", text: "小さな店なら10本以下で買うかもしれない", mark: "guess", evidence: ev("src-wholesale-mail", "断念理由") },
      { id: "an-u-price", text: "返事をくれた9社が、何本・いくらなら買うか", mark: "unknown", missing: "9社への条件の確認" },
      { id: "an-u-tariff", text: "関税が国ごとにどれだけ障害になるか", mark: "unknown", missing: "国別の関税条件の確認" },
    ],
    voices: { period: { from: "2026-06", to: "2026-11" }, source: "src-inquiries-6m", categories: [
      { id: "an-vo-rust", label: "鉄のフライパンの錆び・手入れ", n: 38, note: "国内24・海外14" },
      { id: "an-vo-ship", label: "配送・関税", n: 31, note: "ほぼ海外" },
      { id: "an-vo-set", label: "何本セットを買えばよいか", n: 27, note: "海外19・国内8" },
      { id: "an-vo-sharp", label: "包丁の研ぎ", n: 14, note: "" },
      { id: "an-vo-other", label: "その他", n: 32, note: "" },
    ] },
    market: [{ id: "an-mk-none", text: "市場はまだ調べていません", mark: "unknown", missing: "公開情報の調査（出典と調べた日付を付ける）" }],
    competitors: [{ id: "an-cp-types", text: "大手モールの専門店／個人の輸出出品者／現地の輸入卸（型のみ）", mark: "unknown", missing: "具体的な店名・価格の調査" }],
    strengths: [
      { id: "an-st-sales", text: "15年の法人営業", mark: "fact", evidence: ev("src-conv-1202", "本人の経歴") },
      { id: "an-st-9", text: "卸のときに返事をくれた9社", mark: "fact", evidence: ev("src-wholesale-mail", "返信一覧") },
      { id: "an-st-ship", text: "海外発送の手順と経験", mark: "fact", evidence: ev("src-monthly-summary", "海外売上") },
    ],
  });

  // strategy v1, v2
  const stBase = (v2) => ({
    as_of: v2 ? "2027-04-08" : "2026-12-14",
    compare_rows: ["きっかけ", "使う手持ち", "最初の相手", "確かめる前提", "始める準備", "社長の時間"],
    candidates: [
      { id: "st-cand-a", name: "小さな店向けの少量卸", rows: ["サンプル希望の2社が最小注文50本で断念", "返事をくれた9社、今の海外発送", "返事をくれた9社", "小さな店は10本以下なら買う", "英語のメール下書きだけ", "週4時間に収まる見込み"],
        values: { min_pieces: 6, hours_per_week_estimate: 4 }, links: { from: ["an-ws-mail"] } },
      { id: "st-cand-b", name: "鉄のフライパンの手入れ込みセット", rows: ["錆び・手入れの相談が最多", "仕入れ先、国内発送", "錆びの相談をくれた国内のお客さん", "手入れ用品込みなら高くても買う", "仕入れ先との相談、ページ作り", "最初の2週は週6時間超の見込み"],
        values: { hours_per_week_estimate: 6 }, links: { from: ["an-vo-rust"] } },
    ],
    chosen: "st-cand-a",
    decision: { id: "st-decision", text: "候補Aを試す。「前回の9社にもう一度連絡するだけなら、週4時間で済む」", mark: "decision", evidence: ev("src-conv-1202", "12月14日の会話"), values: { date: "2026-12-14" } },
    trial: { id: "st-trial-a", text: "試しの約束", mark: "commitment",
      values: { weeks: 8, hours_per_week: 4, money_yen: 100000, start: "2026-12-16", end: "2027-02-10" },
      criteria: [
        { id: "st-c-go", kind: "go", text: "8週間で注文2件以上", values: { orders_min: 2 } },
        { id: "st-c-fix", kind: "fix", text: "注文はないが、数量や条件の具体的な質問が3件以上", values: { questions_min: 3 } },
        { id: "st-c-stop", kind: "stop", text: "どちらもない。分かったことを記録してやめる", values: {} },
      ], links: { from: ["an-pages"] } },
    canvas: { candidate: "st-cand-a", blocks: {
      partners: [
        { id: "st-a-partner-sup", text: "今の仕入れ先", mark: "fact", evidence: ev("src-conv-1202", "取引3年") },
        ...(v2 ? [{ id: "st-a-partner-engrave", text: "仕入れ先は名入れに対応できる（1本あたり追加費用あり）", mark: "fact", evidence: ev("src-ws-orders", "2月の電話メモ"), links: { from: ["q1-p4"] } }] : []),
      ],
      activities: [{ id: "st-a-act", text: "見積もり・発送・請求", mark: "fact", evidence: ev("src-conv-1202", "今の発送手順") }],
      resources: [{ id: "st-a-res-9", text: "返事をくれた9社", mark: "fact", evidence: ev("src-wholesale-mail", "返信一覧") }],
      value: [
        { id: "st-a-value", text: "6本から買える日本の包丁", mark: "guess", evidence: ev("src-wholesale-mail", "断念理由") },
        ...(v2 ? [{ id: "st-a-value-engrave", text: "名入れも選べる", mark: "guess", reason: "2月に質問1件だけ", links: { from: ["q1-p4"] } }] : []),
      ],
      relations: [{ id: "st-a-rel", text: "社長がメールで直接やりとり", mark: "fact", evidence: ev("src-conv-1202", "本人の方針") }],
      channels: [{ id: "st-a-ch", text: "今の海外発送の手順をそのまま使う", mark: "fact", evidence: ev("src-monthly-summary", "海外売上") }],
      segments: [v2
        ? { id: "st-a-segment", text: "席数30前後のアジアの小さな店（シンガポール・台湾）", mark: "observed", evidence: ev("src-ws-orders", "3件の注文"), limits: "一度返事をくれた店だけ・3件", values: { seats_max: 30, region: "asia" }, links: { from: ["an-ws-mail", "q1-p1", "q1-p2"] } }
        : { id: "st-a-segment", text: "席数30前後の海外の小さな店", mark: "guess", evidence: ev("src-wholesale-mail", "サンプル希望の2社"), values: { seats_max: 30, region: "overseas" }, links: { from: ["an-ws-mail"] } }],
      costs: [{ id: "st-a-cost", text: "試しの上限は8週間で10万円", mark: "commitment", values: { money_yen: 100000 } }],
      revenue: [v2
        ? { id: "st-a-revenue", text: "1本9,000円・送料別で3件成約", mark: "observed", evidence: ev("src-ws-orders", "1〜3月"), limits: "3件のみ", values: { unit_price_yen: 9000, orders: 3 }, links: { from: ["q1-p1"] } }
        : { id: "st-a-revenue", text: "1本あたりの卸価格（送料は別）", mark: "unknown", missing: "価格は社長が決める", values: { unit_price_yen: null } }],
    } },
  });
  doc(R, "cso-strategy", "20261214-1", fm("戦略 2026-12-14"), "候補の比較と、選んだ候補のキャンバス。", stBase(false));
  doc(R, "cso-strategy", "20270408-1", fm("戦略 2027-04-08", { supersedes: "20261214-1", changed_by: "20270408-1" }), "四半期レビューで「誰に」と「どう稼ぐか」を観測に基づき更新。", stBase(true));

  // plan v1, v2
  const plBase = (ws) => ({
    as_of: null,
    period: { start: "2026-12", months: 12 },
    gross_margin_pct: 38,
    lines: [
      { id: "pl-dom", line: "dom", label: "国内", values: { rule: "prior_year_factor", factor: 1.0 }, links: { from: ["an-dom-flat"] } },
      { id: "pl-ovs", line: "ovs", label: "海外", values: { rule: "prior_year_factor", factor: 1.1 }, links: { from: ["an-ovs-growth"] } },
      { id: "pl-ws", line: "ws", label: "少量卸", values: { rule: "manual", months_yen: ws }, links: { from: ws.some(Boolean) ? ["q1-p1"] : ["st-trial-a"] } },
    ],
    three_year: [
      { id: "pl-y1", label: "1年目（2026年12月〜2027年11月）", mark: "budget", values: {}, basis: "月次予算の合計" },
      { id: "pl-y2", label: "2年目（2027年12月〜2028年11月）", mark: "guess", reason: "少量卸が続いていれば", values: { avg_monthly_yen: man(365) }, basis: "少量卸が試しを経て続いていれば" },
      { id: "pl-y3", label: "3年目（2028年12月〜2029年11月）", mark: "guess", reason: "手伝いの方の勤務日を相談で増やせれば", values: { avg_monthly_yen: man(380) }, basis: "手伝いの方の勤務日を相談で1日増やせれば（人は雇わない）" },
    ],
    kpis: [
      { id: "kpi-dom", label: "国内売上", target: "予算との差" },
      { id: "kpi-ovs", label: "海外売上", target: "予算との差" },
      { id: "kpi-gm", label: "粗利率", target: "38%" },
      { id: "kpi-ws", label: "少量卸の問い合わせと注文", target: "件数" },
      { id: "kpi-evening", label: "夕方の確認時間", target: "1日の分（本人申告）" },
    ],
  });
  const p1 = plBase([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); p1.as_of = "2026-12-18";
  const p2 = plBase([0, 0, 0, 0, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000]); p2.as_of = "2027-04-08";
  doc(R, "cso-plan", "20261218-1", fm("計画 2026-12-18"), "3年の数字、来期の月次予算、毎月見る数字。", p1);
  doc(R, "cso-plan", "20270408-1", fm("計画 2027-04-08", { supersedes: "20261218-1", changed_by: "20270408-1" }), "少量卸の行に4〜11月の月6万円。", p2);

  // monthly
  const mo = (month, date, act, extra) => doc(R, "cso-monthly", month.replace("-", "") + "-r1", fm("月次会議 " + month), "月次経営会議の記録。", {
    month, meeting_date: date, plan_version: "20261218-1", actuals: act.actuals, sources: act.sources,
    gross_margin_pct: act.gm, kpi_values: act.kpi, ...extra,
  });
  mo("2026-12", "2027-01-06", { actuals: { dom: man(209), ovs: man(193), ws: 0 }, sources: ["src-mall-202612"], gm: 37.5, kpi: { "kpi-evening": 70, "kpi-ws": "3件 / 0件" } }, {
    notes: [
      { id: "mo-202612-set", text: "海外の増加の大半は包丁3本セットの注文が前年同月の41件から63件に増えたことによる", mark: "fact", evidence: ev("src-mall-202612", "商品別の件数"), values: { from: 41, to: 63 } },
      { id: "mo-202612-dom", text: "国内の減少の理由は分からない", mark: "unknown", missing: "モールの新形式の明細で読めない列がある" },
    ],
    decisions: [
      { id: "mo-202612-d1", text: "8本の見積もり依頼に価格を出すか", mark: "decision", answer: "自分で計算し直し、1本9,000円・送料別で回答する", evidence: ev("src-mall-202612", "会議メモ") },
      { id: "mo-202612-d2", text: "3本セットの発注をいつにするか", mark: "decision", answer: "1月8日に社長が発注する", evidence: ev("src-mall-202612", "会議メモ") },
      { id: "mo-202612-d3", text: "読めなかった列をどうするか", mark: "decision", answer: "CSOが対応表を作り、社長が1月分で確かめる", evidence: ev("src-mall-202612", "会議メモ") },
    ],
    trial: { values: { hours_used: 7, money_used_yen: 8000, contacted: 9, replies: 3, orders: 0 } },
    observations: [],
  });
  mo("2027-01", "2027-02-04", { actuals: { dom: man(196), ovs: man(136), ws: 72000 }, sources: ["src-mall-202701", "src-ws-orders"], gm: 38.2, kpi: { "kpi-evening": 68, "kpi-ws": "2件 / 1件" } }, {
    notes: [], decisions: [{ id: "mo-202701-d1", text: "名入れの質問にどう対応するか", mark: "decision", answer: "社長が仕入れ先に聞く", evidence: ev("src-ws-orders", "2月の質問") }],
    trial: { values: { hours_used: 18, money_used_yen: 41000, orders: 1 } },
    observations: [{ id: "mo-202701-ws-order", text: "シンガポールの1店が8本を注文（7.2万円）", mark: "observed", observes: ["st-a-segment", "st-a-revenue"], evidence: ev("src-ws-orders", "1月の注文"), limits: "1件のみ。一度返事をくれた店" }],
    unexpected: [{ id: "mo-202701-engrave", text: "店の名前を刃に入れられないかという質問", mark: "fact", evidence: ev("src-ws-orders", "1月の質問") }],
  });
  mo("2027-02", "2027-03-04", { actuals: { dom: man(190), ovs: man(124), ws: 54000 }, sources: ["src-mall-202702", "src-ws-orders", "src-trial-log"], gm: 37.9, kpi: { "kpi-evening": 62, "kpi-ws": "2件 / 1件" } }, {
    notes: [{ id: "mo-202702-trial-end", text: "8週間の試しが終了。注文2件で基準は「続ける」", mark: "fact", evidence: ev("src-trial-log", "2月10日時点"), values: { orders: 2 } }],
    decisions: [{ id: "mo-202702-d1", text: "試しを続けるか", mark: "decision", answer: "上限を据え置き、名入れを選べる形でもう一度連絡する", evidence: ev("src-trial-log", "会議メモ") }],
    trial: { values: { hours_used: 29, money_used_yen: 62000, orders: 2 } },
    observations: [{ id: "mo-202702-ws-order", text: "台湾の1店が6本を注文（5.4万円）", mark: "observed", observes: ["st-a-segment", "st-a-revenue"], evidence: ev("src-ws-orders", "2月の注文"), limits: "1件のみ" }],
  });
  mo("2027-03", "2027-04-08", { actuals: { dom: man(213), ovs: man(147), ws: 63000 }, sources: ["src-mall-202703", "src-ws-orders"], gm: 38.4, kpi: { "kpi-evening": 55, "kpi-ws": "1件 / 1件" } }, {
    notes: [], decisions: [],
    observations: [
      { id: "mo-202703-ws-order", text: "シンガポールの1店が7本を注文（6.3万円）", mark: "observed", observes: ["st-a-segment", "st-a-revenue"], evidence: ev("src-ws-orders", "3月の注文"), limits: "1件のみ" },
      { id: "mo-202703-us", text: "アメリカの1店が関税を理由に見送り", mark: "observed", observes: ["st-a-segment"], evidence: ev("src-ws-orders", "3月の返信"), limits: "アメリカは1店だけ" },
    ],
  });

  // quarterly
  doc(R, "cso-quarterly", "20270408-1", fm("四半期レビュー 2027-04-08"), "前提の点検と、戦略・計画・経営方針の更新。", {
    date: "2027-04-08", period: { from: "2026-12", to: "2027-03" }, plan_version: "20261218-1",
    premises: [
      { id: "q1-p1", title: "小さな店は10本以下なら買う", mark: "observed", text: "連絡した9社のうち3店が注文。8本・6本・7本", evidence: ev("src-ws-orders", "1〜3月"), limits: "相手は一度返事をくれた店だけで、件数も3件", next: "初めて連絡する店10社に、同じ条件で試す", values: { orders: 3, avg_pieces: 7 }, links: { from: ["mo-202701-ws-order", "mo-202702-ws-order", "mo-202703-ws-order"], to: ["st-a-segment", "st-a-revenue", "pl-ws"] } },
      { id: "q1-p2", title: "関税が障害になる", mark: "observed", text: "注文した3店は関税を理由に断らなかった。見送ったのはアメリカの1店", evidence: ev("src-ws-orders", "3月の返信"), limits: "アメリカは1店だけ。国の違いが理由かは分からない", next: "アメリカ向けは関税の条件を確かめるまで止める", links: { from: ["mo-202703-us"], to: ["st-a-segment"] } },
      { id: "q1-p3", title: "商品ページを増やせば売上が増える", mark: "observed", text: "量産を止めた12〜3月、合計は予算を上回ったが、国内は予算を下回った", evidence: ev("src-mall-202703", "12〜3月"), limits: "国内の予算割れがページを止めたせいかは分からない", next: "「量産しない」は7月の見直しまでの期限付きにする", links: { from: ["an-pages"], to: ["di-d-pages"] } },
      { id: "q1-p4", title: "名入れに需要がある", mark: "observed", text: "質問1件。仕入れ先は対応できる", evidence: ev("src-ws-orders", "2月の電話メモ"), limits: "需要があるかは分からない", next: "次の10社への案内に添えて反応を見る", links: { from: ["mo-202701-engrave"], to: ["st-a-value-engrave", "st-a-partner-engrave"] } },
    ],
    updates: [
      { resource: "strategy", to: "20270408-1", summary: "「誰に」をアジアの小さな店へ。価格の観測を追記。名入れを推測として追加" },
      { resource: "plan", to: "20270408-1", summary: "少量卸の行に4〜11月の月6万円" },
      { resource: "direction", to: "20270408-1", summary: "経営方針に「商品ページを量産せず、今あるページで売る（7月まで）」" },
    ],
    decision: { id: "q1-decision", text: "アメリカ向けは止める。卸の試しはアジアの店に絞って続ける", mark: "decision", evidence: ev("src-ws-orders", "会議メモ") },
  });
}

/* ===================== Cafe (restaurant, fictional) ===================== */
function cafe() {
  const R = path.join(FIX, "cafe");
  fs.rmSync(R, { recursive: true, force: true });
  const fm = (title, extra = {}) => ({ title, status: "final", ...extra });
  const k = (x) => x * 1000;
  doc(R, "cso-source", "src-pos-fy25", { title: "レジの月次 2025年4月〜2026年3月" }, "材料", { kind: "レジの書き出し（CSV）", period: { from: "2025-04", to: "2026-03" }, received: "2026-04-02", used: ["店内・テイクアウトの売上"], unread: [] });
  doc(R, "cso-source", "src-pos-2604", { title: "4月のレジ" }, "材料", { kind: "レジの書き出し（CSV）", period: { from: "2026-04", to: "2026-04" }, received: "2026-05-02", used: ["売上"], unread: [] });
  doc(R, "cso-source", "src-pos-2605", { title: "5月のレジ（一部）" }, "材料", { kind: "レジの書き出し（CSV）", period: { from: "2026-05", to: "2026-05" }, received: "2026-06-02", used: ["テイクアウトの売上"], unread: ["店内の売上（端末の故障で欠落）"] });
  doc(R, "cso-source", "src-talk", { title: "店主との会話" }, "材料", { kind: "会話", period: { from: "2026-04-01", to: "2026-04-01" }, received: "2026-04-01", used: ["本人の言葉"], unread: [] });
  doc(R, "cso-index", "current", { title: "CSOの目次" }, "目次", {
    settings: { business: "喫茶こもれび（架空）", owner: "店主", unit: "sen" },
    current: { direction: "20260401-1", analysis: "20260401-1", strategy: "20260401-1", plan: "20260401-1" }, next_meeting: null,
  });
  doc(R, "cso-direction", "20260401-1", fm("ミッション・ビジョン・経営方針"), "ミッション・ビジョン・経営方針", {
    as_of: "2026-04-01",
    purpose: { id: "c-purpose", text: "近所の人が毎日寄れる喫茶店", mark: "decision", evidence: ev("src-talk", "店主の言葉") },
    vision: { horizon: "2028-03", items: [{ id: "c-v1", text: "2店目を出せる資金を貯める", mark: "commitment", values: { savings_target_yen: 8000000 } }] },
    donts: [{ id: "c-d1", text: "深夜営業をせずに続けられる店にする", mark: "decision", values: { until: null }, evidence: ev("src-talk", "店主の言葉") }],
  });
  const months = ["2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  doc(R, "cso-analysis", "20260401-1", fm("現状と環境"), "現状", {
    as_of: "2026-04-01", lines: [{ id: "in", label: "店内" }, { id: "to", label: "テイクアウト" }],
    series: { months, values: {
      in: [1700, 1720, 1650, 1600, 1550, 1700, 1800, 1750, 1900, 1500, 1550, 1750].map(k),
      to: [300, 320, 310, 350, 380, 330, 320, 310, 400, 290, 300, 340].map(k) }, extra_totals: {}, sources: ["src-pos-fy25"] },
    yoy_months: [], annotations: [],
    facts: [{ id: "c-an-to", text: "テイクアウトは昼の時間帯に多い", mark: "fact", evidence: ev("src-pos-fy25", "時間帯別") }],
    unknowns: [], voices: null, market: [], competitors: [], strengths: [],
  });
  doc(R, "cso-strategy", "20260401-1", fm("戦略"), "戦略", {
    as_of: "2026-04-01", compare_rows: ["きっかけ", "確かめる前提"],
    candidates: [{ id: "c-cand", name: "朝のテイクアウト", rows: ["昼のテイクアウトが伸びている", "朝も通勤客が買う"], values: { open_hour: 7 }, links: { from: ["c-an-to"] } }],
    chosen: "c-cand",
    decision: { id: "c-decision", text: "朝7時から4週間試す", mark: "decision", evidence: ev("src-talk", "会話") },
    trial: { id: "c-trial", text: "試しの約束", mark: "commitment", values: { weeks: 4, hours_per_week: 5, money_yen: 50000, start: "2026-04-06", end: "2026-05-03" },
      criteria: [{ id: "c-go", kind: "go", text: "朝の売上が1日1万円以上", values: { daily_yen_min: 10000 } }, { id: "c-stop", kind: "stop", text: "届かなければやめる", values: {} }] },
    canvas: { candidate: "c-cand", blocks: {
      segments: [{ id: "c-seg", text: "駅へ向かう通勤客", mark: "guess", reason: "昼の客層から" }],
      value: [{ id: "c-val", text: "5分で受け取れる朝のコーヒーとパン", mark: "guess", reason: "店主の案" }],
      channels: [], relations: [], revenue: [{ id: "c-rev", text: "1杯450円", mark: "decision", evidence: ev("src-talk", "店主の決定"), values: { price_yen: 450 } }],
      resources: [], activities: [], partners: [], costs: [{ id: "c-cost", text: "上限5万円", mark: "commitment", values: { money_yen: 50000 } }] } },
  });
  doc(R, "cso-plan", "20260401-1", fm("計画"), "計画", {
    as_of: "2026-04-01", period: { start: "2026-04", months: 12 }, gross_margin_pct: 65,
    lines: [
      { id: "c-pl-in", line: "in", label: "店内", values: { rule: "flat", amount_yen: 1800000 }, links: { from: ["c-an-to"] } },
      { id: "c-pl-to", line: "to", label: "テイクアウト", values: { rule: "prior_year_factor", factor: 1.2 }, links: { from: ["c-an-to"] } },
    ],
    three_year: [
      { id: "c-y1", label: "1年目（2026年4月〜2027年3月）", mark: "budget", values: {}, basis: "月次予算の合計" },
      { id: "c-y2", label: "2年目（2027年4月〜2028年3月）", mark: "guess", reason: "朝の営業が続けば", values: { avg_monthly_yen: 2300000 }, basis: "朝の営業が続けば" },
    ],
    kpis: [{ id: "c-kpi-guests", label: "客数", target: "1日80人" }, { id: "c-kpi-cost", label: "原価率", target: "35%以下" }],
  });
  doc(R, "cso-monthly", "202604-r1", fm("月次会議 2026-04"), "月次", {
    month: "2026-04", meeting_date: "2026-05-02", plan_version: "20260401-1", actuals: { in: 1750000, to: 410000 }, sources: ["src-pos-2604"],
    notes: [], decisions: [], observations: [{ id: "c-mo-04", text: "朝の売上は1日平均8千円", mark: "observed", observes: ["c-seg"], evidence: ev("src-pos-2604", "朝の時間帯"), limits: "4週間・平日のみ" }],
  });
  doc(R, "cso-monthly", "202605-r1", fm("月次会議 2026-05"), "月次", {
    month: "2026-05", meeting_date: "2026-06-02", plan_version: "20260401-1", actuals: { in: null, to: 395000 }, sources: ["src-pos-2605"],
    notes: [{ id: "c-mo-05-in", text: "店内の売上は端末の故障で取れていない", mark: "unknown", missing: "店内売上の記録（手書き伝票など）" }], decisions: [], observations: [],
  });
}

morita();
cafe();
console.log("fixtures written to", FIX);
