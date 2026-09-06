import { loadBucketedCells, type BucketNetworkGate } from "@/src/lib/bucket-loader";
import { predictionBucketUrl } from "@/src/lib/map-request-url";
import type { PredictionMapCell, PredictionTimelineOffset, SpatialBounds, SpatialGridSizeM } from "@/src/lib/types";

export const TIMELINE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3, 4, 5] as const;

export function nextTimelineOffset(offset: PredictionTimelineOffset): PredictionTimelineOffset {
  return TIMELINE_OFFSETS[(TIMELINE_OFFSETS.indexOf(offset) + 1) % TIMELINE_OFFSETS.length];
}

/** Buffer at most two upcoming frames, one bucket at a time, behind visible work. */
export async function prefetchTimelineFrames({
  buckets, speciesId, offset, signal, store, inFlight, networkGate, remember,
}: {
  buckets: (offset: PredictionTimelineOffset) => { bounds: SpatialBounds[]; resolution: SpatialGridSizeM };
  speciesId: string;
  offset: PredictionTimelineOffset;
  signal: AbortSignal;
  store: Map<string, PredictionMapCell[]>;
  inFlight: Map<string, Promise<void>>;
  networkGate: BucketNetworkGate;
  remember: (url: string, cells: PredictionMapCell[]) => void;
}) {
  let target = offset;
  for (let frame = 0; frame < 2; frame++) {
    if (signal.aborted) return;
    target = nextTimelineOffset(target);
    const { bounds, resolution } = buckets(target);
    for (const bucket of bounds) {
      if (signal.aborted) return;
      const url = predictionBucketUrl(bucket, speciesId, resolution, target);
      if (store.has(url)) continue;
      // Only one speculative request can occupy the shared gate. A foreground
      // frame may adopt it through inFlight; its paid-for response must survive
      // prefetch cancellation and be stored before that foreground waiter resumes.
      await loadBucketedCells<PredictionMapCell>([bucket], () => url, signal,
        (payload) => { if (!payload.truncated) remember(url, payload.cells); },
        { inFlight, networkGate, attempts: 1, persistAfterAbort: true });
    }
  }
}
