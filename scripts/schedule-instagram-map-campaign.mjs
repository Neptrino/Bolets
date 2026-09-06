import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Schedules the map campaign in Buffer from a manifest of pieces.
//
//   node scripts/schedule-instagram-map-campaign.mjs manifest.json            # dry run: prints the plan
//   node scripts/schedule-instagram-map-campaign.mjs manifest.json --apply    # creates the scheduled posts
//
// The manifest lists pieces with a Europe/Madrid publication time, the caption,
// the public asset URLs (Buffer downloads media from URLs; it has no upload API),
// and Instagram metadata. Reads BUFFER_API_KEY and BUFFER_INSTAGRAM_CHANNEL from
// .env.local like the daily publisher does.

const root = resolve(import.meta.dirname, "..");
const manifestPath = process.argv[2];
const apply = process.argv.includes("--apply");
if (!manifestPath) {
  console.error("Usage: node scripts/schedule-instagram-map-campaign.mjs <manifest.json> [--apply]");
  process.exit(1);
}

const env = Object.fromEntries(
  (await readFile(resolve(root, ".env.local"), "utf8")).split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => { const at = line.indexOf("="); return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const apiKey = env.BUFFER_API_KEY;
const channelName = (env.BUFFER_INSTAGRAM_CHANNEL || "bolets.app").toLowerCase();
if (!apiKey) { console.error("BUFFER_API_KEY missing in .env.local"); process.exit(1); }

async function gql(query, variables) {
  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (payload.errors) throw new Error(JSON.stringify(payload.errors).slice(0, 400));
  return payload.data;
}

// Europe/Madrid wall-clock time → ISO instant.
function madridToIso(local) {
  const [date, time] = local.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
  const asMadrid = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
  return new Date(guess - (asMadrid - guess)).toISOString();
}

async function findChannel() {
  const account = await gql(`query { account { organizations { id name } } }`);
  for (const organization of account.account?.organizations ?? []) {
    const result = await gql(`query C($input: ChannelsInput!) { channels(input: $input) { id name service isDisconnected } }`, { input: { organizationId: organization.id } });
    const channel = (result.channels ?? []).find((candidate) => String(candidate.service).toLowerCase().includes("instagram") && String(candidate.name).toLowerCase() === channelName && candidate.isDisconnected !== true);
    if (channel) return { channelId: channel.id, organizationId: organization.id };
  }
  throw new Error(`No connected Buffer Instagram channel named ${channelName}`);
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok ? `${response.status} ${response.headers.get("content-type") ?? ""} ${Math.round(Number(response.headers.get("content-length") ?? 0) / 1024)} KB` : `HTTP ${response.status}`;
  } catch (error) {
    return `unreachable (${error.message})`;
  }
}

const manifest = JSON.parse(await readFile(resolve(root, manifestPath), "utf8"));
const pieces = manifest.pieces.map((piece) => ({ ...piece, dueAt: madridToIso(piece.publishAt) }));
pieces.sort((left, right) => left.dueAt.localeCompare(right.dueAt));

console.log(`${apply ? "Scheduling" : "Dry run:"} ${pieces.length} pieces on ${channelName}`);
for (const piece of pieces) {
  const assets = piece.assets.map((asset) => asset.video ? `video ${asset.video.url}` : `image ${asset.image.url}`);
  console.log(`\n${piece.publishAt} Madrid (${piece.dueAt})  ${piece.type.padEnd(5)}  ${piece.id}`);
  for (const asset of assets) console.log(`   ${asset}`);
  console.log(`   caption: ${piece.caption.replace(/\s+/g, " ").slice(0, 90)}…`);
  if (piece.firstComment) console.log(`   first comment: ${piece.firstComment.replace(/\s+/g, " ").slice(0, 80)}…`);
}

if (!apply) {
  console.log("\nChecking asset URLs…");
  for (const piece of pieces) {
    for (const asset of piece.assets) {
      const url = asset.video?.url ?? asset.image?.url;
      console.log(`   ${await checkUrl(url)}  ${url}`);
    }
  }
  console.log("\nDry run only. Re-run with --apply to create the scheduled posts.");
  process.exit(0);
}

const { channelId } = await findChannel();
for (const piece of pieces) {
  const result = await gql(`mutation Create($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess { post { id dueAt } }
      ... on MutationError { message }
    }
  }`, {
    input: {
      assets: piece.assets,
      channelId,
      dueAt: piece.dueAt,
      metadata: {
        instagram: {
          type: piece.type,
          shouldShareToFeed: piece.type !== "story",
          isAiGenerated: Boolean(piece.aiGenerated),
          ...(piece.firstComment ? { firstComment: piece.firstComment } : {}),
        },
      },
      mode: "customScheduled",
      schedulingType: "automatic",
      needsApproval: false,
      text: piece.caption,
      source: "bolets-map-campaign",
    },
  });
  const created = result.createPost;
  if (created?.post?.id) console.log(`created ${piece.id} → post ${created.post.id} due ${created.post.dueAt}`);
  else console.error(`FAILED ${piece.id}: ${created?.message ?? JSON.stringify(created)}`);
}
