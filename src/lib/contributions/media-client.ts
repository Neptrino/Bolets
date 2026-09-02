"use client";

import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

export type PreparedContributionMedia = {
  id: string;
  blob: Blob;
  preview: string;
  position: number;
};

export async function uploadContributionMedia(media: PreparedContributionMedia[]) {
  const client = createSupabaseBrowserClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Inicia sessió de nou per enviar les fotografies.");
  const batchId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  try {
    for (const item of media) {
      const path = `${data.session.user.id}/${batchId}/${item.id}.webp`;
      const upload = await client.storage.from("finding-photo-staging").upload(path, item.blob, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });
      if (upload.error) throw new Error("No s’ha pogut pujar una de les fotografies.");
      uploadedPaths.push(path);
    }
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from("finding-photo-staging").remove(uploadedPaths);
    throw error;
  }

  return media.map((item, index) => ({
    id: item.id,
    position: item.position,
    stagingPath: uploadedPaths[index],
  }));
}

export async function removeStagedContributionMedia(paths: string[]) {
  if (!paths.length) return;
  const client = createSupabaseBrowserClient();
  await client.storage.from("finding-photo-staging").remove(paths);
}
