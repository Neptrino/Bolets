"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";

type SpeciesFieldCardActionsProps = {
  imagePath: string;
  speciesId: string;
  speciesName: string;
};

async function loadCard(imagePath: string) {
  const response = await fetch(imagePath);
  if (!response.ok) throw new Error("No s'ha pogut generar la targeta");
  return response.blob();
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function SpeciesFieldCardActions({
  imagePath,
  speciesId,
  speciesName,
}: SpeciesFieldCardActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const filename = `bolets-${speciesId}-targeta-de-camp.png`;

  async function download() {
    try {
      downloadBlob(await loadCard(imagePath), filename);
      setMessage("Targeta descarregada");
    } catch {
      setMessage("No s'ha pogut descarregar la targeta");
    }
  }

  async function share() {
    try {
      const file = new File([await loadCard(imagePath)], filename, { type: "image/png" });
      const pageUrl = window.location.href;
      const payload = {
        title: `${speciesName} · Targeta de camp`,
        text: `Targeta de camp del ${speciesName}. ${pageUrl}`,
        files: [file],
      };

      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        setMessage("Targeta preparada per compartir");
      } else {
        downloadBlob(file, filename);
        await navigator.clipboard?.writeText(pageUrl);
        setMessage("Targeta descarregada i enllaç copiat");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessage("No s'ha pogut preparar la compartició");
      }
    }
  }

  return (
    <div className="species-field-card-actions">
      <button type="button" className="button moss-button" onClick={() => void share()}>
        <Share2 size={17} aria-hidden="true" /> Compartir
      </button>
      <button type="button" className="button field-card-download" onClick={() => void download()}>
        <Download size={17} aria-hidden="true" /> Baixar PNG
      </button>
      <span className="species-field-card-status" aria-live="polite">{message}</span>
    </div>
  );
}
