import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { exportStaticAssets } from "@/scripts/export-static-assets.mjs";

it("exports only public build artifacts without changing their contents", async () => {
  const root = await mkdtemp(join(tmpdir(), "bolets-export-"));
  const source = join(root, "app");
  const target = join(root, "static");
  try {
    for (const path of ["public/media/optimized/v11", "public/icons", ".next/static/chunks", ".next/cache"])
      await mkdir(join(source, path), { recursive: true });
    const code = "const x=1;\n".repeat(300);
    await writeFile(join(source, ".env"), "SECRET=do-not-export");
    await writeFile(join(source, ".next/cache/private"), "private");
    await writeFile(join(source, "public/media/optimized/v11/photo.webp"), "webp");
    await writeFile(join(source, ".next/static/chunks/test.js"), code);
    await exportStaticAssets(source, target);
    expect(await readFile(join(target, "media/optimized/v11/photo.webp"), "utf8")).toBe("webp");
    expect(await readFile(join(target, "_next/static/chunks/test.js"), "utf8")).toBe(code);
    await expect(readFile(join(target, ".env"))).rejects.toThrow();
    await expect(readFile(join(target, ".next/cache/private"))).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
