import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InstagramEducationCard } from "@/components/instagram-education-card";
import { instagramFieldLessons } from "@/src/lib/instagram-field-lessons";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { describe, expect, it } from "vitest";

import {
  instagramEducationTopicForDate,
  instagramEducationTopics,
  isInstagramEducationTopicId,
} from "@/src/lib/instagram-education";

describe("Instagram education curriculum", () => {
  it("contains ten distinct five-slide lessons", () => {
    expect(instagramEducationTopics).toHaveLength(10);
    expect(new Set(instagramEducationTopics.map((topic) => topic.id)).size).toBe(10);
    for (const topic of instagramEducationTopics) {
      expect(topic.slides).toHaveLength(5);
      expect(isInstagramEducationTopicId(topic.id)).toBe(true);
    }
  });

  it("preserves past dates and rotates practical lessons from September 9", () => {
    expect(instagramEducationTopicForDate("2026-09-02").id).toBe("water");
    expect(instagramEducationTopicForDate("2026-09-09").id).toBe("field-photos");
    expect(instagramEducationTopicForDate("2026-09-16").id).toBe("field-underside");
    expect(instagramEducationTopicForDate("2026-09-23").id).toBe("field-lookalike");
    expect(instagramEducationTopicForDate("2026-09-30").id).toBe("field-wood");
    expect(instagramEducationTopicForDate("2026-10-07").id).toBe("field-photos");
    expect(instagramEducationTopicForDate("2026-10-14").id).toBe("field-underside");
  });

  it("renders every field lesson without live readings and ends with a sourced takeaway", () => {
    const card: DailyShareCard = { slug: "catalunya", title: "Catalunya", eyebrow: "Avui", available: false, isPreview: true, observedAt: null, scope: "overview", scopeLabel: "Catalunya", mapPath: "/map", shareText: "", readings: [] };
    for (const topic of instagramFieldLessons) {
      for (let slide = 1; slide <= 5; slide++) {
        const html = renderToStaticMarkup(createElement(InstagramEducationCard, { card, topicId: topic.id, slide }));
        expect(html).not.toContain("millor sector /100");
        if (slide === 5) {
          expect(html).toContain(topic.slides[4].points[0].label);
          expect(html).toContain("Font:");
          expect(html).toContain("No confirma identificació ni comestibilitat");
          expect(html).not.toContain("La lectura completa, a l’enllaç del perfil");
        }
      }
    }
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
