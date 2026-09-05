import { readPhotoStudioAsset } from "@/src/lib/instagram-photo-studio-assets";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  // Layout authorization does not cover route handlers. Verify every asset request.
  await requireOperationalSession();
  const { asset } = await params;
  return readPhotoStudioAsset(asset.join("/"));
}
