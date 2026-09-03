import { describe, expect, it } from "vitest";

import { BACKLINK_CAMPAIGNS } from "@/data/backlink-campaigns";
import {
  automaticEligibility,
  createUnsubscribeToken,
  isRoleMailbox,
  normalizeCandidateUrl,
  readUnsubscribeToken,
  scoreCandidate,
} from "@/src/lib/backlinks/policy";
import { inspectHtml } from "@/src/lib/backlinks/crawler.server";

const campaign = BACKLINK_CAMPAIGNS[0]!;

describe("backlink outreach policy", () => {
  it("normalizes tracking URLs and rejects Bolets and social hosts", () => {
    expect(normalizeCandidateUrl("https://example.cat/guia?utm_source=x&id=2#part"))
      .toBe("https://example.cat/guia?id=2");
    expect(normalizeCandidateUrl("https://bolets.app/map")).toBeNull();
    expect(normalizeCandidateUrl("https://instagram.com/example")).toBeNull();
  });

  it("only treats generic editorial addresses as automatic mailboxes", () => {
    expect(isRoleMailbox("premsa@parc.example.cat")).toBe(true);
    expect(isRoleMailbox("maria@parc.example.cat")).toBe(false);
  });

  it("scores a relevant institutional page and blocks personal outreach", () => {
    const input = {
      campaign,
      pageUrl: "https://parcs.example.cat/guia-bolets",
      title: "Guia de bolets als boscos de Catalunya",
      pageText: "Bolets, bosc, temporada, micologia i Catalunya.",
      contactEmail: "premsa@parcs.example.cat",
      hasExistingLink: false,
    };
    expect(scoreCandidate(input)).toBeGreaterThanOrEqual(82);
    expect(automaticEligibility(input, 82).eligible).toBe(true);
    expect(automaticEligibility({ ...input, contactEmail: "maria@parcs.example.cat" }, 82))
      .toMatchObject({ eligible: false, reason: "personal-mailbox" });
  });

  it("round-trips signed unsubscribe tokens and rejects tampering", () => {
    const token = createUnsubscribeToken("prospect-1", "INFO@EXAMPLE.CAT", "secret-value");
    expect(readUnsubscribeToken(token, "secret-value")).toEqual({
      prospectId: "prospect-1",
      email: "info@example.cat",
    });
    expect(readUnsubscribeToken(`${token}x`, "secret-value")).toBeNull();
  });

  it("extracts public contact details and existing link attributes", () => {
    const page = inspectHtml(`
      <html><head><title>Associació Micològica</title>
      <meta property="og:site_name" content="Micologia del Pirineu"></head>
      <body><a href="mailto:premsa@example.cat">Contacte</a>
      <a href="https://bolets.app/map" rel="nofollow">Mapa actual</a></body></html>
    `, "https://example.cat/bolets");
    expect(page.organization).toBe("Micologia del Pirineu");
    expect(page.emails).toContain("premsa@example.cat");
    expect(page.existingLink).toEqual({ rel: "nofollow", anchor: "Mapa actual" });
  });
});
