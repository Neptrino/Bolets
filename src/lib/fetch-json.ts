const DEFAULT_TIMEOUT_MS = 8_000;

function waitForRetry(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 300);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Fetch JSON with one bounded retry. A single deadline covers every attempt so
 * a stalled map request can never leave the interface loading indefinitely.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  signal: AbortSignal,
  attempts = 2,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const deadline = AbortSignal.timeout(timeoutMs);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.any([signal, deadline]),
      });
    } catch (error) {
      if (
        signal.aborted ||
        deadline.aborted ||
        attempt === attempts - 1
      )
        throw error;
      await waitForRetry(signal);
      continue;
    }
    if (response.ok) return response.json() as Promise<T>;
    if (
      response.status < 500 ||
      deadline.aborted ||
      attempt === attempts - 1
    )
      throw new Error(`Map data unavailable (${response.status})`);
    await waitForRetry(signal);
  }
  throw new Error("Map data unavailable");
}
