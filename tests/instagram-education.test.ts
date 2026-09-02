import { describe, expect, it } from "vitest";

import {
  instagramEducationTopicForDate,
  instagramEducationTopics,
  isInstagramEducationTopicId,
} from "@/src/lib/instagram-education";

describe("Instagram education curriculum", () => {
  it("contains six distinct five-slide lessons", () => {
    expect(instagramEducationTopics).toHaveLength(6);
    expect(new Set(instagramEducationTopics.map((topic) => topic.id)).size).toBe(6);
    for (const topic of instagramEducationTopics) {
      expect(topic.slides).toHaveLength(5);
      expect(isInstagramEducationTopicId(topic.id)).toBe(true);
    }
  });

  it("starts with a new lesson and advances once per Wednesday", () => {
    expect(instagramEducationTopicForDate("2026-09-02").id).toBe("water");
    expect(instagramEducationTopicForDate("2026-09-09").id).toBe("habitat");
    expect(instagramEducationTopicForDate("2026-09-16").id).toBe("extent");
    expect(instagramEducationTopicForDate("2026-09-23").id).toBe("season");
    expect(instagramEducationTopicForDate("2026-09-30").id).toBe("limits");
    expect(instagramEducationTopicForDate("2026-10-07").id).toBe("reading");
    expect(instagramEducationTopicForDate("2026-10-14").id).toBe("water");
  });

  it("rejects malformed publication dates", () => {
    expect(() => instagramEducationTopicForDate("02-09-2026")).toThrow(
      "Invalid Instagram education publication date",
    );
    expect(() => instagramEducationTopicForDate("2026-02-31")).toThrow(
      "Invalid Instagram education publication date",
    );
  });
});
