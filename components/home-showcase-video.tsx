"use client";

import { useRef } from "react";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";

export function HomeShowcaseVideo() {
  const playTracked = useRef(false);
  const completionTracked = useRef(false);

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
      </div>

      <p className="visually-hidden">
        Presentació visual del catàleg d’espècies, les fitxes ecològiques, el mapa de condicions i el quadern de camp. La presentació recorda que el mapa serveix per comparar condicions i no confirma la presència de bolets, i que el punt exacte de cada troballa és privat.
      </p>
    </section>
  );
}
