import type { NextRequest } from "next/server";
import { z } from "zod";

import { getCatalogueSpecies } from "@/data/catalogue";
import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import { dateInCatalonia } from "@/src/lib/buffer-client";
import { instagramSpeciesPublicationForDate } from "@/src/lib/instagram-species-series";
import {
  deleteInstagramSpeciesPublicationOverride,
  saveInstagramSpeciesPublicationOverride,
} from "@/src/lib/instagram-species-publication-controls.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const saveSchema = z.object({
  captionOverride: z.string().trim().max(2100).nullable(),
  publicationDate: dateSchema,
  speciesId: z.string().trim().max(100).nullable(),
  status: z.enum(["scheduled", "cancelled"]),
}).strict();
const deleteSchema = z.object({ publicationDate: dateSchema }).strict();

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

async function administrator(request: NextRequest) {
  if (!isSameOrigin(request)) return null;
  const user = await getAuthenticatedUser();
  return user && userHasAppRole(user, APP_ROLES.admin) ? user : null;
}

function validFuturePublicationDate(publicationDate: string) {
  if (publicationDate < dateInCatalonia(new Date())) return false;
  try {
    instagramSpeciesPublicationForDate(publicationDate);
    return true;
  } catch {
    return false;
  }
}

export async function PATCH(request: NextRequest) {
  const user = await administrator(request);
  if (!user) return noStoreJson({ error: "No autoritzat." }, 403);
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validFuturePublicationDate(parsed.data.publicationDate)) {
    return noStoreJson({ error: "La publicació no és vàlida o ja ha passat." }, 400);
  }
  if (parsed.data.speciesId && !getCatalogueSpecies(parsed.data.speciesId)) {
    return noStoreJson({ error: "L’espècie no forma part del catàleg." }, 400);
  }

  try {
    const saved = await saveInstagramSpeciesPublicationOverride({
      ...parsed.data,
      captionOverride: parsed.data.captionOverride || null,
      speciesId: parsed.data.speciesId || null,
      updatedBy: user.id,
    });
    return noStoreJson({ override: saved });
  } catch (error) {
    console.error("Instagram species publication override save failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson({ error: "No s’han pogut desar els canvis." }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await administrator(request);
  if (!user) return noStoreJson({ error: "No autoritzat." }, 403);
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !validFuturePublicationDate(parsed.data.publicationDate)) {
    return noStoreJson({ error: "La publicació no és vàlida o ja ha passat." }, 400);
  }

  try {
    await deleteInstagramSpeciesPublicationOverride(parsed.data.publicationDate);
    return noStoreJson({ restored: true });
  } catch (error) {
    console.error("Instagram species publication override restore failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson({ error: "No s’ha pogut restaurar la publicació." }, 503);
  }
}
