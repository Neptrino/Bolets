import { expect, test } from "@playwright/test";

test("keeps rendered text at 12px or larger", async ({ page }) => {
  for (const route of ["/", "/bolets/cep", "/compare", "/map", "/metode"]) {
    await page.goto(route);
    const violations = await page.locator("body *").evaluateAll((elements) =>
      elements.flatMap((element) => {
        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize);
        if (!Number.isFinite(fontSize) || fontSize >= 12) return [];
        return [
          {
            element: element.tagName.toLowerCase(),
            className: element.className,
            fontSize,
          },
        ];
      }),
    );

    expect(violations, route).toEqual([]);
  }
});

test("follows the user's location as they move", async ({ browser }) => {
  const context = await browser.newContext({
    geolocation: { longitude: 2.1734, latitude: 41.3851 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  const predictionRequests: URL[] = [];
  await page.route("**/api/predictions?*", async (route) => {
    predictionRequests.push(new URL(route.request().url()));
    await route.fulfill({ json: { cells: [], truncated: false } });
  });

  await page.goto("/map?species=boletus-edulis");
  const locationDot = page.locator(".maplibregl-user-location-dot");
  await expect(locationDot).toBeVisible({ timeout: 12_000 });

  const nextLocation = { longitude: 2.4, latitude: 41.6 };
  await context.setGeolocation(nextLocation);
  await expect.poll(() => predictionRequests.some((request) => {
    const west = Number(request.searchParams.get("west"));
    const south = Number(request.searchParams.get("south"));
    const east = Number(request.searchParams.get("east"));
    const north = Number(request.searchParams.get("north"));
    return west <= nextLocation.longitude && east >= nextLocation.longitude &&
      south <= nextLocation.latitude && north >= nextLocation.latitude;
  }), { timeout: 12_000 }).toBe(true);
  // Canonical 2.5 km requests span 0.5-degree buckets, so their centres do not
  // identify the camera. Verify the location marker after its camera animation.
  await page.waitForTimeout(750);
  await expect.poll(async () => {
    const map = (await page.locator(".maplibregl-canvas").boundingBox())!;
    const dot = (await locationDot.boundingBox())!;
    return Math.max(Math.abs(dot.x + dot.width / 2 - map.x - map.width / 2),
      Math.abs(dot.y + dot.height / 2 - map.y - map.height / 2));
  }).toBeLessThan(5);

  await context.close();
});
