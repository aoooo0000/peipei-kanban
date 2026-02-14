"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { CRON_JOBS } from "@/lib/cronJobs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [statusText, setStatusText] = useState<string>("尚未啟用推播通知");
  const [working, setWorking] = useState(false);

  const vapidKey = useMemo(() => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, []);

  const enablePushNotifications = async () => {
    try {
      setWorking(true);
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatusText("此裝置不支援推播通知");
        return;
      }

      if (!vapidKey) {
        setStatusText("缺少 NEXT_PUBLIC_VAPID_PUBLIC_KEY 環境變數");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatusText("通知權限未授權");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatusText(err.error || "推播訂閱儲存失敗");
        return;
      }

      setNotificationsEnabled(true);
      setStatusText("推播通知已啟用 ✅");
    } catch (error) {
      console.error(error);
      setStatusText("推播啟用失敗，請稍後再試");
    } finally {
      setWorking(false);
    }
  };

  const sendTestPush = async () => {
    try {
      setWorking(true);
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "霈霈看板測試通知",
          body: "如果你看到這則訊息，推播已成功 🎉",
          url: "/",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusText(data.error || "測試推播發送失敗");
        return;
      }

      setStatusText(`測試推播已發送（成功 ${data.sent ?? 0} / 失敗 ${data.failed ?? 0}）`);
    } catch (error) {
      console.error(error);
      setStatusText("測試推播發送失敗");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 pb-24 animate-fadeInUp text-white/95">
      <h1 className="text-xl font-bold mb-5">⚙️ 設定</h1>

      <section className="glass-card rounded-2xl border border-white/10 p-4 mb-4">
        <h2 className="font-semibold mb-3">🎨 主題</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button className="rounded-xl border border-[#667eea]/60 bg-[#667eea]/20 p-3 text-left">
            <p className="font-medium">深色主題（目前）</p>
            <p className="text-xs text-white/65 mt-1">符合 glass 介面風格</p>
          </button>
          <button disabled className="rounded-xl border border-white/10 bg-white/5 p-3 text-left opacity-50 cursor-not-allowed">
            <p className="font-medium">淺色主題（預留）</p>
            <p className="text-xs text-white/60 mt-1">即將推出</p>
          </button>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4 mb-4">
        <h2 className="font-semibold mb-3">🔔 通知</h2>
        <p className="text-sm text-white/75 mb-3">{statusText}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={enablePushNotifications}
            disabled={working}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 p-3 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {notificationsEnabled ? "已啟用通知 ✅" : "開啟通知"}
          </button>
          <button
            onClick={sendTestPush}
            disabled={working}
            className="rounded-xl border border-sky-400/40 bg-sky-500/20 p-3 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50"
          >
            發送測試通知
          </button>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4">
        <h2 className="font-semibold mb-3">📱 關於</h2>
        <div className="space-y-2 text-sm text-white/80">
          <p>版本號：v0.6.0</p>
          <p>Agent 數量：{AGENTS.length}</p>
          <p>Cron Job 數量：{CRON_JOBS.length}</p>
          <p>
            GitHub：
            <Link href="https://github.com" target="_blank" className="text-[#9ab0ff] underline ml-1">
              專案連結
            </Link>
          </p>
          <p className="pt-2 text-pink-200">由霈霈豬 🐷 驅動</p>
        </div>
      </section>
    </main>
  );
}
