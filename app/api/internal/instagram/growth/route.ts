import { socialGrowthSlideCount } from "@/components/social-growth-card";
import {
  BufferPublicationError,
  bufferInstagramPublisherConfig,
  isInstagramPublishRequestAuthorized,
} from "@/src/lib/buffer-client";
import {
  publishInstagramGrowthPost,
  type InstagramGrowthPublication,
} from "@/src/lib/buffer-instagram-growth-publisher";
import { loadDailyShareCard } from "@/src/lib/daily-share-cards";
import {
  signedSocialGrowthImagePath,
  signedWeekendReelPath,
} from "@/src/lib/social-growth-assets";
import { absoluteUrl } from "@/src/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const activePublications = new Map<InstagramGrowthPublication, Promise<unknown>>();

function isGrowthPublication(value: unknown): value is InstagramGrowthPublication {
  return value === "education" || value === "weekend";
}

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function runPublication(kind: InstagramGrowthPublication) {
  const card = await loadDailyShareCard("catalunya");
  if (!card) {
    throw new BufferPublicationError(
      "The Catalonia prediction card is unavailable",
      503,
      "prediction_unavailable",
    );
  }
  return publishInstagramGrowthPost({
    card,
    config: bufferInstagramPublisherConfig(),
    educationImageUrls: kind === "education"
      ? Array.from(
          { length: socialGrowthSlideCount("education") },
          (_, index) => absoluteUrl(signedSocialGrowthImagePath(card, "education", index + 1)),
        )
      : undefined,
    kind,
    reelUrl: kind === "weekend" ? absoluteUrl(signedWeekendReelPath(card)) : undefined,
  });
}

export async function POST(request: Request) {
  if (!isInstagramPublishRequestAuthorized(request.headers)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  let kind: InstagramGrowthPublication | null = null;
  try {
    const payload = await request.json() as { kind?: unknown };
    kind = isGrowthPublication(payload.kind) ? payload.kind : null;
  } catch {
    // Invalid JSON is handled by the same bounded validation response below.
  }
  if (!kind) return noStoreJson({ error: "invalid_publication_kind" }, 400);

  try {
    let publication = activePublications.get(kind);
    if (!publication) {
      publication = runPublication(kind).finally(() => {
        activePublications.delete(kind);
      });
      activePublications.set(kind, publication);
    }
    return noStoreJson(await publication);
  } catch (error) {
    const publicationError = error instanceof BufferPublicationError ? error : null;
    console.error("Instagram growth publication failed", {
      code: publicationError?.code ?? "instagram_growth_publication_failed",
      kind,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson(
      {
        error: publicationError?.code ?? "instagram_growth_publication_failed",
        message: publicationError?.message ?? "The Instagram publication could not be created",
      },
      publicationError?.status ?? 500,
    );
  }
}
