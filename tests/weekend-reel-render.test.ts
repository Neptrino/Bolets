import { describe, expect, it } from "vitest";

import {
  weekendReelDurationSeconds,
  weekendReelFfmpegArgs,
  WEEKEND_REEL_SLIDE_SECONDS,
} from "@/src/lib/weekend-reel-render";

describe("weekend Reel rendering", () => {
  it("holds the information-heavy middle slides longer", () => {
    expect(WEEKEND_REEL_SLIDE_SECONDS).toEqual([4, 4.4, 4, 3.6, 2.6]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[1]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[0]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[2]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[4]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[3]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[4]);
  });

  it("crossfades five vertical frames into a 17.2-second H.264 video", () => {
    const slides = Array.from({ length: 5 }, (_, index) => `/tmp/slide-${index + 1}.png`);
    const args = weekendReelFfmpegArgs(slides, "/tmp/reel.mp4");
    const filter = args[args.indexOf("-filter_complex") + 1];

    expect(weekendReelDurationSeconds(5)).toBeCloseTo(17.2);
    expect(filter.match(/xfade=transition=fade/g)).toHaveLength(4);
    expect(filter).toContain("offset=3.65");
    expect(filter).toContain("offset=7.7");
    expect(filter).toContain("offset=14.6");
    expect(args.slice(-3)).toEqual(["17.2", "-y", "/tmp/reel.mp4"]);
  });

  it("rejects a sequence that cannot transition", () => {
    expect(() => weekendReelFfmpegArgs(["single.png"], "reel.mp4"))
      .toThrow("at least two slides");
  });
});
