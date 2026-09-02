import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import {
  BufferPublicationError,
  createBufferInstagramPost,
  dateInCatalonia,
  findInstagramChannel,
  readRecentInstagramPosts,
  weekdayInCatalonia,
  type BufferInstagramPublisherConfig,
} from "@/src/lib/buffer-client";
import { instagramEducationTopicForDate } from "@/src/lib/instagram-education";
import { instagramSpeciesPublicationForDate } from "@/src/lib/instagram-species-series";

export type InstagramGrowthPublication = "education" | "species" | "weekend";

const publicationConfig = {
  education: {
    markerLabel: "Publicació educativa",
    weekdays: ["Wed"],
  },
  species: {
    markerLabel: "Fitxa d’espècie",
    weekdays: ["Mon", "Thu"],
  },
  weekend: {
    markerLabel: "Previsió del cap de setmana",
    weekdays: ["Fri"],
  },
} satisfies Record<InstagramGrowthPublication, { markerLabel: string; weekdays: string[] }>;

export function instagramGrowthMarker(kind: InstagramGrowthPublication, publicationDate: string) {
  return `${publicationConfig[kind].markerLabel} · ${publicationDate}`;
}

function educationCaption(card: DailyShareCard, publicationDate: string) {
  const topic = instagramEducationTopicForDate(publicationDate);
  const reading = card.readings[0];
  const today = reading
    ? `La lectura territorial més alta d’avui és ${reading.score}/100 per a ${reading.speciesName} a ${reading.regionName}.`
    : "Avui no hi ha una lectura territorial favorable publicable.";
  return `${topic.captionIntro}\n\n${today}\n\n${topic.captionBody} Desplaça per veure la lliçó completa.\n\nLectura completa a l’enllaç del perfil → @bolets.app\n\n${instagramGrowthMarker("education", publicationDate)}\n#BoletsAtles #Micologia #BoletsCatalunya #Bosc`;
}

function weekendCaption(card: DailyShareCard, publicationDate: string) {
  const highlights = card.readings.slice(0, 3).map(
    (reading) => `${reading.regionName}: ${reading.speciesName} · ${reading.score}/100`,
  ).join("\n");
  return `Com arriben les condicions al cap de setmana?\n\n${highlights || "Sense condicions favorables publicables avui."}\n\nAquesta és la lectura verificada d’avui, no una confirmació de presència. Revisa el mapa abans de sortir perquè les dades evolucionen.\n\nMapa complet a l’enllaç del perfil → @bolets.app\n\n${instagramGrowthMarker("weekend", publicationDate)}\n#BoletsAtles #BoletsCatalunya #CapDeSetmana #Micologia`;
}

function speciesCaption(publicationDate: string) {
  const publication = instagramSpeciesPublicationForDate(publicationDate);
  const profile = publication.profile;
  const keys = profile.keyFeatures.join(" · ");
  const comparison = profile.lookalike
    ? `Compara’l especialment amb ${profile.lookalike.commonName}.`
    : "Confirma sempre més d’un tret abans d’identificar-lo.";
  return `${publication.position}/${publication.total} · ${profile.commonName}\n${profile.scientificName}\n\n${profile.shortDescription}\n\nClaus d’identificació: ${keys}. ${comparison}\n\n${profile.edibilityLabel}. La comestibilitat només és rellevant després d’una identificació segura.\n\nFitxa completa a l’enllaç del perfil → @bolets.app\n\n${instagramGrowthMarker("species", publicationDate)}\n#BoletsAtles #BoletsCatalunya #Micologia #IdentificacioDeBolets`;
}

export function instagramGrowthCaption(
  kind: InstagramGrowthPublication,
  card: DailyShareCard,
  publicationDate: string,
) {
  if (kind === "education") return educationCaption(card, publicationDate);
  if (kind === "species") return speciesCaption(publicationDate);
  return weekendCaption(card, publicationDate);
}

export async function publishInstagramGrowthPost({
  card,
  config,
  educationImageUrls,
  fetchImpl = fetch,
  kind,
  now = new Date(),
  reelUrl,
  speciesImageUrls,
}: {
  card: DailyShareCard;
  config: BufferInstagramPublisherConfig;
  educationImageUrls?: string[];
  fetchImpl?: typeof fetch;
  kind: InstagramGrowthPublication;
  now?: Date;
  reelUrl?: string;
  speciesImageUrls?: string[];
}) {
  if (!card.available || !card.observedAt || card.isPreview) {
    throw new BufferPublicationError(
      "There is no verified current prediction for the growth publication",
      503,
      "prediction_unavailable",
    );
  }

  const publicationDate = dateInCatalonia(new Date(card.observedAt));
  if (publicationDate !== dateInCatalonia(now)) {
    throw new BufferPublicationError(
      "The latest verified prediction is stale",
      503,
      "prediction_stale",
    );
  }
  if (!publicationConfig[kind].weekdays.includes(weekdayInCatalonia(now))) {
    throw new BufferPublicationError(
      `The ${kind} publication may only run on its scheduled weekday`,
      409,
      "instagram_growth_off_schedule",
    );
  }
  if (kind === "education" && educationImageUrls?.length !== 5) {
    throw new BufferPublicationError(
      "The educational carousel requires exactly five signed images",
      500,
      "instagram_growth_assets_invalid",
    );
  }
  if (kind === "species" && speciesImageUrls?.length !== 5) {
    throw new BufferPublicationError(
      "The species carousel requires exactly five signed images",
      500,
      "instagram_growth_assets_invalid",
    );
  }
  if (kind === "weekend" && !reelUrl) {
    throw new BufferPublicationError(
      "The weekend Reel requires a signed video URL",
      500,
      "instagram_growth_assets_invalid",
    );
  }

  const caption = instagramGrowthCaption(kind, card, publicationDate);
  if (caption.length > 2_200) {
    throw new BufferPublicationError(
      "The Instagram growth caption exceeds 2,200 characters",
      500,
      "instagram_caption_too_long",
    );
  }

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const marker = instagramGrowthMarker(kind, publicationDate);
  const posts = await readRecentInstagramPosts({
    channelId,
    config,
    fetchImpl,
    organizationId,
  });
  const existing = posts.find(
    (post) => typeof post.text === "string" && post.text.includes(marker),
  );
  if (typeof existing?.id === "string") {
    return { status: "already_published" as const, postId: existing.id, publicationDate, kind };
  }

  const carouselImageUrls = kind === "education" ? educationImageUrls : speciesImageUrls;
  const assets = kind === "weekend"
    ? [{ video: { url: reelUrl! } }]
    : carouselImageUrls!.map((url) => ({ image: { url } }));
  const postId = await createBufferInstagramPost({
    assets,
    caption,
    channelId,
    config,
    fetchImpl,
    type: kind === "weekend" ? "reel" : "post",
  });
  return { status: "published" as const, postId, publicationDate, kind };
}
