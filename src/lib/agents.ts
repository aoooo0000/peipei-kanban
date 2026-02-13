export type AgentStatus = "idle" | "thinking" | "acting";

export const AGENTS = [
  { id: "peipei", name: "霈霈豬", emoji: "🐷", role: "主管", status: "idle" as AgentStatus },
  { id: "trading-lab", name: "Trading Lab", emoji: "📈", role: "交易分析", status: "idle" as AgentStatus },
  { id: "coder", name: "Coder", emoji: "💻", role: "開發", status: "idle" as AgentStatus },
];
