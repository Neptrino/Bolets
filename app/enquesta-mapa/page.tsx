import type { Metadata } from "next";
import { CloudSun, MapPinned, Sprout } from "lucide-react";
import { IntentLink } from "@/components/intent-link";
import { StaticMediaImage } from "@/components/static-media-image";
import { MapPriceSurvey } from "@/components/map-price-survey";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Enquesta: quin preu tindria el mapa detallat per a tu?",
  description: "Dona’ns la teva opinió sobre una quota anual per als sectors de 250 m i una previsió ampliada a 14 dies. Sense cap cobrament ni compromís.",
  alternates: { canonical: "/enquesta-mapa" },
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function MapPriceSurveyPage() {
  return <PageShell as="article">
    <div className={styles.intro}>
      <PageHeader
        eyebrow="Ajuda’ns a decidir · 1 pregunta"
        title={<>Més detall. <PageTitleAccent>Més dies per triar.</PageTitleAccent></>}
        description="Explora el bosc amb sectors de 250 m i prepara la sortida amb una previsió de 14 dies. Estem valorant una quota anual: quin preu tindria sentit per a tu?"
        tone="forest"
      />
      <div className={styles.response} id="respon"><MapPriceSurvey /></div>
    </div>
    <section className={styles.section} aria-labelledby="resolution-comparison">
      <SectionHeader meta="Què aporta el detall" title="De 2,5 km a 250 m" titleId="resolution-comparison"
        description="100 sectors de 250 m dins d’un sector públic. Explora les diferències dins d’una mateixa zona." />
      <div className={styles.comparison}>
        <figure>
          <StaticMediaImage src="/media/editorial/map-survey/public-2500m.webp" width={1500} height={987}
            sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1230px) calc((100vw - 72px) / 2), 578px"
            alt="Captura de demostració del mapa públic: una superfície suavitzada construïda amb sectors de 2,5 km, sobre la mateixa zona que la captura detallada." />
          <figcaption><strong>Mapa públic · sectors de 2,5 km</strong><p>Compara zones amb una visió general.</p></figcaption>
        </figure>
        <figure>
          <StaticMediaImage src="/media/editorial/map-survey/detail-250m.webp" width={1500} height={987}
            sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1230px) calc((100vw - 72px) / 2), 578px"
            alt="Captura de demostració de la mateixa zona amb sectors de 250 m: quadrícules més petites que permeten consultar el detall local." />
          <figcaption><strong>Mapa detallat · sectors de 250 m</strong><p>Explora el detall local per a cada espècie.</p></figcaption>
        </figure>
      </div>
      <p className={styles.note}>Mateixa zona i escala, amb dades simulades. Més detall espacial no garanteix trobar bolets.</p>
      <p className={styles.attribution}>
        Cartografia base: <a href="https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Servei-de-Mapa-Base" target="_blank" rel="noreferrer">© Institut Cartogràfic i Geològic de Catalunya</a>,
        sota <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · © OpenMapTiles · © OpenStreetMap contributors
      </p>
    </section>
    <section className={styles.section} aria-labelledby="extended-forecast">
      <SectionHeader meta="Proposta de subscripció" title="Previsió ampliada a 14 dies" titleId="extended-forecast" size="compact" />
      <p className={styles.prose}>Dues setmanes per veure com podrien evolucionar les condicions i triar quan sortir. Disponible al gràfic de cada sector amb accés al mapa detallat.</p>
      <figure className={styles.forecast}>
        <StaticMediaImage src="/media/editorial/map-survey/forecast-chart.webp" width={1860} height={626}
          sizes="(max-width: 1230px) calc(100vw - 48px), 1180px"
          alt="Gràfic de demostració de l’evolució recent i la previsió a 14 dies, amb una línia contínua per al passat i discontínua per a la projecció." />
        <figcaption className={styles.note}>Gràfic del visor amb dades de demostració fins a 14 dies. Com més lluny mirem, més incertesa hi ha.</figcaption>
      </figure>
    </section>
    <section className={`${styles.section} ${styles.community}`} aria-labelledby="community-model">
      <SectionHeader
        meta="El mapa també creix amb la comunitat"
        title="Cada col·laboració pot fer-lo més útil"
        titleId="community-model"
        description="El model combina el terreny, l’hàbitat i el temps. Les troballes ens ajuden a comprovar com respon sobre el terreny."
      />
      <div className={styles.communityGrid}>
        <article>
          <CloudSun size={24} aria-hidden="true" />
          <h3>Un model per entendre condicions</h3>
          <p>El mapa interpreta les dades ambientals de cada espècie. No indica on trobaràs bolets: mostra on les condicions poden ser més favorables.</p>
        </article>
        <article>
          <Sprout size={24} aria-hidden="true" />
          <h3>Les troballes ens ajuden a aprendre</h3>
          <p>Les troballes públiques revisades, sempre generalitzades, es poden avaluar amb el temps per millorar futures versions del model.</p>
        </article>
        <article>
          <MapPinned size={24} aria-hidden="true" />
          <h3>Col·laborar també obre detall</h3>
          <p>Una troballa pública que compleixi els requisits, amb foto pública, pot obrir 1 km durant 7 dies, un cop cada 30 dies. Una aportació aprovada obre també 250 m durant 30 dies.</p>
          <IntentLink href="/col-labora" className="text-link">Veure com col·laborar</IntentLink>
        </article>
      </div>
      <p className={styles.note}>Aquestes recompenses de col·laboració són independents de la proposta de subscripció. Les troballes no canvien la predicció del dia ni publiquen ubicacions exactes.</p>
    </section>
    <section className={`${styles.section} ${styles.support}`} aria-labelledby="project-costs">
      <SectionHeader meta="Fet aquí, amb il·lusió" title="Bolets existeix per preparar millor cada sortida" titleId="project-costs" />
      <div className={styles.supportGrid}>
        <div className={styles.supportCopy}>
          <p>Soc l’Aleix. Vaig crear Bolets com un projecte personal per reunir en un mateix lloc informació útil i cuidada sobre els bolets de Catalunya: no només què són, sinó també quan, on i en quines condicions poden aparèixer.</p>
          <p>Vull que serveixi tant per començar a identificar espècies com per planificar una sortida amb més criteri, sense vendre certeses ni revelar llocs sensibles.</p>
        </div>
        <ul className={styles.pillars} aria-label="Què ofereix Bolets">
          <li><strong>Guia d’espècies</strong><span>Fitxes clares per conèixer-les i identificar-les amb prudència.</span></li>
          <li><strong>Guies locals</strong><span>Context de temporada, hàbitat i territori per preparar una sortida.</span></li>
          <li><strong>Model de predicció</strong><span>Una lectura orientativa de les condicions, basada en hàbitat i meteorologia.</span></li>
        </ul>
      </div>
      <p className={styles.supportClose}>Mantenir les dades, els servidors i els càlculs actualitzats té un cost. Una <strong>quota anual</strong> ajudaria a donar continuïtat a aquest treball, mentre que el mapa públic, les fitxes i les opcions de col·laboració continuarien disponibles.</p>
    </section>
    <details className={styles.details}>
      <summary>Què cal saber sobre el detall i la previsió?</summary>
      <p>Els 250 m corresponen als mapes per espècie; el mapa combinat té un límit d’1 km. Una resolució més fina no implica més precisió meteorològica.</p>
      <p>La línia de temps del mapa públic arriba a 5 dies, en sectors de 5 km o més. El gràfic de cada sector ofereix una projecció de fins a 14 dies amb accés al mapa detallat, segons les dades disponibles. La resolució del sector no és la de la meteorologia de base.</p>
    </details>
    <a href="#respon" className="button">Dona la teva opinió</a>
    <nav className={`${styles.context} ${styles.links}`} aria-label="Continua explorant Bolets">
      <IntentLink href="/map" className="button">Explora el mapa públic</IntentLink>
      <IntentLink href="/col-labora" className="text-link">Com funciona la col·laboració</IntentLink>
    </nav>
  </PageShell>;
}
