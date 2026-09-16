import { beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
const queries = vi.hoisted(() => [] as { head: boolean; answer?: string; range?: number[]; columns?: string }[]);
vi.mock("@/src/lib/operational-status-session", () => ({ requireOperationalSession: session }));
vi.mock("@/src/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({
  from: () => {
    const query: (typeof queries)[number] = { head: false };
    queries.push(query);
    const builder = {
      select(columns: string, options: { head?: boolean }) { query.head = !!options.head; query.columns = columns; return builder; },
      eq(column: string, value: string) { if (column === "answer") query.answer = value; return builder; },
      order() { return builder; },
      range(start: number, end: number) { query.range = [start, end]; return builder; },
      then(resolve: (value: object) => unknown) {
        return Promise.resolve({ error: null, count: query.head ? 300 : 1500, data: query.head ? null : [
          { id: "test-receipt", answer: "499", created_at: "2026-09-16T08:00:00Z" },
        ] }).then(resolve);
      },
    };
    return builder;
  },
}) }));

import { readAdminSurvey } from "@/src/lib/map-price-survey-admin.server";

beforeEach(() => { queries.length = 0; session.mockReset().mockResolvedValue({ id: "admin" }); });

describe("private survey results", () => {
  it("requires administrator authorization before accessing receipts", async () => {
    session.mockRejectedValue(new Error("Sign in required"));
    await expect(readAdminSurvey(1)).rejects.toThrow("Sign in required");
    expect(queries).toHaveLength(0);
  });

  it("paginates receipts without truncating totals or exposing browser hashes", async () => {
    const result = await readAdminSurvey(3);
    expect(result.total).toBe(1500);
    expect(result.options.every((option) => option.count === 300)).toBe(true);
    expect(queries[0].range).toEqual([100, 149]);
    expect(queries[0].columns).toBe("id, answer, created_at");
    expect(queries.slice(1).every((query) => query.head && !query.range)).toBe(true);
    expect(result.receipts).toHaveLength(1);
  });
});
