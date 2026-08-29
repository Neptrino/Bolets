import { findingDraftSchema } from "@/src/lib/findings/schema";
import { beginFinding } from "@/src/lib/findings/mutations.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió per sincronitzar la troballa." }, { status: 401 });
  const parsed = findingDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "La troballa no té totes les dades necessàries." }, { status: 400 });
  try {
    return Response.json(await beginFinding(user.id, parsed.data));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No s’ha pogut desar la troballa." }, { status: 400 });
  }
}
