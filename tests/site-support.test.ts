import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { resolveSupportUrl } from "@/src/lib/support";

const originalSupportUrl = process.env.SUPPORT_URL;

afterEach(() => {
  if (originalSupportUrl === undefined) delete process.env.SUPPORT_URL;
  else process.env.SUPPORT_URL = originalSupportUrl;
});

describe("project support link", () => {
  it("accepts only absolute HTTPS destinations", () => {
    expect(resolveSupportUrl(" https://ko-fi.com/bolets ")).toBe("https://ko-fi.com/bolets");
    expect(resolveSupportUrl("http://example.com/support")).toBeNull();
    expect(resolveSupportUrl("/support")).toBeNull();
    expect(resolveSupportUrl("not a URL")).toBeNull();
  });

  it("renders a provider-neutral footer action when configured", () => {
    process.env.SUPPORT_URL = "https://buymeacoffee.com/bolets";
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).toContain('href="https://buymeacoffee.com/bolets"');
    expect(html).toContain("Convida’ns a un cafè");
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });

  it("omits the action when its destination is missing or unsafe", () => {
    process.env.SUPPORT_URL = "javascript:alert(1)";
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).not.toContain("site-footer-support");
  });
});
