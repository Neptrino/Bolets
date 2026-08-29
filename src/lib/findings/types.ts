import type { SpatialBounds } from "@/src/lib/types";

export type FindingVisibility = "private" | "public";
export type FindingLocationMode = "private_exact" | "coarse_only";
export type FindingQuantityBand =
  | "one"
  | "two-five"
  | "six-twenty"
  | "twenty-one-plus";
export type FindingVerificationStatus =
  | "not_verifiable"
  | "pending"
  | "community_supported"
  | "contested";
export type FindingPublicationState = "draft" | "published" | "hidden";

export type FindingProfile = {
  alias: string | null;
  moderator: boolean;
};

export type FindingPhoto = {
  id: string;
  url: string;
  position: number;
  width: number;
  height: number;
};

export type PublicFinding = {
  id: string;
  reportedSpeciesId: string;
  reportedSpeciesName: string;
  consensusSpeciesId: string | null;
  consensusSpeciesName: string | null;
  observedOn: string;
  cellId: string;
  cellBounds: SpatialBounds;
  alias: string | null;
  verificationStatus: FindingVerificationStatus;
  voteCount: number;
  consensusVoteCount: number;
  photos: FindingPhoto[];
};

export type OwnerFinding = PublicFinding & {
  observedAt: string;
  visibility: FindingVisibility;
  publicationState: FindingPublicationState;
  showAlias: boolean;
  revision: number;
  exactLocation: { longitude: number; latitude: number; accuracyM: number | null } | null;
  quantityBand: FindingQuantityBand | null;
  privateNotes: string | null;
};

export type OwnerFindingMapItem = Pick<
  OwnerFinding,
  "cellBounds" | "exactLocation" | "id" | "reportedSpeciesName"
>;

export type PublicFindingCell = {
  cellId: string;
  bounds: SpatialBounds;
  findingCount: number;
  supportedCount: number;
  latestObservedOn: string;
  speciesCounts: Record<string, number>;
};

export type FindingDraft = {
  clientReportId: string;
  speciesId: string;
  observedAt: string;
  longitude: number;
  latitude: number;
  accuracyM: number | null;
  locationMode: FindingLocationMode;
  quantityBand: FindingQuantityBand | null;
  privateNotes: string;
  visibility: FindingVisibility;
  showAlias: boolean;
};

export type FindingPhotoUpload = {
  id: string;
  stagingPath: string;
  position: number;
};

export type LocalFindingPhoto = {
  id: string;
  blob: Blob;
  position: number;
};

export type FindingOutboxRecord = {
  draft: FindingDraft;
  photos: LocalFindingPhoto[];
  state: "queued" | "syncing" | "failed";
  serverFindingId: string | null;
  error: string | null;
  updatedAt: string;
};
