import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { homeAppJsonLd } from "@/src/lib/home-app-schema";
import { SITE_URL } from "@/src/lib/seo";

describe("homeAppJsonLd", () => {
  const schema = homeAppJsonLd();

  it("describes a free web app linked to the site entities", () => {
    expect(schema["@type"]).toBe("WebApplication");
    expect(schema.url).toBe(SITE_URL);
    expect(schema.offers).toEqual({ "@type": "Offer", price: "0", priceCurrency: "EUR" });
    expect(schema.isPartOf).toEqual({ "@id": `${SITE_URL}/#website` });
    expect(schema.publisher).toEqual({ "@id": `${SITE_URL}/#organization` });
  });

  it("carries the names people search for the app", () => {
    expect(schema.alternateName).toEqual(expect.arrayContaining(["Bolets app", "Bolets de Catalunya"]));
  });

  it("is rendered on the homepage", () => {
    expect(readFileSync("app/page.tsx", "utf8")).toContain("<JsonLd data={homeAppJsonLd()} />");
  });
});
