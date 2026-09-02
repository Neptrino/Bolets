import { ArrowRight, Camera, MapPinned, NotebookPen } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";

const ways = [
  {
    icon: MapPinned,
    title: "Troballa pública",
    copy: "Publica una troballa amb foto des del quadern i obre els sectors d’1 km durant 7 dies, sense revisió.",
  },
  {
    icon: NotebookPen,
    title: "Catàleg amb fonts",
    copy: "Documenta una correcció concreta. Si l’aprovem, obre els sectors d’1 km i 250 m durant 30 dies.",
  },
  {
    icon: Camera,
    title: "Fotografies reutilitzables",
    copy: "Comparteix imatges amb permís de reutilització. Si les aprovem, obren tot el detall durant 30 dies.",
  },
];

const mapResolutions = [
  {
    resolution: "2500",
    distance: "2,5 km",
    access: "Mapa públic",
    description: "Una lectura territorial per comparar zones grans.",
  },
  {
    resolution: "1000",
    distance: "1 km",
    access: "Troballa pública · 7 dies",
    description: "Publica una troballa amb una fotografia pública.",
  },
  {
    resolution: "250",
    distance: "250 m",
    access: "Aportació aprovada · 30 dies",
    description: "La revisió humana obre tot el detall disponible.",
  },
] as const;

export function ContributionGuide({ showResolution = true }: { showResolution?: boolean }) {
  return (
    <div className="contribution-guide">
      {showResolution ? (
        <section className="contribution-resolution" aria-labelledby="contribution-resolution-title">
          <SectionHeader
            meta="La mateixa zona, més detall"
            title="De 2,5 km a 250 m"
            titleId="contribution-resolution-title"
            description="L’aprovació no canvia el model ni la seva certesa: obre quadrats més petits per explorar la mateixa lectura amb més precisió espacial."
          />
          <div className="contribution-resolution-grid">
            {mapResolutions.map(({ resolution, distance, access, description }, index) => (
              <div className="contribution-resolution-stage" key={resolution}>
                <figure data-resolution={resolution}>
                  <div
                    className="contribution-resolution-shot"
                    role="img"
                    aria-label={`Exemple del mapa del Montseny amb sectors de ${distance}`}
                  >
                    <span className="contribution-resolution-cells" aria-hidden="true" />
                    <span className="contribution-resolution-place">Montseny</span>
                    <span className="contribution-resolution-size">{distance}</span>
                  </div>
                  <figcaption>
                    <span>{access}</span>
                    <strong>{distance} × {distance}</strong>
                    <p>{description}</p>
                  </figcaption>
                </figure>
                {index < mapResolutions.length - 1 ? (
                  <ArrowRight className="contribution-resolution-arrow" size={22} aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
          <p className="contribution-resolution-attribution">Exemple visual sobre cartografia de l’ICGC.</p>
        </section>
      ) : null}

      <section className="contribution-explainer" aria-labelledby="contribution-how-title">
        <SectionHeader
          meta="Una contribució, una revisió humana"
          title="Com funciona"
          titleId="contribution-how-title"
          description="Les correccions i els recursos reutilitzables passen una revisió humana. No hi ha punts, rànquings ni pagaments."
        />
        <div className="contribution-steps">
          <div><span>1</span><strong>Proposa</strong><p>Descriu què aportes i adjunta un enllaç si ajuda a comprovar-ho.</p></div>
          <div><span>2</span><strong>Revisem</strong><p>Comprovem que sigui original, verificable i prou útil per incorporar-la.</p></div>
          <div><span>3</span><strong>Obrim tot el detall</strong><p>L’aprovació afegeix 30 dies d’accés als sectors d’1 km i 250 m.</p></div>
        </div>
      </section>

      <section aria-labelledby="contribution-ways-title">
        <SectionHeader title="Dues vies d’accés" titleId="contribution-ways-title" description="Publicar una troballa és una acció directa de 7 dies; enviar una aportació és un flux separat, revisat, de 30 dies." />
        <div className="contribution-way-grid">
          {ways.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <Icon size={22} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
