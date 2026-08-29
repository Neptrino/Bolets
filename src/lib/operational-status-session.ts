import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  isOperationalSessionAuthorized,
  OPERATIONAL_SESSION_COOKIE,
} from "@/src/lib/operational-status-auth";

export async function requireOperationalSession() {
  const cookieStore = await cookies();
  const authorized = await isOperationalSessionAuthorized(
    cookieStore.get(OPERATIONAL_SESSION_COOKIE)?.value,
  );
  if (!authorized) redirect("/admin/login");
}
