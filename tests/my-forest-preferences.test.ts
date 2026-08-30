import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forestPreferenceOptions,
  normaliseCanonicalForestPreferences,
} from "@/src/lib/my-forest/preferences";
import { forestPreferencesSchema } from "@/src/lib/my-forest/schema";

const {
  getAuthenticatedUser,
  readForestPreferences,
  saveForestPreferences,
} = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  readForestPreferences: vi.fn(),
  saveForestPreferences: vi.fn(),
}));

vi.mock("@/src/lib/supabase/server", () => ({ getAuthenticatedUser }));
vi.mock("@/src/lib/my-forest/preferences.server", () => ({
  readForestPreferences,
  saveForestPreferences,
}));

import { GET, PATCH } from "@/app/api/me/forest-preferences/route";

const migration = readFileSync(
  "supabase/migrations/20260829182354_add_user_forest_preferences.sql",
  "utf8",
);
const migrationInstaller = readFileSync(
  "deploy/vps/apply-database-migrations.sh",
  "utf8",
);

describe("El meu bosc preferences", () => {
  beforeEach(() => {
    getAuthenticatedUser.mockReset();
    readForestPreferences.mockReset();
    saveForestPreferences.mockReset();
  });

  it("uses the canonical species catalogue and territorial hub registry", () => {
    const options = forestPreferenceOptions();
    expect(options.species.some((option) => option.value === "boletus-edulis")).toBe(true);
    expect(options.territories.some((option) => option.value === "ripolles")).toBe(true);
    expect(new Set(options.species.map((option) => option.value)).size).toBe(options.species.length);
    expect(new Set(options.territories.map((option) => option.value)).size).toBe(options.territories.length);
  });

  it("rejects duplicate, excessive, and malformed selections", () => {
    expect(forestPreferencesSchema.safeParse({
      speciesIds: ["boletus-edulis", "boletus-edulis"],
      territorySlugs: [],
    }).success).toBe(false);
    expect(forestPreferencesSchema.safeParse({
      speciesIds: ["../secret"],
      territorySlugs: ["ripolles"],
    }).success).toBe(false);
    expect(forestPreferencesSchema.safeParse({
      speciesIds: [],
      territorySlugs: Array.from({ length: 31 }, (_, index) => `territori-${index}`),
    }).success).toBe(false);
  });

  it("drops catalogue entries that no longer exist when reading old preferences", () => {
    expect(normaliseCanonicalForestPreferences({
      speciesIds: ["boletus-edulis", "removed-species"],
      territorySlugs: ["ripolles", "removed-territory"],
    })).toEqual({
      speciesIds: ["boletus-edulis"],
      territorySlugs: ["ripolles"],
    });
  });

  it("requires authentication for preference reads and writes", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PATCH(new Request("https://bolets.app/api/me/forest-preferences", {
      method: "PATCH",
      body: JSON.stringify({ speciesIds: [], territorySlugs: [] }),
    }))).status).toBe(401);
    expect(readForestPreferences).not.toHaveBeenCalled();
    expect(saveForestPreferences).not.toHaveBeenCalled();
  });

  it("saves only canonical choices for the authenticated owner", async () => {
    getAuthenticatedUser.mockResolvedValue({ id: "owner-a" });
    saveForestPreferences.mockResolvedValue({
      speciesIds: ["boletus-edulis"],
      territorySlugs: ["ripolles"],
    });
    const response = await PATCH(new Request("https://bolets.app/api/me/forest-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speciesIds: ["boletus-edulis"],
        territorySlugs: ["ripolles"],
      }),
    }));
    expect(response.status).toBe(200);
    expect(saveForestPreferences).toHaveBeenCalledWith("owner-a", {
      speciesIds: ["boletus-edulis"],
      territorySlugs: ["ripolles"],
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects syntactically valid identifiers outside the catalogues", async () => {
    getAuthenticatedUser.mockResolvedValue({ id: "owner-a" });
    const response = await PATCH(new Request("https://bolets.app/api/me/forest-preferences", {
      method: "PATCH",
      body: JSON.stringify({
        speciesIds: ["invented-mushroom"],
        territorySlugs: ["ripolles"],
      }),
    }));
    expect(response.status).toBe(400);
    expect(saveForestPreferences).not.toHaveBeenCalled();
  });

  it("enforces owner-scoped RLS for every preference mutation", () => {
    expect(migration).toContain("alter table public.user_forest_preferences enable row level security");
    expect(migration).toContain("revoke all on table public.user_forest_preferences from public, anon, authenticated");
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(5);
    expect(migration).toMatch(/for update to authenticated[\s\S]*using \(\(select auth\.uid\(\)\) = user_id\)[\s\S]*with check \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it("installs the private account boundary during a VPS rollout", () => {
    expect(migrationInstaller).toContain(
      "20260829182354_add_user_forest_preferences.sql",
    );
    expect(migrationInstaller).toContain(
      'apply_if_missing user_forest_preferences "$forest_preferences_migration" forest-preferences',
    );
  });
});
