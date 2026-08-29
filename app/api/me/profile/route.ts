import { findingProfileSchema } from "@/src/lib/findings/schema";
import { readFindingProfile } from "@/src/lib/findings/reads.server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  return Response.json(await readFindingProfile(user.id), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  const parsed = findingProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "L’àlies ha de tenir entre 3 i 30 caràcters." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("finding_profiles").upsert({ user_id: user.id, public_alias: parsed.data.alias, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.code === "23505" ? "Aquest àlies ja s’utilitza." : "No s’ha pogut desar l’àlies." }, { status: 400 });
  return Response.json({ alias: parsed.data.alias });
}
