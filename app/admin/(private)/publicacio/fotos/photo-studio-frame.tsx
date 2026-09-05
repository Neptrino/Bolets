"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./photo-studio.module.css";

export function PhotoStudioFrame() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1600);
  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "bolets-photo-studio-height") return;
      const value = event.data.height;
      if (typeof value === "number" && Number.isFinite(value)) setHeight(Math.max(500, Math.min(6000, value + 16)));
    }
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, []);
  return (
    <iframe
      ref={frame}
      title="Editor de fotos de Bolets"
      src="/admin/publicacio/fotos/editor/index.html"
      className={styles.editor}
      style={{ height }}
      referrerPolicy="no-referrer"
    />
  );
}
