import { TIMELINE_BUCKET_CACHE_TTL_MS } from "@/src/lib/map-bucket-cache";

/** Keep a buffered animation bounded by the same freshness window as its HTTP response. */
export class PredictionBucketMemory<T> extends Map<string, T[]> {
  private storedAt = new Map<string, number>();

  override set(url: string, cells: T[]) {
    if (url.includes("&time=")) this.storedAt.set(url, Date.now());
    return super.set(url, cells);
  }

  override has(url: string) {
    const timestamp = this.storedAt.get(url);
    if (timestamp !== undefined && Date.now() - timestamp >= TIMELINE_BUCKET_CACHE_TTL_MS) {
      this.delete(url);
    }
    return super.has(url);
  }

  override get(url: string) {
    return this.has(url) ? super.get(url) : undefined;
  }

  override delete(url: string) {
    this.storedAt.delete(url);
    return super.delete(url);
  }

  override clear() {
    this.storedAt.clear();
    super.clear();
  }
}
