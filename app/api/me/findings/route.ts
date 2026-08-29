import { matchingOwnerFindingSpeciesIds, ownerFindingsPage } from "@/src/lib/findings/owner-filter";
import { readOwnerFindingsPage } from "@/src/lib/findings/reads.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const page = ownerFindingsPage(url.searchParams.get("page"));
    const visibilityParam = url.searchParams.get("visibility");
    const visibility = visibilityParam === "public" || visibilityParam === "private"
      ? visibilityParam
      : undefined;
    const speciesIds = matchingOwnerFindingSpeciesIds(url.searchParams.get("q") ?? "");
    const result = await readOwnerFindingsPage(user.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      speciesIds,
      visibility,
    });
    return Response.json({
      ...result,
      page,
      pageSize: PAGE_SIZE,
      hasMore: page * PAGE_SIZE < result.total,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No s’han pogut carregar les troballes." }, { status: 503 });
  }
}
