import "server-only";

import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function isOperationalSessionAuthorized() {
  const user = await getAuthenticatedUser();
  return user !== null && userHasAppRole(user, APP_ROLES.admin);
}
