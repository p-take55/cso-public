---
name: cso-strategy
description: ミッション・ビジョン・経営方針と現状から、手持ちの力を使った事業の候補を1〜3つ作って比べ、選んだ候補をビジネスモデルキャンバスにし、試しの上限と続ける・直す・やめるの基準を利用者と決める。新しい柱や事業の方向を決めるときに使う。
metadata:
  aachat.headline.ja: "事業戦略と試し"
  aachat.headline.en: "Business strategy and small trials"
  aachat.description.ja: "手持ちの力から事業の候補を作って比べ、ビジネスモデルキャンバスと、試しの上限・判定基準にまとめます。"
  aachat.description.en: "Builds and compares options from existing strengths, then turns the chosen one into a business model canvas with trial limits and decision criteria."
  aachat.discovery.listed: "false"
---

# 戦略と試し（③事業戦略）

先に `cso-records` を読む。現在のミッション・ビジョン・経営方針と、現状と環境の版を読んでから始める。

## 候補を作る

1. 候補は「市場が大きいところ」からではなく、**利用者がすでに持っているもの**（`strengths`、過去の試みで返事をくれた相手、顧客の声）から作る。
2. 候補は1〜3つ。各候補に、比較の行（`compare_rows`：きっかけ・使う手持ち・最初の相手・確かめる前提・始める準備・利用者の時間など）を同じ順で埋める。
3. 各候補の `links.from` に、きっかけになった分析の項目idを入れる。
4. 経営方針に合わない候補は、どの方針に合わないかを比較の行に書く。
5. 利用者の時間とお金の見込みを、比較の行に必ず入れる。

## 利用者が決めること

- どの候補を試すか（`chosen` と `decision`）
- 試しの上限：期間（週）・週あたりの時間・お金（円）。`trial.values`
- 続ける・直す・やめるの基準。数で判定できる形にする（例：8週間で注文2件以上）。`trial.criteria`

上限と基準が決まるまで `chosen` を入れない（検査で止まる）。

## キャンバス

選んだ候補を9つの枠（`segments` 誰に、`value` 何を約束するか、`channels` どう届けるか、`relations` どう付き合うか、`revenue` どう稼ぐか、`resources` 手持ちの力、`activities` やること、`partners` 組む相手、`costs` かかるお金）に分ける。

- すべての項目に印を付ける。確かめていないことは `guess` か `unknown`
- 条件・価格・上限などの値は `values` に入れる（版の比較で差が出るようにする）
- 項目のidは、後の版でも同じものに同じidを使う

## 外部への連絡

試しで顧客や取引先に連絡が必要なら、CSOは下書きを作るだけ。送るのは利用者。値段を決めるのも利用者。

## 版

戦略を変えるのは、原則として四半期レビュー（`cso-review`）。月次の結果は戦略の文書に書き足さない。利用者が月の途中で方向を変えると決めた場合は、新しい版を作り `changed_by` にその決定の月次記録のidを入れる。
