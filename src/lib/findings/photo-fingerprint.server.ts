import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { hammingDistance } from "@/src/lib/findings/photo-fingerprint";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function fingerprintFindingPhoto(output: Buffer, ownerId: string) {
  const contentSha256 = createHash("sha256").update(output).digest("hex");
  const pixels = await sharp(output)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      bits <<= 1n;
      if (pixels[row * 9 + column] > pixels[row * 9 + column + 1]) bits |= 1n;
    }
  }
  const perceptualHash = bits.toString(16).padStart(16, "0");

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("inspect_finding_photo_fingerprint", {
    p_owner_id: ownerId,
    p_content_sha256: contentSha256,
  });
  if (error) throw new Error("No s’ha pogut comprovar la fotografia.");
  const row = (Array.isArray(data) ? data[0] : data) as {
    exact_other?: boolean;
    exact_self?: boolean;
    perceptual_hashes?: string[];
  } | null;
  if (row?.exact_other) throw new Error("Aquesta mateixa imatge ja s’ha publicat des d’un altre compte.");
  const near = (row?.perceptual_hashes ?? []).some((hash) => hammingDistance(hash, perceptualHash) <= 6);
  return {
    contentSha256,
    perceptualHash,
    duplicateReviewState: row?.exact_self ? "exact_self" as const : near ? "near" as const : "clear" as const,
  };
}
