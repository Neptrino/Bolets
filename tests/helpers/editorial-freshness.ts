import { sitemapContentEntries } from "@/app/sitemap";
import { getEditorialMetadata } from "@/data/editorial";
import { editorialSourcesFor, NON_CONTENT_COMMITS } from "./editorial-sources";
import { createGitContentDates, type SourceDate } from "./git-content-dates";

export interface EditorialFreshnessItem {
  contentId: string;
  paths: string[];
  updatedAt: string;
  /** Newest dated source; null when every mapped source was an absent optional block. */
  latest: SourceDate | null;
  sectionConstant?: string;
  stale: boolean;
}

export interface EditorialFreshnessReport {
  unavailable: string | null;
  items: EditorialFreshnessItem[];
}

/** Compares every sitemap content id's `updatedAt` with what git says about its sources. */
export function collectEditorialFreshness(root: string): EditorialFreshnessReport {
  const dates = createGitContentDates(root, { ignoredCommits: NON_CONTENT_COMMITS });
  if (dates.unavailable) {
    return { unavailable: dates.unavailable, items: [] };
  }

  const pathsById = new Map<string, string[]>();
  for (const entry of sitemapContentEntries()) {
    pathsById.set(entry.contentId, [...(pathsById.get(entry.contentId) ?? []), entry.path]);
  }

  const items: EditorialFreshnessItem[] = [];
  for (const [contentId, paths] of pathsById) {
    const { sources, sectionConstant } = editorialSourcesFor(contentId);
    let latest: SourceDate | null = null;
    for (const source of sources) {
      const dated = dates.date(source);
      if (dated && (!latest || dated.date > latest.date)) latest = dated;
    }
    if (!latest) {
      throw new Error(`No dated source found for ${contentId}; check tests/helpers/editorial-sources.ts`);
    }
    const { updatedAt } = getEditorialMetadata(contentId);
    items.push({ contentId, paths, updatedAt, latest, sectionConstant, stale: latest.date > updatedAt });
  }
  return { unavailable: null, items };
}

export function describeSource(item: EditorialFreshnessItem) {
  const { latest } = item;
  if (!latest) return "no source";
  const where = latest.lines ? `${latest.source.file}:${latest.lines[0]}-${latest.lines[1]}` : latest.source.file;
  return `${where} (${latest.uncommitted ? "uncommitted" : latest.date})`;
}
