import type { NextRequest } from "next/server";
import { z } from "zod";

import { getCatalogueSpecies } from "@/data/catalogue";
import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import {
  BufferPublicationError,
  bufferInstagramPublisherConfig,
  dateInCatalonia,
} from "@/src/lib/buffer-client";
import { queueInstagramSpeciesPost } from "@/src/lib/buffer-instagram-species-queue";
import { loadDailyShareCard } from "@/src/lib/daily-share-cards";
import { INSTAGRAM_SPECIES_SLIDE_COUNT } from "@/src/lib/instagram-species-series";
import { absoluteUrl } from "@/src/lib/seo";
import { signedSpeciesInstagramImagePath } from "@/src/lib/social-growth-assets";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const payloadSchema = z.object({
  captionOverride: z.string().trim().max(2100).nullable().optional(),
  speciesId: z.string().trim().min(1).max(100),
}).strict();

const activeSpecies = new Map<string, Promise<unknown>>();

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
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

async function isAdministrator(request: NextRequest) {
  if (!isSameOrigin(request)) return false;
  const user = await getAuthenticatedUser();
  return Boolean(user && userHasAppRole(user, APP_ROLES.admin));
}

async function queueSpecies(speciesId: string, captionOverride: string | null) {
  const card = await loadDailyShareCard("catalunya");
  if (!card?.observedAt) {
    throw new BufferPublicationError(
      "The Catalonia prediction card is unavailable",
      503,
      "prediction_unavailable",
    );
  }
  const publicationDate = dateInCatalonia(new Date(card.observedAt));
  const imageUrls = Array.from(
    { length: INSTAGRAM_SPECIES_SLIDE_COUNT },
    (_, index) => absoluteUrl(signedSpeciesInstagramImagePath(
      card,
      publicationDate,
      index + 1,
      speciesId,
    )),
  );
  return queueInstagramSpeciesPost({
    card,
    captionOverride,
    config: bufferInstagramPublisherConfig(),
    imageUrls,
    speciesId,
  });
}

export async function POST(request: NextRequest) {
  if (!await isAdministrator(request)) {
    return noStoreJson({ error: "No autoritzat." }, 403);
  }
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !getCatalogueSpecies(parsed.data.speciesId)) {
    return noStoreJson({ error: "L’espècie o el text no són vàlids." }, 400);
  }

  const { speciesId } = parsed.data;
  try {
    let publication = activeSpecies.get(speciesId);
    if (!publication) {
      publication = queueSpecies(speciesId, parsed.data.captionOverride?.trim() || null)
        .finally(() => activeSpecies.delete(speciesId));
      activeSpecies.set(speciesId, publication);
    }
    return noStoreJson(await publication);
  } catch (error) {
    const publicationError = error instanceof BufferPublicationError ? error : null;
    console.error("Instagram species queue failed", {
      code: publicationError?.code ?? "instagram_species_queue_failed",
      message: error instanceof Error ? error.message : "Unknown error",
      speciesId,
    });
    return noStoreJson(
      {
        error: publicationError?.code ?? "instagram_species_queue_failed",
        message: publicationError?.message ?? "No s’ha pogut afegir la publicació a Buffer.",
      },
      publicationError?.status ?? 500,
    );
  }
}
