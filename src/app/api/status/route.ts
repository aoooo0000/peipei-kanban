import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      agents: [
        {
          id: "main",
          name: "霈霈豬",
          emoji: "🐷",
          status: "idle",
          lastActive: "2026-02-14T02:30:00Z",
        },
        {
          id: "trading-lab",
          name: "Trading Lab",
          emoji: "📈",
          status: "idle",
          lastActive: "2026-02-14T02:28:00Z",
        },
        {
          id: "coder",
          name: "Coder",
          emoji: "💻",
          status: "idle",
          lastActive: "2026-02-14T02:25:00Z",
        },
      ],
      uptime: "3d 14h",
      version: "2.6.3",
    });
  } catch (error) {
    console.error("GET /api/status error", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
