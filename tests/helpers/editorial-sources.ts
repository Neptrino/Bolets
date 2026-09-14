import type { ContentSource } from "./git-content-dates";

/**
 * Maps every sitemap content id to the files, or the blocks inside shared
 * catalogue files, whose changes make that page's editorial `updatedAt`
 * stale. Layout, navigation and shared UI are deliberately excluded: a page
 * only counts as updated when the content readers see on it changes.
 */
export interface EditorialSourceSet {
  sources: ContentSource[];
  /** Section-wide constant in `data/editorial.ts` that dates the shared template. */
  sectionConstant?: string;
}

/**
 * Commits that touched content sources without changing what readers see.
 * When `tests/editorial-freshness.test.ts` fails after a refactor, add the
 * commit here with its reason instead of inventing an editorial date.
 */
export const NON_CONTENT_COMMITS: readonly string[] = [
  "0560fce", // Refactor oversized modules and shared utilities
  "46df2b5", // Nest account pages under compte
  "6d981c1", // Map caching and shared worktrees
  "7943413", // Lightweight responsive previews for species field cards
  "39f4c89", // Speed up today map loading and buffer timeline frames
  "8b1f33d", // Defer offscreen Avui map startup
  "833e1f1", // Reduce frontend loading work and reuse forecast normalization
  "a0bb784", // Load feature styles only on their owning routes
  "a55a052", // Scope SEO styles to their routes
  "c454c9d", // Warm local guide caches through their production page routes
];

const file = (name: string): ContentSource => ({ kind: "file", file: name });
const block = (name: string, marker: string | string[], scope?: string): ContentSource => ({
  kind: "block",
  file: name,
  marker,
  scope,
});
const lineOf = (name: string, marker: string): ContentSource => ({ kind: "block", file: name, marker, unit: "line" });
const optionalBlock = (name: string, marker: string, unit: "block" | "line" = "block"): ContentSource => ({
  kind: "block",
  file: name,
  marker,
  unit,
  optional: true,
});

const SPECIES_TEMPLATE = [
  file("app/bolets/[slug]/page.tsx"),
  file("components/species-hero.tsx"),
  file("components/species-profile/culinary-section.tsx"),
  file("components/species-profile/distribution-section.tsx"),
  file("components/species-profile/ecology-section.tsx"),
  file("components/species-profile/field-card-section.tsx"),
  file("components/species-profile/identification-section.tsx"),
  file("components/species-profile/profile-section.tsx"),
];

const HUB_TEMPLATE = [file("components/hub-map-portrait.tsx"), file("components/hub-sections.tsx")];

const STATIC_PAGES: Record<string, ContentSource[]> = {
  home: [
    file("app/page.tsx"),
    file("components/home-findings-feature.tsx"),
    file("components/home-map-feature.tsx"),
    file("components/home-reference-feature.tsx"),
    file("components/home-showcase-video.tsx"),
  ],
  bolets: [file("app/bolets/page.tsx"), file("components/species-directory.tsx")],
  "noms-de-bolets-catala-castella": [
    file("app/noms-de-bolets-catala-castella/page.tsx"),
    file("components/species-name-glossary.tsx"),
    file("data/species-common-names.ts"),
  ],
  "bolets-infografia": [
    file("app/bolets/infografia/page.tsx"),
    file("components/catalogue-infographic.tsx"),
    file("components/catalogue-infographic-species.tsx"),
    file("src/lib/catalogue-infographic.ts"),
    file("src/lib/infographic-media.ts"),
  ],
  "bolets-avui": [file("app/bolets-avui/page.tsx"), file("src/lib/current-overview-copy.ts")],
  "quan-surten-els-bolets-despres-de-ploure": [
    file("app/quan-surten-els-bolets-despres-de-ploure/page.tsx"),
    file("src/lib/rain-response-summary.ts"),
  ],
  "conservar-bolets": [file("app/conservar-bolets/page.tsx")],
  "parts-dun-bolet": [
    file("app/parts-dun-bolet/page.tsx"),
    file("components/mushroom-parts-explorer.tsx"),
    file("components/mushroom-anatomy-icons.tsx"),
  ],
  "bolets-de-soca": [file("app/bolets-de-soca/page.tsx"), file("data/wood-fungi.ts")],
  "fals-rossinyol": [file("app/fals-rossinyol/page.tsx")],
  "normativa-bolets": [file("app/normativa-bolets/page.tsx")],
  "preguntes-frequents-bolets": [file("app/preguntes-frequents-bolets/page.tsx")],
  "bolets-comestibles": [file("app/bolets-comestibles/page.tsx"), file("src/lib/species-collections.ts")],
  "bolets-verinosos": [
    file("app/bolets-verinosos/page.tsx"),
    file("components/poisonous-comparisons.tsx"),
    file("src/lib/species-collections.ts"),
  ],
  temporada: [
    file("app/temporada/page.tsx"),
    file("app/temporada/[month]/page.tsx"),
    file("components/season-page-content.tsx"),
  ],
  map: [file("app/map/page.tsx"), file("src/lib/map-seo.ts")],
  troballes: [file("app/troballes/page.tsx")],
  compare: [file("app/compare/page.tsx")],
  joc: [file("app/joc/page.tsx"), file("components/mushroom-hunt-game.tsx"), file("src/lib/mushroom-game.ts")],
  metode: [file("app/metode/page.tsx"), file("src/lib/suitability-scale.ts")],
  "col-labora": [file("app/col-labora/page.tsx"), file("components/contribution-guide.tsx")],
  "equip-editorial": [file("app/equip-editorial/page.tsx")],
  "avis-legal": [file("app/avis-legal/page.tsx")],
  guies: [file("app/guies/page.tsx"), file("components/guide-directory.tsx")],
  "zones-rovellons": [
    file("app/zones/rovellons/page.tsx"),
    block("src/lib/species-territory-guides.ts", 'contentId: "zones-rovellons"'),
  ],
  "zones-ceps": [
    file("app/zones/ceps/page.tsx"),
    file("components/ceps-local-guides.tsx"),
    file("src/lib/ceps-guide.ts"),
    block("src/lib/species-territory-guides.ts", 'contentId: "zones-ceps"'),
  ],
};

