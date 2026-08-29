import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260827222558_add_user_findings.sql", "utf8");
const privateReaderMigration = readFileSync("supabase/migrations/20260828114500_read_owner_finding_private_details.sql", "utf8");
const removalMigration = readFileSync("supabase/migrations/20260828120000_remove_owner_finding_atomically.sql", "utf8");
const unifiedPhotoVisibilityMigration = readFileSync("supabase/migrations/20260829152554_unify_finding_photo_visibility.sql", "utf8");
const photoRoute = readFileSync("app/api/findings/[id]/photo/[photoId]/route.ts", "utf8");
const findingReads = readFileSync("src/lib/findings/reads.server.ts", "utf8");

describe("community findings database boundary", () => {
  it("keeps exact locations in a separate service-only table", () => {
    expect(migration).toContain("create table public.user_finding_private_details");
    expect(migration).toContain("exact_location extensions.geography(Point, 4326)");
    expect(migration).toContain("revoke all on table public.user_finding_private_details from public, anon, authenticated");
    expect(privateReaderMigration).toContain("extensions.st_x(details.exact_location::extensions.geometry)");
    expect(privateReaderMigration).toContain("extensions.st_y(details.exact_location::extensions.geometry)");
    expect(privateReaderMigration).toContain("where findings.owner_id = p_owner_id");
    expect(privateReaderMigration).toContain("from public, anon, authenticated");
    expect(privateReaderMigration).toContain("to service_role");
  });

  it("maps publication to the canonical 10 km lattice", () => {
    expect(migration).toContain("levels.grid_size_m = 10000");
    expect(migration).toContain("No canonical 10 km land cell covers the finding");
  });

  it("requires a photo and excludes owner votes", () => {
    expect(migration).toContain("Reporters cannot validate their own findings");
    expect(unifiedPhotoVisibilityMigration).toContain("A photo is required for validation");
    expect(unifiedPhotoVisibilityMigration).toContain("where photos.finding_id = finding.id");
    expect(migration).toContain("coalesce(total_votes, 0) >= 3");
    expect(migration).toContain(">= 0.75");
  });

  it("makes every photo follow its parent finding visibility", () => {
    expect(unifiedPhotoVisibilityMigration).toContain("check (is_public)");
    expect(photoRoute).toContain('finding?.visibility === "public"');
    expect(photoRoute).not.toContain("photo.is_public");
    expect(findingReads).not.toContain("photo.is_public");
  });

  it("keeps final photographs private at the storage boundary", () => {
    expect(migration).toContain("('finding-photos', 'finding-photos', false");
    expect(migration).not.toMatch(/create policy[^;]+finding-photos/is);
  });

  it("withdraws an owner finding and its private rows atomically", () => {
    expect(removalMigration).toContain("for update");
    expect(removalMigration).toContain("publication_state = 'hidden'");
    expect(removalMigration).toContain("delete from public.user_finding_private_details");
    expect(removalMigration).toContain("delete from public.user_finding_photos");
    expect(removalMigration).toContain("from public, anon, authenticated");
    expect(removalMigration).toContain("to service_role");
  });
});
