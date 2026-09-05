export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRuntimeMetrics } = await import("./src/lib/runtime-metrics");
    startRuntimeMetrics();
  }
}
