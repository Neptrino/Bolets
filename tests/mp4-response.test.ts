import { describe, expect, it } from "vitest";

import { mp4Response, parseMp4ByteRange } from "@/src/lib/mp4-response";

describe("MP4 byte-range responses", () => {
  it("parses open, bounded, and suffix byte ranges", () => {
    expect(parseMp4ByteRange("bytes=3-", 10)).toEqual({ start: 3, end: 9 });
    expect(parseMp4ByteRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseMp4ByteRange("bytes=-4", 10)).toEqual({ start: 6, end: 9 });
  });

  it("rejects invalid and unsatisfiable ranges", () => {
    expect(parseMp4ByteRange("bytes=10-", 10)).toBeNull();
    expect(parseMp4ByteRange("bytes=7-3", 10)).toBeNull();
    expect(parseMp4ByteRange("bytes=0-1,4-5", 10)).toBeNull();
  });

  it("returns a complete MP4 with explicit length and range support", async () => {
    const response = mp4Response(Uint8Array.from([0, 1, 2, 3]), "reel.mp4", null);

    expect(response.status).toBe(200);
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    expect(response.headers.get("Content-Length")).toBe("4");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1, 2, 3]);
  });

  it("returns the requested bytes as partial content", async () => {
    const response = mp4Response(
      Uint8Array.from([0, 1, 2, 3, 4, 5]),
      "reel.mp4",
      "bytes=2-4",
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Length")).toBe("3");
    expect(response.headers.get("Content-Range")).toBe("bytes 2-4/6");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4]);
  });

  it("returns 416 for an unsatisfiable browser range", () => {
    const response = mp4Response(Uint8Array.from([0, 1, 2]), "reel.mp4", "bytes=8-");

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */3");
  });
});
