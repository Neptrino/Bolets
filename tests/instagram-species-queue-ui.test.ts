import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Instagram species queue UI", () => {
  it("previews the selected species, confirms the write and links to Buffer", () => {
    const component = readFileSync(
      "app/admin/(private)/publicacio/species-buffer-composer.tsx",
      "utf8",
    );

    expect(component).toContain("https://publish.buffer.com/");
    expect(component).toContain("Obre Buffer");
    expect(component).toContain("/admin/publicacio/queue-species");
    expect(component).toContain("<ConfirmDialog");
    expect(component).toContain("Afegeix a Buffer");
    expect(component).toContain("url.searchParams.set(\"speciesId\", speciesId)");
  });
});
