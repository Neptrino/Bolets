import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pageHref, positivePage } from "@/app/admin/(private)/detail-utils";

describe("admin community details", () => {
  it("shows the complete account email only inside the private admin page", () => {
    const page = readFileSync("app/admin/(private)/usuaris/page.tsx", "utf8");
    const server = readFileSync("src/lib/community-details-server.ts", "utf8");
    expect(page).toContain("user.email");
    expect(page).toContain("El correu complet identifica cada compte");
    expect(server).toContain('email: user.email ?? "Sense correu"');
    expect(server).not.toContain("maskAdminEmail");
  });

  it("normalizes invalid pages and preserves detail filters in pagination links", () => {
    expect(positivePage("-3")).toBe(1);
    expect(positivePage("4")).toBe(4);
    expect(pageHref("/admin/troballes", 3, {
      state: "published",
      visibility: "public",
    })).toBe("/admin/troballes?state=published&visibility=public&page=3");
  });

  it("shows user roles and expiring map access in an admin table", () => {
    const page = readFileSync("app/admin/(private)/usuaris/page.tsx", "utf8");
    const server = readFileSync("src/lib/community-details-server.ts", "utf8");
    expect(page).toContain("<table");
    expect(page).toContain("Accés al mapa");
    expect(page).toContain("Caducitat");
    expect(page).toContain("Aportacions");
    expect(page).toContain("Sense caducitat");
    expect(server).toContain('.from("contributor_access")');
    expect(server).toContain('.from("contribution_requests")');
    expect(server).toContain("userHasAppRole(user, APP_ROLES.admin)");
  });

  it("lets administrators grant and revoke map access per user", () => {
    const page = readFileSync("app/admin/(private)/usuaris/page.tsx", "utf8");
    const dialog = readFileSync("app/admin/(private)/usuaris/user-access-dialog.tsx", "utf8");
    const actions = readFileSync("app/admin/(private)/usuaris/actions.ts", "utf8");
    const server = readFileSync("src/lib/contributions/server.ts", "utf8");
    const migration = readFileSync("supabase/migrations/20260903123701_admin_manual_map_access_ordered.sql", "utf8");
    expect(page).toContain("UserAccessDialog");
    expect(page).toContain('<th scope="col">Accions</th>');
    expect(dialog).toContain("Gestionar accés");
    expect(dialog).toContain("Concedir accés");
    expect(dialog).toContain("Retirar l’accés");
    expect(dialog).toContain("FormSelect");
    expect(dialog).toContain("portalContainer={dialog}");
    expect(actions).toContain("requireOperationalSession");
    expect(server).toContain('admin.rpc("grant_manual_map_access"');
    expect(migration).toContain("create table public.manual_map_access_grants");
    expect(migration).toContain("administrator role required");
    expect(migration).toContain("alter table public.manual_map_access_grants enable row level security");
  });

  it("shows communicated findings in a semantic admin table", () => {
    const page = readFileSync("app/admin/(private)/troballes/page.tsx", "utf8");
    expect(page).toContain("<table");
    expect(page).toContain("Taula de troballes comunicades");
    expect(page).toContain('<th scope="col">Troballa</th>');
    expect(page).toContain('<th scope="col">Validació</th>');
    expect(page).not.toContain("styles.detailCard");
  });

  it("lets administrators dismiss alerts or hide reported findings", () => {
    const page = readFileSync("app/admin/(private)/avisos/page.tsx", "utf8");
    const controls = readFileSync("app/admin/(private)/avisos/report-moderation-controls.tsx", "utf8");
    const action = readFileSync("app/admin/(private)/avisos/actions.ts", "utf8");
    const server = readFileSync("src/lib/community-details-server.ts", "utf8");
    expect(page).toContain("ReportModerationControls");
    expect(controls).toContain("Desestimar l’avís");
    expect(controls).toContain("Ocultar la troballa");
    expect(controls).toContain("ConfirmDialog");
    expect(action).toContain('z.enum(["hide", "dismiss"])');
    expect(server).toContain('admin.rpc("moderate_user_finding"');
    expect(server).toContain("requireOperationalSession()");
  });

  it("exposes privacy-safe actions from the admin findings table", () => {
    const page = readFileSync("app/admin/(private)/troballes/page.tsx", "utf8");
    const controls = readFileSync("app/admin/(private)/troballes/finding-admin-actions.tsx", "utf8");
    const action = readFileSync("app/admin/(private)/troballes/actions.ts", "utf8");
    const server = readFileSync("src/lib/community-details-server.ts", "utf8");
    expect(page).toContain("FindingAdminActions");
    expect(controls).toContain('href={`/admin/troballes/${findingId}`}');
    expect(controls).toContain("Vista pública");
    expect(controls).toContain("Revisar");
    expect(controls).toContain("Retirar");
    expect(controls).toContain("ConfirmDialog");
    expect(action).toContain("hideAdminFinding");
    expect(server).toContain('.eq("visibility", "public")');
    expect(server).toContain('.eq("publication_state", "published")');
  });

  it("provides a privacy-safe admin detail page for every finding state", () => {
    const list = readFileSync("app/admin/(private)/troballes/page.tsx", "utf8");
    const detail = readFileSync("app/admin/(private)/troballes/[id]/page.tsx", "utf8");
    const reader = readFileSync("src/lib/admin-finding-detail-server.ts", "utf8");
    expect(list).toContain('href={`/admin/troballes/${finding.id}`}');
    expect(detail).toContain("Registre de la troballa");
    expect(detail).toContain("Límit de privadesa");
    expect(detail).toContain("Sector generalitzat");
    expect(reader).toContain('.from("user_findings")');
    expect(reader).toContain('.from("user_finding_flags")');
    expect(reader).not.toContain("user_finding_private_details");
    expect(reader).not.toContain("storage_path");
  });
});
