export interface CronJobDef {
  id: string;
  agentId: string;
  name: string;
  schedule: string;
  tz: string;
  description: string;
  category: "trading" | "content" | "monitoring" | "other";
}

/** @deprecated Schedule page now reads real-time jobs from Supabase (`/api/cron/jobs`). */
export const CRON_JOBS: CronJobDef[] = [
  { id: "tl-premarket", agentId: "trading-lab", name: "盤前準備", schedule: "0 21 * * 1-5", tz: "Asia/Taipei", description: "同步 Notion、掃描 Watchlist、風險檢查、交易決策", category: "trading" },
  { id: "tl-open", agentId: "trading-lab", name: "開盤交易", schedule: "45 22 * * 1-5", tz: "Asia/Taipei", description: "開盤 15 分鐘後檢查持倉、掃描買點", category: "trading" },
  { id: "tl-monitor-2330", agentId: "trading-lab", name: "盤中監控", schedule: "30 23 * * 1-5", tz: "Asia/Taipei", description: "持倉狀態、停損單、異動檢查", category: "trading" },
  { id: "tl-trade-0000", agentId: "trading-lab", name: "盤中交易", schedule: "0 0 * * 2-6", tz: "Asia/Taipei", description: "帳戶狀態、Watchlist 掃描、進場決策", category: "trading" },
  { id: "tl-monitor-0100", agentId: "trading-lab", name: "盤中監控", schedule: "0 1 * * 2-6", tz: "Asia/Taipei", description: "持倉檢查、異動監控", category: "trading" },
  { id: "tl-check-0200", agentId: "trading-lab", name: "盤中檢查", schedule: "0 2 * * 2-6", tz: "Asia/Taipei", description: "中場調整、Watchlist 掃描、新聞", category: "trading" },
  { id: "tl-monitor-0300", agentId: "trading-lab", name: "盤中監控", schedule: "0 3 * * 2-6", tz: "Asia/Taipei", description: "持倉檢查", category: "trading" },
  { id: "tl-monitor-0400", agentId: "trading-lab", name: "盤中監控", schedule: "0 4 * * 2-6", tz: "Asia/Taipei", description: "持倉檢查", category: "trading" },
  { id: "tl-close", agentId: "trading-lab", name: "收盤決策", schedule: "30 4 * * 2-6", tz: "Asia/Taipei", description: "過夜風險評估、減碼/清倉/加碼決策", category: "trading" },
  { id: "tl-review", agentId: "trading-lab", name: "盤後反思+學習", schedule: "0 6 * * 2-6", tz: "Asia/Taipei", description: "交易回顧、Mimi 學習、SA 研究、策略優化", category: "trading" },
  { id: "tl-weekly", agentId: "trading-lab", name: "週末總結", schedule: "0 10 * * 6", tz: "Asia/Taipei", description: "本週績效、交易分析、學習進度、下週計畫", category: "trading" },
  { id: "pp-mimi-check", agentId: "main", name: "MimiVsJames 整理", schedule: "30 5,15 * * *", tz: "Asia/Taipei", description: "Gmail 收信 → 分類 → 整理到 Notion（4 個 Gate）", category: "content" },
  { id: "pp-close-summary", agentId: "main", name: "收盤總結+催化劑", schedule: "0 7 * * 2-6", tz: "Asia/Taipei", description: "三大指數、持股 Top5、重要事件、催化劑提醒", category: "monitoring" },
  { id: "pp-news", agentId: "main", name: "新聞+異動監控", schedule: "0 10,14,18,22 * * *", tz: "Asia/Taipei", description: "持股新聞、市場新聞、異常篩選（>5%通知）", category: "monitoring" },
  { id: "pp-premarket", agentId: "main", name: "盤前報告", schedule: "0 21 * * 1-5", tz: "Asia/Taipei", description: "期指、盤前異動、Mimi 技術分析、Watchlist", category: "monitoring" },
];
