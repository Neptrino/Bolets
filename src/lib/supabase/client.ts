"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseConfig } from "@/src/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, key } = publicSupabaseConfig();
    browserClient = createBrowserClient(url, key, {
      auth: {
        experimental: { passkey: true },
      },
    });
  }
  return browserClient;
}
