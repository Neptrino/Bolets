import { findingVoteSchema } from "@/src/lib/findings/schema";
import { voteOnFinding } from "@/src/lib/findings/mutations.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió per validar identificacions." }, { status: 401 });
  const parsed = findingVoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Tria una espècie del catàleg." }, { status: 400 });
  try {
    const { id } = await context.params;
    await voteOnFinding(id, user.id, parsed.data.speciesId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No s’ha pogut registrar el vot." }, { status: 400 });
  }
}
