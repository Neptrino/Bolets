import { loadDailyShareCard } from "@/src/lib/daily-share-cards";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import {
  bufferInstagramPublisherConfig,
  BufferPublicationError,
  isInstagramPublishRequestAuthorized,
  publishDailyInstagramPrediction,
} from "@/src/lib/buffer-instagram-publisher";
import { absoluteUrl } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let activePublication: Promise<Awaited<ReturnType<typeof publishDailyInstagramPrediction>>> | null = null;

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function runPublication() {
  const card = await loadDailyShareCard("catalunya");
  if (!card) {
    throw new BufferPublicationError(
      "The Catalonia daily prediction card is unavailable",
      503,
      "prediction_unavailable",
    );
  }
  const imageUrl = absoluteUrl(signedDailyShareImagePath(card, "feed"));
  const storyImageUrl = absoluteUrl(signedDailyShareImagePath(card, "story"));
  return publishDailyInstagramPrediction({
    card,
    config: bufferInstagramPublisherConfig(),
    imageUrl,
    storyImageUrl,
  });
}

export async function POST(request: Request) {
  if (!isInstagramPublishRequestAuthorized(request.headers)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    if (!activePublication) {
      activePublication = runPublication().finally(() => {
        activePublication = null;
      });
    }
    const result = await activePublication;
    return noStoreJson(result);
  } catch (error) {
    const publicationError = error instanceof BufferPublicationError ? error : null;
    console.error("Daily Instagram publication failed", {
      code: publicationError?.code ?? "instagram_publication_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson(
      {
        error: publicationError?.code ?? "instagram_publication_failed",
        message: publicationError?.message ?? "The daily prediction could not be published",
      },
      publicationError?.status ?? 500,
    );
  }
}
