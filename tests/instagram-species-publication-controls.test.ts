import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Instagram species publication controls", () => {
  it("keeps overrides private and service-role only", () => {
    const migration = readFileSync(
      "supabase/migrations/20260902213000_add_instagram_species_publication_overrides.sql",
      "utf8",
    );

    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.instagram_species_publication_overrides from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.instagram_species_publication_overrides to service_role");
    expect(migration).toContain("char_length(caption_override) <= 2100");
  });

  it("checks a cancelled override before contacting the publisher", () => {
    const route = readFileSync("app/api/internal/instagram/growth/route.ts", "utf8");
    const cancellation = route.indexOf('speciesOverride?.status === "cancelled"');
    const publication = route.indexOf("publishInstagramGrowthPost({");

    expect(cancellation).toBeGreaterThan(0);
    expect(cancellation).toBeLessThan(publication);
    expect(route).toContain("speciesCaptionOverride: speciesOverride?.captionOverride");
    expect(route).toContain("speciesId: speciesOverride?.speciesId");
  });

  it("offers edit, skip and restore controls in the private planner", () => {
    const control = readFileSync(
      "app/admin/(private)/publicacio/species-publication-control.tsx",
      "utf8",
    );

    expect(control).toContain("Desa els canvis");
    expect(control).toContain("Omet aquesta publicació");
    expect(control).toContain("Restaura l’automàtica");
    expect(control).toContain("/admin/publicacio/species-overrides");
  });
});
