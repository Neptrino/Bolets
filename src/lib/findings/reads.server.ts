import "server-only";

import { getCatalogueSpecies } from "@/data/catalogue";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type {
  FindingPhoto,
  FindingProfile,
  OwnerFinding,
  OwnerFindingMapItem,
  PublicFinding,
  PublicFindingCell,
} from "@/src/lib/findings/types";
import type { ContributionFindingOption } from "@/src/lib/contributions";
import type { SpatialBounds } from "@/src/lib/types";

type FindingRow = {
  id: string;
  owner_id: string | null;
  reported_species_id: string;
  observed_at: string;
  observed_on: string;
  public_cell_id: string;
  visibility: OwnerFinding["visibility"];
  publication_state: OwnerFinding["publicationState"];
  show_alias: boolean;
  revision: number;
  verification_status: OwnerFinding["verificationStatus"];
  consensus_species_id: string | null;
  vote_count: number;
  consensus_vote_count: number;
};

type CellRow = { cell_id: string; west: number; south: number; east: number; north: number };
type PhotoRow = Omit<FindingPhoto, "url" | "position"> & {
  finding_id: string;
  position: number;
};
type PrivateRow = {
  finding_id: string;
  exact_longitude: number | null;
  exact_latitude: number | null;
  location_accuracy_m: number | null;
  quantity_band: OwnerFinding["quantityBand"];
  private_notes: string | null;
};

type OwnerMapRow = Pick<FindingRow, "id" | "public_cell_id" | "reported_species_id">;

export type OwnerFindingsPageOptions = {
  limit: number;
  offset: number;
  speciesIds?: string[];
  visibility?: OwnerFinding["visibility"];
};

export type OwnerFindingsPage = {
  findings: OwnerFinding[];
  total: number;
};

function speciesName(id: string | null) {
  return id ? getCatalogueSpecies(id)?.identity.commonName ?? id : null;
}

function photoDto(row: PhotoRow): FindingPhoto {
  return {
    id: row.id,
    url: `/api/findings/${row.finding_id}/photo/${row.id}`,
    position: row.position,
    width: row.width,
    height: row.height,
  };
}

function publicDto(
  row: FindingRow,
  cell: CellRow,
  photos: PhotoRow[],
  alias: string | null,
): PublicFinding {
  return {
    id: row.id,
    reportedSpeciesId: row.reported_species_id,
    reportedSpeciesName: speciesName(row.reported_species_id)!,
    consensusSpeciesId: row.consensus_species_id,
    consensusSpeciesName: speciesName(row.consensus_species_id),
    observedOn: row.observed_on,
    cellId: row.public_cell_id,
    cellBounds: { west: cell.west, south: cell.south, east: cell.east, north: cell.north },
    alias: row.show_alias ? alias : null,
    verificationStatus: row.verification_status,
    voteCount: row.vote_count,
    consensusVoteCount: row.consensus_vote_count,
    photos: photos.map(photoDto),
  };
}

