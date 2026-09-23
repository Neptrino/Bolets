import { describe, expect, it } from "vitest";
import { breadcrumbSchema } from "@/src/lib/breadcrumb-schema";

describe("breadcrumb schema", () => {
  it("starts every trail at the home page and numbers the steps", () => {
    expect(breadcrumbSchema([
      { name: "Guies", url: "https://bolets.app/guies" },
      { name: "Conservar bolets", url: "https://bolets.app/conservar-bolets" },
    ], "https://bolets.app/conservar-bolets#breadcrumb")).toEqual({
      "@type": "BreadcrumbList",
      "@id": "https://bolets.app/conservar-bolets#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inici", item: "https://bolets.app/" },
        { "@type": "ListItem", position: 2, name: "Guies", item: "https://bolets.app/guies" },
        { "@type": "ListItem", position: 3, name: "Conservar bolets", item: "https://bolets.app/conservar-bolets" },
      ],
    });
  });

  it("omits the id when none is given", () => {
    expect(breadcrumbSchema([])).not.toHaveProperty("@id");
  });
});
