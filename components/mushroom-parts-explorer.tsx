"use client";

import { useState, type CSSProperties } from "react";
import { ScanLine, ShieldAlert, X } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { StaticMediaImage } from "@/components/static-media-image";

const parts = [
  {
    id: "barret",
    label: "Barret",
    context: "Cos fructífer",
    description: "És la part superior del bolet i pot canviar molt de forma a mesura que madura.",
    observations: ["Forma, marge i superfície", "Color i possibles restes de vel"],
    x: 35.5,
    y: 17.3,
  },
  {
    id: "carn",
    label: "Carn",
    context: "Teixit interior",
    description: "La carn interior pot ser compacta, fibrosa, fràgil o gelatinosa segons l’espècie.",
    observations: ["Consistència i textura", "Canvis en tallar o pressionar"],
    x: 59.2,
    y: 19.8,
  },
  {
    id: "himeni",
    label: "Himeni",
    context: "Superfície fèrtil",
    description: "Es troba sota el barret i és on es formen les espores. No sempre presenta làmines.",
    observations: ["Làmines, porus, agulletes o plecs", "Unió amb el peu, color i reaccions"],
    x: 32.5,
    y: 25.7,
  },
  {
    id: "espores",
    label: "Espores",
    context: "Reproducció",
    description: "S’alliberen des de l’himeni. El color de l’esporada pot ajudar en una identificació experta.",
    observations: ["Color de l’esporada", "Observació controlada del dipòsit"],
    x: 66,
    y: 33.2,
  },
  {
    id: "anell",
    label: "Anell",
    context: "Resta de vel",
    description: "És una estructura que queda al voltant del peu en algunes espècies; moltes altres no en tenen.",
    observations: ["Forma i persistència", "Posició al llarg del peu"],
    x: 41.2,
    y: 39.2,
  },
  {
    id: "peu",
    label: "Peu",
    context: "Suport del barret",
    description: "Sosté el barret en moltes espècies i aporta trets útils quan se n’observa tota la longitud.",
    observations: ["Posició, gruix i textura", "Fibres, reticle, buit o massís"],
    x: 43.4,
    y: 44.6,
  },
  {
    id: "volva",
    label: "Volva i base",
    context: "Extrem inferior",
    description: "La volva és una beina o copa a la base. Pot quedar enterrada i desaparèixer de la descripció.",
    observations: ["Base sencera i sense terra", "Beina, copa, restes o bulb"],
    x: 35.7,
    y: 57.1,
  },
  {
    id: "miceli",
    label: "Miceli",
    context: "Sota el substrat",
    description: "És la xarxa de filaments que viu al sòl, a la fusta o vinculada a les arrels.",
    observations: ["Substrat i arbre associat", "Cos vegetatiu, diferent del bolet visible"],
    x: 45,
    y: 72.6,
  },
] as const;

type PartId = (typeof parts)[number]["id"];

export function MushroomPartsExplorer() {
  const [activePartId, setActivePartId] = useState<PartId>("barret");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const activeIndex = parts.findIndex((part) => part.id === activePartId);
  const activePart = parts[activeIndex] ?? parts[0];

  function selectPart(partId: PartId, revealMobileDetail = false) {
    setActivePartId(partId);
    if (revealMobileDetail) setIsMobileDetailOpen(true);
  }

  return (
    <section
      className="mushroom-parts-explorer seo-guide-section"
      aria-labelledby="mushroom-parts-explorer-title"
    >
      <SectionHeader
        meta={<><ScanLine size={16} aria-hidden="true" /> Làmina interactiva</>}
        title="Explora l’anatomia del bolet"
        titleId="mushroom-parts-explorer-title"
        description="Selecciona els punts de la il·lustració per saber què és cada estructura i què convé observar-ne."
      />

      <div className="mushroom-parts-explorer-layout">
        <figure className="mushroom-parts-figure">
          <div className="mushroom-parts-canvas" role="group" aria-label="Parts assenyalades del bolet">
            <StaticMediaImage
              src="/media/editorial/parts-dun-bolet-infografia-v2.webp"
              alt="Infografia anatòmica d’un bolet en tall, amb barret, carn, himeni, espores, anell, peu, volva, base i miceli; també compara làmines, porus, agulletes i plecs."
              width={1024}
              height={1536}
              sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1080px) 58vw, 600px"
            />
            {parts.map((part, index) => {
              const isActive = part.id === activePart.id;
              const position = {
                "--marker-x": `${part.x}%`,
                "--marker-y": `${part.y}%`,
              } as CSSProperties;

              return (
                <button
                  key={part.id}
                  type="button"
                  className="mushroom-part-marker"
                  style={position}
                  aria-pressed={isActive}
                  aria-controls="mushroom-part-detail mushroom-part-mobile-detail"
                  onClick={() => selectPart(part.id, true)}
                  onFocus={() => selectPart(part.id)}
                  onPointerEnter={() => selectPart(part.id)}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  <span className="visually-hidden">{index + 1}. Mostra: {part.label}</span>
                </button>
              );
            })}
          </div>
          <figcaption>Toca un número o recorre els noms per explorar la làmina.</figcaption>
        </figure>

        <div className="mushroom-parts-guide">
          <article id="mushroom-part-detail" className="mushroom-part-detail" aria-live="polite">
            <div className="mushroom-part-detail-number" aria-hidden="true">
              {String(activeIndex + 1).padStart(2, "0")}
            </div>
            <div className="mushroom-part-detail-copy">
              <p>{activePart.context}</p>
              <h3>{activePart.label}</h3>
              <p>{activePart.description}</p>
              <div className="mushroom-part-observations">
                <span>Què observar</span>
                <ul>
                  {activePart.observations.map((observation) => (
                    <li key={observation}>{observation}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <ol className="mushroom-parts-index" aria-label="Recorregut per les parts del bolet">
            {parts.map((part, index) => (
              <li key={part.id}>
                <button
                  type="button"
                  aria-pressed={part.id === activePart.id}
                  aria-controls="mushroom-part-detail mushroom-part-mobile-detail"
                  onClick={() => selectPart(part.id, true)}
                >
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {part.label}
                </button>
              </li>
            ))}
          </ol>

          <div className="mushroom-parts-explorer-safety">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>Cap d’aquests trets, per si sol, confirma l’espècie ni la comestibilitat.</p>
          </div>
        </div>

        <aside
          id="mushroom-part-mobile-detail"
          className="mushroom-part-mobile-detail"
          data-open={isMobileDetailOpen ? "true" : "false"}
          aria-live="polite"
          aria-label={`Detall: ${activePart.label}`}
        >
          <button
            type="button"
            className="mushroom-part-mobile-detail-close"
            aria-label="Tanca el detall"
            onClick={() => setIsMobileDetailOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <p>{activePart.context}</p>
          <h3>{activePart.label}</h3>
          <p>{activePart.description}</p>
          <ul>
            {activePart.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
