import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  operationalStatusPrometheus,
  summarizeOperationalStatus,
  type OperationalStatus,
} from "@/src/lib/operational-status";

function fixture(overrides: Partial<OperationalStatus> = {}): OperationalStatus {
  return {
    generatedAt: "2026-08-24T12:00:00.000Z",
    currentDate: "2026-08-24",
    sources: [{
      sourceId: "open-meteo",
      title: "Open-Meteo",
      sourceKind: "weather",
      refreshCadence: "daily",
      enabled: true,
      status: "active",
      statusDetail: "Current",
      checkedAt: "2026-08-24T11:00:00.000Z",
    }],
    cursors: [{
      pipeline: "spatial-atmosphere",
      snapshotDate: "2026-08-24",
      lastCellId: "__complete__",
      updatedAt: "2026-08-24T10:00:00.000Z",
    }, {
      pipeline: "spatial-soil",
      snapshotDate: "2026-08-24",
      lastCellId: "__complete__",
      updatedAt: "2026-08-24T09:00:00.000Z",
    }, {
      pipeline: "spatial-condition-coarse",
      snapshotDate: "2026-08-24",
      lastCellId: "__complete__",
      updatedAt: "2026-08-24T10:01:00.000Z",
    }, {
      pipeline: "spatial-condition-territorial",
      snapshotDate: "2026-08-24",
      lastCellId: "__complete__",
      updatedAt: "2026-08-24T10:02:00.000Z",
    }],
    jobs: [{
      snapshotDate: "2026-08-24",
      jobKind: "atmosphere",
      status: "succeeded",
      egressLane: "aws",
      shards: 10,
      expectedPoints: 500,
      rowsWritten: 500,
      maxAttemptCount: 1,
      lastError: null,
      updatedAt: "2026-08-24T10:00:00.000Z",
    }],
    egressLanes: [{
      lane: "direct",
      blockedUntil: null,
      consecutiveRateLimits: 0,
      lastHttpStatus: 200,
      lastRateLimitedAt: null,
      lastSuccessAt: "2026-08-24T10:00:00.000Z",
      updatedAt: "2026-08-24T10:00:00.000Z",
    }, {
      lane: "cloudflare",
      blockedUntil: null,
      consecutiveRateLimits: 0,
      lastHttpStatus: 200,
      lastRateLimitedAt: null,
      lastSuccessAt: "2026-08-24T10:00:00.000Z",
      updatedAt: "2026-08-24T10:00:00.000Z",
    }, {
      lane: "aws",
      blockedUntil: null,
      consecutiveRateLimits: 0,
      lastHttpStatus: 200,
      lastRateLimitedAt: null,
      lastSuccessAt: "2026-08-24T10:00:00.000Z",
      updatedAt: "2026-08-24T10:00:00.000Z",
    }],
    budgets: [{
      provider: "open-meteo",
      consumer: "*",
      windowKind: "day",
      windowStart: "2026-08-24T00:00:00.000Z",
      estimatedUnits: 9579,
      updatedAt: "2026-08-24T10:00:00.000Z",
    }],
    rollingStates: [{
      stream: "arome-atmosphere",
      stateCount: 5128,
      coverageStart: "2026-07-25T00:00:00.000Z",
      oldestLastHour: "2026-08-24T11:00:00.000Z",
      newestLastHour: "2026-08-24T11:00:00.000Z",
      updatedAt: "2026-08-24T11:15:00.000Z",
    }],
    weatherSnapshot: {
      latestDate: "2026-08-24",
      rowCount: 5128,
      staleCount: 0,
      observedAt: "2026-08-24T11:00:00.000Z",
      createdAt: "2026-08-24T11:30:00.000Z",
    },
    recentRuns: [{
      id: "run-1",
      pipeline: "spatial-environment",
      triggerType: "cron",
      status: "succeeded",
      snapshotDate: "2026-08-24",
      startedAt: "2026-08-24T09:00:00.000Z",
      completedAt: "2026-08-24T10:00:00.000Z",
      rowsRead: 5128,
      rowsWritten: 5128,
      errorMessage: null,
      egressLane: "aws",
      reason: null,
      jobId: 12,
      jobKind: "atmosphere",
      shardNumber: 8,
      shardTotal: 52,
      expectedPoints: 100,
      attempt: 1,
    }],
    ...overrides,
  };
}

