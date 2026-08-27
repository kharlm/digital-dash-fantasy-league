"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * One QueryClient per browser tab, created lazily in state rather than at
 * module scope — module scope would share one client (and its cache) across
 * every concurrent server render, which is a real bug on the server even
 * though this component only ever runs client-side.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
