import { createElement, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { faqPageSchema, plainText } from "@/src/lib/faq-schema";

describe("faqPageSchema", () => {
  it("repeats each visible question and answer", () => {
    expect(faqPageSchema([{ question: "Quan?", answer: "A la tardor." }], "https://bolets.app/x#preguntes")).toEqual({
      "@type": "FAQPage",
      "@id": "https://bolets.app/x#preguntes",
      mainEntity: [{ "@type": "Question", name: "Quan?", acceptedAnswer: { "@type": "Answer", text: "A la tardor." } }],
    });
  });

  it("omits the id when none is given", () => {
    expect(faqPageSchema([])).not.toHaveProperty("@id");
  });
});

describe("plainText", () => {
  it("flattens a rich answer into the words a reader sees", () => {
    const answer = createElement(Fragment, null, "Mira les ", createElement("a", { href: "/guies" }, "guies locals"), " i ", 3, false, null, " fonts.");
    expect(plainText(answer)).toBe("Mira les guies locals i 3 fonts.");
  });
});
