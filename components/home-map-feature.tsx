import "@/app/styles/home-map-feature.css";
import { IntentLink as Link } from "@/components/intent-link";
import { ArrowUpRight, Map } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";
import { UmamiEventLink } from "@/components/umami-event-link";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

export function HomeMapFeature() {
  return (
    <div className="home-map-feature page-width">
      <section className="home-map-feature-copy" aria-labelledby="home-map-title">
        <p className="eyebrow"><Map size={16} aria-hidden="true" /> Prepara la sortida</p>
        <h2 id="home-map-title">Mapa de bolets de Catalunya</h2>
        <p>Compara les condicions per espècie, zona i dia abans de sortir al bosc. El color descriu condicions favorables, no llocs on s’hagin trobat bolets.</p>
        <ol className="home-map-steps">
          <li><span><strong>Tria una espècie</strong> o mira quina destaca a cada sector.</span></li>
          <li><span><strong>Compara zones</strong> i acosta’t al territori que t’interessa.</span></li>
          <li><span><strong>Obre el detall d’un sector</strong> per veure l’evolució recent i la projecció dels pròxims dies.</span></li>
        </ol>
        <UmamiEventLink href="/map" className="button" analyticsEvent={UMAMI_EVENTS.homepageMapSectionClick}>
          Obrir el mapa <Map size={18} aria-hidden="true" />
        </UmamiEventLink>
      </section>
      <UmamiEventLink href="/map" className="home-map-preview" analyticsEvent={UMAMI_EVENTS.homepageMapSectionClick} aria-label="Obrir el mapa de bolets de Catalunya">
        <StaticMediaImage
          src="/media/editorial/home-map-simulated.webp"
          alt="Exemple del mapa de bolets de Catalunya amb condicions simulades per sector"
          width={1100}
          height={800}
          sizes="(max-width: 1000px) calc(100vw - 48px), (max-width: 1228px) calc((100vw - 48px) / 2), 590px"
        />
        <span className="home-map-preview-label">Exemple simulat</span>
      </UmamiEventLink>
      <section className="home-map-today" aria-labelledby="home-today-title">
        <div>
          <p className="eyebrow light">Resum diari</p>
          <h2 id="home-today-title">On trobar bolets avui</h2>
          <p>Les zones que destaquen avui per a les espècies comestibles de temporada: la classificació per territori, el mapa combinat i l’evolució dels darrers dies.</p>
        </div>
        <Link href="/bolets-avui" className="button light-button">Consulta on trobar bolets avui <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
