import { timingSafeEqual } from "node:crypto";

export const BUFFER_API_URL = "https://api.buffer.com";
export const INSTAGRAM_TIME_ZONE = "Europe/Madrid";

export interface BufferInstagramPublisherConfig {
  apiKey: string;
  apiUrl: string;
  channelName: string;
}

interface BufferGraphResponse<T> {
  data?: T;
  errors?: Array<{ message?: unknown }>;
}

interface BufferOrganization {
  id?: unknown;
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

export interface BufferPostSummary {
  createdAt?: unknown;
  dueAt?: unknown;
  id?: unknown;
  sentAt?: unknown;
  text?: unknown;
  status?: unknown;
  metadata?: { type?: unknown } | null;
  assets?: Array<{ __typename?: unknown; source?: unknown }>;
  metrics?: Array<{ type?: unknown; name?: unknown; value?: unknown; unit?: unknown }>;
  metricsUpdatedAt?: unknown;
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

export function weekdayInCatalonia(date: Date) {
  return new Intl.DateTimeFormat("en", {
    timeZone: INSTAGRAM_TIME_ZONE,
    weekday: "short",
  }).format(date);
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

export async function bufferGraphql<T>({
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

export async function findInstagramChannel(
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

export async function readRecentInstagramPosts({
  channelId,
  config,
  fetchImpl,
  organizationId,
  first = 50,
}: {
  channelId: string;
  config: BufferInstagramPublisherConfig;
  fetchImpl: typeof fetch;
  organizationId: string;
  first?: number;
}) {
  const result = await bufferGraphql<{
    posts?: { edges?: Array<{ node?: BufferPostSummary }> };
  }>({
    config,
    fetchImpl,
    operation: "Reading recent Buffer posts",
    query: `query BufferRecentPosts($input: PostsInput!, $first: Int!) {
      posts(first: $first, input: $input) {
        edges {
          node {
            id text status createdAt dueAt sentAt metricsUpdatedAt
            metrics { type name value unit }
            metadata {
              __typename
              ... on InstagramPostMetadata { type }
            }
            assets {
              __typename
              ... on ImageAsset { source }
              ... on VideoAsset { source }
            }
          }
        }
      }
    }`,
    variables: {
      first,
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
  return result.posts?.edges?.map((edge) => edge.node).filter(
    (post): post is BufferPostSummary => Boolean(post),
  ) ?? [];
}

export async function createBufferInstagramPost({
  assets,
  caption,
  channelId,
  config,
  fetchImpl,
  mode = "shareNow",
  type,
}: {
  assets: Array<{ image: { url: string } } | { video: { url: string } }>;
  caption: string;
  channelId: string;
  config: BufferInstagramPublisherConfig;
  fetchImpl: typeof fetch;
  mode?: "addToQueue" | "shareNow";
  type: "post" | "story" | "reel";
}) {
  const result = await bufferGraphql<{
    createPost?: { __typename?: unknown; message?: unknown; post?: { id?: unknown } };
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
        assets,
        channelId,
        metadata: {
          instagram: {
            shouldShareToFeed: type !== "story",
            type,
          },
        },
        mode,
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
