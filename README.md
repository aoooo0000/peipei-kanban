# 🐷 霈霈豬看板 (Peipei Kanban)

AI Agent 工作台 — 任務管理、投資追蹤、排程監控一站搞定。

## 功能
- 📋 看板任務管理（Notion 整合）
- 🐷 Agent 狀態即時監控
- 💰 投資組合追蹤
- 📊 數據分析 Dashboard
- 📅 Cron Job 排程視覺化
- 🔍 Command Palette 快速搜尋
- 📝 活動日誌時間軸
- 🔐 Google 登入保護

## 技術棧
- Next.js 15 + Tailwind CSS
- NextAuth.js v5 (Google Provider)
- Vercel 部署
- Notion API 整合

## 開發
npm install
npm run dev

## Web Push 設定
1. 產生 VAPID Keys
```bash
npx web-push generate-vapid-keys
```
2. 設定 Vercel 環境變數（請用 `printf` 避免換行）
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (例：`mailto:andy@example.com`)
3. 需設定 Supabase：`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_EMAIL`, `SUPABASE_PASSWORD`
4. 到 `/settings` 點「開啟通知」，再點「發送測試通知」驗證
