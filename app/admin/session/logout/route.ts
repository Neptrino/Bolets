import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { clearContributorDetailCapability } from "@/src/lib/contributions/capability.server";

export const runtime = "nodejs";

export async function POST() {
  const client = await createSupabaseServerClient();
  await client.auth.signOut({ scope: "global" });
  await clearContributorDetailCapability();
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/acces?retorn=%2Fadmin%2Fstatus" },
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
