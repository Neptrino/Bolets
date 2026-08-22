"use client";

import { Download, Link2, Share2 } from "lucide-react";
import { useState } from "react";

type DailyShareActionsProps = {
  title: string;
  feedImagePath: string;
  storyImagePath: string;
  shareText: string;
  disabled?: boolean;
};

async function downloadImage(imagePath: string, filename: string) {
  const response = await fetch(imagePath);
  if (!response.ok) throw new Error("No s'ha pogut generar la imatge");
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function DailyShareActions({ title, feedImagePath, storyImagePath, shareText, disabled = false }: DailyShareActionsProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function copyText() {
    await navigator.clipboard.writeText(shareText);
    setMessage("Text copiat");
  }

  async function shareCard(imagePath: string, format: "feed" | "story") {
    try {
      const response = await fetch(imagePath);
      if (!response.ok) throw new Error("No s'ha pogut generar la imatge");
      const file = new File([await response.blob()], `bolets-${title.toLocaleLowerCase("ca").replaceAll(" ", "-")}-${format}.png`, { type: "image/png" });
      const payload = { title: `Bolets avui · ${title}`, text: shareText, files: [file] };

      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
      } else {
        await downloadImage(imagePath, file.name);
        await navigator.clipboard.writeText(shareText);
        setMessage(`PNG ${format === "feed" ? "del feed" : "per a Story/Reel"} descarregat i text copiat`);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("No s'ha pogut preparar la compartició");
    }
  }

  return (
    <div className={`daily-share-actions${disabled ? " is-disabled" : ""}`}>
      <div className="daily-share-action-group">
        <span>Feed · 4:5</span>
        <button className="is-primary" type="button" disabled={disabled} onClick={() => void shareCard(feedImagePath, "feed")}><Share2 size={16} /> Compartir</button>
        <button type="button" disabled={disabled} onClick={() => void downloadImage(feedImagePath, `bolets-${title.toLocaleLowerCase("ca").replaceAll(" ", "-")}-feed.png`).then(() => setMessage("PNG del feed descarregat")).catch(() => setMessage("No s'ha pogut descarregar la imatge"))}><Download size={16} /> Baixar</button>
      </div>
      <div className="daily-share-action-group">
        <span>Story · 9:16</span>
        <button className="is-primary" type="button" disabled={disabled} onClick={() => void shareCard(storyImagePath, "story")}><Share2 size={16} /> Compartir</button>
        <button type="button" disabled={disabled} onClick={() => void downloadImage(storyImagePath, `bolets-${title.toLocaleLowerCase("ca").replaceAll(" ", "-")}-story.png`).then(() => setMessage("PNG de Story descarregat")).catch(() => setMessage("No s'ha pogut descarregar la imatge"))}><Download size={16} /> Baixar</button>
      </div>
      <button className="daily-share-copy" type="button" disabled={disabled} onClick={() => void copyText().catch(() => setMessage("No s'ha pogut copiar el text"))}><Link2 size={16} /> Copiar text</button>
      <span className="daily-share-status" aria-live="polite">{message}</span>
    </div>
  );
}
