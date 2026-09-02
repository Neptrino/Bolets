import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contributor detailed-map access", () => {
  const migration = readFileSync(
    "supabase/migrations/20260901200908_contributor_access.sql",
    "utf8",
  );
  const tieredMigration = readFileSync(
    "supabase/migrations/20260902064059_tiered_map_access.sql",
    "utf8",
  );
  const abuseControlsMigration = readFileSync(
    "supabase/migrations/20260902090144_finding_publication_abuse_controls.sql",
    "utf8",
  );
  const edgeReader = readFileSync(
    "supabase/functions/read-spatial-environment/index.ts",
    "utf8",
  );
  const serviceWorker = readFileSync("public/sw.js", "utf8");
  const habitatReader = readFileSync("src/lib/habitat.ts", "utf8");
  const rollout = readFileSync("deploy/vps/rollout.sh", "utf8");
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  const adminContributions = readFileSync("app/admin/status/contributions/page.tsx", "utf8");
  const adminContributionStyles = readFileSync(
    "app/admin/status/contributions/contributions.module.css",
    "utf8",
  );

  it("keeps contribution and grant tables behind the service role", () => {
    for (const table of [
      "contribution_requests",
      "contributor_access",
      "contributor_access_grants",
      "contribution_email_outbox",
    ]) {
      expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
    }
    const mediaMigration = readFileSync(
      "supabase/migrations/20260901224914_contribution_media_uploads.sql",
      "utf8",
    );
    expect(mediaMigration).toContain("media_rights_confirmed_at");
    expect(mediaMigration).toContain("contribution_request_media");
    expect(tieredMigration).toContain("interval '7 days'");
    expect(tieredMigration).toContain("interval '30 days'");
    expect(tieredMigration).toContain("grant_finding_map_access");
    expect(tieredMigration).toContain("finding_access_grants");
    expect(abuseControlsMigration).toContain("grant_row.created_at > now() - interval '7 days'");
    expect(abuseControlsMigration).toContain("finding.observed_on between");
    expect(abuseControlsMigration).toContain("duplicate_review_state = 'clear'");
    expect(abuseControlsMigration).toContain("revoke_grant_without_public_photo");
    expect(abuseControlsMigration).toContain("moderate_user_finding");
    expect(abuseControlsMigration).toContain("open_count >= 2");
    expect(abuseControlsMigration).toContain("interval '30 days'");
    expect(abuseControlsMigration).toContain("revoke all on table public.finding_abuse_signals from public, anon, authenticated");
    expect(tieredMigration).toContain("from public, anon, authenticated");
    expect(migration).toContain("'expiry_reminder'");
    expect(migration).not.toContain("payment");
    expect(rollout).toContain("CONTRIBUTOR_ACCESS_SECRET in the status environment file");
    expect(sitemap).toContain('absoluteUrl("/col-labora")');
    expect(adminContributions).toContain("Obrir la troballa vinculada");
    expect(adminContributionStyles).toContain('button[value="approved"]');
    expect(adminContributionStyles).toContain("background: var(--forest-panel)");
    expect(adminContributionStyles).not.toContain("var(--forest)");
  });

  it("allows only a trusted Edge Function caller to read 1 km and 250 m", () => {
    expect(edgeReader).toContain("resolution < 2500 && !requireServiceRole(request)");
    expect(edgeReader).toContain("Detailed map access requires a trusted application request");
  });

  it("keeps detailed habitat out of public assets and offline caches", () => {
    expect(habitatReader).toContain("assetBaseUrl && gridSizeM >= 2500");
    expect(serviceWorker).toContain('Number(url.searchParams.get("resolution")) < 2500');
  });
});
