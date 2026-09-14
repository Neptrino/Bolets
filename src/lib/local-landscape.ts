import type { PredictionCell } from "@/src/lib/types";

/**
 * Plain-language portrait of the terrain around a place, built from the 1 km
 * cells of the public reading window: which forest groups are present, how
 * high the ground is, what the soil is like, and how much of it fits the
 * species. The land-cover vocabulary comes in class groups (scripts/lib/
 * land-cover.mjs), so beech and oak cannot be told apart here.
 */

type Values = PredictionCell["values"];
type LandscapeCell = { values: Pick<Values, "forestTypes" | "altitudeM" | "soilPh" | "soilTexture" | "habitatCoveragePercent" | "geologicalSubstrate"> };

const FOREST_GROUPS = [
  { key: "planifolis", tag: "fagedes", label: "fagedes i rouredes" },
  { key: "coniferes", tag: "pinedes", label: "pinedes" },
  { key: "esclerofil·les", tag: "alzinars", label: "alzinars i suredes" },
  { key: "ribera", tag: "bosc de ribera", label: "bosc de ribera" },
] as const;

export type LocalLandscape = {
  cellCount: number;
  /** Share of the window's km² where each forest group is present, most common first. */
  forests: Array<{ key: (typeof FOREST_GROUPS)[number]["key"]; label: string; share: number }>;
  openGroundShare: number;
  altitude: { low: number; median: number; high: number };
  soil: { phMedian: number | null; texture: string | null; substrate: "silicic" | "calcareous" | "mixed" | "unconsolidated" | null };
  habitatShare: number;
  habitatAltitude: { low: number; high: number } | null;
};

function percentile(sorted: number[], fraction: number) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * fraction)))];
}

function mode<T extends string>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

export function summariseLocalLandscape(cells: LandscapeCell[]): LocalLandscape | null {
  const withLandCover = cells.filter((cell) => (cell.values.forestTypes?.length ?? 0) > 0);
  if (withLandCover.length < 20) return null;
  const forests = FOREST_GROUPS
    .map((group) => ({ key: group.key, label: group.label, share: withLandCover.filter((cell) => cell.values.forestTypes!.includes(group.tag)).length / withLandCover.length }))
    .filter((group) => group.share >= 0.05)
    .sort((left, right) => right.share - left.share);
  const openGroundShare = withLandCover.filter((cell) => cell.values.forestTypes!.includes("prats")).length / withLandCover.length;
  const altitudes = cells.map((cell) => cell.values.altitudeM).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  if (altitudes.length < 20) return null;
  const phs = cells.map((cell) => cell.values.soilPh).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  const textures = cells.map((cell) => cell.values.soilTexture).filter((value): value is string => typeof value === "string");
  const substrates = cells.map((cell) => cell.values.geologicalSubstrate?.class)
    .filter((value): value is Exclude<NonNullable<typeof value>, "unknown"> => Boolean(value) && value !== "unknown");
  const habitatCells = cells.filter((cell) => (cell.values.habitatCoveragePercent ?? 0) > 0);
  const habitatAltitudes = habitatCells.map((cell) => cell.values.altitudeM).filter((value): value is number => typeof value === "number").sort((a, b) => a - b);
  return {
    cellCount: cells.length,
    forests,
    openGroundShare,
    altitude: { low: percentile(altitudes, 0.1), median: percentile(altitudes, 0.5), high: percentile(altitudes, 0.9) },
    soil: {
      phMedian: phs.length ? percentile(phs, 0.5) : null,
      texture: textures.length ? mode(textures) : null,
      substrate: substrates.length ? mode(substrates) : null,
    },
    habitatShare: habitatCells.length / cells.length,
    habitatAltitude: habitatAltitudes.length >= 10 ? { low: percentile(habitatAltitudes, 0.1), high: percentile(habitatAltitudes, 0.9) } : null,
  };
}

const numberFormat = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 0 });
/** Altitudes read from a 1 km lattice are not precise beyond ~50 m. */
const roundAltitude = (metres: number) => Math.round(metres / 50) * 50;

function joinList(parts: string[]) {
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;
}
const phFormat = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });

function shareWords(share: number) {
  if (share >= 0.85) return "gairebé pertot";
  if (share >= 0.6) return "a la major part del territori";
  if (share >= 0.35) return "en gairebé la meitat";
  if (share >= 0.15) return "en alguns indrets";
  return "només en punts concrets";
}

function soilWords(landscape: LocalLandscape) {
  const { phMedian, texture, substrate } = landscape.soil;
  const reaction = phMedian === null ? null
    : phMedian < 5.5 ? "àcids"
    : phMedian < 6.5 ? "lleugerament àcids"
    : phMedian <= 7.5 ? "neutres"
    : "bàsics";
  const parts: string[] = [];
  if (reaction) parts.push(`sòls ${reaction}${phMedian !== null ? ` (pH ${phFormat.format(phMedian)})` : ""}`);
  if (texture) parts.push(`de textura ${texture}`);
  const rock = substrate === "calcareous" ? "roca calcària" : substrate === "silicic" ? "roca silícia" : substrate === "unconsolidated" ? "sediments solts" : substrate === "mixed" ? "roques de tipus barrejat" : null;
  if (rock) parts.push(`sobre ${rock}`);
  return parts.length ? parts.join(", ") : null;
}

/** "Per al cep", "Per a la múrgola", "Per a l’apagallums". */
function forSpecies(withArticle: string) {
  if (withArticle.startsWith("el ")) return `Per al ${withArticle.slice(3)}`;
  if (withArticle.startsWith("els ")) return `Per als ${withArticle.slice(4)}`;
  return `Per a ${withArticle}`;
}

/** Two short paragraphs a reader can act on, no model vocabulary. */
export function localLandscapeParagraphs(landscape: LocalLandscape, options: { placeName: string; speciesWithArticle: string }) {
  const forests = landscape.forests.slice(0, 3);
  const forestSentence = forests.length
    ? `Al voltant de ${options.placeName} hi ha ${joinList(forests.map((forest) => `${forest.label} ${shareWords(forest.share)}`))}.`
    : `Al voltant de ${options.placeName} el bosc és escàs i dominen els espais oberts.`;
  const openSentence = landscape.openGroundShare >= 0.5 ? " Els prats i les clarianes s’hi barregen sovint amb el bosc." : "";
  const soil = soilWords(landscape);
  const terrainSentence = `El terreny va dels ${numberFormat.format(roundAltitude(landscape.altitude.low))} als ${numberFormat.format(roundAltitude(landscape.altitude.high))} m${soil ? `, amb ${soil}` : ""}.`;
  const habitatSentence = landscape.habitatAltitude
    ? `${forSpecies(options.speciesWithArticle)}, el bosc que encaixa és sobretot entre ${numberFormat.format(roundAltitude(landscape.habitatAltitude.low))} i ${numberFormat.format(roundAltitude(landscape.habitatAltitude.high))} m, i ocupa un ${numberFormat.format(landscape.habitatShare * 100)}% d’aquest entorn.`
    : `${forSpecies(options.speciesWithArticle)}, el bosc que encaixa ocupa un ${numberFormat.format(landscape.habitatShare * 100)}% d’aquest entorn.`;
  return [`${forestSentence}${openSentence}`, `${terrainSentence} ${habitatSentence}`];
}
