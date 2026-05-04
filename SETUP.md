# セットアップガイド（初心者向け）

## ステップ1：Node.js を確認する

ターミナル（Mac: Terminal、Windows: コマンドプロンプトまたは PowerShell）を開いて入力:

```
node -v
```

`v18.x.x` 以上が表示されれば OK。  
`command not found` と出た場合 → https://nodejs.org/ja/ からインストールしてください（LTS版を選択）。

---

## ステップ2：このフォルダに移動

ZIP を解凍した場所に `cd` コマンドで移動します。

```bash
# 例: デスクトップに解凍した場合

# Mac
cd ~/Desktop/horror-x-ai

# Windows
cd C:\Users\あなたのユーザー名\Desktop\horror-x-ai
```

---

## ステップ3：セットアップ（初回のみ）

```bash
npm run setup
```

しばらく待つと（1〜3分）、以下のメッセージが出ます:

```
✔ Generated Prisma Client
Your database is now in sync with your schema.
```

これで準備完了です。

---

## ステップ4：起動する

```bash
npm run dev
```

以下のメッセージが出たら成功:

```
✓ Ready in xxxms
- Local: http://localhost:3001
```

---

## ステップ5：ブラウザで開く

ブラウザ（Chrome など）を開き、アドレスバーに入力:

```
http://localhost:3001
```

「ホラーX編集長AI」のホーム画面が表示されます。

---

## 停止するには

ターミナルで `Ctrl + C` を押します。

---

## 2回目以降の起動

```bash
cd horror-x-ai
npm run dev
```

`npm install` や `prisma migrate` は初回のみ必要です。

---

## データについて

- すべてのデータは `prisma/dev.db`（SQLite ファイル）に保存されます
- このファイルを削除するとデータが消えます
- バックアップは `prisma/dev.db` をコピーするだけです
