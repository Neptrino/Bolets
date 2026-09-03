import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

import { isBacklinkRecipientReserved } from "@/src/lib/backlinks/recipient-history.server";

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

  it("enforces the same rule atomically in PostgreSQL", () => {
    const migration = readFileSync(
      "supabase/migrations/20260903184550_prevent_duplicate_backlink_recipients.sql",
      "utf8",
    );
    expect(migration).toContain("lower(btrim(recipient))");
    expect(migration).toContain("create unique index backlink_outbox_recipient_once_idx");
    expect(migration).toContain("status <> 'cancelled'");
  });
});
