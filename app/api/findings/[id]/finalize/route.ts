import sharp from "sharp";
import { findingFinalizeSchema } from "@/src/lib/findings/schema";
import { assertFindingOwner, grantFindingMapAccess, publishFinding } from "@/src/lib/findings/mutations.server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió per publicar la troballa." }, { status: 401 });
  const { id } = await context.params;
  const owned = await assertFindingOwner(id, user.id);
  if (!owned) return Response.json({ error: "Troballa no trobada." }, { status: 404 });
  if (owned.publication_state === "published") {
    const oneKmAccessUntil = await grantFindingMapAccess(id, user.id);
    return Response.json({ id, state: "published", oneKmAccessUntil });
  }
  const parsed = findingFinalizeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "La llista de fotografies no és vàlida." }, { status: 400 });
  const uniquePositions = new Set(parsed.data.photos.map((photo) => photo.position));
  if (uniquePositions.size !== parsed.data.photos.length) return Response.json({ error: "Hi ha fotografies duplicades." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const processed: Array<typeof parsed.data.photos[number] & { path: string; width: number; height: number; byteSize: number }> = [];
  try {
    for (const photo of parsed.data.photos) {
      const expected = `${user.id}/${id}/${photo.id}.webp`;
      if (photo.stagingPath !== expected) throw new Error("La fotografia no pertany a aquesta troballa.");
      const staged = await admin.storage.from("finding-photo-staging").download(expected);
      if (staged.error || !staged.data) throw new Error("No s’ha trobat una fotografia pendent.");
      const output = await sharp(await staged.data.arrayBuffer()).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const metadata = await sharp(output).metadata();
      if (!metadata.width || !metadata.height || output.byteLength > 4_194_304) throw new Error("La fotografia processada és massa gran.");
      const finalPath = `${id}/${photo.id}.webp`;
      const upload = await admin.storage.from("finding-photos").upload(finalPath, output, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
      if (upload.error) throw new Error("No s’ha pogut protegir la fotografia.");
      processed.push({ ...photo, path: finalPath, width: metadata.width, height: metadata.height, byteSize: output.byteLength });
    }
    const oneKmAccessUntil = await publishFinding(id, user.id, processed);
    if (parsed.data.photos.length) await admin.storage.from("finding-photo-staging").remove(parsed.data.photos.map((photo) => photo.stagingPath));
    return Response.json({ id, state: "published", oneKmAccessUntil });
  } catch (error) {
    if (processed.length) await admin.storage.from("finding-photos").remove(processed.map((photo) => photo.path));
    return Response.json({ error: error instanceof Error ? error.message : "No s’ha pogut publicar la troballa." }, { status: 400 });
  }
}
