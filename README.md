# tw-invoice-checker-web

發票來對喔APP官方網站

## 供APP使用的資源

- public/winning-numbers.json: 開獎號碼
- public/privacy-policy.html: 隱私政策

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
