import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Reminder {
  type: string;
  title: string;
  date: string;
  urgency: string;
  source?: string;
}

async function fetchFromSupabase(): Promise<Reminder[] | null> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;
  if (!url || !anonKey || !email || !password) return null;

  try {
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!authRes.ok) return null;
    const { access_token } = await authRes.json();

    const res = await fetch(`${url}/rest/v1/user_data?data_type=eq.reminders&select=data`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (rows.length > 0 && Array.isArray(rows[0].data)) {
      return rows[0].data as Reminder[];
    }
  } catch {
    // fall through
  }
  return null;
}

export async function GET() {
  try {
    const reminders = await fetchFromSupabase();
    if (reminders) {
      return NextResponse.json(reminders);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/reminders error", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}
