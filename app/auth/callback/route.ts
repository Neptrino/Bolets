import { NextResponse, type NextRequest } from "next/server";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";
import { SITE_URL } from "@/src/lib/seo";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const trustedOrigins = new Set([
  SITE_URL,
  "https://www.bolets.app",
  "http://localhost:3101",
  "http://127.0.0.1:3101",
]);

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function trustedRequestOrigin(request: NextRequest) {
  const host = firstForwardedValue(request.headers.get("x-forwarded-host")) ??
    firstForwardedValue(request.headers.get("host"));
  const protocol = firstForwardedValue(request.headers.get("x-forwarded-proto")) ??
    request.nextUrl.protocol.replace(/:$/, "");
  const forwardedOrigin = host ? `${protocol}://${host}` : null;

  if (forwardedOrigin && trustedOrigins.has(forwardedOrigin)) return forwardedOrigin;
  if (trustedOrigins.has(request.nextUrl.origin)) return request.nextUrl.origin;
  return SITE_URL;
}

export async function GET(request: NextRequest) {
  const destination = resolveAccessDestination(request.nextUrl.searchParams.get("retorn"));
  const code = request.nextUrl.searchParams.get("code");
  const origin = trustedRequestOrigin(request);

  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(destination, origin));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  const retryUrl = new URL("/acces", origin);
  retryUrl.searchParams.set("retorn", destination);
  retryUrl.searchParams.set("error", "oauth");
  const response = NextResponse.redirect(retryUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
