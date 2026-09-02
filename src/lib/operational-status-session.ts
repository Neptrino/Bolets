import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const requireOperationalSession = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=%2Fadmin");
  if (!userHasAppRole(user, APP_ROLES.admin)) {
    redirect("/admin/login?error=forbidden");
  }
  return user;
});
