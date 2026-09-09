import { isOperationalSessionAuthorized } from "@/src/lib/operational-status-auth";
import { readOperationalStatus } from "@/src/lib/operational-status-server";

export const runtime = "nodejs";

/**
 * Compact live progress for the manual resynchronization panel: the client
 * polls this after queuing an order so the operator can watch batches land
 * without reloading the page. Distilled from the same operational status RPC
 * the dashboard renders, so the numbers always agree.
 */
export async function GET() {
  const authorized = await isOperationalSessionAuthorized();
  if (!authorized) {
    return Response.json({ error: "Authentication required" }, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const status = await readOperationalStatus();
  const publication = (stream: "atmosphere" | "soil") =>
    status.observedPublications.find((candidate) => candidate.stream === stream) ?? null;
  const atmosphere = publication("atmosphere");
  const soil = publication("soil");
  const forecast = status.forecastPublication;
  const runningPipelines = [...new Set(
    status.recentRuns
      .filter((run) => run.status === "running")
      .map((run) => run.pipeline),
  )];
  const lastRuns = status.recentRuns
    .filter((run) => run.status !== "running")
    .slice(0, 4)
    .map((run) => ({
      pipeline: run.pipeline,
      status: run.status,
      startedAt: run.startedAt,
      rowsWritten: run.rowsWritten,
      errorMessage: run.errorMessage,
    }));

  return Response.json({
    generatedAt: status.generatedAt,
    atmosphere: atmosphere && {
      pointCount: atmosphere.pointCount,
      expectedPointCount: atmosphere.expectedPointCount,
      complete: atmosphere.complete,
    },
    soil: soil && {
      pointCount: soil.pointCount,
      expectedPointCount: soil.expectedPointCount,
      complete: soil.complete,
    },
    forecast: forecast && {
      pointCount: forecast.pointCount,
      expectedPointCount: forecast.expectedPointCount,
      futureHorizonCount: forecast.futureHorizonCount,
      complete: forecast.complete,
    },
    runningPipelines,
    lastRuns,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
