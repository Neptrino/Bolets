import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountNav, type AccountSection } from "@/components/account-nav";

const sections: AccountSection[] = ["forest", "findings", "contributions", "account"];

describe("account navigation", () => {
  it.each(sections)("marks only the %s section as current", (current) => {
    const html = renderToStaticMarkup(createElement(AccountNav, { current }));

    expect(html).toContain('aria-label="Seccions del compte"');
    expect(html).toContain('href="/el-meu-bosc"');
    expect(html).toContain('href="/les-meves-troballes"');
    expect(html).toContain('href="/compte/col-laboracio"');
    expect(html).toContain('href="/compte"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });
});
