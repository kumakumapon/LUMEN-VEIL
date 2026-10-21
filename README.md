# LUMEN VEIL — 名前のない夜明け

浮遊港オルテで始まる、記憶と灯をめぐるオリジナル・ファンタジーWeb RPG。

**GitHub Pages公開予定:** https://kumakumapon.github.io/LUMEN-VEIL/

## ローカル開発（Node.js 22+）

```sh
npm run dev
# http://127.0.0.1:4173/LUMEN-VEIL/
npm test
npm run build
npm run preview
npm run typecheck
```

**Phaser + TypeScript + Viteで動作する序章Web RPG**。港の探索、会話、記憶灯、回廊での戦闘、忘鐘戦、脱出までを一巡できる。WAIT方式のターン選択と残響・崩しを先行実装。クリック・タップやWASD/矢印キーで歩けるマップ、キャラクター移動アニメーション、Web AudioによるオリジナルBGM/効果音、行動待ち時間を表示するATBゲージ、生成画像の背景・キャラクター肖像を追加。全6章と厳密な敵味方共通ATBシミュレーションは今後の課題。

### 基本操作

- 探索：場面の選択肢をクリック/タップ。マップ上の目印をクリックすると主人公が歩いて調べる。マップを選択後、WASD/矢印キーで移動、近くの場所でSpace。マップ未フォーカス時の矢印キーは従来どおり選択肢移動。
- 戦闘：ATBゲージが満ちたらコマンドを選択。数字キー1〜4にも対応。選択待ちはWAITで時間が停止。
- 上部メニュー：保存、続きから、記録、設定、セーブJSON書出し/読込み。

`docs/DESIGN.md` にシナリオ・最終仕様、`docs/PHASE2.md` に移行時の互換性条件、`docs/PAGES.md` に公開手順。GitHub Pagesではサーバー不要で動作し、保存はIndexedDBへ行う。Pages自体の有効化は管理者による設定が必要。

### コンセプトアート

生成した空中都市のキービジュアルを、軽量なWebP背景として画面に組み込んでいます。忘鐘のコンセプト画像と配色・UI方針は [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md) を参照してください。

### セーブデータ互換性

旧版の IndexedDB `lumen-veil-save-v1`（object store `slots` / key `chapter-zero`）およびセーブJSON `version=1` をそのまま読み込みます。ブラウザと公開URLが同じであれば移行操作は不要です。マップ座標/ATBゲージは見た目専用状態とし保存形式に追加しません。データの端末間移行にはJSON書出し/読込みを利用してください。
