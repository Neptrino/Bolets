import "server-only";

import { monitorEventLoopDelay, performance } from "node:perf_hooks";

type RuntimeState = {
  histogram: ReturnType<typeof monitorEventLoopDelay>;
  utilization: ReturnType<typeof performance.eventLoopUtilization>;
  sample: { p99: number; max: number; utilization: number; seconds: number };
  sampledAt: number;
  timer: ReturnType<typeof setInterval>;
};
const globalState = globalThis as typeof globalThis & { boletsRuntimeMetrics?: RuntimeState };

/** Process aggregates only: no requests, URLs, accounts or headers are retained. */
export function startRuntimeMetrics() {
  if (globalState.boletsRuntimeMetrics || process.env.BOLETS_RUNTIME_METRICS !== "1") return;
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const state: RuntimeState = {
    histogram,
    utilization: performance.eventLoopUtilization(),
    sample: { p99: 0, max: 0, utilization: 0, seconds: 0 },
    sampledAt: performance.now(),
    timer: setInterval(() => {
      const current = performance.eventLoopUtilization();
      state.sample = {
        p99: histogram.percentile(99) / 1e9,
        max: histogram.max / 1e9,
        utilization: performance.eventLoopUtilization(current, state.utilization).utilization,
        seconds: (performance.now() - state.sampledAt) / 1000,
      };
      state.sampledAt = performance.now();
      state.utilization = current;
      histogram.reset();
    }, 60_000),
  };
  state.timer.unref();
  globalState.boletsRuntimeMetrics = state;
}

export function runtimeMetricsPrometheus() {
  const state = globalState.boletsRuntimeMetrics;
  if (!state) return "";
  const memory = process.memoryUsage();
  const values: Array<[string, number]> = [
    ["bolets_event_loop_delay_p99_seconds", state.sample.p99],
    ["bolets_event_loop_delay_max_seconds", state.sample.max],
    ["bolets_event_loop_utilization_ratio", state.sample.utilization],
    ["bolets_runtime_sample_window_seconds", state.sample.seconds],
    ["bolets_runtime_sample_age_seconds", (performance.now() - state.sampledAt) / 1000],
    ["bolets_process_resident_memory_bytes", memory.rss],
    ["bolets_process_heap_used_bytes", memory.heapUsed],
  ];
  return values.map(([name, value]) =>
    `# TYPE ${name} gauge\n${name} ${Number.isFinite(value) ? value : 0}\n`,
  ).join("");
}
