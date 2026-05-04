# ホラーX編集長AI

X（Twitter）向けのホラー投稿・漫画構成・画像/動画プロンプト・バズ分析を行う**完全ローカル**の自分専用ツールです。  
外部API・インターネット接続なし。すべてのデータは手元の PC に保存されます。

---

## 1. アプリ概要

| 機能 | 説明 |
|------|------|
| 投稿生成 | スタイル・怖さ・オノマトペ量など細かく設定してホラー投稿を生成 |
| フック生成 | A/B/C 3種類のフックを一括生成 |
| 漫画構成 | 1〜10コマの構成・セリフ・画像プロンプトを出力 |
| 画像・動画プロンプト | Midjourney/Runway など5ツール対応 |
| 勝率UP | 投稿スコアリング・違和感案・フィードバック分析 |
| バズ投稿DB | バズ投稿を手動保存してパターンを学習 |
| 文体プリセット | 自分のスタイルを保存して再利用 |
| 履歴 | すべての生成結果を自動保存 |

---

## 2. 必要環境

| 項目 | 要件 |
|------|------|
| Node.js | **v18 以上**（推奨: v20 以上） |
| npm | v9 以上（Node に同梱） |
| OS | macOS / Windows 10以降 |
| ブラウザ | Chrome / Firefox / Edge / Safari |

### Node.js のインストール（まだ入っていない場合）

- **公式サイト**: https://nodejs.org/ja/ → 「LTS版」をダウンロード
- インストール後、ターミナル（コマンドプロンプト）で `node -v` を実行して `v18.x.x` 以上が表示されれば OK

---

## 3. インストール手順

```bash
# 1. このフォルダに移動
cd horror-x-ai

# 2. 依存関係のインストール + DB 初期化を一括実行
npm run setup
```

> **`npm run setup` が行うこと:**
> 1. `npm install` — 必要なパッケージをダウンロード
> 2. `npx prisma migrate dev` — ローカル SQLite データベースを作成

または個別に実行することもできます:

```bash
npm install
npx prisma migrate dev
```

---

## 4. 起動方法

```bash
npm run dev
```

起動後、ターミナルに以下のメッセージが表示されます:

```
▲ Next.js 15.x.x
- Local: http://localhost:3001
✓ Ready in xxxms
```

---

## 5. ブラウザで開く

```
http://localhost:3001
```

ブラウザのアドレスバーにこの URL を入力して Enter を押してください。

---

## 6. よくあるエラー

### `EADDRINUSE: address already in use :::3001`
ポート 3001 が既に使われています。

```bash
# 解決策1: 既存のプロセスを終了してから再起動
# Mac/Linux:
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows (PowerShell):
netstat -ano | findstr :3001
taskkill /PID <PID番号> /F
```

### `Error: Cannot find module '@prisma/client'`
Prisma クライアントが生成されていません。

```bash
npx prisma generate
npm run dev
```

### `Error: EPERM: operation not permitted` (Windows)
dev サーバー起動中に `npx prisma generate` を実行するとエラーになります。  
サーバーを停止（Ctrl+C）してから実行してください。

### データベースが壊れた・リセットしたい

```bash
# DB ファイルを削除して再作成
rm prisma/dev.db          # Mac/Linux
del prisma\dev.db         # Windows
npx prisma migrate dev
```

---

## 7. Windows での注意点

- **コマンドプロンプト**または **PowerShell** でコマンドを実行してください
- ファイルパスの区切り文字は `\` ですが、コマンドは `/` でも動作します
- `Ctrl+C` でサーバーを停止できます
- セキュリティソフト（ウイルス対策）が `node_modules` のインストールを遅くすることがあります。一時的に除外設定に追加すると速くなります

---

## 8. Mac での注意点

- `Terminal` または `iTerm2` を使ってください
- 初回起動時に「Node.js がインターネットアクセスを求めています」というダイアログが出る場合があります → 許可してください
- `Ctrl+C` でサーバーを停止できます

---

## 配布用 ZIP の作成（開発者向け）

`node_modules`、`.next`、`prisma/dev.db` を除いた ZIP を作成します。

### Mac / Linux

```bash
zip -r horror-x-editor.zip . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "prisma/dev.db" \
  -x "prisma/dev.db-journal" \
  -x ".git/*" \
  -x "*.DS_Store"
```

### Windows (PowerShell)

```powershell
$exclude = @("node_modules", ".next", ".git", "prisma\dev.db")
$files = Get-ChildItem -Path . -Recurse | Where-Object {
    $path = $_.FullName
    -not ($exclude | Where-Object { $path -like "*\$_*" })
}
Compress-Archive -Path $files -DestinationPath horror-x-editor.zip
```

または [7-Zip](https://www.7-zip.org/) などの GUI ツールを使って `node_modules`、`.next`、`prisma/dev.db` を除外してください。

---

## ライセンス

個人利用専用。
