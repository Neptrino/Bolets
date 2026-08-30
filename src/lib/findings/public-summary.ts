import type { PublicFinding } from "@/src/lib/findings/types";

export type PublicFindingSpeciesSummary = {
  speciesId: string;
  speciesName: string;
  findingCount: number;
};

export function summarizePublicFindings(findings: readonly PublicFinding[]) {
  const counts = new Map<string, PublicFindingSpeciesSummary>();
  let latestObservedOn: string | null = null;

  for (const finding of findings) {
    const current = counts.get(finding.reportedSpeciesId);
    counts.set(finding.reportedSpeciesId, {
      speciesId: finding.reportedSpeciesId,
      speciesName: finding.reportedSpeciesName,
      findingCount: (current?.findingCount ?? 0) + 1,
    });
    if (!latestObservedOn || finding.observedOn > latestObservedOn) {
      latestObservedOn = finding.observedOn;
    }
  }

  return {
    visibleFindingCount: findings.length,
    visibleSpeciesCount: counts.size,
    latestObservedOn,
    species: [...counts.values()].sort((left, right) =>
      right.findingCount - left.findingCount
      || left.speciesName.localeCompare(right.speciesName, "ca", { sensitivity: "base" })),
  };
}
