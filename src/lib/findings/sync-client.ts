"use client";

import { publicSupabaseConfig } from "@/src/lib/supabase/config";
import { deleteOutboxFinding, listOutboxFindings, updateOutboxFinding } from "@/src/lib/findings/outbox";
import type { FindingOutboxRecord, FindingPhotoUpload } from "@/src/lib/findings/types";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

async function uploadPhoto(blob: Blob, path: string, accessToken: string) {
  const tus = await import("tus-js-client");
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

class TurnstileRequiredError extends Error {}

async function syncRecord(record: FindingOutboxRecord, accessToken: string, userId: string, turnstileToken?: string | null) {
  await updateOutboxFinding(record.draft.clientReportId, { state: "syncing", error: null });
  const begin = await fetch("/api/findings/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record.draft) });
  const beginBody = await begin.json();
  if (!begin.ok) throw new Error(beginBody.error ?? "No s’ha pogut iniciar la sincronització.");
  if (beginBody.state === "published") {
    await deleteOutboxFinding(record.draft.clientReportId);
    return null;
  }
  const findingId = beginBody.id as string;
  await updateOutboxFinding(record.draft.clientReportId, { serverFindingId: findingId });
  const photos: FindingPhotoUpload[] = [];
  for (const photo of record.photos) {
    const path = `${userId}/${findingId}/${photo.id}.webp`;
    await uploadPhoto(photo.blob, path, accessToken);
    photos.push({ id: photo.id, stagingPath: path, position: photo.position });
  }
  const finalize = await fetch(`/api/findings/${findingId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos, ...(turnstileToken ? { turnstileToken } : {}) }),
  });
  const finalizeBody = await finalize.json();
  if (finalizeBody.code === "turnstile_required") throw new TurnstileRequiredError(finalizeBody.error);
  if (!finalize.ok) throw new Error(finalizeBody.error ?? "No s’ha pogut publicar la troballa.");
  queueUmamiEvent(UMAMI_EVENTS.findingAdded);
  await deleteOutboxFinding(record.draft.clientReportId);
  return finalizeBody.oneKmAccessUntil as string | null;
}

let inFlightSync: Promise<FindingSyncResult> | null = null;

type FindingSyncResult = {
  synced: number;
  pending: number;
  needsLogin: boolean;
  turnstileRequired: boolean;
  oneKmAccessUntil: string | null;
};

// The report form, the background sync agent (mount, "online", visibility
// change) and the notebook page can all trigger a sync within the same second.
// Two overlapping runs finalize the same finding twice: the loser's cleanup
// removes the storage objects the winner just published, leaving a photo row
// whose file no longer exists. Serialize them so only one run is ever active.
export function syncFindingOutbox(turnstileToken?: string | null) {
  // A run without a token cannot consume the verification the caller holds,
  // so queue a fresh run behind it instead of handing back the shared result.
  if (inFlightSync && !turnstileToken) return inFlightSync;
  const previous = inFlightSync ?? Promise.resolve();
  const next: Promise<FindingSyncResult> = previous
    .then(() => runFindingOutboxSync(turnstileToken), () => runFindingOutboxSync(turnstileToken))
    .finally(() => { if (inFlightSync === next) inFlightSync = null; });
  inFlightSync = next;
  return next;
}

async function runFindingOutboxSync(turnstileToken?: string | null): Promise<FindingSyncResult> {
  const records = await listOutboxFindings();
  // Most public visitors have no pending finding. They need neither an auth
  // client nor a resumable upload library just to read the atlas.
  if (!records.length || !navigator.onLine) return { synced: 0, pending: records.length, needsLogin: false, turnstileRequired: false, oneKmAccessUntil: null };
  const { createSupabaseBrowserClient } = await import("@/src/lib/supabase/client");
  const client = createSupabaseBrowserClient();
  const { data } = await client.auth.getSession();
  if (!data.session) return { synced: 0, pending: records.length, needsLogin: records.length > 0, turnstileRequired: false, oneKmAccessUntil: null };
  let synced = 0;
  let oneKmAccessUntil: string | null = null;
  let turnstileRequired = false;
  for (const record of records) {
    try {
      oneKmAccessUntil = await syncRecord(record, data.session.access_token, data.session.user.id, turnstileToken) ?? oneKmAccessUntil;
      synced += 1;
    } catch (error) {
      if (error instanceof TurnstileRequiredError) {
        turnstileRequired = true;
        await updateOutboxFinding(record.draft.clientReportId, { state: "queued", error: error.message });
        break;
      }
      await updateOutboxFinding(record.draft.clientReportId, { state: "failed", error: error instanceof Error ? error.message : "Error de sincronització" });
    }
  }
  return { synced, pending: (await listOutboxFindings()).length, needsLogin: false, turnstileRequired, oneKmAccessUntil };
}
