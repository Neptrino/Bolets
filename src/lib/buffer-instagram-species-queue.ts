import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import {
  BufferPublicationError,
  createBufferInstagramPost,
  dateInCatalonia,
  findInstagramChannel,
  readRecentInstagramPosts,
  type BufferInstagramPublisherConfig,
} from "@/src/lib/buffer-client";
import { instagramSpeciesPublicationForSpecies } from "@/src/lib/instagram-species-series";

export function instagramSpeciesQueueMarker(speciesId: string) {
  const { profile } = instagramSpeciesPublicationForSpecies(speciesId);
  return `Fitxa d’espècie · ${profile.scientificName}`;
}

export function instagramSpeciesQueueCaption(
  speciesId: string,
  captionOverride?: string | null,
) {
  const publication = instagramSpeciesPublicationForSpecies(speciesId);
  const profile = publication.profile;
  const marker = instagramSpeciesQueueMarker(speciesId);
  const customCaption = captionOverride?.trim();
  if (customCaption) {
    return customCaption.includes(marker) ? customCaption : `${customCaption}\n\n${marker}`;
  }

  const keys = profile.keyFeatures.join(" · ");
  const comparison = profile.lookalike
    ? `Compara’l especialment amb ${profile.lookalike.commonName}.`
    : "Confirma sempre més d’un tret abans d’identificar-lo.";
  return `${publication.position}/${publication.total} · ${profile.commonName}\n${profile.scientificName}\n\n${profile.shortDescription}\n\nClaus d’identificació: ${keys}. ${comparison}\n\n${profile.edibilityLabel}. La comestibilitat només és rellevant després d’una identificació segura.\n\nFitxa completa a l’enllaç del perfil → @bolets.app\n\n${marker}\n#BoletsAtles #BoletsCatalunya #Micologia #IdentificacioDeBolets`;
}

export async function queueInstagramSpeciesPost({
  card,
  captionOverride,
  config,
  fetchImpl = fetch,
  imageUrls,
  now = new Date(),
  speciesId,
}: {
  card: DailyShareCard;
  captionOverride?: string | null;
  config: BufferInstagramPublisherConfig;
  fetchImpl?: typeof fetch;
  imageUrls: string[];
  now?: Date;
  speciesId: string;
}) {
  if (!card.available || !card.observedAt || card.isPreview) {
    throw new BufferPublicationError(
      "There is no verified current prediction for the species carousel",
      503,
      "prediction_unavailable",
    );
  }
  if (dateInCatalonia(new Date(card.observedAt)) !== dateInCatalonia(now)) {
    throw new BufferPublicationError(
      "The latest verified prediction is stale",
      503,
      "prediction_stale",
    );
  }
  if (imageUrls.length !== 5) {
    throw new BufferPublicationError(
      "The species carousel requires exactly five signed images",
      500,
      "instagram_growth_assets_invalid",
    );
  }

  const caption = instagramSpeciesQueueCaption(speciesId, captionOverride);
  if (caption.length > 2_200) {
    throw new BufferPublicationError(
      "The Instagram species caption exceeds 2,200 characters",
      400,
      "instagram_caption_too_long",
    );
  }

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const marker = instagramSpeciesQueueMarker(speciesId);
  const posts = await readRecentInstagramPosts({
    channelId,
    config,
    fetchImpl,
    organizationId,
    first: 100,
  });
  const existing = posts.find(
    (post) => typeof post.text === "string" && post.text.includes(marker),
  );
  if (typeof existing?.id === "string") {
    return { status: "already_queued" as const, postId: existing.id, speciesId };
  }

  const postId = await createBufferInstagramPost({
    assets: imageUrls.map((url) => ({ image: { url } })),
    caption,
    channelId,
    config,
    fetchImpl,
    mode: "addToQueue",
    type: "post",
  });
  return { status: "queued" as const, postId, speciesId };
}
