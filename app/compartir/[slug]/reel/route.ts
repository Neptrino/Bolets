import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { socialGrowthSlideCount } from "@/components/social-growth-card";
import {
  hasSignedDailySharePayload,
  readSignedDailyShareCard,
} from "@/src/lib/daily-share-image-payload-server";
import { mp4Response } from "@/src/lib/mp4-response";
import { signedSocialGrowthImagePath } from "@/src/lib/social-growth-assets";
import { weekendReelFfmpegArgs } from "@/src/lib/weekend-reel-render";

export const runtime = "nodejs";

const activeRenders = new Map<string, Promise<Buffer>>();
const completedRenders = new Map<string, { createdAt: number; video: Buffer }>();
const COMPLETED_RENDER_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_COMPLETED_RENDERS = 3;

function readCompletedRender(cacheKey: string) {
  const now = Date.now();
  for (const [key, render] of completedRenders) {
    if (now - render.createdAt > COMPLETED_RENDER_TTL_MS) completedRenders.delete(key);
  }
  return completedRenders.get(cacheKey)?.video ?? null;
}

function storeCompletedRender(cacheKey: string, video: Buffer) {
  while (completedRenders.size >= MAX_COMPLETED_RENDERS) {
    const oldestKey = completedRenders.keys().next().value as string | undefined;
    if (!oldestKey) break;
    completedRenders.delete(oldestKey);
  }
  completedRenders.set(cacheKey, { createdAt: Date.now(), video });
}

function imageRenderOrigin(requestUrl: URL) {
  if (requestUrl.hostname === "127.0.0.1" || requestUrl.hostname === "localhost") {
    return requestUrl.origin;
  }
  // Avoid a public DNS/TLS round trip from the container back to itself. The
  // image route still validates the signed card payload on this local request.
  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

async function runFfmpeg(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let diagnostics = "";
    const timeout = setTimeout(() => {
      process.kill("SIGKILL");
      reject(new Error("Reel rendering timed out"));
    }, 45_000);
    process.stderr.on("data", (chunk: Buffer) => {
      diagnostics = `${diagnostics}${chunk.toString()}`.slice(-2_000);
    });
    process.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    process.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}: ${diagnostics}`));
    });
  });
}

async function renderWeekendReel(card: NonNullable<ReturnType<typeof readSignedDailyShareCard>>, origin: string) {
  const directory = await mkdtemp(join(tmpdir(), "bolets-reel-"));
  try {
    const slidePaths = Array.from(
      { length: socialGrowthSlideCount("weekend") },
      (_, index) => join(directory, `slide-${index + 1}.png`),
    );
    await Promise.all(slidePaths.map(async (path, index) => {
      const imageUrl = new URL(
        signedSocialGrowthImagePath(card, "weekend", index + 1),
        origin,
      );
      const response = await fetch(imageUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`Slide ${index + 1} returned ${response.status}`);
      await writeFile(path, Buffer.from(await response.arrayBuffer()));
    }));

    const outputPath = join(directory, "weekend.mp4");
    await runFfmpeg(weekendReelFfmpegArgs(slidePaths, outputPath));
    return await readFile(outputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const requestUrl = new URL(request.url);
  const card = readSignedDailyShareCard(requestUrl.searchParams, slug);
  if (!hasSignedDailySharePayload(requestUrl.searchParams) || !card) {
    return new Response("Invalid card payload", { status: 400 });
  }
  if (!card.available || !card.observedAt || card.isPreview) {
    return new Response("Verified current card required", { status: 400 });
  }

  const cacheKey = requestUrl.search;

  try {
    let video = readCompletedRender(cacheKey);
    if (!video) {
      let render = activeRenders.get(cacheKey);
      if (!render) {
        render = renderWeekendReel(card, imageRenderOrigin(requestUrl)).finally(() => {
          activeRenders.delete(cacheKey);
        });
        activeRenders.set(cacheKey, render);
      }
      video = await render;
      storeCompletedRender(cacheKey, video);
    }
    return mp4Response(
      video,
      `bolets-${slug}-weekend.mp4`,
      request.headers.get("range"),
    );
  } catch (error) {
    console.error("Instagram Reel render failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Reel render failed", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
