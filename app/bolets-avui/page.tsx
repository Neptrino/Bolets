import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Database, Map, ShieldCheck } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import { loadCurrentOverview } from "@/src/lib/current-overview";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL } from "@/src/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Bolets avui a Catalunya: condicions per espècie i regió",
  description: "Consulta les condicions de fructificació disponibles avui per a sis combinacions representatives d’espècie i regió de Catalunya.",
  alternates: { canonical: "/bolets-avui" },
  openGraph: {
    url: "/bolets-avui",
    title: "Bolets avui a Catalunya",
    description: "Lectura regional de condicions ambientals, amb hora, procedència i nivell de completitud.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const dateTime = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

export default async function MushroomsTodayPage() {
  const items = await loadCurrentOverview();
  const overviewSources = [...new Set(
    items.flatMap((item) => item.summary?.snapshot.source ?? []),
  )];

  return (
    <article className="seo-guide page-width current-overview-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Bolets avui a Catalunya",
        description: metadata.description,
        url: absoluteUrl("/bolets-avui"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("bolets-avui"),
      }} />
      <header className="seo-guide-hero">
        <p className="eyebrow"><Map size={15} /> Actualització cada cinc minuts</p>
        <h1>Bolets avui<br /><i>a Catalunya.</i></h1>
        <p>Una lectura prudent de sis combinacions representatives. La puntuació descriu condicions ambientals i hàbitat compatible: no confirma presència, no publica observacions i no garanteix trobar bolets.</p>
      </header>

      <aside className="current-overview-method">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Només publiquem un resultat quan el model existent el considera prou complet i vigent.</strong> Si falta evidència o una font falla, ho mostrem explícitament.</p>
      </aside>

      <section className="current-overview-grid" aria-label="Condicions actuals per espècie i regió">
        {items.map((item) => (
          <article className={`current-overview-card is-${item.status}`} key={`${item.speciesId}-${item.regionId}`}>
            <div className="current-overview-card-heading"><span>{item.regionName}</span><h2>{item.speciesName}</h2></div>
            {item.status === "available" && item.summary ? (
              <>
                <div className="current-score"><strong>{item.summary.result.score}</strong><span>/ 100<br />{item.summary.result.label}</span></div>
                <dl>
                  <div><dt>Rang central</dt><dd>{item.summary.scoreRange[0]}–{item.summary.scoreRange[1]}</dd></div>
                  <div><dt>Completitud</dt><dd>{Math.round(item.summary.result.dataCompleteness * 100)}%</dd></div>
                  <div><dt>Cel·les valorades</dt><dd>{item.summary.scoredCellCount}</dd></div>
                </dl>
                <p className="current-observed"><Clock3 size={14} /> Observat {dateTime.format(new Date(item.summary.snapshot.observedAt))}</p>
              </>
            ) : (
              <div className="current-unavailable"><strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong><p>{item.status === "unavailable" ? "La consulta ambiental no ha respost. No s’ha calculat cap substitut." : "Les regles de completitud o vigència no permeten publicar una puntuació."}</p></div>
            )}
            <Link href={`/map?species=${item.speciesId}&region=${item.regionId}`} className="text-link">Obrir al mapa <ArrowUpRight size={16} /></Link>
          </article>
        ))}
      </section>
      {overviewSources.length > 0 && (
        <aside className="current-overview-provenance" aria-label="Procedència de les dades">
          <Database size={14} aria-hidden="true" />
          <p><strong>Fonts de les dades:</strong> {overviewSources.join(" · ")}</p>
        </aside>
      )}

      <EditorialAttribution contentId="bolets-avui" sources={environmentalSources} />
    </article>
  );
}
