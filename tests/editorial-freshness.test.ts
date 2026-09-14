import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectEditorialFreshness, describeSource } from "./helpers/editorial-freshness";

const root = path.resolve(__dirname, "..");
const report = collectEditorialFreshness(root);

/**
 * The sitemap `lastmod` and JSON-LD `dateModified` values come from the
 * hand-maintained table in `data/editorial.ts`. This check reads git to find
 * when each page's content sources last changed, so a forgotten date bump
 * fails locally before it ships. It cannot run on a shallow clone.
 */
describe("editorial freshness", () => {
  it.skipIf(report.unavailable !== null)("dates every sitemap page no earlier than its last content change", () => {
    const stale = report.items.filter((item) => item.stale);
    const lines = stale.map((item) => {
      const fix = item.sectionConstant
        ? `bump ${item.sectionConstant} or the "${item.contentId}" override`
        : `bump the "${item.contentId}" override`;
      return `  ${item.contentId}: updatedAt ${item.updatedAt} < ${item.latest?.date} from ${describeSource(item)} → ${fix}`;
    });
    expect(
      stale,
      [
        "Content changed after its editorial updatedAt in data/editorial.ts.",
        "Set the date to the day the content changed, or list the commit in",
        "NON_CONTENT_COMMITS (tests/helpers/editorial-sources.ts) if readers see no difference.",
        ...lines,
      ].join("\n"),
    ).toEqual([]);
  });

  it("maps every sitemap content id to at least one existing source", () => {
    if (report.unavailable) return;
    for (const item of report.items) {
      expect(item.latest, item.contentId).not.toBeNull();
    }
  });
});
