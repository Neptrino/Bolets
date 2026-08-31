import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { JsonLd } from "@/components/json-ld";
import { MushroomHuntGame } from "@/components/mushroom-hunt-game";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import { speciesProfiles } from "@/data/species";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import type { MushroomGameEntry, MushroomGameTone } from "@/src/lib/mushroom-game";
import { SITE_URL, speciesPath } from "@/src/lib/seo";

const GAME_TITLE = "Joc de buscar bolets: identifica 6 espècies";
const GAME_DESCRIPTION = "Juga a buscar bolets en un bosc il·lustrat. Troba sis espècies de Catalunya, observa’n els detalls i aprèn a identificar-les.";
const GAME_URL = `${SITE_URL}/joc`;
const GAME_SOCIAL_IMAGE = `${GAME_URL}/opengraph-image`;

export const metadata: Metadata = {
  title: GAME_TITLE,
  description: GAME_DESCRIPTION,
  alternates: { canonical: "/joc" },
  openGraph: {
    type: "website",
    locale: "ca_ES",
    url: "/joc",
    title: GAME_TITLE,
    description: GAME_DESCRIPTION,
    images: [{
      url: GAME_SOCIAL_IMAGE,
      width: 1200,
      height: 630,
      alt: "Joc de buscar bolets al bosc de Bolets Atles",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: GAME_TITLE,
    description: GAME_DESCRIPTION,
    images: [GAME_SOCIAL_IMAGE],
  },
};

const gamePlan = [
  { id: "boletus-edulis", choices: ["boletus-edulis", "tylopilus-felleus", "rubroboletus-satanas"], specimen: "cep" },
  { id: "lactarius-deliciosus", choices: ["lactarius-sanguifluus", "lactarius-deliciosus", "cantharellus-cibarius"], specimen: "milkcap" },
  { id: "amanita-muscaria", choices: ["amanita-caesarea", "amanita-muscaria", "amanita-phalloides"], specimen: "fly-agaric" },
  { id: "cantharellus-cibarius", choices: ["omphalotus-olearius", "hygrophoropsis-aurantiaca", "cantharellus-cibarius"], specimen: "chanterelle" },
  { id: "amanita-phalloides", choices: ["russula-virescens", "amanita-phalloides", "amanita-caesarea"], specimen: "death-cap" },
  { id: "omphalotus-olearius", choices: ["cantharellus-cibarius", "omphalotus-olearius", "lactarius-deliciosus"], specimen: "cluster" },
  { id: "amanita-caesarea", choices: ["amanita-caesarea", "amanita-muscaria", "amanita-phalloides"], specimen: "royal-amanita" },
  { id: "macrolepiota-procera", choices: ["macrolepiota-procera", "lepiota-brunneoincarnata", "amanita-pantherina"], specimen: "parasol" },
  { id: "coprinus-comatus", choices: ["coprinus-comatus", "amanita-virosa", "macrolepiota-procera"], specimen: "inkcap" },
  { id: "morchella-esculenta", choices: ["morchella-esculenta", "gyromitra-esculenta", "craterellus-cornucopioides"], specimen: "morel" },
  { id: "pleurotus-ostreatus", choices: ["pleurotus-ostreatus", "omphalotus-olearius", "cyclocybe-cylindracea"], specimen: "oyster" },
  { id: "russula-virescens", choices: ["russula-virescens", "amanita-phalloides", "hygrophorus-russula"], specimen: "russula" },
  { id: "craterellus-lutescens", choices: ["craterellus-lutescens", "craterellus-tubaeformis", "cantharellus-cibarius"], specimen: "yellowfoot" },
  { id: "marasmius-oreades", choices: ["marasmius-oreades", "clitocybe-rivulosa", "cyclocybe-cylindracea"], specimen: "fairy-ring" },
  { id: "rubroboletus-satanas", choices: ["rubroboletus-satanas", "boletus-edulis", "tylopilus-felleus"], specimen: "devil-bolete" },
] as const;

function statusTone(status: string): MushroomGameTone {
  if (status === "toxic" || status === "dangerously_toxic") return "danger";
  if (status === "not_recommended" || status === "inedible" || status === "edible_with_conditions") return "caution";
  return "edible";
}

function buildGameEntries(): MushroomGameEntry[] {
  return gamePlan.map((planned) => {
    const species = speciesProfiles.find((candidate) => candidate.speciesId === planned.id);
    if (!species) throw new Error(`Missing game species: ${planned.id}`);

    const image = species.media.find((asset) => asset.identificationReference && asset.localPath)
      ?? species.media.find((asset) => asset.localPath);
    if (!image?.localPath) throw new Error(`Missing local game image: ${planned.id}`);

    return {
      id: species.speciesId,
      name: species.identity.commonName,
      scientificName: species.identity.scientificName,
      description: species.identity.shortDescription,
      habitat: species.ecologicalConfig.habitat.forestTypes[0],
      features: species.morphology.keyFeatures.slice(0, 3),
      image: {
        src: image.localPath,
        alt: image.alt,
        attribution: image.attribution,
        license: image.license,
        sourceUrl: image.sourceUrl,
      },
      statusLabel: getEdibilityPresentation(species.identity.edibility).label,
      statusTone: statusTone(species.identity.edibility),
      choices: planned.choices.map((choiceId) => {
        const choice = catalogueSpecies.find((candidate) => candidate.speciesId === choiceId);
        if (!choice) throw new Error(`Missing game choice: ${choiceId}`);
        return { id: choice.speciesId, label: choice.identity.commonName };
      }),
      specimen: planned.specimen,
    };
  });
}

export default function MushroomGamePage() {
  const entries = buildGameEntries();

  return (
    <PageShell>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebApplication",
            "@id": `${GAME_URL}#game`,
            name: "Joc de buscar bolets",
            description: GAME_DESCRIPTION,
            url: GAME_URL,
            image: GAME_SOCIAL_IMAGE,
            inLanguage: "ca",
            applicationCategory: "GameApplication",
            operatingSystem: "Qualsevol sistema amb navegador web",
            isAccessibleForFree: true,
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: entries.map((entry) => ({
              "@type": "Taxon",
              name: entry.scientificName,
              alternateName: entry.name,
              url: `${SITE_URL}${speciesPath({ speciesId: entry.id })}`,
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Joc de buscar bolets", item: GAME_URL },
            ],
          },
        ],
      }} />
      <PageHeader
        eyebrow="El bosc secret · 5 minuts"
        title={<>Joc de buscar <PageTitleAccent>bolets</PageTitleAccent></>}
        description="Explora una clariana il·lustrada, troba sis espècies reals i completa el quadern. Cada partida combina bolets diferents."
        layout="split"
        tone="forest"
      />
      <MushroomHuntGame entries={entries} />
      <section className="mushroom-game-guide" aria-labelledby="mushroom-game-guide-title">
        <SectionHeader
          meta="Guia del joc"
          title={`${entries.length} bolets de Catalunya per aprendre a reconèixer`}
          titleId="mushroom-game-guide-title"
          description="Cada partida n’amaga sis a l’atzar. Observa el barret, les làmines, el peu i l’hàbitat; després consulta les fitxes completes de totes les espècies del joc."
        />
        <nav aria-label="Fitxes dels bolets que apareixen al joc">
          <ol className="mushroom-game-species-links">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <Link href={speciesPath({ speciesId: entry.id })}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{entry.name}</strong>
                    <small>{entry.scientificName}</small>
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <p className="mushroom-game-guide-footer">
          Vols continuar explorant? <Link href="/bolets">Consulta totes les fitxes de bolets de Catalunya <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </p>
      </section>
    </PageShell>
  );
}
