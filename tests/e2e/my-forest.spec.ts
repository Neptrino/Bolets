import { expect, test } from "@playwright/test";

test("routes the account entry through sign-in and preserves public field capture", async ({ page }) => {
  await page.goto("/bolets-avui");
  const account = page.locator(".header-account-link");
  await expect(account).toHaveAttribute("href", "/compte/bosc");
  await expect(account).toContainText("El meu bosc");
  await account.click();

  await expect(page).toHaveURL(/\/acces\?retorn=%2Fcompte%2Fbosc$/);
  await expect(page.locator("h1")).toContainText("bosc");

  const draftResponse = await page.goto("/troballes/nova");
  expect(draftResponse?.ok()).toBe(true);
  await expect(page.locator("h1")).toBeVisible();

  const publicResponse = await page.goto("/bolets-avui");
  expect(publicResponse?.ok()).toBe(true);
  await expect(page.locator("[data-page-header]")).toBeVisible();
});
