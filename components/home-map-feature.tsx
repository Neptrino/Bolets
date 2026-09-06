import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";

export function HomeMapFeature() {
  return (
    <section className="home-map-feature page-width" aria-labelledby="home-map-title">
      <div className="home-map-feature-copy">
        <p className="eyebrow"><Gauge size={16} aria-hidden="true" /> Prepara la sortida</p>
        <h2 id="home-map-title">Bolets avui:<br /><i>condicions per territori.</i></h2>
        <p>Consulta les condicions actuals a Catalunya i compara zones i espècies abans de sortir al bosc.</p>
        <Link href="/bolets-avui" className="button">
          Bolets avui <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <Link href="/bolets-avui" className="home-map-preview" aria-label="Consulta Bolets avui: condicions actuals per territori">
        <StaticMediaImage
          src="/media/editorial/home-map-simulated.webp"
          alt="Exemple del mapa d’Avui amb condicions simulades en sectors d’hàbitat compatible de Catalunya"
          width={1100}
          height={800}
          sizes="(max-width: 1000px) calc(100vw - 48px), (max-width: 1228px) calc((100vw - 48px) / 2), 590px"
        />
        <span className="home-map-preview-label">Exemple simulat</span>
      </Link>
    </section>
  );
}
