import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/src/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · Mapa de bolets de Catalunya`,
    short_name: SITE_NAME,
    description:
      "Consulta el mapa de condicions per a la fructificació de bolets a Catalunya i desa una zona per consultar-la sense cobertura.",
    lang: "ca",
    // The map is the reason to install; opening on the home page would make
    // every launch an extra tap away from it.
    start_url: "/map",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2ebd5",
    theme_color: "#3b3b3b",
    categories: ["navigation", "utilities", "education"],
    shortcuts: [
      { name: "Anota una troballa", short_name: "Nova troballa", url: "/troballes/nova", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Les meves troballes", short_name: "El meu quadern", url: "/compte/troballes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
