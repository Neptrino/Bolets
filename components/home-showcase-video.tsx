"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

const SHOWCASE_MEDIA_VERSION = "2026-09-02-cover";

export function HomeShowcaseVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playTracked = useRef(false);
  const completionTracked = useRef(false);
  const [started, setStarted] = useState(false);

  const handlePlay = () => {
    setStarted(true);
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
          <p className="eyebrow">Bolets en 48 segons</p>
          <h2 id="home-showcase-title">Del catàleg al territori.</h2>
        </div>
        <p>Un recorregut visual per les condicions d’avui, les espècies, les guies locals, el mapa i el quadern de camp.</p>
      </header>

      <div className="home-showcase-player">
        <video
          key={SHOWCASE_MEDIA_VERSION}
          ref={videoRef}
          controls
          muted
          playsInline
          preload="none"
          poster={`/media/generated/home-showcase-poster.webp?v=${SHOWCASE_MEDIA_VERSION}`}
          aria-label="Presentació de Bolets de Catalunya"
          onPlay={handlePlay}
          onEnded={handleEnded}
        >
          <source src={`/media/generated/home-showcase.webm?v=${SHOWCASE_MEDIA_VERSION}`} type="video/webm" />
          <source src={`/media/generated/home-showcase.mp4?v=${SHOWCASE_MEDIA_VERSION}`} type="video/mp4" />
          El navegador no permet reproduir aquest vídeo.
        </video>
        {!started ? (
          <button
            type="button"
            className="home-showcase-cover"
            aria-label="Reprodueix la presentació de Bolets de Catalunya"
            onClick={() => void videoRef.current?.play()}
          >
            <StaticMediaImage
              src="/media/generated/home-showcase-poster.webp"
              alt=""
              fill
              sizes="(max-width: 1280px) calc(100vw - 2rem), 1180px"
            />
            <span className="home-showcase-cover-play" aria-hidden="true">
              <Play size={22} fill="currentColor" />
              Veure el recorregut
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