const SEASON_GUIDE_IDS = ["bolets-de-primavera", "bolets-d-estiu", "bolets-de-tardor", "bolets-d-hivern"];

export function editorialSourcesFor(contentId: string): EditorialSourceSet {
  const [prefix, ...rest] = contentId.split(":");
  const key = rest.join(":");

  if (STATIC_PAGES[contentId]) {
    return { sources: STATIC_PAGES[contentId] };
  }
  if (SEASON_GUIDE_IDS.includes(contentId)) {
    return {
      sources: [file(`app/${contentId}/page.tsx`), block("src/lib/season-guides.ts", `path: "/${contentId}"`)],
    };
  }
  switch (prefix) {
    case "species":
      return {
        sectionConstant: "SPECIES_PAGES_UPDATED_AT",
        sources: [
          ...SPECIES_TEMPLATE,
          optionalBlock("data/species.ts", `speciesId: "${key}"`),
          optionalBlock("data/reference-species.ts", `speciesId: "${key}"`),
          optionalBlock("data/reference-species-additions.ts", `speciesId: "${key}"`),
          optionalBlock("data/species-media.ts", `"${key}":`),
          optionalBlock("data/species-gallery-media.ts", `"${key}":`),
          optionalBlock("data/culinary-profiles.ts", `"${key}":`),
          optionalBlock("data/species-common-names.ts", `"${key}":`, "line"),
          lineOf("data/species-slugs.ts", `"${key}":`),
        ],
      };
    case "compare":
      return {
        sectionConstant: "COMPARISON_PAGES_UPDATED_AT",
        sources: [file("app/compare/[slug]/page.tsx"), block("data/comparison-pages.ts", `slug: "${key}"`)],
      };
    case "map":
      return {
        sectionConstant: "MAP_PAGES_UPDATED_AT",
        sources: [file("app/map/[species]/page.tsx"), block("src/lib/species-map-pages.ts", `slug: "${key}"`)],
      };
    case "zone":
      return {
        sectionConstant: "ZONE_PAGES_UPDATED_AT",
        sources: [
          file("app/zones/[place]/page.tsx"),
          ...HUB_TEMPLATE,
          block("data/location-pages.ts", `slug: "${key}"`, "export const areaProfiles"),
        ],
      };
    case "place": {
      const [area, place] = key.split(":");
      return {
        sectionConstant: "PLACE_PAGES_UPDATED_AT",
        sources: [
          file("app/zones/[place]/[species]/page.tsx"),
          ...HUB_TEMPLATE,
          file("components/local-resources.tsx"),
          block("data/location-pages.ts", `areaSlug: "${area}", slug: "${place}"`, "export const placeProfiles"),
        ],
      };
    }
    case "guide": {
      const [area, place, speciesId] = key.split(":");
      return {
        sectionConstant: "LOCAL_GUIDES_UPDATED_AT",
        sources: [
          file("app/zones/[place]/[species]/[guide]/page.tsx"),
          file("components/local-resources.tsx"),
          file("src/lib/local-landscape.ts"),
          block(
            "data/location-pages.ts",
            [`areaSlug: "${area}", placeSlug: "${place}", `, `speciesId: "${speciesId}"`],
            "export const speciesLocationPages",
          ),
        ],
      };
    }
    default:
      throw new Error(`No editorial sources mapped for ${contentId}; add it to tests/helpers/editorial-sources.ts`);
  }
}
