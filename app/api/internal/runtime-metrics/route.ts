import { runtimeMetricsPrometheus } from "@/src/lib/runtime-metrics";
import { isOperationalRequestAuthorized } from "@/src/lib/operational-status-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOperationalRequestAuthorized(request.headers)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(runtimeMetricsPrometheus(), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
