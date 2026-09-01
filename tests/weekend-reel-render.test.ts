import { describe, expect, it } from "vitest";

import {
  weekendReelDurationSeconds,
  weekendReelFfmpegArgs,
  WEEKEND_REEL_SLIDE_SECONDS,
} from "@/src/lib/weekend-reel-render";

describe("weekend Reel rendering", () => {
  it("holds the information-heavy middle slides longer", () => {
    expect(WEEKEND_REEL_SLIDE_SECONDS).toEqual([2.4, 3.4, 3.8, 3.6, 2.6, 2.4]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[1]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[0]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[2]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[5]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[3]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[4]);
  });

  it("crossfades six vertical frames into a 16.45-second H.264 video", () => {
    const slides = Array.from({ length: 6 }, (_, index) => `/tmp/slide-${index + 1}.png`);
    const args = weekendReelFfmpegArgs(slides, "/tmp/reel.mp4");
    const filter = args[args.indexOf("-filter_complex") + 1];

    expect(weekendReelDurationSeconds(6)).toBeCloseTo(16.45);
    expect(filter.match(/xfade=transition=fade/g)).toHaveLength(5);
    expect(filter).toContain("offset=2.05");
    expect(filter).toContain("offset=5.1");
    expect(filter).toContain("offset=14.05");
    expect(args.slice(-3)).toEqual(["16.45", "-y", "/tmp/reel.mp4"]);
  });

  it("rejects a sequence that cannot transition", () => {
    expect(() => weekendReelFfmpegArgs(["single.png"], "reel.mp4"))
      .toThrow("at least two slides");
  });
});
