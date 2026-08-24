import { NextRequest, NextResponse } from "next/server";

import {
  OPERATIONAL_SESSION_COOKIE,
  OPERATIONAL_SESSION_COOKIE_OPTIONS,
} from "@/src/lib/operational-status-auth";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(OPERATIONAL_SESSION_COOKIE, "", {
    ...OPERATIONAL_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
