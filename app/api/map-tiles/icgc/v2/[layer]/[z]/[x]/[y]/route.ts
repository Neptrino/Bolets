import { unstable_cache } from "next/cache";
import sharp from "sharp";
import { getIcgcTile, type TileContext } from "@/src/lib/icgc-map-tile";
import { createBoundedWorkQueue, WorkQueueBusyError } from "@/supabase/functions/_shared/bounded-work-queue";

class TileError extends Error {
  constructor(readonly status: number) { super("Tile unavailable"); }
}

// Only cold tiles enter the queue. Cached encodings survive application restarts
// through Next's persistent data cache; concurrent misses share one conversion.
const encodeTile = createBoundedWorkQueue({ concurrency: 2, maxQueued: 64, maxWaitMs: 8_000 });
const loadTile = createBoundedWorkQueue({ concurrency: 16, maxQueued: 128, maxWaitMs: 8_000 });
const pending = new Map<string, Promise<string>>();
const readWebpTile = unstable_cache(async (params: Awaited<TileContext["params"]>) => {
  const key = JSON.stringify(params);
  const existing = pending.get(key);
  if (existing) return existing;
  const task = loadTile(async () => {
    const original = await getIcgcTile(new Request("https://bolets.invalid"), { params: Promise.resolve(params) });
    if (!original.ok) throw new TileError(original.status);
    const body = Buffer.from(await original.arrayBuffer());
    // Provider latency must not consume one of the scarce conversion slots.
    // Bound downloads separately, including their small queued image buffers.
    const image = await encodeTile(() => sharp(body, { limitInputPixels: 256 * 256 })
      .webp({ quality: 85, effort: 4 }).toBuffer());
    return image.toString("base64");
  });
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}, ["icgc-map-tiles-webp-q85-v2"], { revalidate: false });

export async function GET(_request: Request, context: TileContext) {
  try {
    const body = Buffer.from(await readWebpTile(await context.params), "base64");
    return new Response(body, { headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    } });
  } catch (error) {
    // Errors are thrown out of the cache function so provider failures and
    // capacity limits cannot become immutable cached tiles.
    const status = error instanceof TileError ? error.status : error instanceof WorkQueueBusyError ? 503 : 502;
    return Response.json({ error: "No s’ha pogut carregar la tessel·la." }, {
      status, headers: { "Cache-Control": "no-store" },
    });
  }
}
