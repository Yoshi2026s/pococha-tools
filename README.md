# ポコツール広場

Yoshi2026sのPococha関連ツール6件をまとめた、スマートフォン対応のリンク集です。

公開先（Pages設定後）: https://yoshi2026s.github.io/pococha-tools/

管理画面: https://yoshi2026s.github.io/pococha-tools/admin.html

## 公開

GitHub PagesのSettings → Pages → Build and deploymentで、Sourceを「Deploy from a branch」、Branchを「main」、フォルダを「/(root)」にして保存します。ビルド不要です。公開ファイルのみをリポジトリに入れ、テスト・作業用ファイルは含めていません。

## 一般公開・非公開の切り替え

管理画面でYoshi2026sのFine-grained personal access tokenを入力し、「管理者として認証」を押します。各ツールの「一般公開 / 非公開」ボタンを押すと、tools.jsonがGitHub Contents APIでコミットされ、Pages再公開後に全訪問者の表示へ反映されます。通常1〜数分かかります。開いたままの公開ページは再読み込みしてください。

トークンの設定:

- Resource owner: Yoshi2026s
- Repository access: Only select repositories → pococha-toolsのみ
- Repository permissions: Contents → Read and write（Metadataは自動でRead）
- 短い有効期限を推奨。トークンはチャットやリポジトリへ保存しないでください。

トークンはJavaScriptのメモリ上だけで保持し、localStorage/sessionStorage/Cookieへ保存しません。GitHub APIのAuthorizationヘッダーにだけ送ります。ログアウト・ページ離脱で破棄します。第三者スクリプトや解析ツールは使用していません。管理画面はYoshi2026s本人かつリポジトリのadmin権限を確認します。書き込みの認可そのものはGitHub APIが担当します。このリポジトリの書き込み権限も管理者だけに保持してください。書き込み権限を持つ共同作業者はGitHubで直接設定を変更できます。

トークンを作らない場合は、GitHubにログインしてtools.jsonを直接編集し、各ツールのpublicをtrue（公開）/false（非公開）にしてコミットする方法もあります。

SHA照合で同時編集の上書きを拒否します。保存が失敗した場合は最新版を再取得し、取得できなければログアウトします。未認証の訪問者には管理操作を表示しません。管理画面のURL自体を隠すことで認証を代用していません。

## 非公開の意味

ここでの「非公開」は、このリンク集からの非表示です。リンク先アプリへの直接アクセスや、公開リポジトリのtools.json・Git履歴の閲覧を制限しません。リンク先自体を非公開にするには、各サービス側に認証・アクセス制限が必要です。

## ツール

- 📊 ポコメーター番長: https://yoshi2026s.github.io/poco-meter/
- 📝 ぽこチャレ先生: https://pococha-challenge.freefreelife2000.chatgpt.site/
- 💬 ポコ図鑑: https://pococha-comment-library.freefreelife2000.chatgpt.site/
- 🎮 ポコチャクエスト: https://yoshi2026s.github.io/toplivermichi-kyushu/
- 🚃 ポコチャ電鉄: https://yoshi2026s.github.io/pococha-dentetsu/
- 📒 ポコログ: https://yoshi2026s.github.io/pocolog/

動作確認ではGitHub Pagesの4件はHTTP 200を確認。ChatGPTサイトの2件は自動HTTP取得で403のため、指定URLを採用しました。リンク先の可用性は各サービスによります。

## ローカル確認

リポジトリのフォルダで `python -m http.server 8000 --bind 127.0.0.1` を実行し、http://127.0.0.1:8000/ を開きます。JavaScriptが必要です。外部パッケージ・ビルド・サーバー側秘密鍵は不要です。

Pococha非公式のファン制作ツール集です。
