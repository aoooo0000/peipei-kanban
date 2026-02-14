import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseGetUserDataByType } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SavedSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

function getUniqueSubscriptions(subscriptions: SavedSubscription[]) {
  const map = new Map<string, SavedSubscription>();
  for (const sub of subscriptions) {
    if (sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth) {
      map.set(sub.endpoint, sub);
    }
  }
  return [...map.values()];
}

export async function POST(req: Request) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:andy@example.com";

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Missing VAPID keys" }, { status: 500 });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const body = (await req.json()) as { title?: string; body?: string; url?: string };
    const payload = JSON.stringify({
      title: body.title || "霈霈豬",
      body: body.body || "你有新的看板更新",
      url: body.url || "/",
    });

    const saved = await supabaseGetUserDataByType<SavedSubscription>("pushSubscription");
    const subscriptions = getUniqueSubscriptions(saved);

    if (!subscriptions.length) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "No subscriptions" });
    }

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription as webpush.PushSubscription, payload);
          sent += 1;
        } catch (error) {
          failed += 1;
          console.error("Push send failed", error);
        }
      }),
    );

    return NextResponse.json({ ok: true, sent, failed });
  } catch (error) {
    console.error("POST /api/push/send error", error);
    return NextResponse.json({ error: "Failed to send push notifications" }, { status: 500 });
  }
}
