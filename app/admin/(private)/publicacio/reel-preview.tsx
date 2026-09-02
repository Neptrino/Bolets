"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./instagram.module.css";

type ReelState = "preparing" | "ready" | "failed";

export function ReelPreview({
  durationLabel,
  poster,
  src,
}: {
  durationLabel: string;
  poster: string;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReelState>("preparing");

  useEffect(() => {
    if ((videoRef.current?.readyState ?? 0) >= HTMLMediaElement.HAVE_METADATA) {
      setState("ready");
    }
  }, [attempt]);

  function retry() {
    setState("preparing");
    setAttempt(Date.now());
  }

  return (
    <figure className={styles.reelFrame}>
      <video
        controls
        key={`${src}:${attempt}`}
        onError={() => setState("failed")}
        onLoadedMetadata={() => setState("ready")}
        playsInline
        poster={poster}
        preload="metadata"
        ref={videoRef}
        src={src}
      >
        El navegador no pot reproduir aquesta previsualització de vídeo.
      </video>
      <div className={styles.reelRenderStatus} data-state={state} role="status" aria-live="polite">
        <span className={styles.reelStatusIcon} aria-hidden="true">
          {state === "ready" ? "✓" : state === "failed" ? "!" : null}
        </span>
        <div>
          <strong>
            {state === "ready"
              ? "Reel preparat"
              : state === "failed"
                ? "No s’ha pogut preparar"
                : "Preparant el Reel…"}
          </strong>
          <small>
            {state === "ready"
              ? "El vídeo ja es pot revisar i publicar."
              : state === "failed"
                ? "El servidor no ha retornat un vídeo vàlid."
                : "Pot trigar uns segons si encara no és a la memòria cau."}
          </small>
        </div>
        {state === "failed" ? (
          <button className={styles.reelRetryButton} onClick={retry} type="button">
            Tornar-ho a provar
          </button>
        ) : null}
      </div>
      <figcaption>Reel · {durationLabel} · 9:16</figcaption>
    </figure>
  );
}
