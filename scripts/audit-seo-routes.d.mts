export interface SeoPageInspection {
  url: string;
  status: number;
  title: string;
  description: string;
  h1: string[];
  canonical: string;
  noindex: boolean;
  internalLinks: string[];
  finalUrl?: string;
  error?: string;
}

export function extractSitemapLocations(xml: string): string[];

export function inspectHtml(
  html: string,
  pageUrl: string,
  siteOrigin?: string,
): Omit<SeoPageInspection, "url" | "status">;

export function summarizeAudit(
  pages: SeoPageInspection[],
  sitemapUrls: string[],
): {
  checkedAt: string;
  totals: { sitemapUrls: number; checkedPages: number };
  critical: {
    failures: SeoPageInspection[];
    missingTitles: string[];
    missingDescriptions: string[];
    missingH1: string[];
    missingCanonicals: string[];
    noindexInSitemap: string[];
    legacySpeciesUrls: string[];
  };
  warnings: {
    multipleH1: Array<{ url: string; count: number }>;
    duplicateTitles: Array<{ value: string; urls: string[] }>;
    duplicateDescriptions: Array<{ value: string; urls: string[] }>;
    orphanCandidates: string[];
    longTitles: Array<{ url: string; length: number }>;
    longDescriptions: Array<{ url: string; length: number }>;
  };
};
