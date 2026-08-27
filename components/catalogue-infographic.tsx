import { Download, ExternalLink, Images, ShieldAlert } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";

const posterPath = "/downloads/infografies/bolets-catalunya-infografia.png";
const creditsPath = "/downloads/infografies/bolets-catalunya-infografia-credits.txt";

export function CatalogueInfographic({ speciesCount }: { speciesCount: number }) {
  return (
    <section
      id="infografia"
      className="catalogue-infographic"
      aria-labelledby="catalogue-infographic-title"
    >
      <figure className="catalogue-infographic-preview">
        <StaticMediaImage
          src="/media/editorial/bolets-catalunya-infografia.webp"
          alt={`Infografia vertical “Bolets de Catalunya” amb ${speciesCount} espècies fotografiades i agrupades per comestibilitat; cada targeta mostra el nom català i científic, els millors mesos, l’hàbitat i l’altitud.`}
          width={3508}
          height={4961}
          sizes="(max-width: 900px) calc(100vw - 64px), 430px"
        />
        <figcaption>Pòster A3 · 3508 × 4961 px</figcaption>
      </figure>

      <div className="catalogue-infographic-copy">
        <p className="eyebrow"><Images size={16} aria-hidden="true" /> Catàleg visual</p>
        <h2 id="catalogue-infographic-title">Totes les espècies, en un sol pòster.</h2>
        <p>
          Una vista ràpida del catàleg per comparar fotografies, noms, temporada,
          hàbitat i altitud. Les espècies estan agrupades per comestibilitat i el
          contingut es genera des de les mateixes dades versionades de les fitxes.
        </p>

        <ul className="catalogue-infographic-facts" aria-label="Contingut del pòster">
          <li><strong>{speciesCount}</strong><span>espècies</span></li>
          <li><strong>12</strong><span>mesos</span></li>
          <li><strong>A3</strong><span>alta resolució</span></li>
        </ul>

        <div className="catalogue-infographic-actions">
          <a className="button light-button" href={posterPath} download>
            <Download size={17} aria-hidden="true" /> Baixar el pòster PNG
          </a>
          <a className="text-link" href={posterPath} target="_blank" rel="noreferrer">
            Veure a mida completa <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="catalogue-infographic-safety">
          <ShieldAlert size={18} aria-hidden="true" />
          <p>El pòster serveix per explorar el catàleg; no confirma la identificació ni la comestibilitat d’un exemplar.</p>
        </div>
        <a className="catalogue-infographic-credits" href={creditsPath}>
          Crèdits i llicències de les fotografies
        </a>
      </div>
    </section>
  );
}
