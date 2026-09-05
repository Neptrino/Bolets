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

export type InstagramGrowthPublication = "education" | "weekend";

const publicationConfig = {
  education: {
    markerLabel: "Publicació educativa",
    weekdays: ["Wed"],
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
  if (topic.source) {
    return `${topic.captionIntro}\n\n${topic.captionBody}\n\nDesa la pauta per a la pròxima sortida. Guia: bolets.app${topic.guidePath}\nGuies a l’enllaç del perfil → @bolets.app\n\nFont: ${topic.source.label} — ${topic.source.url}\nPauta d’observació, sense revisió micològica independent. No confirma identificació ni comestibilitat.\n\n${instagramGrowthMarker("education", publicationDate)}\n#BoletsAtles #Micologia #BoletsCatalunya #Bosc`;
  }
  const reading = card.readings[0];
  const today = reading
    ? `La lectura territorial més alta d’avui és ${reading.score}/100 per a ${reading.speciesName} a ${reading.regionName}.`
    : "Avui no hi ha una lectura territorial favorable publicable.";
  return `${topic.captionIntro}\n\n${today}\n\n${topic.captionBody} Desplaça per veure la lliçó completa.\n\nLectura completa a l’enllaç del perfil → @bolets.app\n\n${instagramGrowthMarker("education", publicationDate)}\n#BoletsAtles #Micologia #BoletsCatalunya #Bosc`;
}

function weekendCaption(card: DailyShareCard, publicationDate: string) {
  const highlights = card.readings.slice(0, 3).map(
    (reading) => `${reading.regionName}: ${reading.speciesName} · ${reading.score}/100 al millor sector · ${Math.round(reading.positiveCellShare * 100)}% amb senyal`,
  ).join("\n");
  return `Aquest cap de setmana, bolets? Mira el senyal abans de sortir.\n\n${highlights || "Sense condicions favorables publicables avui."}\n\nAquesta és la lectura verificada d’avui, no una confirmació de presència. Revisa el mapa abans de sortir perquè les dades evolucionen.\n\nDesa-ho per dissabte i envia-ho a qui vindrà amb tu.\nMapa complet a l’enllaç del perfil → @bolets.app\n\n${instagramGrowthMarker("weekend", publicationDate)}\n#BoletsAtles #BoletsCatalunya #CapDeSetmana #Micologia`;
}

export function instagramGrowthCaption(
  kind: InstagramGrowthPublication,
  card: DailyShareCard,
  publicationDate: string,
) {
  if (kind === "education") return educationCaption(card, publicationDate);
  return weekendCaption(card, publicationDate);
}

export async function publishInstagramGrowthPost({
  card,
  config,
  fetchImpl = fetch,
  kind,
  now = new Date(),
  reelUrl,
}: {
  card: DailyShareCard;
  config: BufferInstagramPublisherConfig;
  educationImageUrls?: string[];
  fetchImpl?: typeof fetch;
  kind: InstagramGrowthPublication;
  now?: Date;
  reelUrl?: string;
}) {
  if (kind === "education") {
    throw new BufferPublicationError("Educational publishing has been disabled", 410, "instagram_education_disabled");
  }
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

  const assets = [{ video: { url: reelUrl! } }];
  const postId = await createBufferInstagramPost({
    assets,
    caption,
    channelId,
    config,
    fetchImpl,
    type: "reel",
  });
  return { status: "published" as const, postId, publicationDate, kind };
}
