"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Play, RotateCcw } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

const SHOWCASE_MEDIA_VERSION = "2026-09-03-playback";
const PLAYBACK_START_TIMEOUT_MS = 12_000;
const subscribeToHydration = () => () => undefined;

export function HomeShowcaseVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playTracked = useRef(false);
  const completionTracked = useRef(false);
  const playbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [playbackState, setPlaybackState] = useState<"idle" | "loading" | "playing" | "error">("idle");

  useEffect(() => () => {
    if (playbackTimeout.current) clearTimeout(playbackTimeout.current);
  }, []);

  const clearPlaybackTimeout = () => {
    if (!playbackTimeout.current) return;
    clearTimeout(playbackTimeout.current);
    playbackTimeout.current = null;
  };

  const confirmPlaybackStarted = () => {
    const video = videoRef.current;
    if (!video || video.paused || video.currentTime <= 0.05) return;
    clearPlaybackTimeout();
    setPlaybackState("playing");
    if (playTracked.current) return;
    playTracked.current = true;
    queueUmamiEvent(UMAMI_EVENTS.homepageVideoPlay);
  };

  const requestPlayback = async () => {
    const video = videoRef.current;
    if (!video || playbackState === "loading") return;
    clearPlaybackTimeout();
    setPlaybackState("loading");
    playbackTimeout.current = setTimeout(() => {
      playbackTimeout.current = null;
      if (video.currentTime > 0.05 && !video.paused) {
        confirmPlaybackStarted();
        return;
      }
      setPlaybackState("error");
    }, PLAYBACK_START_TIMEOUT_MS);
    try {
      await video.play();
    } catch {
      clearPlaybackTimeout();
      setPlaybackState("error");
    }
  };

  const handlePlaybackError = () => {
    clearPlaybackTimeout();
    setPlaybackState("error");
  };

  const handleEnded = () => {
    if (completionTracked.current) return;
    completionTracked.current = true;
    queueUmamiEvent(UMAMI_EVENTS.homepageVideoComplete);
  };

  return (
    <section id="com-funciona" className="home-showcase-section page-width" aria-labelledby="home-showcase-title">
      <header className="home-showcase-header">
        <div>
          <p className="eyebrow">Bolets en 48 segons</p>
          <h2 id="home-showcase-title">Del catàleg al territori.</h2>
        </div>
        <p>Un recorregut visual per les condicions d’avui, les espècies, les guies locals, el mapa i el quadern de camp.</p>
      </header>

      <div className="home-showcase-player">
        <video
          key={SHOWCASE_MEDIA_VERSION}
          ref={videoRef}
          controls={!hydrated || playbackState === "playing"}
          muted
          playsInline
          preload="metadata"
          poster={`/media/generated/home-showcase-poster.webp?v=${SHOWCASE_MEDIA_VERSION}`}
          aria-label="Presentació de Bolets de Catalunya"
          onTimeUpdate={confirmPlaybackStarted}
          onError={handlePlaybackError}
          onEnded={handleEnded}
        >
          <source src={`/media/generated/home-showcase.mp4?v=${SHOWCASE_MEDIA_VERSION}`} type="video/mp4" />
          <source src={`/media/generated/home-showcase.webm?v=${SHOWCASE_MEDIA_VERSION}`} type="video/webm" />
          El navegador no permet reproduir aquest vídeo.
        </video>
        {hydrated && playbackState !== "playing" ? (
          <button
            type="button"
            className="home-showcase-cover"
            data-state={playbackState}
            aria-label={playbackState === "loading"
              ? "Carregant la presentació de Bolets de Catalunya"
              : playbackState === "error"
                ? "Torna a provar de reproduir la presentació de Bolets de Catalunya"
                : "Reprodueix la presentació de Bolets de Catalunya"}
            disabled={playbackState === "loading"}
            onClick={() => void requestPlayback()}
          >
            <StaticMediaImage
              src="/media/generated/home-showcase-poster.webp"
              alt=""
              fill
              sizes="(max-width: 1280px) calc(100vw - 2rem), 1180px"
            />
            <span className="home-showcase-cover-play" aria-hidden="true">
              {playbackState === "loading" ? (
                <><LoaderCircle className="home-showcase-cover-spinner" size={22} /> Carregant el vídeo…</>
              ) : playbackState === "error" ? (
                <><RotateCcw size={21} /> Torna-ho a provar</>
              ) : (
                <><Play size={22} fill="currentColor" /> Veure el recorregut</>
              )}
            </span>
          </button>
        ) : null}
      </div>

      <p className="visually-hidden">
        Presentació visual de la lectura d’avui, el catàleg d’espècies, les fitxes ecològiques, les guies locals, el mapa de condicions i el quadern de camp. La presentació recorda que el mapa serveix per comparar condicions i no confirma la presència de bolets, i que el punt exacte de cada troballa és privat.
      </p>
    </section>
  );
}
