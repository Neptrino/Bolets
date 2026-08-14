"use client";

import { Download, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

type DailyShareActionsProps = {
  title: string;
  imagePath: string;
  shareText: string;
  shareUrl: string;
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

function socialCaption(shareText: string, shareUrl: string) {
  return `${shareText.replace(/\nhttps:\/\/bolets\.app\/\S+$/, "")}\n\n${shareUrl}`;
}

export function DailyShareActions({ title, imagePath, shareText, shareUrl }: DailyShareActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const caption = socialCaption(shareText, shareUrl);
  const xShareUrl = `https://x.com/intent/post?text=${encodeURIComponent(caption)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(caption)}`;

  async function copyText() {
    await navigator.clipboard.writeText(shareText);
    setMessage("Text copiat");
  }

  async function shareCard() {
    try {
      const response = await fetch(imagePath);
      if (!response.ok) throw new Error("No s'ha pogut generar la imatge");
      const file = new File([await response.blob()], `bolets-${title.toLocaleLowerCase("ca").replaceAll(" ", "-")}.png`, { type: "image/png" });
      const payload = { title: `Bolets avui · ${title}`, text: shareText, files: [file] };

      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
      } else {
        await downloadImage(imagePath, file.name);
        await navigator.clipboard.writeText(shareText);
        setMessage("Imatge descarregada i text copiat");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("No s'ha pogut preparar la compartició");
    }
  }

  return (
    <div className="daily-share-actions">
      <button type="button" onClick={() => void shareCard()}><Share2 size={16} /> Compartir</button>
      <div className="daily-share-socials" aria-label="Publica a les xarxes socials">
        <a href={xShareUrl} target="_blank" rel="noreferrer" aria-label={`Publica la targeta de ${title} a X`}><span aria-hidden="true">𝕏</span></a>
        <a href={linkedInShareUrl} target="_blank" rel="noreferrer" aria-label={`Publica la targeta de ${title} a LinkedIn`}><span aria-hidden="true">in</span></a>
        <a href={whatsAppShareUrl} target="_blank" rel="noreferrer" aria-label={`Envia la targeta de ${title} per WhatsApp`}><MessageCircle size={16} aria-hidden="true" /></a>
      </div>
      <button type="button" onClick={() => void downloadImage(imagePath, `bolets-${title.toLocaleLowerCase("ca").replaceAll(" ", "-")}.png`).then(() => setMessage("Imatge descarregada")).catch(() => setMessage("No s'ha pogut descarregar la imatge"))}><Download size={16} /> Baixar PNG</button>
      <button type="button" onClick={() => void copyText().catch(() => setMessage("No s'ha pogut copiar el text"))}><Link2 size={16} /> Copiar text</button>
      <span aria-live="polite">{message}</span>
    </div>
  );
}
