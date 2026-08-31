import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/map-tiles/icgc/v1/[layer]/[z]/[x]/[y]/route";

const tileContext = (layer: string, z: string, x: string, y: string) => ({
  params: Promise.resolve({ layer, z, x, y }),
});

describe("ICGC map tile cache route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches the original relief tile once through Next's persistent cache", async () => {
    const image = Uint8Array.of(137, 80, 78, 71);
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(image, {
      headers: { "Content-Type": "image/png" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost/api/map-tiles/icgc/v1/relief/9/257/189"),
      tileContext("relief", "9", "257", "189"),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [input, init] = fetchMock.mock.calls[0];
    const upstream = new URL(String(input));
    expect(upstream.origin).toBe("https://geoserveis.icgc.cat");
    expect(upstream.pathname).toContain("/elevacions-territorial/wms");
    expect(upstream.searchParams.get("LAYERS")).toBe(
      "model-elevacions-terreny-ombrejat-catalunya-topografic-5m-2009-2018",
    );
    expect(upstream.searchParams.get("TRANSPARENT")).toBe("TRUE");
    expect(init).toMatchObject({ cache: "force-cache" });
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, s-maxage=31536000, immutable",
    );
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(image);
  });

  it("keeps the original grey reference layer above the relief", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(
      Uint8Array.of(1),
      { headers: { "Content-Type": "image/jpeg" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      new Request("http://localhost/api/map-tiles/icgc/v1/references/9/257/189"),
      tileContext("references", "9", "257", "189"),
    );

    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.pathname).toContain("/mapa-base/wms");
    expect(upstream.searchParams.get("LAYERS")).toBe("topografic-gris");
    expect(upstream.searchParams.get("TRANSPARENT")).toBe("FALSE");
    expect(upstream.searchParams.get("BGCOLOR")).toBe("0xEEEDE8");
  });

  it("serves the official ICGC Simplificat layer on a warmable URL", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(
      Uint8Array.of(1),
      { headers: { "Content-Type": "image/png" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      new Request("http://localhost/api/map-tiles/icgc/v1/simplified/9/257/189"),
      tileContext("simplified", "9", "257", "189"),
    );

    const upstream = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstream.pathname).toContain("/mapa-base/wms");
    expect(upstream.searchParams.get("LAYERS")).toBe("simplificat");
    expect(upstream.searchParams.get("FORMAT")).toBe("image/jpeg");
    expect(upstream.searchParams.get("TRANSPARENT")).toBe("FALSE");
    expect(upstream.searchParams.get("BGCOLOR")).toBe("0xF2EBD5");
  });

  it.each([
    ["unknown", "9", "257", "189", 404],
    ["relief", "19", "257", "189", 400],
    ["relief", "9", "512", "189", 400],
    ["relief", "9", "257", "-1", 400],
  ])("rejects an invalid tile without becoming an open proxy", async (
    layer,
    z,
    x,
    y,
    status,
  ) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request(`http://localhost/api/map-tiles/icgc/v1/${layer}/${z}/${x}/${y}`),
      tileContext(layer, z, x, y),
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
