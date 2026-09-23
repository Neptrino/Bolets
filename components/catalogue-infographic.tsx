import "@/app/styles/catalogue-infographic.css";
import { Expand, Images, ShieldAlert } from "lucide-react";
import { InfographicActions } from "@/components/infographic-actions";
import { StaticMediaImage } from "@/components/static-media-image";

const posterPath = "/downloads/infografies/bolets-catalunya-infografia.png";
const creditsPath = "/downloads/infografies/bolets-catalunya-infografia-credits.txt";
const previewPath = "/media/editorial/bolets-catalunya-infografia.webp";
const pdfPath = "/downloads/infografies/bolets-catalunya-infografia.pdf";

export function CatalogueInfographic({ speciesCount }: { speciesCount: number }) {
  return (
    <section
      id="infografia"
      className="panel-dark catalogue-infographic"
      aria-labelledby="catalogue-infographic-title"
    >
      <figure className="catalogue-infographic-preview">
        <a
          className="catalogue-infographic-zoom"
          href={previewPath}
          target="_blank"
          rel="noreferrer"
          aria-label="Obre el pòster a mida completa en una pestanya nova"
        >
          <StaticMediaImage
            src={previewPath}
            alt={`Infografia vertical “Bolets de Catalunya” amb ${speciesCount} espècies fotografiades i agrupades per comestibilitat; cada targeta mostra el nom català i científic, els millors mesos, l’hàbitat i l’altitud.`}
            width={3508}
            height={4961}
            sizes="(max-width: 900px) calc(100vw - 64px), 430px"
          />
          <span className="pill catalogue-infographic-zoom-hint" aria-hidden="true">
            <Expand size={15} /> Amplia
          </span>
        </a>
        <figcaption>Infografia dels tipus de bolets de Catalunya: {speciesCount} espècies amb temporada, hàbitat i altitud · pòster A3</figcaption>
      </figure>

      <div className="catalogue-infographic-copy">
        <p className="eyebrow"><Images size={16} aria-hidden="true" /> Catàleg visual de bolets</p>
        <h2 id="catalogue-infographic-title">Tots els bolets de Catalunya, en un sol pòster.</h2>
        <p>
          Una vista ràpida del catàleg per comparar fotografies, noms, temporada,
          hàbitat i altitud dels bolets de Catalunya. Les espècies estan agrupades
          per comestibilitat i el contingut es genera des de les mateixes dades
          versionades de les fitxes.
        </p>

        <ul className="catalogue-infographic-facts" aria-label="Contingut del pòster">
          <li><strong>{speciesCount}</strong><span>bolets</span></li>
          <li><strong>12</strong><span>mesos</span></li>
          <li><strong>A3</strong><span>PNG i PDF</span></li>
        </ul>

        <InfographicActions posterPath={posterPath} pdfPath={pdfPath} />

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
