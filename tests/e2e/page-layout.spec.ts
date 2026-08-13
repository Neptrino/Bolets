import { expect, test, type Locator, type Page } from "@playwright/test";

const routeGroups = {
  stacked: ["/bolets", "/compare", "/compare/rovello-vs-pinetell", "/zones", "/guies"],
  split: [
    "/bolets-comestibles",
    "/bolets-verinosos",
    "/temporada",
    "/temporada/setembre",
    "/bolets-avui",
    "/equip-editorial",
    "/quan-surten-els-bolets-despres-de-ploure",
    "/bolets-de-primavera",
    "/bolets-d-estiu",
    "/bolets-de-tardor",
    "/bolets-d-hivern",
  ],
} as const;

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 800, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

type Layout = keyof typeof routeGroups;

type HeaderStyle = {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
  marginBottom: string;
};

async function readHeaderStyle(pageHeader: Locator): Promise<HeaderStyle> {
  return pageHeader.evaluate((header) => {
    const heading = header.querySelector("h1");

    if (!(heading instanceof HTMLElement)) {
      throw new Error("The page header does not contain an h1");
    }

    const headingStyle = getComputedStyle(heading);
    const headerStyle = getComputedStyle(header);

    return {
      fontFamily: headingStyle.fontFamily,
      fontSize: headingStyle.fontSize,
      lineHeight: headingStyle.lineHeight,
      letterSpacing: headingStyle.letterSpacing,
      fontWeight: headingStyle.fontWeight,
      marginBottom: headerStyle.marginBottom,
    };
  });
}

async function checkRouteLayout(
  page: Page,
  route: string,
  layout: Layout,
  isMobile: boolean,
): Promise<HeaderStyle> {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${route} should return a successful document response`).toBe(true);

  const siteHeader = page.locator(".site-header");
  const pageShell = page.locator("[data-page-shell]");
  const pageHeader = page.locator("[data-page-header]");

  await expect(siteHeader, `${route} should show the site header`).toBeVisible();
  await expect(pageShell, `${route} should have exactly one shared page shell`).toHaveCount(1);
  await expect(pageHeader, `${route} should have exactly one shared page header`).toHaveCount(1);
  await expect(pageHeader, `${route} should use the ${layout} header layout`).toHaveAttribute(
    "data-layout",
    layout,
  );

  const visiblePageTitle = pageHeader.locator("h1:visible");
  await expect(
    visiblePageTitle,
    `${route} should have exactly one visible h1 in its shared page header`,
  ).toHaveCount(1);

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-page-shell]");
    const sharedHeader = document.querySelector<HTMLElement>("[data-page-header]");
    const globalHeader = document.querySelector<HTMLElement>(".site-header");

    if (!shell || !sharedHeader || !globalHeader) {
      throw new Error("Shared page layout geometry could not be measured");
    }

    const shellRect = shell.getBoundingClientRect();
    const sharedHeaderRect = sharedHeader.getBoundingClientRect();
    const globalHeaderRect = globalHeader.getBoundingClientRect();

    return {
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      pageHeaderTop: sharedHeaderRect.top,
      siteHeaderBottom: globalHeaderRect.bottom,
      leftGutter: shellRect.left,
      rightGutter: document.documentElement.clientWidth - shellRect.right,
    };
  });

  expect(
    geometry.horizontalOverflow,
    `${route} should not overflow the viewport horizontally`,
  ).toBeLessThanOrEqual(1);
  expect(
    geometry.pageHeaderTop,
    `${route} shared page header should begin below the site header`,
  ).toBeGreaterThanOrEqual(geometry.siteHeaderBottom - 1);
  expect(
    Math.abs(geometry.leftGutter - geometry.rightGutter),
    `${route} shared shell should have equal left and right gutters`,
  ).toBeLessThanOrEqual(1);

  if (isMobile) {
    expect(geometry.leftGutter, `${route} mobile left gutter should be at least 20px`).toBeGreaterThanOrEqual(
      20,
    );
    expect(
      geometry.rightGutter,
      `${route} mobile right gutter should be at least 20px`,
    ).toBeGreaterThanOrEqual(20);
  }

  return readHeaderStyle(pageHeader);
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} shared page layout`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("keeps route structure, geometry, and title styles consistent", async ({ page }) => {
      test.setTimeout(120_000);

      let viewportTitleSize: string | undefined;

      for (const [layout, routes] of Object.entries(routeGroups) as [
        Layout,
        readonly string[],
      ][]) {
        let groupStyle: HeaderStyle | undefined;

        for (const route of routes) {
          const style = await checkRouteLayout(page, route, layout, viewport.name === "mobile");

          groupStyle ??= style;
          viewportTitleSize ??= style.fontSize;

          expect(style, `${route} should match the ${viewport.name} ${layout} header style`).toEqual(
            groupStyle,
          );
          expect(
            style.fontSize,
            `${route} should use the shared ${viewport.name} title size`,
          ).toBe(viewportTitleSize);
        }
      }
    });
  });
}
