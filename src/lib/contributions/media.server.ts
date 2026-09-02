import "server-only";

import sharp from "sharp";
import {
  CONTRIBUTION_MEDIA_MAX_BYTES,
  type ContributionMediaUpload,
} from "@/src/lib/contributions";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const MAX_INPUT_PIXELS = 40_000_000;

type ProtectedContributionMedia = ContributionMediaUpload & {
  path: string;
  width: number;
  height: number;
  byteSize: number;
};

function assertOwnedStagingPath(userId: string, media: ContributionMediaUpload) {
  const [pathUserId, , filename] = media.stagingPath.split("/");
  if (pathUserId !== userId || filename !== `${media.id}.webp`) {
    throw new Error("La fotografia no pertany a aquest compte.");
  }
}

export async function protectContributionMedia(
  userId: string,
  requestId: string,
  media: ContributionMediaUpload[],
) {
  media.forEach((item) => assertOwnedStagingPath(userId, item));
  const admin = createSupabaseAdminClient();
  const processed: ProtectedContributionMedia[] = [];
  const stagingPaths = media.map((item) => item.stagingPath);

  try {
    for (const item of media) {
      const staged = await admin.storage.from("finding-photo-staging").download(item.stagingPath);
      if (staged.error || !staged.data) throw new Error("No s’ha trobat una fotografia pendent.");

      const output = await sharp(await staged.data.arrayBuffer(), {
        failOn: "warning",
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const metadata = await sharp(output).metadata();
      if (!metadata.width || !metadata.height || output.byteLength > CONTRIBUTION_MEDIA_MAX_BYTES) {
        throw new Error("La fotografia processada és massa gran.");
      }

      const finalPath = `${requestId}/${item.id}.webp`;
      const upload = await admin.storage.from("contribution-media").upload(finalPath, output, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) throw new Error("No s’ha pogut protegir la fotografia.");
      processed.push({
        ...item,
        path: finalPath,
        width: metadata.width,
        height: metadata.height,
        byteSize: output.byteLength,
      });
    }

    const { error } = await admin.from("contribution_request_media").insert(processed.map((item) => ({
      id: item.id,
      request_id: requestId,
      storage_path: item.path,
      position: item.position,
      width: item.width,
      height: item.height,
      byte_size: item.byteSize,
    })));
    if (error) throw error;
  } catch (error) {
    if (processed.length) {
      await admin.storage.from("contribution-media").remove(processed.map((item) => item.path));
    }
    throw error;
  } finally {
    if (stagingPaths.length) {
      await admin.storage.from("finding-photo-staging").remove(stagingPaths);
    }
  }
}
