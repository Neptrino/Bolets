import { readOwnerFindingMap } from "@/src/lib/findings/reads.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  try {
    return Response.json(
      { findings: await readOwnerFindingMap(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "No s’ha pogut carregar el mapa privat." }, { status: 503 });
  }
}
