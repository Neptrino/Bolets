import { findingPrivacyPatchSchema } from "@/src/lib/findings/schema";
import { readPublicFinding } from "@/src/lib/findings/reads.server";
import { assertFindingOwner, updateFindingPrivacy } from "@/src/lib/findings/mutations.server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const finding = await readPublicFinding(id);
  return finding ? Response.json(finding, { headers: { "Cache-Control": "public, s-maxage=300" } }) : Response.json({ error: "Troballa no trobada." }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  const { id } = await context.params;
  if (!await assertFindingOwner(id, user.id)) return Response.json({ error: "Troballa no trobada." }, { status: 404 });
  const parsed = findingPrivacyPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "El canvi de privacitat no és vàlid." }, { status: 400 });
  try {
    const oneKmAccessUntil = await updateFindingPrivacy(
      id,
      user.id,
      parsed.data.visibility,
      parsed.data.showAlias,
    );
    return Response.json({ ok: true, oneKmAccessUntil });
  } catch {
    return Response.json({ error: "No s’ha pogut canviar la privacitat." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  const { id } = await context.params;
  const owned = await assertFindingOwner(id, user.id);
  if (!owned) return Response.json({ error: "Troballa no trobada." }, { status: 404 });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("remove_owner_finding", {
    p_finding_id: id,
    p_owner_id: user.id,
  });
  const removal = data?.[0] as {
    removal_mode: "deleted" | "withdrawn";
    storage_paths: string[];
  } | undefined;
  if (error || !removal) {
    console.error("[api/findings/:id] database removal failed", {
      findingId: id,
      error: error?.message ?? "No row returned",
    });
    return Response.json({ error: "No s’ha pogut eliminar la troballa." }, { status: 400 });
  }

  if (removal.storage_paths.length) {
    const storageRemoval = await admin.storage.from("finding-photos").remove(removal.storage_paths);
    if (storageRemoval.error) {
      console.error("[api/findings/:id] storage cleanup failed after removal", {
        findingId: id,
        paths: removal.storage_paths.length,
        error: storageRemoval.error.message,
      });
      return Response.json({
        ok: true,
        removalMode: removal.removal_mode,
        warning: "La troballa s’ha eliminat, però queda pendent completar la neteja de les fotos.",
      });
    }
  }

  return Response.json({ ok: true, removalMode: removal.removal_mode });
}
