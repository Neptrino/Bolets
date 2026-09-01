import { describe, expect, it } from "vitest";

import {
  weekendReelDurationSeconds,
  weekendReelFfmpegArgs,
} from "@/src/lib/weekend-reel-render";

describe("weekend Reel rendering", () => {
  it("crossfades six vertical frames into a 9.3-second H.264 video", () => {
    const slides = Array.from({ length: 6 }, (_, index) => `/tmp/slide-${index + 1}.png`);
    const args = weekendReelFfmpegArgs(slides, "/tmp/reel.mp4");
    const filter = args[args.indexOf("-filter_complex") + 1];

    expect(weekendReelDurationSeconds(6)).toBeCloseTo(9.3);
    expect(filter.match(/xfade=transition=fade/g)).toHaveLength(5);
    expect(filter).toContain("offset=1.5");
    expect(filter).toContain("offset=7.5");
    expect(args.slice(-3)).toEqual(["9.3", "-y", "/tmp/reel.mp4"]);
  });

  it("rejects a sequence that cannot transition", () => {
    expect(() => weekendReelFfmpegArgs(["single.png"], "reel.mp4"))
      .toThrow("at least two slides");
  });
});
