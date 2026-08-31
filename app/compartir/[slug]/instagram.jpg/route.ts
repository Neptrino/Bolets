import sharp from "sharp";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const sourceUrl = new URL(`/compartir/${encodeURIComponent(slug)}/imatge`, request.url);
  sourceUrl.search = new URL(request.url).search;
  sourceUrl.searchParams.set("format", "feed");

  const source = await fetch(sourceUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!source.ok) {
    return new Response(await source.text(), {
      status: source.status,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const jpeg = await sharp(Buffer.from(await source.arrayBuffer()))
      .flatten({ background: "#f3eddc" })
      .jpeg({ chromaSubsampling: "4:4:4", mozjpeg: true, quality: 92 })
      .toBuffer();
    return new Response(jpeg, {
      headers: {
        "Cache-Control": "public, max-age=43200, immutable",
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Instagram image conversion failed", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
