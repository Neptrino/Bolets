/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SpeciesDirectory } from "@/components/species-directory";
import { catalogueSpecies } from "@/data/catalogue";
import { catalogueCounts, catalogueListRows, toCatalogueDirectoryEntry } from "@/src/lib/catalogue-list";

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("species directory after a back navigation", () => {
  it("restores the filters from the address when the router cache replays the unfiltered props", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    // Back from a species page: the address keeps the filters, the cached props do not.
    window.history.replaceState(null, "", "/bolets?q=&tipus=comestibles");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(SpeciesDirectory, {
        species: catalogueSpecies.map(toCatalogueDirectoryEntry),
        currentMonth: "oct",
        seasonGuides: [],
      }));
    });

    const edible = catalogueCounts(catalogueListRows()).edible;
    expect(container.querySelector(".directory-summary strong")?.textContent).toBe(String(edible));
    expect(container.querySelector(".directory-filter[aria-pressed=true]")?.textContent).toContain("Comestibles");
    // The address is left as the visitor had it, not reset to the unfiltered catalogue.
    expect(`${window.location.pathname}${window.location.search}`).toBe("/bolets?tipus=comestibles");
    await act(async () => root.unmount());
  });
});
