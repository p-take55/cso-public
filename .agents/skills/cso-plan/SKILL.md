---
name: cso-plan
description: 過去の実績と戦略の試しの約束から、行ごとの予算の作り方を利用者と決めて月次予算を計算し、数年分の数字と前提、毎月見る数字をまとめる。計画と予算を作る・見直すとき、月次会議の日を決めるときに使う。
metadata:
  aachat.headline.ja: "計画と予算"
  aachat.headline.en: "Plan and budget"
  aachat.description.ja: "過去の実績と試しの約束から、月次予算・数年分の数字・毎月見る数字をまとめます。"
  aachat.description.en: "Builds the monthly budget, multi-year figures, and the few numbers to watch each month from past results and trial commitments."
  aachat.discovery.listed: "false"
---

# 計画と予算（④中期経営計画・年度予算）

先に `cso-records` を読む。現在の現状と環境・戦略の版を読んでから始める。

## 予算

1. 予算の期間（開始月と月数）を利用者と決める。年度の始まりは利用者の事業に合わせる。
2. 売上の行は、分析の `lines` と同じ行idを使う。試し中の新しい柱は別の行にする。
3. 行ごとに作り方を利用者と決める。
   - `prior_year_factor`：前年同月の実績×係数。係数の根拠になった分析の項目を `links.from` に入れる（必須）
   - `flat`：毎月同じ金額
   - `manual`：月ごとに入力
4. 試し中の新しい柱は、結果が出るまで既定で0円（`manual` で0）にする。予測で売上を入れない。
5. 前年同月の実績がない月は予算が出ない。その場合は推定せず、`flat` か `manual` に変えることを提案する。
6. 計算は `build` の `summary` に任せる。予算の合計・各月の値は `summary.plan` から写す。

## 数年分の数字

- 1年目は月次予算の合計（自動で計算される）。2年目以降は利用者と決めた月平均（`avg_monthly_yen`）と、その数字が成り立つ前提を書き、`mark: "guess"` にする。
- 年数は利用者に合わせる（1〜5年）。
- ビジョンと食い違う数字にしない。食い違うなら利用者に確かめる。

## 毎月見る数字

1〜5個。売上の行のほか、利用者の時間（本人申告）などビジョンに近づいているかを測る数字を入れてよい。

## 月次会議の日

計画を確定した回の終わりに、月次会議をいつ行うかを利用者に聞く。定期実行（Trigger）の作り方は `cso-review` の「定期実行」に従う。**了承がなければ作らない。**
