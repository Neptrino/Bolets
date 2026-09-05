import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthenticatedUser } = vi.hoisted(() => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/src/lib/supabase/server", () => ({ getAuthenticatedUser }));

import { GET } from "@/app/admin/(private)/publicacio/fotos/editor/[...asset]/route";
import { instagramFormats } from "@/src/lib/instagram-design";

const requestAsset = (name: string) => GET(new Request(`https://bolets.app/admin/publicacio/fotos/editor/${name}`), {
  params: Promise.resolve({ asset: name.split("/") }),
});

describe("private online photo studio", () => {
  beforeEach(() => getAuthenticatedUser.mockReset());

  it("requires a server-confirmed administrator even for a direct asset URL", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    await expect(requestAsset("index.html")).rejects.toThrow("NEXT_REDIRECT");
    getAuthenticatedUser.mockResolvedValue({ app_metadata: { app_role: "member" }, user_metadata: { app_role: "admin" } });
    await expect(requestAsset("design.json")).rejects.toThrow("NEXT_REDIRECT");
  });

  it("serves the shared editor and design privately under the nested route", async () => {
    getAuthenticatedUser.mockResolvedValue({ app_metadata: { app_role: "admin" } });
    const html = await requestAsset("index.html");
    expect(html.status).toBe(200);
    expect(html.headers.get("Cache-Control")).toBe("private, no-store");
    expect(html.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(html.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    const body = await html.text();
    expect(body).toContain('<body data-embedded="true">');
    expect(body).toContain('src="./studio.mjs"');
    expect(body).toContain('name="branding" value="signature"');
    expect((await (await requestAsset("design.json")).json()).formats).toEqual(instagramFormats);
    for (const name of ["studio.mjs", "drawing.mjs", "settings.mjs", "geometry.mjs", "studio.css", "tokens.css", "brand.svg", "fonts/Bold.ttf"]) {
      expect((await requestAsset(name)).status, name).toBe(200);
    }
  });

  it("never resolves user-supplied filesystem paths", async () => {
    getAuthenticatedUser.mockResolvedValue({ app_metadata: { app_role: "admin" } });
    for (const name of ["../../.env.local", ".env", "README.md", "fonts/../../package.json", "toString"]) {
      expect((await requestAsset(name)).status).toBe(404);
    }
  });
});
