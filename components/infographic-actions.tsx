"use client";

import { Download, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

type InfographicActionsProps = {
  posterPath: string;
};

const filename = "bolets-catalunya-infografia.png";

async function loadPoster(posterPath: string) {
  const response = await fetch(posterPath);
  if (!response.ok) throw new Error("No s'ha pogut preparar el pòster");
  return response.blob();
}

function savePoster(blob: Blob) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function InfographicActions({ posterPath }: InfographicActionsProps) {
  const [activeAction, setActiveAction] = useState<"download" | "share" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setActiveAction("download");
    setMessage(null);

    try {
      savePoster(await loadPoster(posterPath));
      queueUmamiEvent(UMAMI_EVENTS.infographicDownloaded);
      setMessage("Pòster descarregat");
    } catch {
      setMessage("No s'ha pogut descarregar el pòster");
    } finally {
      setActiveAction(null);
    }
  }

  async function share() {
    setActiveAction("share");
    setMessage(null);

    try {
      const blob = await loadPoster(posterPath);
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      const filePayload = {
        title: "Bolets de Catalunya · Infografia",
        text: "Infografia visual dels bolets de Catalunya.",
        files: [file],
      };

      if (navigator.canShare?.(filePayload)) {
        await navigator.share(filePayload);
      } else if (navigator.share) {
        await navigator.share({
          title: filePayload.title,
          text: filePayload.text,
          url: new URL(posterPath, window.location.origin).href,
        });
      } else {
        await navigator.clipboard.writeText(new URL(posterPath, window.location.origin).href);
        setMessage("Enllaç del pòster copiat");
        return;
      }

      queueUmamiEvent(UMAMI_EVENTS.infographicShared);
      setMessage("Pòster compartit");
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setMessage("No s'ha pogut compartir el pòster");
      }
    } finally {
      setActiveAction(null);
    }
  }

  const isBusy = activeAction !== null;

  return (
    <div className="catalogue-infographic-actions">
      <button
        className="button light-button"
        type="button"
        disabled={isBusy}
        onClick={() => void download()}
      >
        <Download size={17} aria-hidden="true" />
        {activeAction === "download" ? "Preparant…" : "Baixar el pòster PNG"}
      </button>
      <button
        className="button infographic-share-button"
        type="button"
        disabled={isBusy}
        onClick={() => void share()}
      >
        <Share2 size={17} aria-hidden="true" />
        {activeAction === "share" ? "Preparant…" : "Compartir"}
      </button>
      <a className="text-link" href={posterPath} target="_blank" rel="noreferrer">
        Veure a mida completa <ExternalLink size={16} aria-hidden="true" />
      </a>
      <span className="catalogue-infographic-action-status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
