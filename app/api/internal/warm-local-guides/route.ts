import { isMapWarmRequestAuthorized } from "@/src/lib/map-cache-warmer";
import { warmLocalGuideCaches } from "@/src/lib/local-guide-cache-warmer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isMapWarmRequestAuthorized(request.headers)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(await warmLocalGuideCaches(), { headers: { "Cache-Control": "no-store" } });
}
