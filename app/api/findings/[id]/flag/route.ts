import { findingFlagSchema } from "@/src/lib/findings/schema";
import { flagFinding } from "@/src/lib/findings/mutations.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió per avisar-nos." }, { status: 401 });
  const parsed = findingFlagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "L’avís no és vàlid." }, { status: 400 });
  const { id } = await context.params;
  try {
    await flagFinding(id, user.id, parsed.data.reason, parsed.data.detail);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "No s’ha pogut enviar l’avís." }, { status: 400 });
  }
}
