import { NextResponse, type NextRequest } from "next/server";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export async function GET(request: NextRequest) {
  const destination = resolveAccessDestination(request.nextUrl.searchParams.get("retorn"));
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  const retryUrl = new URL("/acces", request.nextUrl.origin);
  retryUrl.searchParams.set("retorn", destination);
  retryUrl.searchParams.set("error", "oauth");
  const response = NextResponse.redirect(retryUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
