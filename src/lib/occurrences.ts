import { occurrenceSupportResponseSchema } from "@/src/lib/schema";
import type { OccurrenceSupportCell, SpatialBounds } from "@/src/lib/types";

interface OccurrenceSupportResult {
  available: boolean;
  cells: OccurrenceSupportCell[];
}

export async function getOccurrenceSupport(speciesId: string, bounds: SpatialBounds): Promise<OccurrenceSupportResult> {
  const query = new URLSearchParams({
    species: speciesId,
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    limit: "1000"
  });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/read-occurrence-support?${query}`, {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, apikey: process.env.SUPABASE_ANON_KEY! },
      cache: "no-store"
    });
    if (!response.ok) return { available: false, cells: [] };
    const payload = occurrenceSupportResponseSchema.parse(await response.json());
    return {
      available: true,
      cells: payload.cells.map((cell) => ({
        supportCellId: cell.cellId,
        gridSizeM: cell.gridSizeM,
        bounds: cell.bounds,
        recordCount: cell.recordCount,
        observedYearMin: cell.observedYearMin,
        observedYearMax: cell.observedYearMax,
        observedMonths: cell.observedMonths,
        sources: cell.sources
      }))
    };
  } catch (error) {
    console.error("Unable to load historical occurrence support", error);
    return { available: false, cells: [] };
  }
}
