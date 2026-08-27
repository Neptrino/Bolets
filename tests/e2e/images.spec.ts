import { expect, test } from "@playwright/test";

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
    path: "/bolets/boletus-edulis",
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
  test(`${image.name} uses responsive WebP delivery`, async ({ page }) => {
    await page.goto(image.path);

    const element = page.locator(image.selector).first();
    await expect(element).toBeVisible();
    await expect(element).toHaveAttribute("sizes", image.sizes);

    const srcset = await element.getAttribute("srcset");
    expect(srcset).toBeTruthy();
    const candidates = srcset?.split(",").map((candidate) => candidate.trim()) ?? [];
    expect(candidates.length).toBeGreaterThan(1);

    for (const candidate of candidates) {
      expect(candidate).toMatch(/^\/_next\/image\?.+\s\d+w$/);
    }

    const candidateUrl = candidates[0]?.replace(/\s\d+w$/, "");
    expect(candidateUrl).toBeTruthy();
    const source = new URL(candidateUrl ?? "", page.url()).searchParams.get("url");
    expect(source).toMatch(/\.webp$/);

    const response = await page.request.get(
      new URL(candidateUrl ?? "", page.url()).href,
      { headers: { Accept: "image/webp" } },
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/webp(?:;|$)/);
  });
}

test("preloads only the primary above-the-fold hero image", async ({ page }) => {
  await page.goto("/bolets/boletus-edulis");

  const photos = page.locator(".specimen-photo");
  await expect(photos).toHaveCount(1);
  await expect(photos.first()).not.toHaveAttribute("loading", "lazy");
  await expect(page.locator(".species-gallery-thumbnails button")).toHaveCount(5);

  const preload = page.locator(
    'link[rel="preload"][as="image"][imagesrcset*="boletus-edulis.webp"]',
  );
  await expect(preload).toHaveCount(1);
  await expect(preload).toHaveAttribute(
    "imagesizes",
    "(max-width: 760px) calc(100vw - 48px), (max-width: 1000px) calc(55vw - 45px), (max-width: 1228px) calc(55vw - 61px), 615px",
  );
  await expect(preload).toHaveAttribute("imagesrcset", /\/_next\/image\?/);
});

test("species gallery changes slides and opens a larger view", async ({ page }) => {
  await page.goto("/bolets/lactarius-deliciosus");

  const mainImage = page.locator(".species-gallery-stage .specimen-photo");
  const initialSource = await mainImage.getAttribute("src");

  await page.getByRole("button", { name: "Fotografia següent" }).first().click();
  await expect(mainImage).not.toHaveAttribute("src", initialSource ?? "");
  await expect(page.locator(".species-gallery-toolbar")).toContainText("2 / 3");

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
  await page.goto("/bolets/boletus-edulis");

  const thumbnailImages = page.locator(".species-gallery-thumbnails img");
  await expect(thumbnailImages).toHaveCount(5);
  for (let index = 0; index < await thumbnailImages.count(); index += 1) {
    await expect(thumbnailImages.nth(index)).not.toHaveAttribute("alt", "");
  }
});
