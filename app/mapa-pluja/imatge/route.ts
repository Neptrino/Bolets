import { renderRainMap } from "@/src/lib/rain-map-server";

export const runtime = "nodejs";
// The coarse condition cache republishes twice a day; an hour keeps the
// picture close to the readings beside it without re-rendering per visit.
export const revalidate = 3600;

export async function GET() {
  try {
    const image = await renderRainMap();
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Rain map render failed", error);
    return new Response("El mapa de pluja no està disponible ara mateix.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
