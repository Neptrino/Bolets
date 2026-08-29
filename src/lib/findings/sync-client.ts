"use client";

import * as tus from "tus-js-client";
import { publicSupabaseConfig } from "@/src/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";
import { deleteOutboxFinding, listOutboxFindings, updateOutboxFinding } from "@/src/lib/findings/outbox";
import type { FindingOutboxRecord, FindingPhotoUpload } from "@/src/lib/findings/types";

function uploadPhoto(blob: Blob, path: string, accessToken: string) {
  const { url } = publicSupabaseConfig();
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${accessToken}`, "x-upsert": "true" },
      metadata: { bucketName: "finding-photo-staging", objectName: path, contentType: "image/webp", cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      removeFingerprintOnSuccess: true,
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}

async function syncRecord(record: FindingOutboxRecord, accessToken: string, userId: string) {
  await updateOutboxFinding(record.draft.clientReportId, { state: "syncing", error: null });
  const begin = await fetch("/api/findings/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record.draft) });
  const beginBody = await begin.json();
  if (!begin.ok) throw new Error(beginBody.error ?? "No s’ha pogut iniciar la sincronització.");
  if (beginBody.state === "published") {
    await deleteOutboxFinding(record.draft.clientReportId);
    return;
  }
  const findingId = beginBody.id as string;
  await updateOutboxFinding(record.draft.clientReportId, { serverFindingId: findingId });
  const photos: FindingPhotoUpload[] = [];
  for (const photo of record.photos) {
    const path = `${userId}/${findingId}/${photo.id}.webp`;
    await uploadPhoto(photo.blob, path, accessToken);
    photos.push({ id: photo.id, stagingPath: path, position: photo.position });
  }
  const finalize = await fetch(`/api/findings/${findingId}/finalize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photos }) });
  const finalizeBody = await finalize.json();
  if (!finalize.ok) throw new Error(finalizeBody.error ?? "No s’ha pogut publicar la troballa.");
  await deleteOutboxFinding(record.draft.clientReportId);
}

export async function syncFindingOutbox() {
  if (!navigator.onLine) return { synced: 0, pending: (await listOutboxFindings()).length, needsLogin: false };
  const client = createSupabaseBrowserClient();
  const { data } = await client.auth.getSession();
  const records = await listOutboxFindings();
  if (!data.session) return { synced: 0, pending: records.length, needsLogin: records.length > 0 };
  let synced = 0;
  for (const record of records) {
    try {
      await syncRecord(record, data.session.access_token, data.session.user.id);
      synced += 1;
    } catch (error) {
      await updateOutboxFinding(record.draft.clientReportId, { state: "failed", error: error instanceof Error ? error.message : "Error de sincronització" });
    }
  }
  return { synced, pending: (await listOutboxFindings()).length, needsLogin: false };
}
