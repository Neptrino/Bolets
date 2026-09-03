import { describe, expect, it } from "vitest";

import { BACKLINK_CAMPAIGNS } from "@/data/backlink-campaigns";
import {
  automaticEligibility,
  buildOutreachMessage,
  createUnsubscribeToken,
  explainCandidateScore,
  isRoleMailbox,
  normalizeCandidateUrl,
  readUnsubscribeToken,
  scoreCandidate,
} from "@/src/lib/backlinks/policy";
import { inspectHtml } from "@/src/lib/backlinks/crawler.server";

const campaign = BACKLINK_CAMPAIGNS.find((candidate) => candidate.id === "current-map")!;

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
      outboundLinkCount: 4,
      contentPublishedAt: null,
      contentModifiedAt: null,
      hasExistingLink: false,
    };
    expect(scoreCandidate(input)).toBeGreaterThanOrEqual(82);
    expect(automaticEligibility(input, 82).eligible).toBe(true);
    expect(automaticEligibility({ ...input, contactEmail: "maria@parcs.example.cat" }, 82))
      .toMatchObject({ eligible: false, reason: "personal-mailbox" });
  });

  it("penalizes pages that never cite external resources", () => {
    const input = {
      campaign,
      pageUrl: "https://parcs.example.cat/guia-bolets",
      title: "Guia de bolets als boscos de Catalunya",
      pageText: "Bolets, bosc, temporada, micologia i Catalunya.",
      contactEmail: "premsa@parcs.example.cat",
      outboundLinkCount: 0,
      contentPublishedAt: null,
      contentModifiedAt: null,
      hasExistingLink: false,
    };
    expect(scoreCandidate(input)).toBe(70);
    expect(explainCandidateScore(input)).toMatchObject({
      version: "backlink-score-v3",
      rawScore: 70,
      finalScore: 70,
      factors: expect.arrayContaining([
        { id: "topic-relevance", points: 32, evidence: ["bolets", "micologia", "bosc", "temporada", "catalunya"] },
        { id: "external-link-propensity", points: -20, evidence: ["0"] },
      ]),
    });
    expect(automaticEligibility(input, 82)).toMatchObject({ eligible: false, reason: "low-score" });
    expect(scoreCandidate({ ...input, outboundLinkCount: 1 })).toBe(82);
    expect(scoreCandidate({ ...input, outboundLinkCount: 2 })).toBe(92);
    expect(scoreCandidate({ ...input, outboundLinkCount: 4 })).toBe(96);
    expect(scoreCandidate({ ...input, outboundLinkCount: 8 })).toBe(96);
    expect(scoreCandidate({ ...input, outboundLinkCount: 80 })).toBe(96);
  });

  it("penalizes only reliably dated old content", () => {
    const scoredAt = new Date("2026-09-03T00:00:00.000Z");
    const input = {
      campaign,
      pageUrl: "https://parcs.example.cat/guia-bolets",
      title: "Guia de bolets als boscos de Catalunya",
      pageText: "Bolets, bosc, temporada, micologia i Catalunya.",
      contactEmail: "premsa@parcs.example.cat",
      outboundLinkCount: 4,
      contentPublishedAt: "2010-09-03T00:00:00.000Z",
      contentModifiedAt: null,
      hasExistingLink: false,
    };
    expect(explainCandidateScore(input, scoredAt)).toMatchObject({
      version: "backlink-score-v3",
      finalScore: 78,
      factors: expect.arrayContaining([
        { id: "content-freshness", points: -18, evidence: ["2010-09-03T00:00:00.000Z", "published"] },
      ]),
    });
    expect(scoreCandidate({ ...input, contentPublishedAt: "2020-09-03T00:00:00.000Z" }, scoredAt)).toBe(88);
    expect(scoreCandidate({ ...input, contentPublishedAt: null }, scoredAt)).toBe(96);
    expect(scoreCandidate({ ...input, contentModifiedAt: "2025-09-03T00:00:00.000Z" }, scoredAt)).toBe(96);
  });

  it("round-trips signed unsubscribe tokens and rejects tampering", () => {
    const token = createUnsubscribeToken("prospect-1", "INFO@EXAMPLE.CAT", "secret-value");
    expect(readUnsubscribeToken(token, "secret-value")).toEqual({
      prospectId: "prospect-1",
      email: "info@example.cat",
    });
    expect(readUnsubscribeToken(`${token}x`, "secret-value")).toBeNull();
  });

  it("builds one outreach message and promises no follow-up", () => {
    const message = buildOutreachMessage({
      campaign,
      organization: "Associació Micològica",
      pageTitle: "Guia de bolets",
      pageUrl: "https://example.cat/guia",
      unsubscribeUrl: "https://bolets.app/baixa-comunicacions?token=example",
    });
    expect(message.subject).toBe("Recurs sobre bolets per a «Guia de bolets»");
    expect(message.text).toContain("No tornarem a escriure sobre aquesta pàgina.");
    expect(message.text).toContain("Podeu evitar qualsevol comunicació futura aquí:");
    expect(message.text).not.toContain("Recordatori");
  });

  it("extracts public contact details and existing link attributes", () => {
    const page = inspectHtml(`
      <html><head><title>Associació Micològica</title>
      <meta property="og:site_name" content="Micologia del Pirineu">
      <meta property="article:published_time" content="2018-09-10T08:00:00+02:00">
      <script type="application/ld+json">{"@type":"Article","dateModified":"2024-10-12T09:30:00+02:00"}</script></head>
      <body><a href="mailto:premsa@example.cat">Contacte</a>
      <a href="https://bolets.app/map" rel="nofollow">Mapa actual</a>
      <a href="https://font.example.org/estudi">Estudi independent</a>
      <footer><a href="https://instagram.com/example">Instagram</a></footer></body></html>
    `, "https://example.cat/bolets");
    expect(page.organization).toBe("Micologia del Pirineu");
    expect(page.emails).toContain("premsa@example.cat");
    expect(page.outboundLinkCount).toBe(1);
    expect(page.contentPublishedAt).toBe("2018-09-10T06:00:00.000Z");
    expect(page.contentModifiedAt).toBe("2024-10-12T07:30:00.000Z");
    expect(page.existingLink).toEqual({ rel: "nofollow", anchor: "Mapa actual" });
  });

  it("does not mistake sister sites or social controls for editorial citations", () => {
    const page = inspectHtml(`
      <html><head><title>Guia de tardor</title></head><body>
      <a href="https://elcaso.elnacional.cat/ca/noticies/article.html">Més notícies</a>
      <a href="https://profile.google.com/cp/publication">Segueix-nos a Discover</a>
      <a class="m-social__link" aria-label="Compartir a X"
        href="https://twitter.com/intent/tweet?url=https://www.elnacional.cat/article.html"></a>
      <a class="m-social__link" aria-label="Compartir a WhatsApp"
        href="https://web.whatsapp.com/send?text=article"></a>
      <a class="m-social__link" aria-label="Compartir a Telegram"
        href="https://t.me/share/url?url=https://www.elnacional.cat/article.html"></a>
      </body></html>
    `, "https://www.elnacional.cat/ca/gourmeteria/article.html");
    expect(page.outboundLinkCount).toBe(0);
  });

  it("does not count share controls, comment forms, consent links, or related modules", () => {
    const page = inspectHtml(`
      <html><head><title>Comença la temporada de bolets</title></head><body>
      <div class="entry-content with-share">
        <div class="share-float">
          <a aria-label="Share on Pinterest"
            href="https://www.pinterest.com/pin/create/bookmarklet/?url=https%3A%2F%2Fmedi.example.cat%2Farticle">Pinterest</a>
        </div>
        <div class="content-inner">
          <p>Article sense cap citació externa.</p>
          <a href="https://medi.example.cat/un-altre-article">Un altre article del mateix mitjà</a>
        </div>
      </div>
      <div class="related-posts"><a href="https://partner.example.org/promo">Contingut relacionat</a></div>
      <form class="comment-form">
        <div class="recaptcha-opt-in">
          <a href="https://policies.google.com/privacy">Privacy Policy</a>
          <a href="https://policies.google.com/terms">Terms of Use</a>
        </div>
      </form>
      </body></html>
    `, "https://medi.example.cat/comenca-la-temporada-de-bolets/");
    expect(page.outboundLinkCount).toBe(0);
  });

  it("counts distinct editorial sources inside the article while ignoring sponsored links", () => {
    const page = inspectHtml(`
      <html><head><title>Guia de bolets</title></head><body>
      <main><article>
        <p>Segons <a href="https://research.example.org/study#results">aquest estudi</a>, la temporada canvia.</p>
        <p>Vegeu també <a href="https://data.example.edu/report.pdf">les dades públiques</a>.</p>
        <a rel="sponsored" href="https://shop.example.com/cistells">Compra un cistell</a>
        <aside><a href="https://newsletter.example.net/signup">Butlletí</a></aside>
      </article></main>
      </body></html>
    `, "https://news.example.cat/guia-bolets");
    expect(page.outboundLinkCount).toBe(2);
  });
});
