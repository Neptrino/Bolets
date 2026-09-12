import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });

const responsiveImages = [
  {
    name: "home hero",
    path: "/",
    selector: ".hero-media img",
    sizes: "100vw",
  },
  {
    name: "species card",
    path: "/bolets",
    selector: ".species-card-photo",
    sizes:
      "(max-width: 580px) calc(100vw - 48px), (max-width: 1000px) calc(50vw - 37px), (max-width: 1228px) calc(33.333vw - 33px), 377px",
  },
  {
    name: "species hero",
    path: "/bolets/cep",
    selector: ".specimen-photo",
    sizes:
      "(max-width: 760px) calc(100vw - 48px), (max-width: 1000px) calc(55vw - 45px), (max-width: 1228px) calc(55vw - 61px), 615px",
  },
  {
    name: "comparison photo",
    path: "/compare?left=boletus-edulis&right=lactarius-deliciosus",
    selector: ".compare-profile-photo",
    sizes:
      "(max-width: 520px) calc(100vw - 52px), (max-width: 800px) calc(100vw - 80px), (max-width: 1228px) calc(50vw - 85px), 529px",
  },
] as const;

for (const image of responsiveImages) {
  test(`${image.name} uses responsive AVIF delivery with a WebP fallback`, async ({ page }) => {
    await page.goto(image.path);

    const element = page.locator(image.selector).first();
    await expect(element).toBeVisible();
    await expect(element).toHaveAttribute("sizes", image.sizes);

    const srcset = await element.getAttribute("srcset");
    expect(srcset).toBeTruthy();
    const candidates = srcset?.split(",").map((candidate) => candidate.trim()) ?? [];
    expect(candidates.length).toBeGreaterThan(1);

    for (const candidate of candidates) {
      expect(candidate).toMatch(/^\/media\/optimized\/v\d+\/.+\.w\d+\.webp\s\d+w$/);
    }

    const candidateUrl = candidates[0]?.replace(/\s\d+w$/, "");
    expect(candidateUrl).toBeTruthy();
    const preferred = element.locator("xpath=..").locator('source[type="image/avif"]');
    await expect(preferred).toHaveAttribute("srcset", /\.avif \d+w/);
    await expect.poll(() => element.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await element.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/\.avif$/);

    const response = await page.request.get(
      new URL(candidateUrl ?? "", page.url()).href,
      { headers: { Accept: "image/webp" } },
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/webp(?:;|$)/);
  });
}

test("preloads only the primary above-the-fold hero image", async ({ page }) => {
  const heroRequests: string[] = [];
  page.on("request", request => {
    if (/\/wikimedia\/boletus-edulis\.w(?:640|960|1280|1920)\./.test(request.url())) heroRequests.push(request.url());
  });
  await page.goto("/bolets/cep");

  const photos = page.locator(".specimen-photo");
  await expect(photos).toHaveCount(1);
  await expect(photos.first()).not.toHaveAttribute("loading", "lazy");
  await expect(page.locator(".species-gallery-thumbnails button")).toHaveCount(5);

  const preload = page.locator(
    'link[rel="preload"][as="image"][imagesrcset*="boletus-edulis.w"]',
  );
  await expect(preload).toHaveCount(1);
  await expect(preload).toHaveAttribute(
    "imagesizes",
    "(max-width: 760px) calc(100vw - 48px), (max-width: 1000px) calc(55vw - 45px), (max-width: 1228px) calc(55vw - 61px), 615px",
  );
  await expect(preload).toHaveAttribute("type", "image/avif");
  await expect(preload).toHaveAttribute("imagesrcset", /\/media\/optimized\/.+\.avif/);
  await expect.poll(() => photos.first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(heroRequests).toHaveLength(1);
  expect(heroRequests[0]).toMatch(/\.avif$/);
});

test("loads the WebP fallback without JavaScript when the preferred format is unsupported", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: "block", extraHTTPHeaders: { DNT: "1" } });
  try {
    const page = await context.newPage();
    // Chromium's disabled-image-types emulation affects picture selection but
    // still loads AVIF preload links. An unknown MIME type exercises both
    // native unsupported-format checks, including preload suppression.
    await page.route("**/bolets/cep", async route => {
      const response = await route.fetch();
      const body = (await response.text()).replaceAll('type="image/avif"', 'type="image/x-test-unsupported"');
      await route.fulfill({ response, body });
    });
    const requests: string[] = [];
    page.on("request", request => { if (request.resourceType() === "image") requests.push(request.url()); });
    await page.goto(`${baseURL}/bolets/cep`);
    const hero = page.locator(".specimen-photo");
    await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await hero.evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(/\.webp$/);
    expect(requests.some(url => url.endsWith(".avif"))).toBe(false);
  } finally {
    await context.close();
  }
});

test("species gallery changes slides and opens a larger view", async ({ page }) => {
  await page.goto("/bolets/pinetell");

  const mainImage = page.locator(".species-gallery-stage .specimen-photo");
  const initialSource = await mainImage.getAttribute("src");

  await page.getByRole("button", { name: "Fotografia següent" }).first().click();
  await expect(mainImage).not.toHaveAttribute("src", initialSource ?? "");
  await expect(page.locator(".species-gallery-toolbar")).toContainText(`2 / ${await page.locator(".species-gallery-thumbnails button").count()}`);

  await page.getByRole("button", { name: "Mostra la fotografia a mida gran" }).click();
  const lightbox = page.getByRole("dialog", {
    name: "Fotografies ampliades de Lactarius deliciosus",
  });
  await expect(lightbox).toBeVisible();
  await expect(lightbox.locator(".species-lightbox-image img")).toBeVisible();

  await page.getByRole("button", { name: "Tanca la fotografia ampliada" }).click();
  await expect(lightbox).not.toBeVisible();
});

test("species gallery thumbnails carry their media descriptions", async ({ page }) => {
  await page.goto("/bolets/cep");

  const thumbnailImages = page.locator(".species-gallery-thumbnails img");
  await expect(thumbnailImages).toHaveCount(5);
  for (let index = 0; index < await thumbnailImages.count(); index += 1) {
    await expect(thumbnailImages.nth(index)).not.toHaveAttribute("alt", "");
  }
});
