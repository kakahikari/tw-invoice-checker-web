# tw-invoice-checker-web

發票來對喔APP官方網站

## 供APP使用的資源

- public/winning-numbers.json: 開獎號碼
- public/privacy-policy.html: 隱私政策

### 更新開獎號碼資料

自動化腳本 (`scripts/update-winning-numbers.js`)，可從財政部稅務入口網抓取最新開獎號碼

#### 自動更新

透過 GitHub Actions 定時執行，若偵測到新期別會自動更新 `public/winning-numbers.json` 並推送到儲存庫

#### 手動更新

執行以下指令可手動觸發爬蟲：

```bash
pnpm update:winning-numbers
```

## 專案結構

```
.
├── .vitepress/          # VitePress 相關設定
├── pages/               # VitePress 來源目錄
├── scripts/             # 腳本目錄
└── public/              # 靜態資源目錄 (供 App 使用)
```

## 開發

### 安裝依賴

```bash
pnpm install
```

### 啟動開發環境

```bash
pnpm dev
```

### 建置生產版本

```bash
pnpm build
```

### 預覽生產版本

```bash
pnpm preview
```
