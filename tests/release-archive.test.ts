import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";

it("keeps creative files in Git while exporting all required application and deployment inputs", () => {
  const root = mkdtempSync(join(tmpdir(), "bolets-release-archive-"));
  const source = join(root, "source");
  mkdirSync(source);
  const excluded = ["output/campaign/reel.mp4", "outputs/preview.png", "artifacts/report.json",
    "social/campaign/receipt.json", ".codex-tmp/scratch.txt", "video/assets/brand/logo.svg"];
  const required = ["app/page.tsx", "public/media/catalogue.webp", "data/species.ts",
    "supabase/migrations/20260911000000_example.sql", "supabase/functions/main/index.ts",
    "deploy/vps/rollout.sh", "scripts/image-build-config.mjs", "package.json"];
  const git = (...args: string[]) => execFileSync("git", args, { cwd: source, encoding: "utf8" });
  try {
    writeFileSync(join(source, ".gitattributes"), readFileSync(".gitattributes"));
    for (const file of [...excluded, ...required]) {
      const path = join(source, file);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "fixture\n");
    }
    git("init", "--quiet");
    git("add", ".");
    const tree = git("write-tree").trim();
    const tracked = git("ls-files").trim().split("\n");
    const archive = join(root, "release.tar.gz");
    git("archive", "--format=tar.gz", `--output=${archive}`, tree);
    const members = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" }).trim().split("\n");
    for (const file of excluded) {
      expect(tracked).toContain(file);
      expect(members).not.toContain(file);
    }
    for (const file of required) expect(members).toContain(file);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
