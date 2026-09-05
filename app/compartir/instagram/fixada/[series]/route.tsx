import { renderInstagramPinnedCover } from "@/src/lib/instagram-editorial-render";
import { isPinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ series: string }> }) {
  const { series } = await context.params;
  if (!isPinnedInstagramSeries(series)) return new Response("Not found", { status: 404 });
  const image = await renderInstagramPinnedCover(series);
  image.headers.set("Cache-Control", "public, max-age=3600, s-maxage=31536000, immutable");
  image.headers.set("Content-Disposition", `inline; filename="bolets-instagram-${series}.png"`);
  return image;
}
