import { isValidElement, type ReactNode } from "react";

export type FaqEntry = { question: string; answer: string };

/* Search engines only trust FAQ markup that repeats the visible answers, so
   every FAQPage is built from the same list the page renders. */
export function faqPageSchema(faqs: readonly FaqEntry[], id?: string) {
  return {
    "@type": "FAQPage",
    ...(id ? { "@id": id } : {}),
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/* Flattens a rich answer (text with inline links) into the words a reader
   sees, for structured data. */
export function plainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
  return "";
}
