import { expect, test } from "@playwright/test";

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`contribution action has a visible high-contrast background at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/col-labora");
    const action = page.getByRole("link", { name: "Proposar una aportació", exact: true });
    await expect(action).toBeVisible();
    await expect(action).toHaveAttribute("href", "/compte/col-laboracio");
    await page.evaluate(() => document.fonts.ready);
    const appearance = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      const channels = (colour: string) => colour.match(/[\d.]+/g)!.map(Number);
      const foreground = channels(style.color);
      const background = channels(style.backgroundColor);
      const luminance = (rgb: number[]) => rgb.slice(0, 3).reduce((sum, value, index) => {
        const channel = value / 255;
        const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      const box = element.getBoundingClientRect();
      return {
        backgroundAlpha: background[3] ?? 1,
        contrast: (light + 0.05) / (dark + 0.05),
        height: box.height,
        left: box.left,
        right: box.right,
      };
    });
    expect(appearance.backgroundAlpha).toBe(1);
    expect(appearance.contrast).toBeGreaterThanOrEqual(4.5);
    expect(appearance.height).toBeGreaterThanOrEqual(44);
    expect(appearance.left).toBeGreaterThanOrEqual(0);
    expect(appearance.right).toBeLessThanOrEqual(viewport.width);
    await action.focus();
    await expect(action).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("contribution-action.png") });
  });
}
