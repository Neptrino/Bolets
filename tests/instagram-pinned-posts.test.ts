import { describe, expect, it } from "vitest";

import {
  isPinnedInstagramSeries,
  pinnedInstagramPost,
  pinnedInstagramPosts,
} from "@/src/lib/instagram-pinned-posts";

describe("Instagram pinned posts", () => {
  it("defines three uniquely ordered profile foundations", () => {
    expect(pinnedInstagramPosts).toHaveLength(3);
    expect(new Set(pinnedInstagramPosts.map((post) => post.series)).size).toBe(3);
    expect(pinnedInstagramPosts.map((post) => post.number)).toEqual(["01", "02", "03"]);
  });

  it("keeps captions within Instagram's limit", () => {
    for (const post of pinnedInstagramPosts) {
      expect(post.caption.length).toBeLessThanOrEqual(2_200);
      expect(post.caption).not.toContain("\\n");
    }
  });

  it("resolves only supported pinned series", () => {
    expect(isPinnedInstagramSeries("pinned-method")).toBe(true);
    expect(isPinnedInstagramSeries("education")).toBe(false);
    expect(isPinnedInstagramSeries(null)).toBe(false);
    expect(pinnedInstagramPost("pinned-safety").shortTitle).toBe("Amb criteri");
  });
});
