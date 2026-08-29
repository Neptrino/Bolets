import "server-only";

import { serverSupabaseConfig } from "@/src/lib/supabase/config";

type AuthSettings = {
  external?: {
    google?: boolean;
  };
};

export async function getPublicAuthCapabilities() {
  const { url, key } = serverSupabaseConfig();
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!response.ok) return { google: false };
    const settings = await response.json() as AuthSettings;
    return { google: settings.external?.google === true };
  } catch {
    return { google: false };
  }
}
