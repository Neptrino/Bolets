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
import { speciesPath } from "@/src/lib/seo";

export function instagramSpeciesQueueMarker(speciesId: string) {
  const { profile } = instagramSpeciesPublicationForSpecies(speciesId);
  return `Fitxa d’espècie · ${profile.scientificName}`;
}

function speciesHashtag(commonName: string) {
  return commonName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function lowerFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
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

  const cues = profile.keyFeatures.map((feature, index) => `${index + 1}. ${feature}`).join("\n");
  const comparison = profile.lookalike
    ? `Confusió habitual: ${lowerFirst(profile.lookalike.commonName)} (${profile.lookalike.scientificName}). ${profile.lookalike.mainDifferences}`
    : "Confirma sempre més d’un tret abans d’identificar-lo.";
  const context = [
    profile.habitatTypes.length > 0 ? lowerFirst(profile.habitatTypes.join(" i ")) : null,
    `millor moment ${profile.bestMonthsLabel}`,
    profile.altitude ? `entre ${profile.altitude[0]} i ${profile.altitude[1]} m` : null,
  ].filter(Boolean).join(" · ");
  const credit = profile.imageAttribution
    ? `\nFoto: ${profile.imageAttribution}${profile.imageLicense ? ` · ${profile.imageLicense}` : ""}`
    : "";
  const hashtags = [
    "#Bolets",
    "#BoletsCatalunya",
    `#${speciesHashtag(profile.commonName)}`,
    "#Micologia",
    "#IdentificacioDeBolets",
    "#BoletsApp",
  ];
  return `${profile.commonName} (${profile.scientificName}): guia ràpida d’identificació.\n\n${profile.shortDescription}\n\nTres trets per començar:\n${cues}\n\n${comparison}\n\nOn i quan: ${context}.\n\n${profile.edibilityLabel}. La comestibilitat només compta després d’una identificació segura; davant del dubte, no en mengis.\n\nFitxa completa, temporada i mapa de probabilitat: bolets.app${speciesPath(profile)} (enllaç al perfil)${credit}\n\n${marker}\n${hashtags.join(" ")}`;
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
