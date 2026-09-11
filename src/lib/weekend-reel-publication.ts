import { BufferPublicationError } from "@/src/lib/buffer-client";

/** Finish rendering and verify the public download before Buffer imports it. */
export async function prepareWeekendReel(url: string, fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "video/mp4") {
      await response.body?.cancel();
      throw new Error("The public Reel URL did not return an MP4");
    }
    // Read the complete body: a successful header alone can hide a truncated
    // render. The route retains the completed video for Buffer's next request.
    const video = new Uint8Array(await response.arrayBuffer());
    const length = response.headers.get("content-length");
    if (video.length < 12 || (length !== null && Number(length) !== video.length)
      || new TextDecoder().decode(video.subarray(4, 8)) !== "ftyp") {
      throw new Error("The public Reel download was incomplete or invalid");
    }
  } catch {
    throw new BufferPublicationError(
      "The weekend Reel could not be prepared for publication",
      503,
      "instagram_reel_unavailable",
    );
  }
}
