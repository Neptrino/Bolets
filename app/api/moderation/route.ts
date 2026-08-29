import { z } from "zod";
import { readFindingProfile } from "@/src/lib/findings/reads.server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

async function moderatorUser() {
  const user = await getAuthenticatedUser();
  if (!user || !(await readFindingProfile(user.id)).moderator) return null;
  return user;
}

export async function GET() {
  if (!await moderatorUser()) return Response.json({ error: "No autoritzat." }, { status: 403 });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("user_finding_flags").select("id,finding_id,reason,detail,created_at,user_findings!inner(reported_species_id,observed_on,public_cell_id,visibility,publication_state)").eq("status", "open").order("created_at").limit(100);
  if (error) return Response.json({ error: "No s’han pogut carregar els avisos." }, { status: 503 });
  return Response.json({ flags: data }, { headers: { "Cache-Control": "private, no-store" } });
}

const actionSchema = z.object({ flagId: z.uuid(), action: z.enum(["hide", "dismiss"]) });

export async function PATCH(request: Request) {
  if (!await moderatorUser()) return Response.json({ error: "No autoritzat." }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Acció no vàlida." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data: flag } = await admin.from("user_finding_flags").select("finding_id").eq("id", parsed.data.flagId).eq("status", "open").maybeSingle();
  if (!flag) return Response.json({ error: "Avís no trobat." }, { status: 404 });
  if (parsed.data.action === "hide") await admin.from("user_findings").update({ publication_state: "hidden", updated_at: new Date().toISOString() }).eq("id", flag.finding_id);
  const { error } = await admin.from("user_finding_flags").update({ status: parsed.data.action === "dismiss" ? "dismissed" : "resolved", resolved_at: new Date().toISOString() }).eq("id", parsed.data.flagId);
  return error ? Response.json({ error: "No s’ha pogut resoldre l’avís." }, { status: 500 }) : Response.json({ ok: true });
}
