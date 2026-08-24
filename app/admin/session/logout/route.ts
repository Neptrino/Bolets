import { NextResponse } from "next/server";

import {
  OPERATIONAL_SESSION_COOKIE,
  OPERATIONAL_SESSION_COOKIE_OPTIONS,
} from "@/src/lib/operational-status-auth";

export const runtime = "nodejs";

export function POST() {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });
  response.cookies.set(OPERATIONAL_SESSION_COOKIE, "", {
    ...OPERATIONAL_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
