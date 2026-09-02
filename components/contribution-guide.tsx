import { ArrowRight, Camera, NotebookPen } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";

const ways = [
  {
    icon: Camera,
    title: "Troballes i fotografies",
    copy: "Comparteix una troballa útil amb fotografies públiques adequades o una imatge que puguem reutilitzar.",
  },
  {
    icon: NotebookPen,
    title: "Catàleg amb fonts",
    copy: "Assenyala i documenta una correcció concreta d’una fitxa o d’un contingut del catàleg.",
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
    access: "Amb accés",
    description: "Més detall per entendre el bosc del voltant.",
  },
  {
    resolution: "250",
    distance: "250 m",
    access: "Amb més zoom",
    description: "La quadrícula més fina disponible al mapa.",
  },
] as const;

export function ContributionGuide() {
  return (
    <div className="contribution-guide">
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

      <section className="contribution-explainer" aria-labelledby="contribution-how-title">
        <SectionHeader
          meta="Una contribució, una revisió humana"
          title="Com funciona"
          titleId="contribution-how-title"
          description="No hi ha punts, rànquings ni pagaments. L’accés reconeix feina concreta que fa el projecte més útil."
        />
        <div className="contribution-steps">
          <div><span>1</span><strong>Proposa</strong><p>Descriu què aportes i adjunta un enllaç si ajuda a comprovar-ho.</p></div>
          <div><span>2</span><strong>Revisem</strong><p>Comprovem que sigui original, verificable i prou útil per incorporar-la.</p></div>
          <div><span>3</span><strong>Obrim el detall</strong><p>L’aprovació afegeix 90 dies des de la data de caducitat vigent o des d’avui.</p></div>
        </div>
      </section>

      <section aria-labelledby="contribution-ways-title">
        <SectionHeader title="Maneres de contribuir" titleId="contribution-ways-title" />
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
