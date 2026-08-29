import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";

export function createSupabaseAdminClient() {
  const { url, key } = serviceSupabaseConfig();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
