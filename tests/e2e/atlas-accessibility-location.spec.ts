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

test("keeps the user's location when changing species", async ({
  browser,
}) => {
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
  const map = page.locator(".full-map");
  const locationDot = page.locator(".maplibregl-user-location-dot");
  const distanceFromMapCentre = async () => {
    const [mapBox, dotBox] = await Promise.all([
      map.boundingBox(),
      locationDot.boundingBox(),
    ]);
    if (!mapBox || !dotBox) return Infinity;
    const horizontalDistance = Math.abs(
      mapBox.x + mapBox.width / 2 - (dotBox.x + dotBox.width / 2),
    );
    const verticalDistance = Math.abs(
      mapBox.y + mapBox.height / 2 - (dotBox.y + dotBox.height / 2),
    );
    return Math.max(horizontalDistance, verticalDistance);
  };

  await expect(locationDot).toBeVisible({ timeout: 12_000 });
  await expect.poll(distanceFromMapCentre).toBeLessThan(80);
  await expect.poll(() => predictionRequests.some((request) => {
    const west = Number(request.searchParams.get("west"));
    const south = Number(request.searchParams.get("south"));
    const east = Number(request.searchParams.get("east"));
    const north = Number(request.searchParams.get("north"));
    return west <= 2.1734 && east >= 2.1734 &&
      south <= 41.3851 && north >= 41.3851;
  })).toBe(true);

  await page.getByLabel("Espècie seleccionada").click();
  await page.getByRole("option", { name: "Pinetell", exact: true }).click();
  await expect(page).toHaveURL(/species=lactarius-deliciosus/);
  await expect(locationDot).toBeVisible();
  await expect.poll(distanceFromMapCentre).toBeLessThan(80);

  await context.close();
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
      south <= nextLocation.latitude && north >= nextLocation.latitude &&
      Math.abs((west + east) / 2 - nextLocation.longitude) < 0.1 &&
      Math.abs((south + north) / 2 - nextLocation.latitude) < 0.1;
  }), { timeout: 12_000 }).toBe(true);

  await context.close();
});
