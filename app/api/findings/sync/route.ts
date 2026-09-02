import { findingDraftSchema } from "@/src/lib/findings/schema";
import { beginFinding } from "@/src/lib/findings/mutations.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";
import { consumeRateLimit, requestIp } from "@/src/lib/abuse-rate-limit.server";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió per sincronitzar la troballa." }, { status: 401 });
  const [networkAllowed, accountAllowed] = await Promise.all([
    consumeRateLimit(`ip:${requestIp(request)}`, "finding_sync_ip", 600, 100),
    consumeRateLimit(`user:${user.id}`, "finding_sync_user", 600, 100),
  ]).catch(() => [false, false]);
  if (!networkAllowed || !accountAllowed) {
    return Response.json({ error: "Hi ha massa sincronitzacions seguides. Torna-ho a provar d’aquí a uns minuts." }, { status: 429 });
  }
  const parsed = findingDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "La troballa no té totes les dades necessàries." }, { status: 400 });
  try {
    return Response.json(await beginFinding(user.id, parsed.data));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No s’ha pogut desar la troballa." }, { status: 400 });
  }
}
