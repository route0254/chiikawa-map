# 任意クラウド保存の有効化手順

ちい活MAPの通常保存先は、これまでどおりブラウザの `localStorage` です。Firebaseを有効にした場合だけ、Googleログインした利用者の記録をFirestoreへ同期します。ログインは必須ではありません。

## 同期仕様

- 対象: 「行きたい」「行った！」「訪問日・メモ」「今日のプラン」
- 地図・公式スポット一覧・ちい活手帳・個別スポット・プライバシーの各ページ右上からGoogleログイン可能
- 操作時は先に端末へ保存し、5秒間まとめてからクラウドへ同期
- 画面表示中は5分ごと、オンライン復帰時・画面復帰時にも同期確認
- 端末全体を丸ごと上書きせず、「行きたい」「行った！」「訪問日・メモ」はスポット単位で端末とクラウドを統合
- 異なるスポットの記録は両方を残し、記録が空の2台目でログインしてもクラウドの記録を削除しない
- 同じスポットが両方で変更された場合だけ、更新時刻が新しい追加・編集・解除・削除を優先
- 並び順が意味を持つ「今日のプラン」は、最後に編集したリスト全体を優先
- 解除・削除も削除状態として保存し、別端末の古い記録から復活することを防止
- 同期中の端末操作を検知した場合は、上書きせず再同期
- JSON書き出し・追加統合読み込みは非常用バックアップとして引き続き利用可能
- 位置情報、Googleの表示名・メールアドレスはFirestoreへ保存しない

## Firebase Console側の設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成します。本サイトではGoogle Analytics for Firebaseも有効化しています。
2. 「プロジェクトの設定」からWebアプリを追加し、表示されたFirebase構成値を控えます。
3. Authenticationの「Sign-in method」でGoogleを有効にします。
4. Google Cloud ConsoleのOAuth同意画面で、アプリ名・サポート用メールアドレス・承認済みドメインを設定します。プライバシーポリシーURLには `https://chiikatsu-map.com/privacy.html` を指定できます。
5. Authenticationの「Settings > Authorized domains」に `chiikatsu-map.com` と `www.chiikatsu-map.com` を追加します。ローカル確認も行う場合は `localhost` も許可します。
6. Firestore Databaseを作成します。リージョンは主な利用者に近い場所を選び、本番モードで開始します。
7. Firestoreの「ルール」に、リポジトリ直下の `firestore.rules` を貼り付けて公開します。このルールは、ログイン利用者本人の `users/{uid}/private/chiikatsu` だけを読み書き可能にします。
8. `firebase-config.json` の `firebase` をWebアプリの構成値で埋め、`enabled` と `analytics.enabled` を `true` にします。FirebaseのWeb APIキーは秘密鍵ではありません。アクセス制御はSecurity RulesとApp Checkで行います。
9. Google Cloud ConsoleでWeb APIキーをHTTPリファラー制限する場合は、本番ドメインに加えて `authDomain` のドメインも許可します。本サイトでは `https://chiikatsu-map.firebaseapp.com` と `https://chiikatsu-map.firebaseapp.com/*` が必要です。これを省くとGoogleログイン画面で `The requested action is invalid.` になります。
10. 各ページ右上に「Googleで保存」が表示されること、足あと画面で詳しい同期操作ができること、GA4のリアルタイム計測、初回同期・ログアウト・再ログイン・別ブラウザ復元を確認します。

設定例:

```json
{
  "enabled": true,
  "version": "公開時の更新識別子",
  "enabledHosts": [
    "chiikatsu-map.com",
    "www.chiikatsu-map.com"
  ],
  "firebase": {
    "apiKey": "Firebase Consoleの値",
    "authDomain": "プロジェクトID.firebaseapp.com",
    "projectId": "プロジェクトID",
    "storageBucket": "Firebase Consoleの値",
    "messagingSenderId": "Firebase Consoleの値",
    "appId": "Firebase Consoleの値",
    "measurementId": "G-から始まる測定ID"
  },
  "analytics": {
    "enabled": true
  },
  "appCheck": {
    "enabled": false,
    "provider": "recaptcha-enterprise",
    "siteKey": ""
  }
}
```

`enabledHosts` により、通常のローカル開発・自動テストでは本番Firebaseへ接続しません。ローカルでFirebase接続を明示的に確認する場合だけ、開発者ツールで `localStorage.setItem("chiikawa-map-firebase-debug-v1", "1")` を実行して再読込します。Authenticationの承認済みドメインに `localhost` が必要です。確認後は `localStorage.removeItem("chiikawa-map-firebase-debug-v1")` で解除します。

GA4はFirebase初期化とは別に読み込み、解析側の初期化に失敗してもAuthenticationとFirestore同期を止めません。保存したスポットID・訪問日・メモ・現在地・Googleアカウント情報を独自イベントとして送信する処理はありません。

## 安全・費用設定

- Firebase App CheckでWebアプリを登録し、reCAPTCHA Enterpriseのサイトキーを設定します。最初はメトリクスを確認し、問題がなければFirestoreとAuthenticationの適用を有効にします。
- `firebase-config.json` の `appCheck.siteKey` を設定して `appCheck.enabled` を `true` にします。
- Google Cloudの「予算とアラート」を少額から設定します。予算アラートは課金を自動停止する機能ではない点に注意してください。
- Firebase ConsoleのFirestore使用量を公開直後に確認します。本実装は変更を5秒単位でまとめ、定期確認を5分間隔にして読み書きを抑えています。
- Firebaseの無料枠・料金は変更される可能性があるため、公開時に[Firestoreの料金](https://firebase.google.com/docs/firestore/pricing)と[使用量・上限](https://firebase.google.com/docs/firestore/quotas)を確認します。

## 確認項目

- 未ログインのまま従来どおり保存・JSONバックアップできる
- 既存記録がある端末で初回ログインしても記録が消えない
- 端末Aで追加した記録が端末Bに復元される
- 記録が空の端末Bでログインしても端末Aのクラウド記録が消えない
- 端末A・Bで異なるスポットを追加すると両方が残る
- 同じスポットを両端末で変更した場合は新しい操作が反映される
- 端末Aで解除した「行きたい」が端末Bの古い状態から復活しない
- オフラインで変更後、オンライン復帰すると同期される
- 別のGoogleアカウントを選んだ場合、確認前には端末データが送信されない
- 「クラウド記録を削除」後も端末内データが残る
- GA4のリアルタイム画面またはDebugViewでページ閲覧が確認できる

参考: [Firebase Webセットアップ](https://firebase.google.com/docs/web/setup)、[Googleログイン](https://firebase.google.com/docs/auth/web/google-signin)、[Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)、[Web APIキーの扱い](https://firebase.google.com/docs/projects/api-keys)、[App Check](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
