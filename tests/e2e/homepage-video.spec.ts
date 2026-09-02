import { expect, test, type Locator, type Page } from "@playwright/test";

async function clickNativePlay(page: Page, video: Locator) {
  await video.scrollIntoViewIfNeeded();
  const bounds = await video.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  const nativePlayControl = {
    x: bounds.x + 34,
    y: bounds.y + bounds.height - 40,
  };
  await page.mouse.move(nativePlayControl.x, nativePlayControl.y);
  await page.waitForTimeout(100);
  await page.mouse.click(nativePlayControl.x, nativePlayControl.y);
}

test.describe("before hydration", () => {
  test.use({ javaScriptEnabled: false });

  test("plays from the first native-control click", async ({ page }) => {
    await page.goto("/");
    const video = page.locator(".home-showcase-player video");

    await expect(video).toHaveAttribute("controls", "");
    await expect(page.locator(".home-showcase-cover")).toHaveCount(0);
    await clickNativePlay(page, video);

    await expect.poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
    ).toBeGreaterThan(0.05);
  });
});

test("plays from one cover click after hydration", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const video = page.locator(".home-showcase-player video");
  const cover = page.locator(".home-showcase-cover");
  await expect(cover).toBeVisible();
  await expect(video).not.toHaveAttribute("controls", "");
  await cover.click();

  await expect.poll(
    () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
  ).toBeGreaterThan(0.05);
  await expect(cover).toHaveCount(0, { timeout: 15_000 });
  await expect(video).toHaveAttribute("controls", "");

  await video.evaluate((element) => (element as HTMLVideoElement).pause());
  await expect.poll(
    () => video.evaluate((element) => (element as HTMLVideoElement).paused),
  ).toBe(true);
  await expect(cover).toHaveCount(0);
});
