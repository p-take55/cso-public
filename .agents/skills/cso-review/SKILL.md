---
name: cso-review
description: 月次経営会議（予算と実績の差、差の内訳、試しの進み具合、決めてほしいこと3つまで）と、四半期レビュー（前提の点検と、戦略・計画・経営方針の新しい版づくり）を行う。月次会議の定期実行の設定もこのSkillで扱う。
metadata:
  aachat.headline.ja: "月次経営会議と四半期レビュー"
  aachat.headline.en: "Monthly review and quarterly review"
  aachat.description.ja: "予算と実績の差と決めることを月次でまとめ、四半期ごとに前提を点検して戦略・計画の新しい版を作ります。"
  aachat.description.en: "Prepares the monthly budget-versus-actual meeting and the quarterly check of assumptions that creates new versions of strategy and plan."
  aachat.discovery.listed: "false"
---

# 見直し（⑤月次経営会議、⑥四半期レビュー）

先に `cso-records` を読む。目次と、現在の戦略・計画、直近の月次記録を読んでから始める。

## 月次経営会議

1. 対象月の材料（明細など）を受け取り、台帳を作る。**届いていなければ、利用者に1つだけ頼む（ProjectのAskか会話）。届いた範囲で記録を作り、届かない行の実績は `null` にする。**
2. 実績を `actuals` に入れる。`plan_version` には、その月の予算に使った計画の版を入れる。
3. `build` して `summary.monthly` から予算と実績の差を読む。差の内訳は明細で確かめられたものだけ `fact` にし、確かめられないものは `unknown`（`missing` に何が足りないか）。それらしい理由で埋めない。
4. 試しの進み具合（使った時間・お金・結果）は本人に聞く（`trial.values`）。申告がなければ `null`。
5. 試しの結果のうち、戦略の前提に関わるものは `observations` に書き、`observes` に戦略項目のidを入れる。`limits`（まだ言えないこと）を必ず書く。**戦略の文書は変えない。**
6. 計画になかった出来事（顧客からの申し出など）は `unexpected` に分けて書き、計画に組み込まない。
7. 決めてほしいことを3つまでに絞り、必要な下書きを用意する。決まったら `answer` に書く。
8. 前月に決めたことが実行されたかを利用者に確かめる。
9. 版idは `next-id --kind monthly --month YYYY-MM`。会議後に実績が訂正されたら `r2` の新しい文書を作る。
10. `build` し、返答では数字を `summary` から写す。

## 四半期レビュー

1. 対象期間（通常3か月）の月次記録と、戦略・計画の現在の版を読む。
2. 戦略の前提を1つずつ取り上げ、`observes` で結び付いた観測を集める。
3. 前提ごとに「観測したこと」（`text`・`evidence`）と「まだ言えないこと」（`limits`）を書く。件数が少ない、相手が偏っている、期間にほかの変化が重なっている、などの理由で言えないことを必ず書く。観測から因果を断定しない。
4. `build` の `summary.quarterly` から期間の予算と実績を読む。
5. 利用者に、戦略・計画・経営方針（ミッション・ビジョンを含む）のどこを変えるか、試しを続ける・直す・やめるかを決めてもらう。
6. 変える資料ごとに新しい版を作る（`supersedes` に前の版、`changed_by` にこのレビューのid）。変更した項目の `links.from` に、根拠になった前提（`q…`）を入れる。同じ項目には同じidを使い続ける。
7. 四半期レビューの文書（`updates` に変えた資料と版）を保存し、目次の `current` を新しい版に向ける。
8. `build` し、HTMLの版の切り替えで前の版との違いが出ることを確かめてから返答する。

## 定期実行（月次会議の自動起動）

- 計画を確定した回などで、利用者に「毎月何日の何時に、先月の数字をまとめてよいか」を聞く。**了承がなければ作らない。**
- 作るときは、まず `chat trigger preview` で次の3回の日時を確かめ、利用者に見せる。営業日の指定はできないので、日付（`day_of_month`）で決める。
- 了承を得たら `chat trigger create --project <team/project> --stdin` で作る。

```json
{
  "name": "月次経営会議の準備",
  "schedule": { "kind": "monthly", "day_of_month": 5, "time": "09:00:00", "timezone": "Asia/Tokyo", "starts_on": "2027-01-01" },
  "target": { "kind": "session", "agent": "<自分のagent名>", "prompt": "cso-review の手順で、先月の月次経営会議の準備をしてください。材料が届いていなければ1つだけ頼み、届いた範囲で記録を作ってください。" }
}
```

- 作ったら、目次の `next_meeting` に trigger のidと次回の日時を書く。
- 利用者が止めたいと言ったら `chat trigger pause` か `delete` を使う。
- 起動時に利用者のPCが動いていないと始まらないことがある。自動で始まらなかったら「月次会議をして」と頼めば同じ手順で行うことを、最初に伝えておく。