async function relatedRows(rows: FindingRow[]) {
  const admin = createSupabaseAdminClient();
  const ids = rows.map((row) => row.id);
  const cellIds = [...new Set(rows.map((row) => row.public_cell_id))];
  const ownerIds = [...new Set(rows.flatMap((row) => row.owner_id ? [row.owner_id] : []))];
  if (ids.length === 0) return { cells: new Map(), photos: new Map(), aliases: new Map() };
  const [cellResult, photoResult, profileResult] = await Promise.all([
    admin.from("spatial_cell_levels").select("cell_id,west,south,east,north").in("cell_id", cellIds),
    admin.from("user_finding_photos").select("id,finding_id,position,width,height").in("finding_id", ids).order("position"),
    ownerIds.length ? admin.from("finding_profiles").select("user_id,public_alias").in("user_id", ownerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (cellResult.error || photoResult.error || profileResult.error) throw new Error("Could not read finding details");
  const cells = new Map((cellResult.data as CellRow[]).map((cell) => [cell.cell_id, cell]));
  const photos = new Map<string, PhotoRow[]>();
  for (const photo of photoResult.data as PhotoRow[]) {
    photos.set(photo.finding_id, [...(photos.get(photo.finding_id) ?? []), photo]);
  }
  const aliases = new Map((profileResult.data as { user_id: string; public_alias: string | null }[])
    .map((profile) => [profile.user_id, profile.public_alias]));
  return { cells, photos, aliases };
}

export async function readPublicFindingCells(bounds: SpatialBounds, speciesId: string | null) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("read_public_finding_cells", {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_species_id: speciesId,
    p_limit: 1000,
  });
  if (error) throw new Error("Could not read public finding cells");
  return (data as Array<{
    cell_id: string; west: number; south: number; east: number; north: number;
    finding_count: number; supported_count: number; latest_observed_on: string;
    species_counts: Record<string, number>;
  }>).map((row): PublicFindingCell => ({
    cellId: row.cell_id,
    bounds: { west: row.west, south: row.south, east: row.east, north: row.north },
    findingCount: row.finding_count,
    supportedCount: row.supported_count,
    latestObservedOn: row.latest_observed_on,
    speciesCounts: row.species_counts ?? {},
  }));
}

export async function readPublicFindings(cellId?: string, limit = 80) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("user_findings").select("*")
    .eq("visibility", "public").eq("publication_state", "published")
    .order("observed_on", { ascending: false }).limit(Math.min(limit, 100));
  if (cellId) query = query.eq("public_cell_id", cellId);
  const { data, error } = await query;
  if (error) throw new Error("Could not read public findings");
  const rows = data as FindingRow[];
  const related = await relatedRows(rows);
  return rows.flatMap((row) => {
    const cell = related.cells.get(row.public_cell_id);
    if (!cell) return [];
    return [publicDto(row, cell, related.photos.get(row.id) ?? [], row.owner_id ? related.aliases.get(row.owner_id) ?? null : null)];
  });
}

export async function readPublicFinding(id: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("user_findings").select("*").eq("id", id)
    .eq("visibility", "public").eq("publication_state", "published").maybeSingle();
  if (error || !data) return null;
  const row = data as FindingRow;
  const related = await relatedRows([row]);
  const cell = related.cells.get(row.public_cell_id);
  if (!cell) return null;
  return publicDto(row, cell, related.photos.get(row.id) ?? [], row.owner_id ? related.aliases.get(row.owner_id) ?? null : null);
}

async function ownerPrivateDetails(ownerId: string, findingIds?: string[]) {
  const admin = createSupabaseAdminClient();
  let query = admin.rpc("read_owner_finding_private_details", { p_owner_id: ownerId });
  if (findingIds) {
    if (findingIds.length === 0) return [];
    query = query.in("finding_id", findingIds);
  }
  const { data, error } = await query;
  if (error) throw new Error("Could not read private finding details");
  return data as PrivateRow[];
}

export async function readOwnerFindingsPage(
  ownerId: string,
  options: OwnerFindingsPageOptions,
): Promise<OwnerFindingsPage> {
  const admin = createSupabaseAdminClient();
  if (options.speciesIds && options.speciesIds.length === 0) return { findings: [], total: 0 };
  let query = admin.from("user_findings").select("*", { count: "exact" }).eq("owner_id", ownerId)
    .neq("publication_state", "hidden")
    .order("observed_at", { ascending: false });
  if (options.visibility) query = query.eq("visibility", options.visibility);
  if (options.speciesIds) query = query.in("reported_species_id", options.speciesIds);
  const { data, error, count } = await query.range(
    options.offset,
    options.offset + options.limit - 1,
  );
  if (error) throw new Error("Could not read personal findings");
  const rows = data as FindingRow[];
  const related = await relatedRows(rows);
  const privateData = await ownerPrivateDetails(ownerId, rows.map((row) => row.id));
  const details = new Map(privateData.map((item) => [item.finding_id, item]));
  const findings = rows.flatMap((row): OwnerFinding[] => {
    const cell = related.cells.get(row.public_cell_id);
    if (!cell) return [];
    const base = publicDto(row, cell, related.photos.get(row.id) ?? [], row.owner_id ? related.aliases.get(row.owner_id) ?? null : null);
    const detail = details.get(row.id);
    const exactLongitude = detail?.exact_longitude;
    const exactLatitude = detail?.exact_latitude;
    const hasExactLocation = typeof exactLongitude === "number" && typeof exactLatitude === "number";
    return [{ ...base, photos: (related.photos.get(row.id) ?? []).map(photoDto), observedAt: row.observed_at, visibility: row.visibility,
      publicationState: row.publication_state, showAlias: row.show_alias, revision: row.revision,
      exactLocation: hasExactLocation ? { longitude: exactLongitude, latitude: exactLatitude, accuracyM: detail?.location_accuracy_m ?? null } : null,
      quantityBand: detail?.quantity_band ?? null, privateNotes: detail?.private_notes ?? null }];
  });
  return { findings, total: count ?? findings.length };
}

export async function readOwnerContributionFindingOptions(
  ownerId: string,
): Promise<ContributionFindingOption[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("user_findings")
    .select("id,reported_species_id,observed_on")
    .eq("owner_id", ownerId)
    .eq("visibility", "public")
    .eq("publication_state", "published")
    .order("observed_on", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not read contribution finding options");
  const rows = data as Array<Pick<FindingRow, "id" | "reported_species_id" | "observed_on">>;
  if (!rows.length) return [];
  const { data: photos, error: photoError } = await admin.from("user_finding_photos")
    .select("finding_id")
    .in("finding_id", rows.map((row) => row.id))
    .eq("is_public", true);
  if (photoError) throw new Error("Could not read contribution finding photos");
  const withPhotos = new Set((photos as Array<{ finding_id: string }>).map((photo) => photo.finding_id));
  return rows.flatMap((row) => withPhotos.has(row.id) ? [{
    id: row.id,
    reportedSpeciesName: speciesName(row.reported_species_id)!,
    observedOn: row.observed_on,
  }] : []);
}

export async function readOwnerFindingMap(ownerId: string): Promise<OwnerFindingMapItem[]> {
  const admin = createSupabaseAdminClient();
  const pageSize = 500;
  const rows: OwnerMapRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.from("user_findings")
      .select("id,reported_species_id,public_cell_id")
      .eq("owner_id", ownerId)
      .neq("publication_state", "hidden")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Could not read personal finding map");
    const page = data as OwnerMapRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  if (rows.length === 0) return [];

  const cellIds = [...new Set(rows.map((row) => row.public_cell_id))];
  const { data: cellData, error: cellError } = await admin.from("spatial_cell_levels")
    .select("cell_id,west,south,east,north")
    .in("cell_id", cellIds);
  if (cellError) throw new Error("Could not read personal finding map cells");
  const cells = new Map((cellData as CellRow[]).map((cell) => [cell.cell_id, cell]));

  const privateRows: PrivateRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.rpc("read_owner_finding_private_details", { p_owner_id: ownerId })
      .order("finding_id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Could not read personal finding map locations");
    const page = data as PrivateRow[];
    privateRows.push(...page);
    if (page.length < pageSize) break;
  }
  const details = new Map(privateRows.map((item) => [item.finding_id, item]));

  return rows.flatMap((row): OwnerFindingMapItem[] => {
    const cell = cells.get(row.public_cell_id);
    if (!cell) return [];
    const detail = details.get(row.id);
    const exactLongitude = detail?.exact_longitude;
    const exactLatitude = detail?.exact_latitude;
    return [{
      id: row.id,
      reportedSpeciesName: speciesName(row.reported_species_id)!,
      cellBounds: { west: cell.west, south: cell.south, east: cell.east, north: cell.north },
      exactLocation: typeof exactLongitude === "number" && typeof exactLatitude === "number"
        ? { longitude: exactLongitude, latitude: exactLatitude, accuracyM: detail?.location_accuracy_m ?? null }
        : null,
    }];
  });
}

export async function readFindingProfile(userId: string): Promise<FindingProfile> {
  const admin = createSupabaseAdminClient();
  const [profile, moderator] = await Promise.all([
    admin.from("finding_profiles").select("public_alias").eq("user_id", userId).maybeSingle(),
    admin.from("finding_moderators").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  if (profile.error || moderator.error) throw new Error("Could not read finding profile");
  return { alias: profile.data?.public_alias ?? null, moderator: Boolean(moderator.data) };
}
