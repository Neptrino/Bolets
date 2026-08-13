"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "@/src/lib/types";

interface SpeciesGalleryProps {
  images: MediaAsset[];
  speciesName: string;
}

function imageSource(asset: MediaAsset) {
  return asset.localPath ?? asset.imageUrl ?? asset.sourceUrl;
}

export function SpeciesGallery({ images, speciesName }: SpeciesGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeImage = images[activeIndex];

  const showPrevious = useCallback(() => {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (lightboxOpen && !dialog.open) dialog.showModal();
    if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, showNext, showPrevious]);

  if (!activeImage) return null;

  const multipleImages = images.length > 1;
  const countLabel = `${activeIndex + 1} / ${images.length}`;

  return (
    <div className="species-gallery">
      <div className="species-gallery-stage">
        <button
          className="species-gallery-expand-target"
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Amplia la fotografia ${activeIndex + 1} de ${speciesName}`}
        >
          <Image
            className="specimen-photo"
            src={imageSource(activeImage)}
            alt={activeImage.alt}
            fill
            preload={activeIndex === 0}
            sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1000px) calc(55vw - 45px), (max-width: 1228px) calc(55vw - 61px), 615px"
          />
          <span className="species-gallery-vignette" aria-hidden="true" />
        </button>

        <div className="species-gallery-toolbar">
          <span aria-live="polite">{countLabel}</span>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Mostra la fotografia a mida gran"
          >
            <Expand size={17} aria-hidden="true" />
            <span>Amplia</span>
          </button>
        </div>

        {multipleImages && (
          <>
            <button
              className="species-gallery-arrow previous"
              type="button"
              onClick={showPrevious}
              aria-label="Fotografia anterior"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button
              className="species-gallery-arrow next"
              type="button"
              onClick={showNext}
              aria-label="Fotografia següent"
            >
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </>
        )}

        <div className="species-gallery-caption">
          <p>
            <i>{speciesName}</i> · foto de{" "}
            <a
              href={activeImage.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={activeImage.license}
            >
              {activeImage.attribution}
            </a>
          </p>
          <span>{activeImage.license} · imatge orientativa; verifica tots els trets</span>
        </div>
      </div>

      {multipleImages && (
        <div className="species-gallery-thumbnails" aria-label="Trieu una fotografia">
          {images.map((asset, index) => (
            <button
              className={index === activeIndex ? "active" : undefined}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Mostra la fotografia ${index + 1} de ${images.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              key={asset.id}
            >
              <Image
                src={imageSource(asset)}
                alt=""
                fill
                sizes="72px"
              />
            </button>
          ))}
        </div>
      )}

      <dialog
        className="species-lightbox"
        ref={dialogRef}
        onCancel={() => setLightboxOpen(false)}
        onClose={() => setLightboxOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setLightboxOpen(false);
        }}
        aria-label={`Fotografies ampliades de ${speciesName}`}
      >
        {lightboxOpen && (
          <div className="species-lightbox-content">
            <div className="species-lightbox-image">
              <Image
                src={imageSource(activeImage)}
                alt={activeImage.alt}
                fill
                sizes="100vw"
              />
            </div>
            <div className="species-lightbox-caption">
              <p>
                <i>{speciesName}</i> · {countLabel}
              </p>
              <a
                href={activeImage.sourceUrl}
                target="_blank"
                rel="noreferrer"
                title={activeImage.license}
              >
                {activeImage.attribution} · {activeImage.license}
              </a>
            </div>
            <button
              className="species-lightbox-close"
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Tanca la fotografia ampliada"
            >
              <X size={24} aria-hidden="true" />
            </button>
            {multipleImages && (
              <>
                <button
                  className="species-lightbox-arrow previous"
                  type="button"
                  onClick={showPrevious}
                  aria-label="Fotografia anterior"
                >
                  <ChevronLeft size={32} aria-hidden="true" />
                </button>
                <button
                  className="species-lightbox-arrow next"
                  type="button"
                  onClick={showNext}
                  aria-label="Fotografia següent"
                >
                  <ChevronRight size={32} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
