import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { dispatchOperationalResync, isOperationalSessionAuthorized } = vi.hoisted(() => ({
  dispatchOperationalResync: vi.fn(),
  isOperationalSessionAuthorized: vi.fn(),
}));

vi.mock("@/src/lib/operational-status-auth", () => ({
  isOperationalSessionAuthorized,
  OPERATIONAL_SESSION_COOKIE: "bolets-admin-session",
}));
vi.mock("@/src/lib/operational-resync-server", () => ({ dispatchOperationalResync }));

import { POST } from "@/app/admin/status/resync/route";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824151551_add_operational_resync_dispatcher.sql",
  ),
  "utf8",
);
const installer = readFileSync(
  join(process.cwd(), "deploy", "vps", "apply-database-migrations.sh"),
  "utf8",
);
const clientControls = readFileSync(
  join(process.cwd(), "app", "admin", "status", "resync-controls.tsx"),
  "utf8",
);
const statusPage = readFileSync(
  join(process.cwd(), "app", "admin", "status", "page.tsx"),
  "utf8",
);
const serverDispatcher = readFileSync(
  join(process.cwd(), "src", "lib", "operational-resync-server.ts"),
  "utf8",
);

let address = 20;
function request(
  target: unknown,
  options: { origin?: string; cookie?: boolean } = {},
) {
  address += 1;
  return new NextRequest("https://bolets.app/admin/status/resync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? "https://bolets.app",
      Host: "bolets.app",
      "CF-Connecting-IP": `192.0.2.${address}`,
      ...(options.cookie === false ? {} : { Cookie: "bolets-admin-session=test-session" }),
    },
    body: JSON.stringify({ target }),
  });
}

describe("private operational resync controls", () => {
  beforeEach(() => {
    dispatchOperationalResync.mockReset();
    isOperationalSessionAuthorized.mockReset();
    isOperationalSessionAuthorized.mockResolvedValue(true);
  });

  it("keeps reset and Vault dispatch behind a service-role-only database function", () => {
    expect(migration).toContain("create or replace function public.dispatch_operational_resync");
    expect(migration).toContain("security definer");
    expect(migration).toContain("from vault.decrypted_secrets");
    expect(migration).toContain("bolets_ingestion_token");
    expect(migration).toContain("net.http_post");
    expect(migration).toContain("array['direct', 'cloudflare', 'aws']");
    expect(migration).toContain("if atmosphere_complete then");
    expect(migration).toContain("if soil_complete and forecast_complete then");
    expect(migration).toContain("spatial-condition-territorial");
    expect(migration).toMatch(
      /revoke all on function public\.dispatch_operational_resync\(text\)[\s\S]*from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.dispatch_operational_resync\(text\)[\s\S]*to service_role/,
    );
  });

  it("reapplies the dispatcher on restored self-hosted databases", () => {
    expect(installer).toContain("20260824151551_add_operational_resync_dispatcher.sql");
    expect(installer).toContain("Applied operational resync dispatcher");
  });

  it("keeps operational credentials out of the client controls", () => {
    expect(clientControls).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(clientControls).not.toContain("ingestion_token");
    expect(clientControls).toContain('fetch("/admin/status/resync"');
    expect(serverDispatcher).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serverDispatcher).toContain("dispatch_operational_resync");
  });

  it("keeps the controls available when the status query is unavailable", () => {
    const unavailableBranch = statusPage.slice(
      statusPage.indexOf("La telemetria no respon"),
      statusPage.indexOf("const summary = summarizeOperationalStatus"),
    );
    expect(unavailableBranch).toContain("<ResyncControls />");
  });

  it("queues an authenticated same-origin command", async () => {
    dispatchOperationalResync.mockResolvedValue({
      accepted: true,
      target: "soil-forecast",
      requestIds: [81],
      resetPipelines: ["spatial-soil", "spatial-forecast-v2"],
    });

    const response = await POST(request("soil-forecast"));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({ accepted: true, requestIds: [81] });
    expect(dispatchOperationalResync).toHaveBeenCalledWith("soil-forecast");
  });

  it("rejects cross-origin, unauthenticated, and unknown commands", async () => {
    const crossOrigin = await POST(request("all", { origin: "https://example.com" }));
    expect(crossOrigin.status).toBe(403);

    isOperationalSessionAuthorized.mockResolvedValue(false);
    const unauthenticated = await POST(request("all", { cookie: false }));
    expect(unauthenticated.status).toBe(401);

    isOperationalSessionAuthorized.mockResolvedValue(true);
    const invalid = await POST(request("drop-database"));
    expect(invalid.status).toBe(400);
    expect(dispatchOperationalResync).not.toHaveBeenCalled();
  });

  it("reports a busy dispatcher without pretending that work was queued", async () => {
    dispatchOperationalResync.mockResolvedValue({
      accepted: false,
      target: "condition-caches",
      reason: "condition-cache-publication-is-running",
      requestIds: [],
      resetPipelines: [],
    });

    const response = await POST(request("condition-caches"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      accepted: false,
      reason: "condition-cache-publication-is-running",
    });
  });
});
