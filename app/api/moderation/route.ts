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
  const { data: signals, error: signalError } = await admin.from("finding_abuse_signals")
    .select("id,finding_id,kind,metadata,created_at,user_findings!inner(reported_species_id,observed_on,public_cell_id,visibility,publication_state)")
    .eq("status", "open")
    .in("kind", ["near_duplicate", "repeated_content"])
    .order("created_at")
    .limit(100);
  if (signalError) return Response.json({ error: "No s’han pogut carregar els controls de fotografies." }, { status: 503 });
  const reportCounts = new Map<string, number>();
  for (const flag of data) reportCounts.set(flag.finding_id, (reportCounts.get(flag.finding_id) ?? 0) + 1);
  return Response.json({
    items: [
      ...signals.map((signal) => ({ ...signal, source: "signal" as const })),
      ...data.map((flag) => ({ ...flag, source: "flag" as const, report_count: reportCounts.get(flag.finding_id) ?? 1 })),
    ],
  }, { headers: { "Cache-Control": "private, no-store" } });
}

const actionSchema = z.object({ id: z.uuid(), source: z.enum(["flag", "signal"]), action: z.enum(["hide", "dismiss"]) });

export async function PATCH(request: Request) {
  const moderator = await moderatorUser();
  if (!moderator) return Response.json({ error: "No autoritzat." }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Acció no vàlida." }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const { data, error } = parsed.data.source === "flag"
    ? await admin.rpc("moderate_user_finding", {
      p_flag_id: parsed.data.id,
      p_action: parsed.data.action,
      p_moderator_id: moderator.id,
    })
    : await admin.rpc("moderate_finding_abuse_signal", {
      p_signal_id: parsed.data.id,
      p_action: parsed.data.action,
      p_moderator_id: moderator.id,
    });
  if (error) return Response.json({ error: "No s’ha pogut resoldre l’avís." }, { status: 500 });
  return data ? Response.json({ ok: true }) : Response.json({ error: "Avís no trobat." }, { status: 404 });
}
