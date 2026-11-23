---
name: cso-records
description: CSOの記録（docs/cso-*）の置き場所・形式・版の規則と、記録からHTML資料（html/cso/）を書き出す手順。ミッション・ビジョン・経営方針、分析、戦略、計画、月次会議、四半期レビューのどれかを書く前と、書いた後に必ず使う。
metadata:
  aachat.headline.ja: "経営の記録と資料（CSOの土台）"
  aachat.headline.en: "CSO records and HTML reports"
  aachat.description.ja: "CSOの記録の形・版の規則と、記録からHTML資料を書き出す手順。計算・検査・テンプレート・架空の見本を同梱します。"
  aachat.description.en: "Record format, versioning rules, and the HTML report build for the CSO, with calculation, checks, templates, and fictional samples."
  aachat.discovery.listed: "false"
---

# 経営の記録と資料（土台）

ほかの4つのSkill（`cso-direction`・`cso-strategy`・`cso-plan`・`cso-review`）は、記録を書く前にこのSkillを読む。
このSkillは、記録の置き場所・形式・版の規則・HTMLの書き出しを決める。

## 置き場所

記録は、いま作業しているProjectのrootに置く（DMでも通常のProjectでも同じ）。

```text
<Project root>/docs/cso-index/current.md              目次（現在の版の指し先・設定）
<Project root>/docs/cso-source/<id>.md                材料の台帳（材料1つにつき1文書）
<Project root>/docs/cso-direction/<YYYYMMDD>-<n>.md   ミッション・ビジョン・経営方針
<Project root>/docs/cso-analysis/<YYYYMMDD>-<n>.md    現状と環境
<Project root>/docs/cso-strategy/<YYYYMMDD>-<n>.md    候補・キャンバス・試しの約束
<Project root>/docs/cso-plan/<YYYYMMDD>-<n>.md        計画・予算・毎月見る数字
<Project root>/docs/cso-monthly/<YYYYMM>-r<n>.md      月次会議（対象月ごと）
<Project root>/docs/cso-quarterly/<YYYYMMDD>-<n>.md   四半期レビュー
<Project root>/html/cso/                              書き出したHTML（手で編集しない）
```

`<Project root>` は Session の Workspace 欄にある `aachat/teams/<team>/projects/<project>` 。

## 文書の形

本文は人が読む説明と経緯。末尾に `cso-data` という名前のコードブロックを**ちょうど1つ**置き、JSONで機械が読むデータを書く。

````markdown
---
title: 戦略 2026-12-14
status: final
supersedes: null
changed_by: null
---

（本文：何を決めたか、なぜか、何がまだ分からないか）

```cso-data
{ ... }
```
````

各kindのデータの形は [reference/records.md](reference/records.md) にある。完全な見本は `fixtures/morita/docs/`（物販・架空）と `fixtures/cafe/docs/`（飲食・架空）。**見本の数字や文言を利用者の記録に写さない。**

## 項目と印

判断・事実・数字の項目は `id`（文書をまたいで一意、英小文字・数字・`-`）と `text` と `mark` を持つ。

| mark | 表示 | 必須 |
|---|---|---|
| `fact` | 事実 | `evidence`（台帳の材料idと場所） |
| `observed` | 観測 | `evidence` と `limits`（まだ言えないこと） |
| `guess` | 推測 | `evidence` か `reason` |
| `unknown` | 未確認 | `missing`（何が足りないか） |
| `budget` / `actual` / `commitment` | 予算 / 実績 / 約束 | — |
| `decision` | 決定 | 利用者が決めたこと。`evidence` に会話の材料 |

比べる意味のある値（金額・係数・上限・条件・期限など）は `text` に埋め込まず `values` に入れる。金額は**円の整数**で、キー名を `_yen` で終える。reference/records.md にない値のキーを使うときは、表示名を `value_labels`（例 `{"asia_paid_by": "アジアの関税を払う側"}`）に書く。版の比較でこの名前が表示される。`value_labels` は比較の対象外。

つながりは `links.from`（この項目のもとになった項目id）で書く。`links.to` は、書く時点で**すでに存在する**項目にだけ使う。後で作る項目は、作るときに `links.from` で前の項目を指す。

## 材料が足りないとき

- 材料がない数字は `null` にする。推定・補間・「だいたい」の数字を入れない。会話でも数字を言わない
- 読めなかった部分は台帳の `unread` に書き、項目は `unknown` にする
- 同じ月の数字が2つの材料で違うときは、どちらも採らず、両方の値と出典を利用者に見せて選んでもらう
- 顧客の個人名・メールアドレス・住所・電話番号を記録とHTMLに写さない。件数と、個人が分からない短い言い換えだけにする
- 公開情報を調べられなかった欄は `unknown`。架空の出典を付けない

## 版の規則

- 確定した文書（`status: final`）は**二度と書き換えない**。変えるときは新しい文書を作る
- Sessionの中で利用者の確認前は `status: draft`。確認を得たら `final` にする
- 版idは `YYYYMMDD-<n>`。同じ日の2回目は `-2`。月次は `YYYYMM-r<n>`（訂正は `r2`）。番号は次のコマンドで決める

```bash
node "$AA_AGENT_DIR/.agents/skills/cso-records/scripts/build.mjs" next-id --root <Project root> --kind strategy --date 2027-04-08
node "$AA_AGENT_DIR/.agents/skills/cso-records/scripts/build.mjs" next-id --root <Project root> --kind monthly --month 2027-03
```

- 新しい版の frontmatter に `supersedes:`（前の版id）と `changed_by:`（きっかけの四半期レビューなどのid）を書く。古い版には何も足さない
- どれが現在の版かは目次（`cso-index/current.md`）の `current` だけが持つ。目次は更新し続けてよい唯一の文書
- **月次の観測は戦略の文書に書かない。** 月次記録の `observations` に、`observes: [戦略項目のid]` を付けて書く。戦略を変えるのは四半期レビュー

## 書いた後：検査と書き出し

記録を書いたら毎回、次を実行する。

```bash
node "$AA_AGENT_DIR/.agents/skills/cso-records/scripts/build.mjs" build --root <Project root>
```

- `ok: false` なら `issues` を読み、記録を直して再実行する。直せない問題（材料がないなど）は `unknown` として記録し直す
- `ok: true` の `summary` に計算済みの数字がある。**利用者への返答に書く数字は、この `summary` か HTML から写す。** 自分で暗算しない
- 書き出し先は `html/cso/`。`html/index.html`（ハブ）には「経営の資料（CSO）」へのリンクが1行足される。ハブを置き換えない
- `check` だけなら `build` の代わりに `check`、数字だけなら `summary` を使う

Node.js が使えない環境では `build` できない。その場合は記録だけを書き、「HTMLの書き出しにはNode.jsが必要」と利用者に伝える。

## 利用者への案内

書き出したら返答の最後に、ProjectのHTMLタブ（Pages）から「経営の資料（CSO）」を開けることを1行で伝える。外部向けの共有URLは発行しない（人間の操作）。

## 守る線

値段の変更、外部へのメール送信、支払い、公開はしない。下書きまで。利用者に1回で頼む作業は1つ、決めてもらうことは3つまで。
