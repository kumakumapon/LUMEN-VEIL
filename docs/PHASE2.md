# Phase 2 — Phaser / TypeScript / Vite 移行

## 必ず維持する契約
- セーブDB: `lumen-veil-save-v1` / object store `slots` / key `chapter-zero`、JSON `version: 1`、同一オリジンのIndexedDBを変更しない。
- `web/model.mjs` と `web/save.mjs` はゲーム進行・保存の既存契約として維持。既存データへの破壊的な自動移行を禁止。
- 公開URL `https://kumakumapon.github.io/LUMEN-VEIL/` と GitHub Actions 上のPages workflowを維持。
- 既存の `data-hotspot`、`data-command`、主要DOM IDを維持。テキスト/ボタンでの操作も残す。

## 実装計画
1. Vite（root: web、base: /LUMEN-VEIL/）、TypeScript、Phaserを導入。既存モデルはJS互換モジュールとして再利用。
2. Phaserのマップ描画・キャラクター移動・足踏み・地点選択、キーボード/タップ操作を追加。
3. 既存の戦闘ルールを保ったままATBの視覚ゲージ、待機中の時間停止、斬撃/術技/残響/被弾演出を追加。
4. コンセプト画像から最適化した背景・人物ポートレートを配置。権利上問題のない独自素材のみ。
5. Web AudioによるオリジナルBGMループと各種SEを追加。ユーザー操作で解禁し、設定音量と非表示時の停止を反映。

## 完了条件
- `npm test`, `npm run typecheck`, `npm run build`, Playwrightが成功。
- 初版で作成したv1のIndexedDBとJSONを新しいビルドで読み込める。
- `dist/index.html` に絶対ルートURLがなく、Pagesのサブパス内で画像/スクリプト/BGMが動く。
- PC、スマートフォン、reduce-motion、BGMミュートで操作可能。
