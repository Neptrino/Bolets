import { expect, test } from "@playwright/test";

test("plays from the first native-control click before hydration", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });

  const navigation = page.goto("/", { waitUntil: "domcontentloaded" });
  const video = page.locator(".home-showcase-player video");

  await video.waitFor({ state: "visible" });
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("controls", "");
  await expect(page.locator(".home-showcase-poster-play")).toHaveCount(0);

  const bounds = await video.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const nativePlayControl = {
    x: bounds.x + 25,
    y: bounds.y + bounds.height - 25,
  };
  await page.mouse.move(nativePlayControl.x, nativePlayControl.y);
  await page.mouse.click(nativePlayControl.x, nativePlayControl.y);

  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(false);
  await navigation;
  await expect(page.locator(".home-showcase-poster-play")).toHaveCount(0);
});

test("plays from the first branded-button click after hydration", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const video = page.locator(".home-showcase-player video");
  await page
    .getByRole("button", { name: "Reprodueix el vídeo de presentació" })
    .click();

  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(false);
  await expect(page.locator(".home-showcase-poster-play")).toHaveCount(0);
});
