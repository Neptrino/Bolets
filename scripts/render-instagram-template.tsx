// Render a review draft from a JSON brief. This command never publishes.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { instagramCoverBriefSchema, instagramCoverWarnings } from "@/src/lib/instagram-cover-brief";
import { renderInstagramCover } from "@/src/lib/instagram-editorial-render";

async function main() {
  const [input, format = "feed"] = process.argv.slice(2);
  if (!input || !["feed", "story"].includes(format)) throw new Error("Usage: npx tsx scripts/render-instagram-template.tsx <brief.json> [feed|story]");
  const brief = instagramCoverBriefSchema.parse(JSON.parse(await readFile(resolve(input), "utf8")));
  for (const warning of instagramCoverWarnings(brief)) console.warn(warning);
  const response = await renderInstagramCover({ brief, format: format as "feed" | "story", draft: true });
  const output = resolve("artifacts/instagram/template-drafts");
  await mkdir(output, { recursive: true });
  const path = resolve(output, `${basename(input, ".json")}-${format}.png`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
  console.log(path);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
