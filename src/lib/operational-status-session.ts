import "server-only";

import { redirect } from "next/navigation";

import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function requireOperationalSession() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=%2Fadmin%2Fstatus");
  if (!userHasAppRole(user, APP_ROLES.admin)) {
    redirect("/admin/login?error=forbidden");
  }
  return user;
}
