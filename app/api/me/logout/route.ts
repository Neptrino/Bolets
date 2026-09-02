import { clearContributorDetailCapability } from "@/src/lib/contributions/capability.server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function POST() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut({ scope: "global" });
  await clearContributorDetailCapability();
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "private, no-store" },
  });
}
