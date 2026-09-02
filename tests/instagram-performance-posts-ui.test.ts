import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InstagramPerformancePosts } from "@/app/admin/(private)/publicacio/instagram-performance-posts";

describe("Instagram performance post ranking", () => {
  it("renders ranked posts with their image, publishing context, and metric labels", () => {
    const html = renderToStaticMarkup(createElement(InstagramPerformancePosts, {
      posts: [{
        id: "post-1",
        caption: "Petits tresors del bosc",
        format: "post",
        thumbnailPath: "/compartir/catalunya/imatge?payload=signed",
        publishedAt: "2026-08-28T16:23:00.000Z",
        reach: 176,
        shares: 1,
        saves: 0,
      }],
    }));

    expect(html).toContain('aria-label="Posició 1"');
    expect(html).toContain("Publicació");
    expect(html).toContain("Petits tresors del bosc");
    expect(html).toContain('src="/compartir/catalunya/imatge?payload=signed"');
    expect(html).toContain("Abast");
    expect(html).toContain("Comparticions");
    expect(html).toContain("Desats");
  });
});
