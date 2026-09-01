import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { timingSafeEqual } from "node:crypto";

const INSTAGRAM_TIME_ZONE = "Europe/Madrid";
const BUFFER_API_URL = "https://api.buffer.com";

export interface BufferInstagramPublisherConfig {
  apiKey: string;
  apiUrl: string;
  channelName: string;
}

export type InstagramPublicationResult =
  | { status: "already_published"; publicationDate: string; postId: string | null }
  | { status: "published"; publicationDate: string; postId: string };

interface BufferGraphResponse<T> {
  data?: T;
  errors?: Array<{ message?: unknown }>;
}

interface BufferOrganization {
  id?: unknown;
  name?: unknown;
}

interface BufferChannel {
  id?: unknown;
  name?: unknown;
  service?: unknown;
  externalLink?: unknown;
  isDisconnected?: unknown;
  isLocked?: unknown;
  organizationId?: unknown;
}

interface BufferPost {
  id?: unknown;
  text?: unknown;
  status?: unknown;
}

export class BufferPublicationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "BufferPublicationError";
  }
}

function requiredEnvironmentValue(
  environment: Readonly<Record<string, string | undefined>>,
  name: string,
) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function bufferInstagramPublisherConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BufferInstagramPublisherConfig {
  return {
    apiKey: requiredEnvironmentValue(environment, "BUFFER_API_KEY"),
    apiUrl: BUFFER_API_URL,
    channelName: environment.BUFFER_INSTAGRAM_CHANNEL?.trim() || "bolets.app",
  };
}

