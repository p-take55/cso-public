# 記録の `cso-data` の形

完全な見本は `../fixtures/morita/docs/` と `../fixtures/cafe/docs/`。ここでは必須の形だけを書く。
`id` は文書をまたいで一意にする。印（`mark`）の規則は SKILL.md の表に従う。

## cso-index/current.md

```json
{
  "settings": { "business": "事業の呼び名", "owner": "利用者の呼び名", "unit": "man" },
  "current": { "direction": "20261202-1", "analysis": "20261209-1", "strategy": "20261214-1", "plan": "20261218-1" },
  "next_meeting": { "trigger_id": null, "next_at": null, "note": "毎月5日9時（了承済み）" }
}
```

- `unit`：表示単位。`man`（万円）・`sen`（千円）・`yen`（円）
- `current`：まだない資料のキーは書かない

## cso-source/<id>.md

```json
{ "kind": "月次の売上まとめ（CSV）", "period": { "from": "2025-12", "to": "2026-11" },
  "received": "2026-11-30", "used": ["国内・海外の月別売上"], "unread": [], "privacy": "個人名・連絡先は写していない" }
```

`id` は `src-` で始める。frontmatter の `title` が画面に出る材料名になる。

## cso-direction（ミッション・ビジョン・経営方針）

```json
{ "as_of": "2026-12-02",
  "purpose": { "id": "di-purpose", "text": "…", "mark": "guess", "reason": "CSOの案" },
  "vision": { "horizon": "2029-11", "items": [ { "id": "di-v-1", "text": "…", "mark": "commitment", "values": { } } ] },
  "donts": [ { "id": "di-d-1", "text": "…", "mark": "decision", "values": { "until": null }, "evidence": [ ] } ],
  "owner_hands": [ { "id": "di-o-1", "text": "…", "mark": "decision", "evidence": [ ] } ] }
```

- 画面の見出しは `purpose` がミッション、`vision` がビジョン、`donts` が経営方針、`owner_hands` が本人が行うこと。キー名は前の版と同じ
- `donts` には判断の方針（何を重視して選ぶか）を書く。CSOの権限に関わること（値段・送信・支払い・公開を本人が行う）は `owner_hands` に書く。`owner_hands` は省略してよい

## cso-analysis（現状と環境）

```json
{ "as_of": "2026-12-09",
  "lines": [ { "id": "dom", "label": "国内" } ],
  "series": { "months": ["2025-12", "…"], "values": { "dom": [2150000, "…"] }, "extra_totals": { "2025-09": 3300000 }, "sources": ["src-…"] },
  "yoy_months": ["2026-09"],
  "annotations": [ { "id": "an-…", "from": "2026-09", "to": "2026-10", "text": "本人が何かを変えた期間", "mark": "fact", "evidence": [ ] } ],
  "facts": [ ], "unknowns": [ ],
  "voices": { "period": { "from": "2026-06", "to": "2026-11" }, "source": "src-…", "categories": [ { "id": "an-vo-…", "label": "…", "n": 38, "note": "" } ] },
  "market": [ ], "competitors": [ ], "strengths": [ ] }
```

- `series.values` の各配列は `months` と同じ長さ。材料がない月は `null`
- `extra_totals`：行の内訳はないが合計だけ分かる月（前年同月比に使う）
- `voices` がなければ `null`

## cso-strategy（戦略）

```json
{ "as_of": "2026-12-14",
  "compare_rows": ["きっかけ", "使う手持ち", "確かめる前提", "社長の時間"],
  "candidates": [ { "id": "st-cand-a", "name": "…", "rows": ["…"], "values": { }, "links": { "from": ["an-…"] } } ],
  "chosen": "st-cand-a",
  "decision": { "id": "st-decision", "text": "…", "mark": "decision", "evidence": [ ] },
  "trial": { "id": "st-trial-a", "text": "試しの約束", "mark": "commitment",
    "values": { "weeks": 8, "hours_per_week": 4, "money_yen": 100000, "start": "2026-12-16", "end": "2027-02-10" },
    "criteria": [ { "id": "st-c-go", "kind": "go", "text": "…", "values": { } }, { "id": "st-c-stop", "kind": "stop", "text": "…", "values": { } } ] },
  "canvas": { "candidate": "st-cand-a", "blocks": {
    "segments": [ ], "value": [ ], "channels": [ ], "relations": [ ], "revenue": [ ],
    "resources": [ ], "activities": [ ], "partners": [ ], "costs": [ ] } } }
```

