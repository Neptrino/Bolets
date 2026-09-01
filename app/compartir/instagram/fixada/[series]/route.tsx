import { ImageResponse } from "next/og";

import { PinnedInstagramCard } from "@/components/social-growth-card";
import { isPinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ series: string }> },
) {
  const { series } = await context.params;
  if (!isPinnedInstagramSeries(series)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    <PinnedInstagramCard series={series} />,
    {
      width: 1080,
      height: 1350,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=31536000, immutable",
        "Content-Disposition": `inline; filename="bolets-instagram-${series}.png"`,
      },
    },
  );
}
