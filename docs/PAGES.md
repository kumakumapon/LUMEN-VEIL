# GitHub Pages 公開設計

- 目標URL: `https://kumakumapon.github.io/LUMEN-VEIL/`
- 配置先: Pages (Vite生成の静的HTML/JS/CSS/WebP/SVGのみ。サーバー・APIキー不要)
- ソース: `index.html`、`src/`、`web/model.mjs`、`web/save.mjs`、`web/app.mjs` と `public/assets/`。成果物はViteが生成する `dist/`（`npm run build`）。
- `vite.config.ts` の `base: "/LUMEN-VEIL/"` がCSS、JS、WebPとPhaserの動的メディアパスに反映される。`npm run dev` と `npm run preview` で本番サブパス `/LUMEN-VEIL/` を再現する。
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
- Phase 2でPhaser + TypeScript + Viteを導入。`npm ci`が必要（Node.js 22.12以降）。保存ロジックとセーブversion=1は変更しない。
