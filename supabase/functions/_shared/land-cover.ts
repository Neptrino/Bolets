export const LAND_COVER_FIRST_CODE = 221;
export const LAND_COVER_LAST_CODE = 229;
export const LAND_COVER_SAMPLE_COUNT = 25;
const BITS_PER_COVER = 5n;
const SAMPLE_MASK = 31n;

type PackedLandCover = {
  packed: string;
  sampleCounts: number[];
};

function textArray(value: unknown) {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim());
}

export function packLandCoverFractions(value: unknown, cellId: string): PackedLandCover | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || !value.length || value.length > 9) {
    throw new Error(`Invalid land-cover fractions for ${cellId}`);
  }

  const sampleCounts = Array<number>(9).fill(0);
  const seenCodes = new Set<number>();
  let totalSamples = 0;
  let packed = 0n;

  for (const fraction of value) {
    if (!fraction || typeof fraction !== "object" || Array.isArray(fraction)) {
      throw new Error(`Invalid land-cover fraction for ${cellId}`);
    }
    const item = fraction as Record<string, unknown>;
    const code = typeof item.code === "number" && Number.isFinite(item.code) ? item.code : undefined;
    const share = typeof item.share === "number" && Number.isFinite(item.share) ? item.share : undefined;
    if (!Number.isInteger(code) || code! < LAND_COVER_FIRST_CODE || code! > LAND_COVER_LAST_CODE ||
      share === undefined || share <= 0 || share > 1 || !textArray(item.habitat)) {
      throw new Error(`Invalid land-cover fraction for ${cellId}`);
    }
    if (seenCodes.has(code!)) throw new Error(`Duplicate land-cover code for ${cellId}`);

    const sampleCount = Math.round(share * LAND_COVER_SAMPLE_COUNT);
    if (sampleCount < 1 || sampleCount > LAND_COVER_SAMPLE_COUNT ||
      Math.abs(sampleCount / LAND_COVER_SAMPLE_COUNT - share) > 1e-6) {
      throw new Error(`Land-cover fractions for ${cellId} must come from the 25-sample 50 m grid`);
    }

    seenCodes.add(code!);
    totalSamples += sampleCount;
    const index = code! - LAND_COVER_FIRST_CODE;
    sampleCounts[index] = sampleCount;
    packed |= BigInt(sampleCount) << (BigInt(index) * BITS_PER_COVER);
  }

  if (totalSamples > LAND_COVER_SAMPLE_COUNT) {
    throw new Error(`Land-cover fractions exceed 100% for ${cellId}`);
  }
  return { packed: packed.toString(), sampleCounts };
}

export function unpackLandCoverSampleCount(packed: string, code: number) {
  if (!Number.isInteger(code) || code < LAND_COVER_FIRST_CODE || code > LAND_COVER_LAST_CODE) return 0;
  const index = BigInt(code - LAND_COVER_FIRST_CODE);
  return Number((BigInt(packed) >> (index * BITS_PER_COVER)) & SAMPLE_MASK);
}
