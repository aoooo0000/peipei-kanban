"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: true,
          revalidateOnReconnect: true,
          dedupingInterval: 3000,
          errorRetryCount: 3,
          errorRetryInterval: 5000,
          focusThrottleInterval: 10000,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
