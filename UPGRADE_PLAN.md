# 霈霈看板大改版計畫

## 靈感來源
- ClawDashboard: Agent 狀態燈、Glass Terminal 風格、Activity Log、Model Usage
- Linear: 流暢動畫、快捷鍵、極簡設計
- Notion: 豐富的任務詳情
- iOS Health/Fitness: 圓環進度、卡片式 Dashboard

## Phase 1: 核心體驗升級（優先）

### 1.1 深色主題 + Glass Morphism 風格
- 從淺色切換到深色 Glass Terminal 風格（參考 ClawDashboard）
- 半透明毛玻璃卡片、漸層背景、微妙光暈
- 色彩方案：深藍底 + 紫藍主色調

### 1.2 Agent 狀態面板（首頁新增）
- 即時顯示霈霈豬 / Trading Lab / Coder 狀態
- 狀態燈：🟢 idle / 🟡 thinking / 🔴 acting
- 顯示上次活動時間

### 1.3 Activity Log 頁面（新增）
- 時間軸式活動記錄
- 分類篩選：Agent / Task / System
- 顯示 cron 執行紀錄、任務狀態變更

### 1.4 看板頁面升級
- 拖拽支援（drag & drop 換欄位）
- 任務卡片顯示優先度色條
- 展開/收合長列表

## Phase 2: 功能強化

### 2.1 快捷操作面板
- 首頁快速按鈕：新增任務、查持倉、跑分析
- 一鍵觸發常用操作

### 2.2 投資頁面升級
- 持倉卡片式展示（不只表格）
- 漲跌色塊視覺化
- Mini chart sparklines

### 2.3 Docs 瀏覽器（新增）
- 瀏覽 ~/clawd/docs/ 下的文件
- Markdown 渲染

## Phase 3: 精緻化

### 3.1 動畫與過渡
- 頁面切換動畫
- 卡片進場動畫
- 拉動刷新

### 3.2 PWA 強化
- 離線快取
- 推播通知整合

## 技術注意
- Next.js 15 + Tailwind CSS
- 保持 Vercel 部署相容
- 保持 Google 登入保護
- 響應式：手機摺疊（375px）/ 展開（720px）/ 桌面
