import { describe, expect, it } from "vitest";

import {
  weekendReelDurationSeconds,
  weekendReelFfmpegArgs,
  WEEKEND_REEL_SLIDE_SECONDS,
} from "@/src/lib/weekend-reel-render";

describe("weekend Reel rendering", () => {
  it("holds the information-heavy middle slides longer", () => {
    expect(WEEKEND_REEL_SLIDE_SECONDS).toEqual([4.4, 5.4, 4.8, 4.4, 3.4]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[1]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[0]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[2]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[4]);
    expect(WEEKEND_REEL_SLIDE_SECONDS[3]).toBeGreaterThan(WEEKEND_REEL_SLIDE_SECONDS[4]);
  });

  it("encodes five paced scenes with a closing loop into a 20-second H.264 video", () => {
    const slides = Array.from({ length: 5 }, (_, index) => `/tmp/slide-${index + 1}.png`);
    const args = weekendReelFfmpegArgs(slides, "/tmp/reel.mp4");
    const filter = args[args.indexOf("-filter_complex") + 1];

    expect(weekendReelDurationSeconds(5)).toBeCloseTo(20);
    expect(filter.match(/xfade=transition=/g)).toHaveLength(5);
    expect(filter).toContain("transition=smoothleft");
    expect(filter).toContain("transition=smoothup");
    expect(filter).toContain("offset=3.8");
    expect(filter).toContain("offset=8.6");
    expect(filter).toContain("offset=16.6");
    expect(args.slice(-3)).toEqual(["20", "-y", "/tmp/reel.mp4"]);
  });

  it("keeps comparison and context still while animating map and photo within their margins", () => {
    const args = weekendReelFfmpegArgs(["map.png", "ranking.png", "photo.png", "context.png", "end.png"], "reel.mp4");
    const filter = args[args.indexOf("-filter_complex") + 1];
    for (const index of [1, 3, 4]) {
      expect(filter.split(";").find(part => part.startsWith(`[${index}:v]`))).toContain("zoompan=z='1'");
    }
    expect(filter).toContain("1+0.018*");
    expect(filter).toContain("1.018-0.018*");
    expect(filter).toContain("offset=19.367[looped]");
    expect(args).not.toContain("-loop");
  });

  it.each([0, -1, 1.5, 6, NaN])("rejects invalid scene count %s", count => {
    expect(() => weekendReelDurationSeconds(count)).toThrow("supports 1-5 slides");
  });

  it("rejects a sequence that cannot transition", () => {
    expect(() => weekendReelFfmpegArgs(["single.png"], "reel.mp4"))
      .toThrow("at least two slides");
  });
});
