import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const personalFindings = readFileSync("components/findings/personal-findings.tsx", "utf8");
const reportForm = readFileSync("components/findings/finding-report-form.tsx", "utf8");
const locationPreview = readFileSync("components/findings/finding-location-preview.tsx", "utf8");

describe("owner finding interactions", () => {
  it("opens a published finding from its main content instead of a small view button", () => {
    expect(personalFindings).toContain('className="finding-personal-entry" href={viewHref}');
    expect(personalFindings).toContain("Obrir la troballa de");
    expect(personalFindings).not.toContain(">Veure</Link>");
  });

  it("uses one publication decision for the finding and all of its photos", () => {
    expect(personalFindings).toContain('finding.visibility === "public" ? "Publicada" : "Privada"');
    expect(personalFindings).toContain("Retirar de l’atles");
    expect(personalFindings).toContain("Publicar a l’atles");
    expect(personalFindings).toContain("La comunitat veu totes les fotos");
    expect(personalFindings).toContain("El punt exacte i les notes continuen sent només teus.");
    expect(personalFindings).not.toContain("changePhotoPrivacy");
  });

  it("keeps a large notebook searchable, filtered, compact, and progressively loaded", () => {
    expect(personalFindings).toContain("Cercar per espècie");
    expect(personalFindings).toContain("Visibilitat");
    expect(personalFindings).toContain("Carregar-ne 20 més");
    expect(personalFindings).toContain("/api/me/findings/map");
    expect(personalFindings).toContain("finding-personal-menu");
    expect(personalFindings).not.toContain("finding-sharing-panel");
  });

  it("uses an icon-only actions menu that closes outside and with Escape", () => {
    expect(personalFindings).toContain('aria-label={label} title="Accions"');
    expect(personalFindings).not.toContain("/> Accions</summary>");
    expect(personalFindings).toContain('document.addEventListener("pointerdown", closeOutside)');
    expect(personalFindings).toContain('document.addEventListener("keydown", closeOnEscape)');
    expect(personalFindings).toContain('event.key !== "Escape"');
  });

  it("explains that photos follow the finding publication choice", () => {
    expect(reportForm).toContain("Es publiquen totes les fotos");
    expect(reportForm).toContain("Només es veuen si decideixes publicar-la.");
    expect(reportForm).not.toContain("photo.isPublic");
  });

  it("lets the owner remove a selected photo and its detected metadata before saving", () => {
    expect(reportForm).toContain("removePhoto");
    expect(reportForm).toContain("Eliminar la fotografia");
    expect(reportForm).toContain("URL.revokeObjectURL(removed.preview)");
    expect(reportForm).toContain("setPhotoLocation(nextPhotoLocation)");
    expect(reportForm).toContain("setPhotoDateTime(nextPhotoDateTime)");
  });

  it("lets the owner correct photo GPS by clicking, zooming, or dragging on the private map", () => {
    expect(locationPreview).toContain("interactive: true");
    expect(locationPreview).toContain("showNavigation: true");
    expect(locationPreview).toContain('localMap.on("click", handleMapClick)');
    expect(locationPreview).toContain('draggable: true');
    expect(locationPreview).toContain('localMarker.on("dragend", handleMarkerDrag)');
    expect(reportForm).toContain('setLocationSource("map")');
    expect(reportForm).toContain("Ubicació ajustada al mapa");
  });

  it("suggests taking GPS photos in the forest and completing the finding at home", () => {
    expect(reportForm).toContain("Fes les fotos al bosc. Completa la troballa a casa.");
    expect(reportForm).toContain("tingues activada la ubicació de la càmera");
    expect(reportForm).toContain("Afegeix-les des del mòbil o l’ordinador");
    expect(reportForm).toContain("corregeix el punt al mapa");
  });

  it("gives the privacy summary a clear promise and distinct decisions", () => {
    expect(reportForm).toContain("El punt exacte");
    expect(reportForm).toContain("no es publica mai");
    expect(reportForm).toContain("Al mapa públic");
    expect(reportForm).toContain("Les fotos van amb la troballa");
    expect(reportForm).toContain("La decisió sempre és teva");
  });

  it("offers a clear next step after saving and clears the previous location", () => {
    expect(reportForm).toContain("Anotar-ne una altra");
    expect(reportForm).toContain("Obrir el meu quadern");
    expect(reportForm).toContain("startAnotherFinding");
    expect(reportForm).toContain("setLatitude(null)");
    expect(reportForm).toContain("setLongitude(null)");
    expect(reportForm).toContain("speciesSelectRef.current?.focus");
  });
});
