export class WorkQueueBusyError extends Error {
  constructor() { super("Spatial read capacity is busy; retry shortly"); }
}

type Options = { background?: boolean; signal?: AbortSignal };
type Waiter = { background: boolean; start: () => void };

/** Bound both active allocations and waiting closures. An aborted active job
 * keeps its slot until it settles: releasing early would exceed the memory bound. */
export function createBoundedWorkQueue({
  concurrency, backgroundConcurrency = concurrency, maxQueued, maxWaitMs,
}: { concurrency: number; backgroundConcurrency?: number; maxQueued: number; maxWaitMs: number }) {
  if (![concurrency, backgroundConcurrency, maxQueued, maxWaitMs].every(Number.isInteger) ||
    concurrency < 1 || backgroundConcurrency < 1 || backgroundConcurrency > concurrency || maxQueued < 0 || maxWaitMs < 1) {
    throw new Error("Invalid work queue limits");
  }
  let active = 0;
  let backgroundActive = 0;
  const waiting: Waiter[] = [];
  const available = (background: boolean) => active < concurrency && (!background || backgroundActive < backgroundConcurrency);
  function drain() {
    while (active < concurrency) {
      // Reserve capacity for current readings when timelines are queued.
      let index = waiting.findIndex((entry) => !entry.background);
      if (index < 0) index = waiting.findIndex((entry) => available(entry.background));
      if (index < 0) return;
      waiting.splice(index, 1)[0].start();
    }
  }
  return async function run<T>(task: () => Promise<T>, { background = false, signal }: Options = {}): Promise<T> {
    signal?.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      if (available(background)) {
        active++;
        if (background) backgroundActive++;
        resolve(); return;
      }
      if (waiting.length >= maxQueued) { reject(new WorkQueueBusyError()); return; }
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
      const entry: Waiter = { background, start: () => {
        cleanup();
        active++;
        if (background) backgroundActive++;
        resolve();
      } };
      const remove = (reason: unknown) => {
        const index = waiting.indexOf(entry);
        if (index < 0) return;
        waiting.splice(index, 1);
        cleanup();
        reject(reason);
      };
      const abort = () => remove(signal!.reason);
      const timer = setTimeout(() => remove(new WorkQueueBusyError()), maxWaitMs);
      waiting.push(entry);
      signal?.addEventListener("abort", abort, { once: true });
    });
    try {
      signal?.throwIfAborted();
      return await task();
    } finally {
      active--;
      if (background) backgroundActive--;
      drain();
    }
  };
}
