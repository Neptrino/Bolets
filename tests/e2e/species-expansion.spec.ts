import { expect, test } from "@playwright/test";

test("renders new edible and lethal profiles with their local galleries", async ({ page }) => {
  const pageErrors: string[] = [];
  const failedImageResponses: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().includes("/media/wikimedia/")) {
      failedImageResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/bolets");
  await page.getByRole("textbox", { name: "Cerca espècies" }).fill("Marçot");
  const marzotCard = page.getByRole("link", { name: "Obre la fitxa de Marçot" });
  await expect(marzotCard).toBeVisible();
  await expect(marzotCard.locator("img")).toHaveAttribute(
    "src",
    /hygrophorus-marzuolus\.webp/,
  );

  await page.goto("/bolets/hygrophorus-marzuolus");
  await expect(page.getByRole("heading", { name: "Marçot", exact: true })).toBeVisible();
  await expect(page.locator(".species-gallery-thumbnails button")).toHaveCount(3);
  await expect(page.locator(".species-gallery-stage img")).toHaveJSProperty("complete", true);
  expect(
    await page.locator(".species-gallery-stage img").evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBeGreaterThan(0);

  await page.goto("/bolets/lepiota-brunneoincarnata");
  await expect(
    page.getByRole("heading", { name: "Palometa metzinosa", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".species-hero .culinary-rating")).toHaveAccessibleName(
    /Advertiment de consum/,
  );
  await expect(page.locator(".species-gallery-thumbnails button")).toHaveCount(3);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
  expect(failedImageResponses).toEqual([]);
});
