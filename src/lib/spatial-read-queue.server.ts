import "server-only";
import { createBoundedWorkQueue } from "@/supabase/functions/_shared/bounded-work-queue";

// Shared across buckets/species in this process. Keep a slot for current reads.
// Callers must consume and validate the body inside the slot, not just headers.
export const runSpatialRead = createBoundedWorkQueue({
  concurrency: 2, backgroundConcurrency: 1, maxQueued: 64, maxWaitMs: 8_000,
});
