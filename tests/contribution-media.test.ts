import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contributionRequestInputSchema } from "@/src/lib/contributions";

const photo = {
  id: "6ddaf107-64b1-494b-925a-4bd98de7a6a8",
  stagingPath: "bd2fa868-92c8-4d98-9404-e9d9b2527716/144cfd2b-b4e1-4238-afad-780d735f9811/6ddaf107-64b1-494b-925a-4bd98de7a6a8.webp",
  position: 0,
};

describe("contribution media", () => {
  it("requires a photo and reuse permission for reusable-media contributions", () => {
    const valid = contributionRequestInputSchema.safeParse({
      kind: "reusable_media",
      description: "Fotografies pròpies d’una espècie del catàleg.",
      evidenceUrl: "",
      mediaRightsConfirmed: true,
      mediaCredit: "Bosc Viu",
      media: [photo],
    });
    expect(valid.success).toBe(true);

    expect(contributionRequestInputSchema.safeParse({
      kind: "reusable_media",
      description: "Fotografies pròpies d’una espècie del catàleg.",
      mediaRightsConfirmed: false,
      media: [photo],
    }).success).toBe(false);
    expect(contributionRequestInputSchema.safeParse({
      kind: "reusable_media",
      description: "Fotografies pròpies d’una espècie del catàleg.",
      mediaRightsConfirmed: true,
      media: [],
    }).success).toBe(false);
  });

  it("does not attach direct media to another contribution kind", () => {
    expect(contributionRequestInputSchema.safeParse({
      kind: "catalogue_correction",
      description: "Correcció documentada amb una font fiable i pública.",
      mediaRightsConfirmed: true,
      media: [photo],
    }).success).toBe(false);
  });

  it("keeps final media private and review-only", () => {
    const migration = readFileSync(
      "supabase/migrations/20260901224914_contribution_media_uploads.sql",
      "utf8",
    );
    const mediaRoute = readFileSync(
      "app/api/contributions/[requestId]/media/[mediaId]/route.ts",
      "utf8",
    );
    const processor = readFileSync("src/lib/contributions/media.server.ts", "utf8");
    const adminPage = readFileSync("app/admin/status/contributions/page.tsx", "utf8");

    expect(migration).toContain("'contribution-media', 'contribution-media', false");
    expect(migration).toContain("alter table public.contribution_request_media enable row level security");
    expect(migration).toContain("revoke all on table public.contribution_request_media from public, anon, authenticated");
    expect(mediaRoute).toContain('user.app_metadata?.app_role === "admin"');
    expect(mediaRoute).toContain('"Cache-Control": "private, no-store"');
    expect(mediaRoute).toContain('headers.set("Content-Disposition"');
    expect(adminPage).toContain('href={`${media.url}?download=1`}');
    expect(adminPage).toContain("Descarrega la foto");
    expect(processor).toContain(".webp({ quality: 82 })");
    expect(processor).toContain('from("finding-photo-staging")');
  });
});
