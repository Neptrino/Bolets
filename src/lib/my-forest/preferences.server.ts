import "server-only";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ForestPreferences } from "@/src/lib/my-forest/types";
import { normaliseCanonicalForestPreferences } from "@/src/lib/my-forest/preferences";

type PreferenceRow = {
  favourite_species_ids: string[];
  territory_slugs: string[];
};

export async function readForestPreferences(userId: string): Promise<ForestPreferences> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("user_forest_preferences")
    .select("favourite_species_ids,territory_slugs")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not read forest preferences");
  const row = data as PreferenceRow | null;
  return normaliseCanonicalForestPreferences({
    speciesIds: row?.favourite_species_ids ?? [],
    territorySlugs: row?.territory_slugs ?? [],
  });
}

export async function saveForestPreferences(
  userId: string,
  preferences: ForestPreferences,
) {
  const client = await createSupabaseServerClient();
  const { error } = await client.from("user_forest_preferences").upsert({
    user_id: userId,
    favourite_species_ids: preferences.speciesIds,
    territory_slugs: preferences.territorySlugs,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Could not save forest preferences");
  return preferences;
}
