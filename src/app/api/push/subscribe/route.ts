import { NextResponse } from "next/server";
import { supabaseInsertUserData } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(req: Request) {
  try {
    const { subscription } = (await req.json()) as { subscription?: PushSubscriptionPayload };

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    const saved = await supabaseInsertUserData("pushSubscription", {
      ...subscription,
      createdAt: new Date().toISOString(),
    });

    if (!saved) {
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
