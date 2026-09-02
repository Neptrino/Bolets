import { NextRequest } from "next/server";

import { bufferInstagramPublisherConfig, BufferPublicationError } from "@/src/lib/buffer-client";
import { publishPinnedInstagramPosts } from "@/src/lib/buffer-instagram-pinned-publisher";
import { isOperationalSessionAuthorized } from "@/src/lib/operational-status-auth";
import { absoluteUrl } from "@/src/lib/seo";
import { pinnedInstagramImagePath } from "@/src/lib/social-growth-assets";

export const runtime = "nodejs";

let activePublication: Promise<Awaited<ReturnType<typeof publishPinnedInstagramPosts>>> | null = null;

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")
    ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?? new URL(request.url).protocol.slice(0, -1);
  if (!origin || !forwardedHost) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === forwardedHost && parsed.protocol === `${forwardedProtocol}:`;
  } catch {
    return false;
  }
}

async function runPublication() {
  return publishPinnedInstagramPosts({
    config: bufferInstagramPublisherConfig(),
    imageUrlForSeries: (series) => absoluteUrl(pinnedInstagramImagePath(series)),
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return noStoreJson({ error: "Invalid request origin" }, 403);
  if (!await isOperationalSessionAuthorized()) {
    return noStoreJson({ error: "Authentication required" }, 401);
  }

  try {
    if (!activePublication) {
      activePublication = runPublication().finally(() => {
        activePublication = null;
      });
    }
    return noStoreJson(await activePublication);
  } catch (error) {
    const publicationError = error instanceof BufferPublicationError ? error : null;
    console.error("Pinned Instagram publication failed", {
      code: publicationError?.code ?? "instagram_pinned_publication_failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson(
      {
        error: publicationError?.code ?? "instagram_pinned_publication_failed",
        message: publicationError?.message ?? "The pinned Instagram posts could not be created",
      },
      publicationError?.status ?? 500,
    );
  }
}
