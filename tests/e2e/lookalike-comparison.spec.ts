import { expect, test } from "@playwright/test";

test("offers the comparator for a toxic lookalike without a curated comparison page", async ({ page }) => {
  await page.goto("/bolets/apagallums");

  const toxicLookalike = page.locator(".similar-list article").filter({
    hasText: "Lepiota mortal",
  });
  const comparisonLink = toxicLookalike.getByRole("link", {
    name: "Comparar Apagallums i Lepiota mortal",
  });

  await expect(comparisonLink).toHaveAttribute(
    "href",
    "/compare?left=macrolepiota-procera&right=lepiota-brunneoincarnata",
  );
  await comparisonLink.click();
  await expect(page).toHaveURL(
    "/compare?left=macrolepiota-procera&right=lepiota-brunneoincarnata",
  );
  await expect(
    page.getByRole("columnheader", {
      name: "Espècie B: Palometa metzinosa, Lepiota brunneoincarnata",
    }),
  ).toBeVisible();
});
