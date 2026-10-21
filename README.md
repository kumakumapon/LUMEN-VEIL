# LUMEN VEIL — 名前のない夜明け

浮遊港オルテで始まる、記憶と灯をめぐるオリジナル・ファンタジーWeb RPG。

**GitHub Pages公開予定:** https://kumakumapon.github.io/LUMEN-VEIL/

## ローカル開発（Node.js 20+）

```sh
npm run dev
# http://127.0.0.1:4173/LUMEN-VEIL/
npm test
npm run build
npm run preview
```

初版は **静的・外部依存ゼロの序章プロトタイプ**。港の探索、会話、記憶灯、回廊での戦闘、忘鐘戦、脱出までを一巡できる。WAIT方式のターン選択と残響・崩しを先行実装。自由歩行、Phaserの描画、生成画像の統合、BGM、完全なATBゲージ、全6章は後続実装。

### 基本操作

- 探索：場面の選択肢をクリック/タップ。矢印キーで選択、Enterで決定。
- 戦闘：コマンドを選択。数字キー1〜4にも対応。
- 上部メニュー：保存、続きから、記録、設定、セーブJSON書出し/読込み。

`docs/DESIGN.md` にシナリオ・最終仕様、`docs/PAGES.md` に公開手順。GitHub Pagesではサーバー不要で動作し、保存はIndexedDBへ行う。Pages自体の有効化は管理者による設定が必要。
