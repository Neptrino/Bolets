import { runBacklinkAutomation } from "@/src/lib/backlinks/automation.server";
import { isOperationalRequestAuthorized } from "@/src/lib/operational-status-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isOperationalRequestAuthorized(request.headers)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const result = await runBacklinkAutomation();
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Backlink automation failed", error);
    return Response.json(
      { error: "backlink_automation_failed" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
