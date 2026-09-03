import { suppressBacklinkToken } from "@/src/lib/backlinks/admin.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !await suppressBacklinkToken(token)) {
    return new Response("Invalid unsubscribe token", {
      status: 400,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
