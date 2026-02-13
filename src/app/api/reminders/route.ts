import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json([
    {
      type: "deadline",
      title: "NAK DOJ Pebble Mine 回應",
      date: "2026-02-16",
      urgency: "high",
    },
    {
      type: "catalyst",
      title: "美股休市 (Presidents' Day)",
      date: "2026-02-17",
      urgency: "medium",
    },
  ]);
}
