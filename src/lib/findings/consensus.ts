import type { FindingVerificationStatus } from "@/src/lib/findings/types";

export type FindingConsensus = {
  status: FindingVerificationStatus;
  speciesId: string | null;
  totalVotes: number;
  leadingVotes: number;
};

export function calculateFindingConsensus(
  speciesVotes: Iterable<string>,
  publicPhotoCount: number,
): FindingConsensus {
  const counts = new Map<string, number>();
  let totalVotes = 0;
  for (const speciesId of speciesVotes) {
    counts.set(speciesId, (counts.get(speciesId) ?? 0) + 1);
    totalVotes += 1;
  }
  const leader = [...counts.entries()]
    .sort(([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId))[0];
  const leadingVotes = leader?.[1] ?? 0;
  if (publicPhotoCount < 1) {
    return { status: "not_verifiable", speciesId: null, totalVotes, leadingVotes };
  }
  if (totalVotes < 3) {
    return { status: "pending", speciesId: null, totalVotes, leadingVotes };
  }
  if (leadingVotes / totalVotes >= 0.75) {
    return {
      status: "community_supported",
      speciesId: leader?.[0] ?? null,
      totalVotes,
      leadingVotes,
    };
  }
  return { status: "contested", speciesId: null, totalVotes, leadingVotes };
}

export const findingVerificationCopy: Record<FindingVerificationStatus, string> = {
  not_verifiable: "Sense evidència pública",
  pending: "Pendent de la comunitat",
  community_supported: "Identificació recolzada per la comunitat",
  contested: "Identificació discutida",
};
