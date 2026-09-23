import { DEFAULT_DESCRIPTION, SITE_ALTERNATE_NAMES, SITE_NAME, SITE_URL } from "@/src/lib/seo";

/**
 * The site installs as a web app (see app/manifest.ts); this entity lets
 * search and AI answers connect «app bolets de catalunya» and «bolets app»
 * to it. Keep the claims to what the installed app actually does.
 */
export function homeAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    alternateName: [...SITE_ALTERNATE_NAMES, "Bolets de Catalunya", "App de bolets de Catalunya"],
    description: `${DEFAULT_DESCRIPTION} Funciona com a app al mòbil i desa les troballes encara que no hi hagi cobertura.`,
    url: SITE_URL,
    installUrl: `${SITE_URL}/map`,
    image: `${SITE_URL}/icons/icon-512.png`,
    inLanguage: "ca",
    applicationCategory: "ReferenceApplication",
    operatingSystem: "Qualsevol sistema amb navegador web",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    featureList: [
      "Mapa de predicció de bolets a Catalunya",
      "Fitxes d’espècies amb fotografies, hàbitat i temporada",
      "Quadern de camp per anotar troballes sense cobertura",
      "Mapa públic de troballes en àrees de 10 × 10 km",
    ],
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
