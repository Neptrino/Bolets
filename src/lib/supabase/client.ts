"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  publicSupabaseConfig,
  SUPABASE_AUTH_COOKIE_NAME,
} from "@/src/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, key } = publicSupabaseConfig();
    browserClient = createBrowserClient(url, key, {
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
      auth: {
        experimental: { passkey: true },
      },
    });
  }
  return browserClient;
}
