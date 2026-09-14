import { expect, test } from "@playwright/test";

for (const width of [390, 1444]) {
  test(`culinary explanation stays anchored and dismissible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/bolets/cep");
    const trigger = page.getByRole("button", { name: "Com s’interpreta el valor culinari" });
    await trigger.scrollIntoViewIfNeeded();
    const rating = await page.locator(".profile-rating-scale .culinary-rating").boundingBox();
    const help = await trigger.boundingBox();
    expect(Math.abs(rating!.y + rating!.height / 2 - help!.y - help!.height / 2)).toBeLessThanOrEqual(1);
    expect(help!.x - rating!.x - rating!.width).toBeGreaterThanOrEqual(7);
    await trigger.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    const popup = await tooltip.boundingBox();
    const button = await trigger.boundingBox();
    expect(popup!.x).toBeGreaterThanOrEqual(15);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(width - 15);
    expect(Math.min(Math.abs(button!.y - popup!.y - popup!.height), Math.abs(popup!.y - button!.y - button!.height))).toBeLessThanOrEqual(10);
    await trigger.press("Escape");
    await expect(tooltip).not.toBeVisible();
    await trigger.click();
    await expect(tooltip).toBeVisible();
    await page.getByRole("heading", { name: "El cep a la cuina" }).click();
    await expect(tooltip).not.toBeVisible();
  });
}
