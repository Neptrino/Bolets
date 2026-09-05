import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFieldCardCache } from "@/src/lib/field-card-cache";

const directories: string[] = [];
async function directory() {
  const path = await mkdtemp(join(tmpdir(), "bolets-card-test-"));
  directories.push(path);
  return path;
}
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("field card cache", () => {
  it("shares a concurrent render and reuses the disk result after a process restart", async () => {
    const path = await directory();
    const cache = createFieldCardCache(path);
    const render = vi.fn(async () => Buffer.from("PNG"));
    const results = await Promise.all(Array.from({ length: 8 }, () => cache("cep", "v1", render)));
    expect(results.every((result) => result.toString() === "PNG")).toBe(true);
    await createFieldCardCache(path)("cep", "v1", render);
    expect(render).toHaveBeenCalledOnce();
  });

  it("replaces a card when its content identity changes without growing the file inventory", async () => {
    const path = await directory();
    const cache = createFieldCardCache(path);
    await cache("cep", "v1", async () => Buffer.from("old"));
    expect((await cache("cep", "v2", async () => Buffer.from("new"))).toString()).toBe("new");
    expect(await readdir(path)).toEqual(["cep.json"]);
  });

  it("retries rendering failures instead of retaining a rejected promise", async () => {
    const cache = createFieldCardCache(await directory());
    await expect(cache("cep", "v1", async () => { throw new Error("render failed"); })).rejects.toThrow("render failed");
    expect((await cache("cep", "v1", async () => Buffer.from("recovered"))).toString()).toBe("recovered");
  });

  it("delivers a rendered image if the cache directory is unwritable", async () => {
    const cache = createFieldCardCache("/dev/null/not-a-directory");
    expect((await cache("cep", "v1", async () => Buffer.from("PNG"))).toString()).toBe("PNG");
  });

  it("serializes different cold card renders", async () => {
    const cache = createFieldCardCache(await directory());
    let active = 0;
    let maximum = 0;
    const render = async () => {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return Buffer.from("PNG");
    };
    await Promise.all([cache("cep", "v1", render), cache("rovello", "v1", render)]);
    expect(maximum).toBe(1);
  });
});
