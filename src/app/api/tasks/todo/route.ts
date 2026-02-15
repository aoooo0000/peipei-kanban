import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_EMAIL;
  const password = process.env.SUPABASE_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    return NextResponse.json({ items: [] });
  }

  try {
    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) {
      return NextResponse.json({ items: [] });
    }

    const { access_token } = await authRes.json();
    const res = await fetch(`${url}/rest/v1/user_data?data_type=eq.todoQueue&select=data`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ items: [] });
    }

    const rows = await res.json();
    const data = rows?.[0]?.data;
    const items = Array.isArray(data?.items) ? data.items : [];

    return NextResponse.json({
      title: typeof data?.title === "string" ? data.title : "工作佇列",
      updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null,
      items,
    });
  } catch (error) {
    console.error("GET /api/tasks/todo error", error);
    return NextResponse.json({ items: [] });
  }
}
