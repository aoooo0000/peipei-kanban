import { NextResponse } from "next/server";
import { supabaseGetFirstData } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";

interface Reminder {
  type: string;
  title: string;
  date: string;
  urgency: string;
  source?: string;
}

export async function GET() {
  try {
    const reminders = await supabaseGetFirstData<Reminder[]>("reminders");
    if (reminders && Array.isArray(reminders)) {
      return NextResponse.json(reminders);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/reminders error", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}
