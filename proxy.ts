import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  serverSupabaseConfig,
  SUPABASE_AUTH_COOKIE_NAME,
} from "@/src/lib/supabase/config";

const privatePages = ["/compte", "/moderacio", "/admin/status"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = serverSupabaseConfig();
  const client = createServerClient(url, key, {
    cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await client.auth.getUser();
  const isAdminPage = request.nextUrl.pathname === "/admin"
    || request.nextUrl.pathname.startsWith("/admin/");
  const isPrivatePage = privatePages.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!data.user && isPrivatePage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/acces";
    loginUrl.search = "";
    loginUrl.searchParams.set("retorn", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isPrivatePage || isAdminPage || request.nextUrl.pathname === "/acces") {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: [
    "/acces",
    "/compte/:path*",
    "/moderacio/:path*",
    "/admin/:path*",
    "/troballes/:path*",
    "/api/findings/:path*",
    "/api/me/:path*",
    "/api/moderation/:path*",
  ],
};