export function dateInCatalonia(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: INSTAGRAM_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function dailyInstagramMarker(publicationDate: string) {
  return `Publicació diària · ${publicationDate}`;
}

export function dailyInstagramCaption(card: DailyShareCard, publicationDate: string) {
  return `${card.shareText}\n\n${dailyInstagramMarker(publicationDate)}\n#BoletsAtles #BoletsCatalunya`;
}

export function isInstagramPublishRequestAuthorized(
  headers: Pick<Headers, "get">,
  expectedSecret = process.env.INSTAGRAM_PUBLISH_SECRET,
) {
  const authorization = headers.get("authorization");
  if (!expectedSecret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function bufferGraphql<T>({
  config,
  fetchImpl,
  operation,
  query,
  variables,
}: {
  config: BufferInstagramPublisherConfig;
  fetchImpl: typeof fetch;
  operation: string;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const response = await fetchImpl(config.apiUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const raw = await response.text();
  let payload: BufferGraphResponse<T>;
  try {
    payload = JSON.parse(raw) as BufferGraphResponse<T>;
  } catch {
    throw new BufferPublicationError(
      `${operation} returned an invalid response`,
      502,
      "buffer_invalid_response",
    );
  }

  const graphMessage = payload.errors
    ?.map((error) => error.message)
    .find((message): message is string => typeof message === "string");
  if (!response.ok || graphMessage || !payload.data) {
    const detail = graphMessage || `Buffer rejected the request with status ${response.status}`;
    throw new BufferPublicationError(
      `${operation} failed: ${detail.slice(0, 300)}`,
      502,
      "buffer_api_error",
    );
  }
  return payload.data;
}

function normalizeChannelName(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/^@/, "");
}

function channelMatches(channel: BufferChannel, configuredName: string) {
  if (typeof channel.service !== "string" || channel.service.toLowerCase() !== "instagram") {
    return false;
  }
  const expected = normalizeChannelName(configuredName);
  if (typeof channel.name === "string" && normalizeChannelName(channel.name) === expected) {
    return true;
  }
  if (typeof channel.externalLink !== "string") return false;
  try {
    const url = new URL(channel.externalLink);
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return url.hostname.replace(/^www\./, "") === "instagram.com"
      && typeof handle === "string"
      && normalizeChannelName(handle) === expected;
  } catch {
    return false;
  }
}

async function findInstagramChannel(
  config: BufferInstagramPublisherConfig,
  fetchImpl: typeof fetch,
) {
  const account = await bufferGraphql<{ account?: { organizations?: BufferOrganization[] } }>({
    config,
    fetchImpl,
    operation: "Reading the Buffer account",
    query: `query BufferOrganizations {
      account { organizations { id name } }
    }`,
  });
  const organizations = account.account?.organizations?.filter(
    (organization): organization is BufferOrganization & { id: string } => typeof organization.id === "string",
  ) ?? [];
  if (organizations.length === 0) {
    throw new BufferPublicationError(
      "The Buffer account has no organization",
      502,
      "buffer_channel_unavailable",
    );
  }

  const matches: Array<{ channelId: string; organizationId: string }> = [];
  for (const organization of organizations) {
    const result = await bufferGraphql<{ channels?: BufferChannel[] }>({
      config,
      fetchImpl,
      operation: "Reading Buffer channels",
      query: `query BufferChannels($input: ChannelsInput!) {
        channels(input: $input) {
          id name service externalLink isDisconnected isLocked organizationId
        }
      }`,
      variables: { input: { organizationId: organization.id } },
    });
    for (const channel of result.channels ?? []) {
      if (
        channelMatches(channel, config.channelName)
        && channel.isDisconnected !== true
        && channel.isLocked !== true
        && typeof channel.id === "string"
      ) {
        matches.push({
          channelId: channel.id,
          organizationId: typeof channel.organizationId === "string"
            ? channel.organizationId
            : organization.id,
        });
      }
    }
  }

  if (matches.length !== 1) {
    throw new BufferPublicationError(
      matches.length === 0
        ? `No connected Buffer Instagram channel matches ${config.channelName}`
        : `More than one Buffer Instagram channel matches ${config.channelName}`,
      503,
      "buffer_channel_unavailable",
    );
  }
  return matches[0];
}

async function findExistingPublication({
  channelId,
  config,
  fetchImpl,
  marker,
  organizationId,
}: {
  channelId: string;
  config: BufferInstagramPublisherConfig;
  fetchImpl: typeof fetch;
  marker: string;
  organizationId: string;
}) {
  const result = await bufferGraphql<{
    posts?: { edges?: Array<{ node?: BufferPost }> };
  }>({
    config,
    fetchImpl,
    operation: "Reading recent Buffer posts",
    query: `query BufferRecentPosts($input: PostsInput!) {
      posts(first: 50, input: $input) {
        edges { node { id text status } }
      }
    }`,
    variables: {
      input: {
        filter: {
          channelIds: [channelId],
          status: ["scheduled", "sending", "sent"],
        },
        organizationId,
        sort: [{ direction: "desc", field: "createdAt" }],
      },
    },
  });
  const match = result.posts?.edges?.find(
    (edge) => typeof edge.node?.text === "string" && edge.node.text.includes(marker),
  );
  return typeof match?.node?.id === "string" ? match.node.id : null;
}

async function createImagePost({
  caption,
  channelId,
  config,
  fetchImpl,
  imageUrl,
}: {
  caption: string;
  channelId: string;
  config: BufferInstagramPublisherConfig;
  fetchImpl: typeof fetch;
  imageUrl: string;
}) {
  const result = await bufferGraphql<{
    createPost?: {
      __typename?: unknown;
      message?: unknown;
      post?: { id?: unknown };
    };
  }>({
    config,
    fetchImpl,
    operation: "Creating the Buffer Instagram post",
    query: `mutation BufferCreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      }
    }`,
    variables: {
      input: {
        assets: [{ image: { url: imageUrl } }],
        channelId,
        metadata: {
          instagram: {
            shouldShareToFeed: true,
            type: "post",
          },
        },
        mode: "shareNow",
        schedulingType: "automatic",
        text: caption,
      },
    },
  });
  const postId = result.createPost?.post?.id;
  if (typeof postId !== "string") {
    const detail = typeof result.createPost?.message === "string"
      ? `: ${result.createPost.message.slice(0, 300)}`
      : "";
    throw new BufferPublicationError(
      `Buffer did not accept the Instagram post${detail}`,
      502,
      "buffer_publication_failed",
    );
  }
  return postId;
}

export async function publishDailyInstagramPrediction({
  card,
  config,
  fetchImpl = fetch,
  imageUrl,
  now = new Date(),
}: {
  card: DailyShareCard;
  config: BufferInstagramPublisherConfig;
  fetchImpl?: typeof fetch;
  imageUrl: string;
  now?: Date;
}): Promise<InstagramPublicationResult> {
  if (!card.available || !card.observedAt || card.isPreview) {
    throw new BufferPublicationError(
      "There is no verified daily prediction to publish",
      503,
      "prediction_unavailable",
    );
  }

  const publicationDate = dateInCatalonia(new Date(card.observedAt));
  if (publicationDate !== dateInCatalonia(now)) {
    throw new BufferPublicationError(
      "The latest verified daily prediction is stale",
      503,
      "prediction_stale",
    );
  }

  const caption = dailyInstagramCaption(card, publicationDate);
  if (caption.length > 2_200) {
    throw new BufferPublicationError(
      "The daily Instagram caption exceeds 2,200 characters",
      500,
      "instagram_caption_too_long",
    );
  }

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const marker = dailyInstagramMarker(publicationDate);
  const existingPostId = await findExistingPublication({
    channelId,
    config,
    fetchImpl,
    marker,
    organizationId,
  });
  if (existingPostId) {
    return { status: "already_published", publicationDate, postId: existingPostId };
  }

  const postId = await createImagePost({
    caption,
    channelId,
    config,
    fetchImpl,
    imageUrl,
  });
  return { status: "published", publicationDate, postId };
}
