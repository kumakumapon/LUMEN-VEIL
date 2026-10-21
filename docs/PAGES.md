# GitHub Pages 公開設計

- 目標URL: `https://kumakumapon.github.io/LUMEN-VEIL/`
- 配置先: Pages (静的HTML/ES Modules/CSS/SVGのみ。サーバー・APIキー不要)
- ソース: `web/`、成果物: `dist/`（`npm run build` で生成）
- `./` から始まる相対URLを全資産に採用。プロジェクトサブパスでも正常に読み込む。`scripts/serve.mjs` は本番の `/LUMEN-VEIL/` をローカル再現する。
- GitHub ActionsはPRで `npm test` とビルドを検証し、`main` pushでPagesへデプロイする。PRから本番公開しない。
- 個人の非公開リポジトリがPagesを利用するにはGitHub側の対象プランが必要。Pages公開サイトは原則公開状態のため秘密情報を置かない。

## 初回セットアップ (リポジトリ管理者)
1. `Settings → Pages → Build and deployment → Source` を **GitHub Actions** にする。
2. 個人アカウントのGitHubプランで非公開リポジトリからPagesが許可されるか確認する。許可されない場合は公開リポジトリへの切り替え等を検討する（公開前に内容を監査）。
3. PRマージ後の `main` pushでワークフロー `Test and publish LUMEN VEIL` の `deploy` が成功することを確認する。
4. `https://kumakumapon.github.io/LUMEN-VEIL/` にアクセスし、開始・進行・保存/再開・バトルを確認する。

## セーブと制限
- 保存はそのブラウザの IndexedDB。ブラウザデータ削除/端末変更時には消える。エクスポート/インポートで移行可能。
- セーブのバージョンと構造を検証。壊れたJSONを読み込んでも既存データを消さない。
- サーバー、アカウント、対戦、ランキング、課金、クラウド同期は初期実装外。
- 初版は外部依存ゼロの静的探索・戦闘プロトタイプ。本格的なPhaser/TypeScript/Vite描画への移行は、基盤確認後の後続PRで対応する。
