"use client";

import { Play } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

const neverChanges = () => () => undefined;
const clientHasHydrated = () => true;
const serverHasHydrated = () => false;

function useVideoStarted(video: HTMLVideoElement | null) {
  const subscribe = useCallback((onPlaybackChange: () => void) => {
    if (!video) return () => undefined;

    video.addEventListener("play", onPlaybackChange);
    video.addEventListener("pause", onPlaybackChange);
    video.addEventListener("ended", onPlaybackChange);
    video.addEventListener("emptied", onPlaybackChange);

    return () => {
      video.removeEventListener("play", onPlaybackChange);
      video.removeEventListener("pause", onPlaybackChange);
      video.removeEventListener("ended", onPlaybackChange);
      video.removeEventListener("emptied", onPlaybackChange);
    };
  }, [video]);
  const getSnapshot = useCallback(
    () => Boolean(
      video
      && !video.ended
      && (!video.paused || video.currentTime > 0),
    ),
    [video],
  );

  return useSyncExternalStore(subscribe, getSnapshot, serverHasHydrated);
}

export function HomeShowcaseVideo() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const playTracked = useRef(false);
  const completionTracked = useRef(false);
  const hydrated = useSyncExternalStore(
    neverChanges,
    clientHasHydrated,
    serverHasHydrated,
  );
  const started = useVideoStarted(video);

  const play = async () => {
    try {
      await video?.play();
    } catch {
      // Keep the native controls available when the browser declines playback.
    }
  };

  const handlePlay = () => {
    if (playTracked.current) return;
    playTracked.current = true;
    queueUmamiEvent(UMAMI_EVENTS.homepageVideoPlay);
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
          <p className="eyebrow">Bolets en 36 segons</p>
          <h2 id="home-showcase-title">Del catàleg al territori.</h2>
        </div>
        <p>Un recorregut visual per les espècies, les condicions del bosc, el mapa i el quadern de camp.</p>
      </header>

      <div className="home-showcase-player">
        <video
          ref={setVideo}
          controls
          muted
          playsInline
          preload="none"
          poster="/media/generated/home-showcase-poster.webp"
          aria-label="Presentació de Bolets de Catalunya"
          onPlay={handlePlay}
          onEnded={handleEnded}
        >
          <source src="/media/generated/home-showcase.webm" type="video/webm" />
          <source src="/media/generated/home-showcase.mp4" type="video/mp4" />
          El navegador no permet reproduir aquest vídeo.
        </video>

        {hydrated && video !== null && !started && (
          <button type="button" className="home-showcase-poster-play" onClick={play} aria-label="Reprodueix el vídeo de presentació">
            <span className="home-showcase-poster-play-content">
              <span className="home-showcase-poster-play-icon" aria-hidden="true"><Play size={24} fill="currentColor" /></span>
              <span>Reprodueix el vídeo</span>
              <small>Sense so · textos integrats</small>
            </span>
          </button>
        )}
      </div>

      <p className="visually-hidden">
        Presentació visual del catàleg d’espècies, les fitxes ecològiques, el mapa de condicions i el quadern de camp. La presentació recorda que el mapa serveix per comparar condicions i no confirma la presència de bolets, i que el punt exacte de cada troballa és privat.
      </p>
    </section>
  );
}
