# GitHub Pages 公開設計

- 目標URL: `https://kumakumapon.github.io/LUMEN-VEIL/`
- 配置先: Pages (Viteが生成する静的HTML/JS/CSS/WebP/SVG。サーバー・APIキー不要)
- ソース: `web/`、成果物: `dist/`（`npm run build` で生成）
- `vite.config.ts` は `root: web`, `base: /LUMEN-VEIL/`, `outDir: ../dist`。Viteが本番URLに合った `/LUMEN-VEIL/assets/...` を生成し、`npm run preview` が本番サブパスを再現する。
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
- 描画はPhaser 3 + TypeScript、ビルドはVite 7。ゲーム進行・保存のv1モジュールはそのまま維持し、マップ座標/ATBゲージの状態は永続化しない。

## デプロイのトラブルシューティング

- **テストが成功し、公開だけ失敗する場合**：Actions の「Test and publish LUMEN VEIL」で `test-build`、`e2e`、`deploy` の各ジョブを分けて確認する。ゲーム側のビルド成功と Pages 公開成功は別の状態。
- **`Get Pages site failed` / `Resource not accessible by integration`**：まず `Settings → Pages → Build and deployment → Source: GitHub Actions` を設定したか確認する。非公開リポジトリでは Pages の利用資格と GITHUB_TOKEN の `pages` 権限も確認する。
- **初回有効化**：ワークフローの `GITHUB_TOKEN` からPagesサイトを自動生成できるとは限らないため、リポジトリ管理者が GitHub UI で有効化する。PRの検証では公開処理を実行しない。
- **設定変更後**：`Actions → Test and publish LUMEN VEIL → Run workflow` で `main` のワークフローを再実行し、`deploy` の成功と公開URLの動作を確認する。
- `configure-pages` は公開用 `deploy` ジョブだけで行い、`pages: write` / `id-token: write` を付与する。Pagesが未設定でも `test-build` と `e2e` の実行結果は独立して得られる。