describe("operational status", () => {
  it("distinguishes completed, running, degraded, and stale production state", () => {
    expect(summarizeOperationalStatus(fixture()).state).toBe("healthy");
    expect(summarizeOperationalStatus(fixture({
      jobs: [{ ...fixture().jobs[0]!, status: "pending", egressLane: null }],
    })).state).toBe("running");
    expect(summarizeOperationalStatus(fixture({
      sources: [{ ...fixture().sources[0]!, status: "degraded" }],
    })).state).toBe("attention");
    expect(summarizeOperationalStatus(fixture({
      sources: [{
        ...fixture().sources[0]!,
        sourceId: "copernicus-clms-ssm-1km-v1",
        status: "blocked",
      }],
    })).state).toBe("healthy");
    expect(summarizeOperationalStatus(fixture({
      cursors: fixture().cursors.map((cursor) => cursor.pipeline === "spatial-atmosphere"
        ? { ...cursor, snapshotDate: "2026-08-22" }
        : cursor),
    })).state).toBe("critical");
    expect(summarizeOperationalStatus(fixture({
      cursors: fixture().cursors.map((cursor) => cursor.pipeline === "spatial-condition-territorial"
        ? { ...cursor, snapshotDate: "2026-08-23" }
        : cursor),
    })).state).toBe("critical");
  });

  it("treats a later successful run as recovery from an earlier failure", () => {
    const failed = {
      ...fixture().recentRuns[0]!,
      id: "failed",
      status: "failed" as const,
      startedAt: "2026-08-24T08:00:00.000Z",
      completedAt: "2026-08-24T08:01:00.000Z",
      errorMessage: "temporary upstream failure",
    };
    const recovered = fixture().recentRuns[0]!;
    expect(summarizeOperationalStatus(fixture({ recentRuns: [recovered, failed] })).state).toBe("healthy");
    expect(summarizeOperationalStatus(fixture({ recentRuns: [failed] })).state).toBe("attention");
  });

  it("exports bounded operational metrics without error text", () => {
    const status = fixture({
      recentRuns: [{ ...fixture().recentRuns[0]!, errorMessage: "secret-looking detail" }],
    });
    const metrics = operationalStatusPrometheus(status);

    expect(metrics).toContain('bolets_operational_status{state="healthy"} 1');
    expect(metrics).toContain('bolets_provider_budget_units{provider="open-meteo",consumer="*",window="day"} 9579');
    expect(metrics).toContain('bolets_rolling_state_points{stream="arome-atmosphere"} 5128');
    expect(metrics).toContain('bolets_open_meteo_egress_blocked{lane="direct"} 0');
    expect(metrics).not.toContain("secret-looking detail");
  });

  it("keeps the database boundary and ingress private", () => {
    const migration = readFileSync(
      "supabase/migrations/20260824143000_add_operational_status_reader.sql",
      "utf8",
    );
    const caddy = readFileSync("deploy/vps/Caddyfile", "utf8");
    const serviceWorker = readFileSync("public/sw.js", "utf8");
    const sessionRoute = readFileSync("app/admin/session/route.ts", "utf8");
    const logoutRoute = readFileSync("app/admin/session/logout/route.ts", "utf8");

    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(/revoke all on function public\.read_operational_status\(\)[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute[\s\S]*to service_role/i);
    expect(migration).not.toMatch(/metadata'\s*,\s*recent\.metadata/i);
    expect(caddy).not.toContain("basic_auth");
    expect(caddy).toMatch(/@admin path \/admin \/admin\/\*/);
    expect(caddy).not.toContain("header_up X-Bolets-Status-Auth");
    expect(caddy).toContain("header_up -X-Bolets-Status-Auth");
    expect(caddy).toMatch(/@internal_api[\s\S]*respond "Not found" 404/);
    expect(serviceWorker).toMatch(/pathname === "\/admin"[\s\S]*startsWith\("\/admin\/"\)[\s\S]*return/);
    expect(sessionRoute).toContain('Location: "/admin/status"');
    expect(sessionRoute).not.toMatch(/new URL\([^)]*request\.url/);
    expect(logoutRoute).toContain('Location: "/admin/login"');
  });
});
