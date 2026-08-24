import { operationalStatusPrometheus } from "@/src/lib/operational-status";
import {
  isOperationalRequestAuthorized,
  readOperationalStatus,
} from "@/src/lib/operational-status-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOperationalRequestAuthorized(request.headers)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const status = await readOperationalStatus();
    return new Response(operationalStatusPrometheus(status), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Operational metrics unavailable\n", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
