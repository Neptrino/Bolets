import { z } from "zod";
import { HABITAT_MODEL_VERSION } from "@/src/lib/model-versions";
import type { PotentialHabitatCell, SpatialBounds } from "@/src/lib/types";

const confidenceSchema = z.enum(["high", "moderate", "limited", "unknown"]);

const localFactSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("derived"),
    metric: z.enum([
      "compatible-area",
      "compatible-cells",
      "altitude-retention",
    ]),
    label: z.string().min(1),
    value: z.number().finite().nonnegative(),
    unit: z.enum(["km²", "sectors", "%"]),
    description: z.string().min(1),
  }),
  z.object({
    kind: z.literal("editorial"),
    metric: z.literal("territorial-context"),
    label: z.string().min(1),
    text: z.string().min(1),
    sourceId: z.string().min(1),
  }),
]);

export const localGuideFactsSchema = z.object({
  scope: z.literal("public-reading-window"),
  scopeLabel: z.string().min(1),
  gridSizeM: z.literal(1000),
  modelVersion: z.string().min(1),
  confidence: confidenceSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  facts: z.array(localFactSchema).min(1),
});

export type LocalGuideFacts = z.infer<typeof localGuideFactsSchema>;

const confidenceOrder = ["unknown", "limited", "moderate", "high"] as const;

function centreFallsWithinBounds(cell: PotentialHabitatCell, bounds: SpatialBounds) {
  const [[west, south], [east, north]] = cell.cellBounds;
  const longitude = (west + east) / 2;
  const latitude = (south + north) / 2;
  return longitude >= bounds.west && longitude <= bounds.east &&
    latitude >= bounds.south && latitude <= bounds.north;
}

/**
 * Summarises only positive, verified potential-habitat cells. The compatible
 * area is an area-equivalent total, not the surface of a municipality or a
 * claim that the species occurs there.
 */
export function aggregateLocalGuideFacts(
  cells: PotentialHabitatCell[],
  bounds: SpatialBounds,
  scopeLabel: string,
): LocalGuideFacts | null {
  const compatibleCells = cells.filter((cell) =>
    cell.gridSizeM === 1000 &&
    cell.coverage > 0 &&
    centreFallsWithinBounds(cell, bounds)
  );
  if (!compatibleCells.length) return null;

  const compatibleAreaKm2 = compatibleCells.reduce(
    (total, cell) => total + cell.coverage,
    0,
  );
  const altitudeAdjustedAreaKm2 = compatibleCells.reduce(
    (total, cell) => total + cell.altitudeWeightedCoverage,
    0,
  );
  if (compatibleAreaKm2 <= 0 || altitudeAdjustedAreaKm2 > compatibleAreaKm2 + 1e-9) {
    return null;
  }

  const confidence = compatibleCells.reduce<(typeof confidenceOrder)[number]>(
    (lowest, cell) => confidenceOrder.indexOf(cell.confidence) < confidenceOrder.indexOf(lowest)
      ? cell.confidence
      : lowest,
    "high",
  );
  const sourceIds = [...new Set(compatibleCells.flatMap((cell) => cell.source))];
  if (!sourceIds.length) return null;

  return localGuideFactsSchema.parse({
    scope: "public-reading-window",
    scopeLabel,
    gridSizeM: 1000,
    modelVersion: HABITAT_MODEL_VERSION,
    confidence,
    sourceIds,
    facts: [
      {
        kind: "derived",
        metric: "compatible-area",
        label: "Bosc i sòl favorables",
        value: compatibleAreaKm2,
        unit: "km²",
        description: "Superfície total on el tipus de bosc i de sòl encaixen amb l’espècie.",
      },
      {
        kind: "derived",
        metric: "compatible-cells",
        label: "Sectors amb terreny adequat",
        value: compatibleCells.length,
        unit: "sectors",
        description: "Sectors del mapa que contenen alguna zona adequada. No indiquen que hi hagi bolets.",
      },
      {
        kind: "derived",
        metric: "altitude-retention",
        label: "Altitud adequada",
        value: (altitudeAdjustedAreaKm2 / compatibleAreaKm2) * 100,
        unit: "%",
        description: "Part del bosc i el sòl favorables que també queda dins l’altitud adequada per a l’espècie.",
      },
    ],
  });
}
