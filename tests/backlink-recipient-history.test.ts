import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import {
  isBacklinkRecipientReserved,
  suppressOtherBacklinkProspectsForRecipient,
} from "@/src/lib/backlinks/recipient-history.server";

function recipientQuery(rows: Array<{ id: string }>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  return query;
}

describe("backlink recipient history", () => {
  beforeEach(() => createSupabaseAdminClient.mockReset());

  it("treats any non-cancelled message for the normalized address as reserved", async () => {
    const query = recipientQuery([{ id: "message-1" }]);
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(isBacklinkRecipientReserved("  EDITORIAL@EXAMPLE.CAT ", {
      outboxId: "current-message",
      prospectId: "current-prospect",
    })).resolves.toBe(true);
    expect(query.eq).toHaveBeenCalledWith("recipient", "editorial@example.cat");
    expect(query.eq).toHaveBeenCalledWith("message_kind", "initial");
    expect(query.neq).toHaveBeenCalledWith("status", "cancelled");
    expect(query.neq).toHaveBeenCalledWith("id", "current-message");
    expect(query.neq).toHaveBeenCalledWith("prospect_id", "current-prospect");
  });

  it("does not query delivery history for an invalid address", async () => {
    await expect(isBacklinkRecipientReserved("not-an-email")).resolves.toBe(false);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("suppresses every other unsent opportunity after delivery", async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      select: vi.fn().mockResolvedValue({ data: [{ id: "duplicate-1" }, { id: "duplicate-2" }], error: null }),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.neq.mockReturnValue(query);
    query.in.mockReturnValue(query);
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) });

    await expect(suppressOtherBacklinkProspectsForRecipient(
      " EDITORIAL@EXAMPLE.CAT ",
      "sent-prospect",
      new Date("2026-09-05T12:00:00.000Z"),
    )).resolves.toBe(2);
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "suppressed",
      status_reason: "recipient-already-contacted",
    }));
    expect(query.eq).toHaveBeenCalledWith("contact_email", "editorial@example.cat");
    expect(query.neq).toHaveBeenCalledWith("id", "sent-prospect");
    expect(query.eq).toHaveBeenCalledWith("send_count", 0);
    expect(query.in).toHaveBeenCalledWith("status", ["discovered", "ready", "failed"]);
  });

  it("enforces the same rule atomically in PostgreSQL", () => {
    const migration = readFileSync(
      "supabase/migrations/20260903184550_prevent_duplicate_backlink_recipients.sql",
      "utf8",
    );
    expect(migration).toContain("lower(btrim(recipient))");
    expect(migration).toContain("create unique index backlink_outbox_recipient_once_idx");
    expect(migration).toContain("status <> 'cancelled'");
  });

  it("reconciles stale cycles and pre-existing duplicate prospects on rollout", () => {
    const migration = readFileSync(
      "supabase/migrations/20260905211841_reconcile_backlink_outreach_state.sql",
      "utf8",
    );
    expect(migration).toContain("started_at < now() - interval '30 minutes'");
    expect(migration).toContain("recipient-already-contacted");
    expect(migration).toContain("delivery.status <> 'cancelled'");
  });
});
