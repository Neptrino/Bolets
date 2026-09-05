import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** One release-local file per catalogue card; concurrent misses share a render. */
export function createFieldCardCache(directory: string) {
  const pending = new Map<string, Promise<Buffer>>();
  // Rendering is CPU-heavy. Queue cold catalogue crawls instead of allowing
  // dozens of sharp/Satori renders to compete with public page requests.
  let renderQueue: Promise<unknown> = Promise.resolve();

  return async (speciesId: string, identity: string, render: () => Promise<Buffer>) => {
    if (!/^[a-z0-9-]+$/.test(speciesId)) throw new Error("Invalid card species identifier");
    const key = createHash("sha256").update(identity).digest("hex");
    const filename = join(directory, `${speciesId}.json`);
    const pendingKey = `${speciesId}:${key}`;
    const existing = pending.get(pendingKey);
    if (existing) return existing;
    const task = (async () => {
      try {
        const cached = JSON.parse(await readFile(filename, "utf8"));
        if (cached.key === key && typeof cached.image === "string") {
          return Buffer.from(cached.image, "base64");
        }
      } catch { /* An absent or damaged cache must remain a normal miss. */ }
      const rendered = renderQueue.then(render, render);
      renderQueue = rendered.catch(() => undefined);
      const image = await rendered;
      const temporary = `${filename}.${randomUUID()}.tmp`;
      try {
        await mkdir(directory, { recursive: true });
        await writeFile(temporary, JSON.stringify({ key, image: image.toString("base64") }));
        await rename(temporary, filename);
      } catch {
        // Full/read-only storage must not turn a successfully rendered card
        // into an error. The next request can retry the cache write.
        await rm(temporary, { force: true }).catch(() => undefined);
      }
      return image;
    })();
    pending.set(pendingKey, task);
    try { return await task; } finally { pending.delete(pendingKey); }
  };
}

export const cachedFieldCard = createFieldCardCache(
  join(process.cwd(), ".next/cache/field-cards"),
);
