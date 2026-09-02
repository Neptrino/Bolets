import {
  clearContributorDetailCapability,
  setContributorDetailCapability,
} from "@/src/lib/contributions/capability.server";
import { readContributorAccess } from "@/src/lib/contributions/server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    await clearContributorDetailCapability();
    return Response.json(
      { authenticated: false, active: false, activeUntil: null, revokedAt: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const access = await readContributorAccess(user.id);
    if (access.active && access.activeUntil) {
      await setContributorDetailCapability(access.activeUntil);
    } else {
      await clearContributorDetailCapability();
    }
    return Response.json(access, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to read contributor access", error);
    await clearContributorDetailCapability();
    return Response.json(
      { error: "No s’ha pogut consultar l’accés de col·laboració." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
