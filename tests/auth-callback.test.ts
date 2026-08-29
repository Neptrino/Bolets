import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

import { GET } from "@/app/auth/callback/route";

describe("OAuth callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("exchanges the PKCE code and redirects to the allowlisted destination", async () => {
    const response = await GET(new NextRequest("https://bolets.app/auth/callback?code=abc&retorn=%2Fcompte"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("https://bolets.app/compte");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not accept an external return destination", async () => {
    const response = await GET(new NextRequest("https://bolets.app/auth/callback?code=abc&retorn=https%3A%2F%2Fexample.com"));

    expect(response.headers.get("location")).toBe("https://bolets.app/les-meves-troballes");
  });

  it("returns to the access page with a safe error when exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("invalid code") });
    const response = await GET(new NextRequest("https://bolets.app/auth/callback?code=bad&retorn=%2Fcompte"));

    expect(response.headers.get("location")).toBe("https://bolets.app/acces?retorn=%2Fcompte&error=oauth");
  });
});