- 候補は1〜3。`rows` は `compare_rows` と同じ順・同じ数
- `chosen` を入れたら `trial`（上限と基準）が必須。`kind` は `go`（続ける）・`fix`（直す）・`stop`（やめる）
- キャンバスの項目は同じidを版をまたいで使い続ける（比較はidで行う）

## cso-plan（計画）

```json
{ "as_of": "2026-12-18", "period": { "start": "2026-12", "months": 12 }, "gross_margin_pct": 38,
  "lines": [
    { "id": "pl-dom", "line": "dom", "label": "国内", "values": { "rule": "prior_year_factor", "factor": 1.0 }, "links": { "from": ["an-…"] } },
    { "id": "pl-new", "line": "new", "label": "新しい柱", "values": { "rule": "manual", "months_yen": [0, 0, "…"] }, "links": { "from": ["st-trial-a"] } },
    { "id": "pl-x", "line": "x", "label": "…", "values": { "rule": "flat", "amount_yen": 500000 } } ],
  "three_year": [ { "id": "pl-y1", "label": "1年目（…）", "mark": "budget", "values": { }, "basis": "月次予算の合計" },
                  { "id": "pl-y2", "label": "2年目（…）", "mark": "guess", "reason": "…", "values": { "avg_monthly_yen": 3650000 }, "basis": "…" } ],
  "kpis": [ { "id": "kpi-…", "label": "…", "target": "…" } ] }
```

- `line` は分析・月次の実績の行idと同じにする
- `prior_year_factor` は前年同月の実績×係数。根拠を `links.from` に必須。前年同月がない月は予算が `null` になる（その場合は `flat` か `manual` を提案する）
- 1年目は月次予算の合計から自動で計算する。2年目以降は `avg_monthly_yen`
- `kpis` は1〜5個。`three_year` は1〜5行

## cso-monthly（月次会議）

```json
{ "month": "2026-12", "meeting_date": "2027-01-06", "plan_version": "20261218-1",
  "actuals": { "dom": 2090000, "ovs": null }, "sources": ["src-…"],
  "gross_margin_pct": 37.5, "kpi_values": { "kpi-…": 70 },
  "notes": [ ], "decisions": [ { "id": "mo-202612-d1", "text": "決めてほしいこと", "mark": "decision", "answer": "利用者が決めたこと（未決なら書かない）", "evidence": [ ] } ],
  "trial": { "values": { "hours_used": 7, "money_used_yen": 8000, "orders": 0 } },
  "observations": [ { "id": "mo-202612-…", "text": "…", "mark": "observed", "observes": ["st-…"], "evidence": [ ], "limits": "…" } ],
  "unexpected": [ ] }
```

- `plan_version`：その月の予算に使った計画の版
- `decisions` は3つまで
- `trial.values` は本人申告。申告がなければ `null`

## cso-quarterly（四半期レビュー）

```json
{ "date": "2027-04-08", "period": { "from": "2026-12", "to": "2027-03" }, "plan_version": "20261218-1",
  "premises": [ { "id": "q1-p1", "title": "前提", "mark": "observed", "text": "観測したこと", "evidence": [ ], "limits": "まだ言えないこと",
                  "next": "次にすること", "links": { "from": ["mo-…"], "to": ["st-…"] } } ],
  "updates": [ { "resource": "strategy", "to": "20270408-1", "summary": "何を変えたか" } ],
  "decision": { "id": "q1-decision", "text": "…", "mark": "decision", "evidence": [ ] } }
```

- `premises[].links.to` には、同じSessionで作った新しい版の項目id（すでに存在するもの）を書ける
