import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type InstagramSpeciesPublicationStatus = "cancelled" | "scheduled";

export type InstagramSpeciesPublicationOverride = {
  captionOverride: string | null;
  publicationDate: string;
  speciesId: string | null;
  status: InstagramSpeciesPublicationStatus;
  updatedAt: string;
};

type OverrideRow = {
  caption_override: string | null;
  publication_date: string;
  species_id: string | null;
  status: InstagramSpeciesPublicationStatus;
  updated_at: string;
};

function fromRow(row: OverrideRow): InstagramSpeciesPublicationOverride {
  return {
    captionOverride: row.caption_override,
    publicationDate: row.publication_date,
    speciesId: row.species_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export async function readInstagramSpeciesPublicationOverrides(
  publicationDates: string[],
) {
  if (publicationDates.length === 0) return new Map<string, InstagramSpeciesPublicationOverride>();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("instagram_species_publication_overrides")
    .select("publication_date,species_id,caption_override,status,updated_at")
    .in("publication_date", publicationDates);
  if (error) throw new Error(`Instagram species controls could not be read: ${error.message}`);
  return new Map((data as OverrideRow[]).map((row) => [row.publication_date, fromRow(row)]));
}

export async function readInstagramSpeciesPublicationOverride(publicationDate: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("instagram_species_publication_overrides")
    .select("publication_date,species_id,caption_override,status,updated_at")
    .eq("publication_date", publicationDate)
    .maybeSingle();
  if (error) throw new Error(`Instagram species control could not be read: ${error.message}`);
  return data ? fromRow(data as OverrideRow) : null;
}

export async function saveInstagramSpeciesPublicationOverride({
  captionOverride,
  publicationDate,
  speciesId,
  status,
  updatedBy,
}: {
  captionOverride: string | null;
  publicationDate: string;
  speciesId: string | null;
  status: InstagramSpeciesPublicationStatus;
  updatedBy: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("instagram_species_publication_overrides")
    .upsert({
      caption_override: captionOverride,
      publication_date: publicationDate,
      species_id: speciesId,
      status,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: "publication_date" })
    .select("publication_date,species_id,caption_override,status,updated_at")
    .single();
  if (error) throw new Error(`Instagram species control could not be saved: ${error.message}`);
  return fromRow(data as OverrideRow);
}

export async function deleteInstagramSpeciesPublicationOverride(publicationDate: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("instagram_species_publication_overrides")
    .delete()
    .eq("publication_date", publicationDate);
  if (error) throw new Error(`Instagram species control could not be restored: ${error.message}`);
}
