export const landCoverClasses = new Map([
  [221, { name: "Boscos densos d’aciculifolis", habitat: ["pinedes", "boscos de coníferes"] }],
  [222, { name: "Boscos densos de caducifolis i planifolis", habitat: ["fagedes", "rouredes", "boscos de planifolis"] }],
  [223, { name: "Boscos densos d’esclerofil·les i laurifolis", habitat: ["alzinars", "suredes", "boscos d’esclerofil·les"] }],
  [224, { name: "Matollar", habitat: ["matollars", "clarianes", "vores de bosc"] }],
  [225, { name: "Boscos clars d’aciculifolis", habitat: ["pinedes", "pinedes obertes", "boscos de coníferes"] }],
  [226, { name: "Boscos clars de caducifolis i planifolis", habitat: ["fagedes", "rouredes", "boscos de planifolis"] }],
  [227, { name: "Boscos clars d’esclerofil·les i laurifolis", habitat: ["alzinars", "suredes", "boscos d’esclerofil·les"] }],
  [228, { name: "Prats i herbassars", habitat: ["prats", "clarianes", "vores de bosc"] }],
  [229, { name: "Bosc de ribera", habitat: ["bosc de ribera", "boscos humits"] }],
]);

export function packLandCoverFractions(fractions) {
  if (!Array.isArray(fractions) || !fractions.length || fractions.length > 9) return undefined;
  let packed = 0n;
  let totalSamples = 0;
  for (const fraction of fractions) {
    const sampleCount = Math.round(Number(fraction.share) * 25);
    if (!Number.isInteger(fraction.code) || fraction.code < 221 || fraction.code > 229 ||
      sampleCount < 1 || sampleCount > 25 || Math.abs(sampleCount / 25 - Number(fraction.share)) > 1e-6) {
      return undefined;
    }
    totalSamples += sampleCount;
    packed |= BigInt(sampleCount) << (BigInt(fraction.code - 221) * 5n);
  }
  return totalSamples <= 25 ? packed.toString() : undefined;
}

export function summarizeLandCoverCounts(counts, totalSamples, minimumNaturalShare = 0) {
  if (!(counts instanceof Map) || !Number.isInteger(totalSamples) || totalSamples <= 0) return undefined;
  const covers = [...counts.entries()]
    .flatMap(([code, count]) => {
      const definition = landCoverClasses.get(code);
      if (!definition || !Number.isFinite(count) || count <= 0) return [];
      return [{
        code,
        name: definition.name,
        habitat: definition.habitat,
        share: count / totalSamples,
      }];
    })
    .sort((left, right) => right.share - left.share || left.code - right.code);
  const naturalShare = covers.reduce((total, cover) => total + cover.share, 0);
  if (!covers.length || naturalShare < minimumNaturalShare) return undefined;
  const dominant = covers[0];
  return {
    code: dominant.code,
    name: dominant.name,
    share: dominant.share,
    naturalShare,
    habitat: [...new Set(covers.flatMap((cover) => cover.habitat))],
    fractions: covers,
  };
}
