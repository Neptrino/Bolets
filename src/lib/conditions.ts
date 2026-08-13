import { conditionSnapshotSchema } from "@/src/lib/schema";
import type { ConditionSnapshot, RegionId } from "@/src/lib/types";

const regions: RegionId[] = ["pirineus", "prepirineus", "catalunya-central", "serralades-costeres", "serralades-prelitorals", "emporda", "montseny", "ports", "muntanyes-interiors", "altres"];
const environmentalFields = [
  "temperatureC", "temperatureMin24hC", "temperatureAvg24hC", "temperatureMax24hC",
  "temperatureMin7dC", "frostHours7d",
  "temperatureMin10dC", "temperatureAvg10dC", "temperatureMax10dC", "frostHours10d",
  "relativeHumidity", "relativeHumidityMin24h", "relativeHumidityAvg24h", "relativeHumidityMax24h", "relativeHumidityAvg7d",
  "soilMoisture", "soilMoistureMin24h", "soilMoistureAvg24h", "soilMoistureMax24h",
  "soilMoistureMin7d", "soilMoistureAvg7d", "soilMoistureMax7d", "soilMoistureTrend7d",
  "rainfall24hMm", "rainfall3dMm", "rainfall7dMm", "rainfallPrevious23dMm", "rainfall30dMm", "drySpellDays",
  "evapotranspiration3dMm", "evapotranspiration7dMm", "evapotranspiration30dMm",
  "windKmh", "windAvg24hKmh", "windMax24hKmh", "windGustMax24hKmh",
  "altitudeM", "forestCompatibility", "soilCompatibility"
];

function unavailableSnapshot(regionId: RegionId): ConditionSnapshot {
  return {
    regionId,
    observedAt: new Date(0).toISOString(),
    source: ["Cap instantània ambiental publicada"],
    confidence: "unknown",
    stale: true,
    unavailableFields: environmentalFields,
    values: {}
  };
}

export const localSnapshots = regions.map(unavailableSnapshot);

function environmentFeedConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export async function getConditionSnapshot(regionId: RegionId): Promise<ConditionSnapshot> {
  const unavailable = unavailableSnapshot(regionId);
  if (!environmentFeedConfigured()) return unavailable;

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/read-environment?region=${regionId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        apikey: process.env.SUPABASE_ANON_KEY!
      },
      // Regional snapshots are ingested on a much slower cadence than page
      // requests. Reuse them briefly so every map render does not block on the
      // same authenticated edge-function round trip. The snapshot's own
      // observedAt/stale fields remain the authority for publication safety.
      cache: "force-cache",
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return unavailable;
    return conditionSnapshotSchema.parse(await response.json());
  } catch {
    return unavailable;
  }
}

export function normaliseSnapshot(input: unknown): ConditionSnapshot {
  return conditionSnapshotSchema.parse(input);
}
