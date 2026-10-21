# LUMEN VEIL — 名前のない夜明け

オリジナルのブラウザJRPG。**序章「消える港」**（浮遊港オルテ→整備回廊→保管庫→飛空艇）をPC・スマートフォンで遊べます。背景・立ち絵・街のアニメーションはオリジナルの生成画像／Phaser描画です。

**GitHub Pages:** https://kumakumapon.github.io/LUMEN-VEIL/

## 技術構成

- **Vite + TypeScript + Phaser 3**: マップ描画・歩行スプライト・移動・ホットスポット・戦闘エフェクト。
- **DOM/CSS UI**: 会話、ステータス、探索候補、コマンド、セーブ操作。Canvasが無効でも操作できる構成。
- **Web Audio API**: 画面ごとのオリジナルBGMとSEをシンセサイザーで生成。クリック/キー操作後のみ再生し、非表示タブでは停止。
- **既存のゲームモデル（`web/model.mjs`）と保存（`web/save.mjs`）を維持**: v1 IndexedDB・JSONセーブの互換性を優先。歩行位置、ATBゲージ、音声の再生時刻はセーブに追加しません。
- **GitHub Actions**: テスト→Pagesパス検証→Playwright E2E→`main` からPagesに公開。

## 開発

Node.js 22.12以降を推奨。

```bash
npm ci
npm run dev
# http://127.0.0.1:4173/LUMEN-VEIL/
npm test
npm run typecheck
npm run build
npm run preview
```

## 操作

| 場面 | PC | スマートフォン |
|---|---|---|
| 探索 | WASD/矢印キーで歩く、地点をクリック・選択肢を押す | 画面をタップして移動／光の印をタップ、選択肢をタップ |
| 戦闘 | ATBゲージが満ちたら1〜4キー・コマンド選択（WAITモード） | ゲージが満ちたらコマンドをタップ |
| 設定 | ヘッダ「設定」で音量・文字・演出・難易度を変更 | 同じ |
| セーブ | 「保存」「続きから」／「記録」→JSON書出し・読み込み | 同じ |

戦闘モデルの敵行動、崩し、残響、回復、全滅→リトライのルールは旧版のままです。ATBは手番入力をチャージ後に可能にする演出・入力ゲートです（リアルタイム敵ターン制とは異なります）。

## セーブ互換性

`web/model.mjs` と `web/save.mjs` のセーブ形式は **version=1** のままです。

- IndexedDB DB: `lumen-veil-save-v1`、object store: `slots`、key: `chapter-zero`。
- 旧版からのブラウザ内保存・JSONインポートに対応。旧セーブの実データ例で回帰テストを実施。
- 別のブラウザ/端末への移行はJSONエクスポート・インポートが必要。ゲーム本体にセーブを外部送信する仕組みはありません。

## 詳細資料

- [設計・シナリオ](docs/DESIGN.md)
- [ビジュアル＆オーディオ移行](docs/VISUAL_MIGRATION.md)
- [画像素材について](docs/ART_DIRECTION.md)
- [GitHub Pages公開と復旧](docs/PAGES.md)

**今後の課題:** リアルタイム敵ATB、自由歩行の衝突マップ、フル3D、音声ファイルに差し替えたBGM、全6章、クラウド同期は未実装です。初回は序章のプレイ可能なプロトタイプです。
