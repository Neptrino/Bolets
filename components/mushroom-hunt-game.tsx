"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Camera,
  Check,
  Compass,
  Leaf,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";

import { StaticMediaImage } from "@/components/static-media-image";
import { ForestBackdrop, MushroomSpecimen } from "@/components/mushroom-game-illustrations";
import { MushroomGameForestArt } from "@/components/mushroom-game-forest-art";
import {
  MUSHROOM_GAME_SIZE,
  rankForScore,
  selectMushroomRound,
  scoreForAttempt,
  type MushroomGameEntry,
} from "@/src/lib/mushroom-game";

type Feedback = {
  kind: "correct" | "incorrect";
  message: string;
};

type Celebration = {
  key: number;
  name: string;
  points: number;
};

type MushroomHuntGameProps = {
  entries: MushroomGameEntry[];
};

type HotspotStyle = CSSProperties & {
  "--spot-x": string;
  "--spot-y": string;
};

type SporeStyle = CSSProperties & {
  "--delay": string;
  "--drift": string;
  "--duration"?: string;
  "--spore-x"?: string;
  "--spore-y"?: string;
  "--start-x"?: string;
};

const CORRECT_SPORES = Array.from({ length: 24 }, (_, index): SporeStyle => {
  const angle = (Math.PI * 2 * index) / 24;
  const distance = 130 + (index % 5) * 23;
  return {
    "--delay": `${(index % 4) * 0.035}s`,
    "--drift": `${index * 29}deg`,
    "--spore-x": `${Math.cos(angle) * distance}px`,
    "--spore-y": `${Math.sin(angle) * distance}px`,
  };
});

const FINALE_SPORES = Array.from({ length: 38 }, (_, index): SporeStyle => ({
  "--delay": `${(index % 13) * -0.27}s`,
  "--drift": `${((index * 37) % 120) - 60}px`,
  "--duration": `${3.8 + (index % 7) * 0.38}s`,
  "--start-x": `${(index * 47) % 101}%`,
}));

export function MushroomHuntGame({ entries }: MushroomHuntGameProps) {
  const [started, setStarted] = useState(false);
  const [roundChosen, setRoundChosen] = useState(false);
  const [roundEntries, setRoundEntries] = useState(() =>
    selectMushroomRound(entries, [], () => 0.999999),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [identified, setIdentified] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const activeEntry = useMemo(
    () => roundEntries.find((entry) => entry.id === activeId) ?? null,
    [activeId, roundEntries],
  );
  const isComplete = identified.length === MUSHROOM_GAME_SIZE;

  useEffect(() => {
    if (!started) return;

    const mobileViewport = window.matchMedia("(max-width: 680px)");
    const previousOverflow = document.body.style.overflow;
    const updateScrollLock = () => {
      document.body.style.overflow = mobileViewport.matches ? "hidden" : previousOverflow;
    };

    updateScrollLock();
    mobileViewport.addEventListener("change", updateScrollLock);
    return () => {
      mobileViewport.removeEventListener("change", updateScrollLock);
      document.body.style.overflow = previousOverflow;
    };
  }, [started]);

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 1700);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  const closeObservation = useCallback(() => {
    setActiveId(null);
    setFeedback(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!activeEntry) return;

    panelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeObservation();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activeEntry, closeObservation]);

  function openObservation(entryId: string, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setFeedback(null);
    setActiveId(entryId);
  }

  function identify(choiceId: string) {
    if (!activeEntry || identified.includes(activeEntry.id)) return;

    const nextAttempt = (attempts[activeEntry.id] ?? 0) + 1;
    setAttempts((current) => ({ ...current, [activeEntry.id]: nextAttempt }));

    if (choiceId !== activeEntry.id) {
      setFeedback({
        kind: "incorrect",
        message: "No acaba d’encaixar. Torna a mirar la forma, l’himeni i el lloc on creix.",
      });
      return;
    }

    const earnedPoints = scoreForAttempt(nextAttempt);
    setIdentified((current) => [...current, activeEntry.id]);
    setScore((current) => current + earnedPoints);
    setCelebration({ key: identified.length + 1, name: activeEntry.name, points: earnedPoints });
    setFeedback({
      kind: "correct",
      message: `Identificació encertada: ${activeEntry.name}. La fotografia ja és al quadern.`,
    });
  }

  function resetGame() {
    setRoundEntries((current) => selectMushroomRound(entries, current.map((entry) => entry.id)));
    setRoundChosen(true);
    setStarted(true);
    setActiveId(null);
    setIdentified([]);
    setAttempts({});
    setScore(0);
    setFeedback(null);
    setCelebration(null);
  }

  function startGame() {
    if (!roundChosen) {
      setRoundEntries(selectMushroomRound(entries));
      setRoundChosen(true);
    }
    setStarted(true);
  }

  function leaveGame() {
    setStarted(false);
    setActiveId(null);
    setFeedback(null);
    setCelebration(null);
  }

  return (
    <section className="mushroom-game" data-active={started ? "true" : "false"} aria-label="Joc de fotografia de bolets">
      <header className="mushroom-game-toolbar">
        {started ? (
          <button type="button" className="mushroom-game-mobile-exit" onClick={leaveGame}>
            <X size={18} aria-hidden="true" /> <span>Sortir</span>
          </button>
        ) : null}
        <div className="mushroom-game-location">
          <Compass size={18} aria-hidden="true" />
          <span><strong>Bosc de la molsa</strong><small>Itinerari fictici · cap ubicació real</small></span>
        </div>
        <dl className="mushroom-game-stats" aria-live="polite">
          <div><dt>Quadern</dt><dd>{identified.length}/{MUSHROOM_GAME_SIZE}</dd></div>
          <div className={celebration ? "is-popping" : undefined}><dt>Punts</dt><dd>{score}</dd></div>
        </dl>
      </header>

      <div
        className="mushroom-game-stage"
        data-started={started ? "true" : "false"}
        data-celebrating={celebration ? "true" : "false"}
        data-complete={started && isComplete && !activeEntry ? "true" : "false"}
      >
        <MushroomGameForestArt />
        <ForestBackdrop />

        <div className="mushroom-game-hotspots" aria-label="Clariana per explorar">
          {roundEntries.map((entry, index) => {
            const found = identified.includes(entry.id);
            const style: HotspotStyle = {
              "--spot-x": `${entry.position.x}%`,
              "--spot-y": `${entry.position.y}%`,
            };
            return (
              <button
                key={entry.id}
                type="button"
                className={`mushroom-game-hotspot specimen-${entry.specimen}`}
                style={style}
                data-found={found ? "true" : "false"}
                aria-label={found ? `${entry.name}, fotografiat. Obrir el quadern.` : `Indici ${index + 1}: observar bolet`}
                onClick={(event) => openObservation(entry.id, event.currentTarget)}
              >
                <span className="mushroom-game-pulse" aria-hidden="true" />
                <MushroomSpecimen kind={entry.specimen} />
                <span className="mushroom-game-found-mark" aria-hidden="true"><Check size={14} /></span>
              </button>
            );
          })}
        </div>

        {!started ? (
          <div className="mushroom-game-briefing">
            <p className="mushroom-game-kicker"><Sparkles size={15} aria-hidden="true" /> Missió de camp</p>
            <h2>El bosc amaga<br /><em>sis mirades.</em></h2>
            <p>Troba els bolets entre la molsa, fotografia’ls i identifica’ls a partir dels detalls de la guia.</p>
            <ul>
              <li><Search size={17} aria-hidden="true" /> Explora tota la clariana</li>
              <li><Camera size={17} aria-hidden="true" /> Fotografia sense collir</li>
              <li><BookOpen size={17} aria-hidden="true" /> Completa el quadern</li>
            </ul>
            <button type="button" className="mushroom-game-primary" onClick={startGame}>
              {isComplete ? "Veure el resultat" : identified.length > 0 ? "Reprendre la ruta" : "Entrar al bosc"} <Leaf size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {activeEntry ? (
          <div className="mushroom-game-observation-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeObservation();
          }}>
            <div
              ref={panelRef}
              className="mushroom-game-observation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mushroom-observation-title"
              tabIndex={-1}
            >
              <button type="button" className="mushroom-game-close" onClick={closeObservation} aria-label="Tancar l’observació">
                <X size={20} aria-hidden="true" />
              </button>
              <div className="mushroom-game-photo">
                <StaticMediaImage
                  src={activeEntry.image.src}
                  alt={activeEntry.image.alt}
                  fill
                  loading="eager"
                  sizes="(max-width: 760px) 92vw, 440px"
                />
                <span><Camera size={14} aria-hidden="true" /> Observació {roundEntries.findIndex((entry) => entry.id === activeEntry.id) + 1}</span>
              </div>
              <div className="mushroom-game-observation-copy">
                {identified.includes(activeEntry.id) ? (
                  <>
                    <p className="mushroom-game-kicker"><Check size={15} aria-hidden="true" /> Al quadern</p>
                    <h2 id="mushroom-observation-title">{activeEntry.name}</h2>
                    <p className="mushroom-game-scientific">{activeEntry.scientificName}</p>
                    <p>{activeEntry.description}</p>
                    <div className={`mushroom-game-status status-${activeEntry.statusTone}`}>
                      <TriangleAlert size={17} aria-hidden="true" /> {activeEntry.statusLabel}
                    </div>
                    <dl className="mushroom-game-field-notes">
                      <div><dt>Hàbitat</dt><dd>{activeEntry.habitat}</dd></div>
                      <div><dt>Clau</dt><dd>{activeEntry.features[0]}</dd></div>
                    </dl>
                    <button type="button" className="mushroom-game-primary" onClick={closeObservation}>Continuar explorant <Search size={17} aria-hidden="true" /></button>
                  </>
                ) : (
                  <>
                    <p className="mushroom-game-kicker"><Search size={15} aria-hidden="true" /> Mira de prop</p>
                    <h2 id="mushroom-observation-title">Quin bolet és?</h2>
                    <p>Contrasta tots els indicis abans de decidir.</p>
                    <ul className="mushroom-game-clues">
                      {activeEntry.features.map((feature) => <li key={feature}><span aria-hidden="true" />{feature}</li>)}
                      <li><span aria-hidden="true" />Hàbitat habitual: {activeEntry.habitat}</li>
                    </ul>
                    <div className="mushroom-game-choices">
                      {activeEntry.choices.map((choice) => (
                        <button key={choice.id} type="button" onClick={() => identify(choice.id)}>{choice.label}</button>
                      ))}
                    </div>
                    {feedback ? <p className={`mushroom-game-feedback feedback-${feedback.kind}`} role="status">{feedback.kind === "correct" ? <Check size={17} aria-hidden="true" /> : <Leaf size={17} aria-hidden="true" />}{feedback.message}</p> : null}
                  </>
                )}
                <p className="mushroom-game-credit">Foto: <a href={activeEntry.image.sourceUrl} target="_blank" rel="noreferrer">{activeEntry.image.attribution}</a> · {activeEntry.image.license}</p>
              </div>
            </div>
          </div>
        ) : null}

        {celebration ? (
          <div key={celebration.key} className="mushroom-game-correct-celebration" aria-live="polite">
            <div className="mushroom-game-correct-rays" aria-hidden="true" />
            <div className="mushroom-game-correct-spores" aria-hidden="true">
              {CORRECT_SPORES.map((style, index) => <i key={index} style={style} />)}
            </div>
            <div className="mushroom-game-correct-emblem">
              <span><Check size={28} strokeWidth={3} aria-hidden="true" /></span>
              <strong>Ben vist!</strong>
              <small>{celebration.name}</small>
              <b>+{celebration.points}</b>
            </div>
          </div>
        ) : null}

        {started && isComplete && !activeEntry ? (
          <>
            <div className="mushroom-game-finale-effects" aria-hidden="true">
              <div className="mushroom-game-finale-rays"><i /><i /><i /><i /><i /></div>
              <div className="mushroom-game-finale-spores">
                {FINALE_SPORES.map((style, index) => <i key={index} style={style} />)}
              </div>
              <div className="mushroom-game-fireflies"><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="mushroom-game-complete" role="status">
              <span className="mushroom-game-complete-icon"><Sparkles size={25} aria-hidden="true" /></span>
              <p className="mushroom-game-kicker">Quadern complet</p>
              <h2>{rankForScore(score, MUSHROOM_GAME_SIZE)}</h2>
              <p>Has fotografiat les {MUSHROOM_GAME_SIZE} espècies i has acabat amb <strong>{score} punts</strong>.</p>
              <button type="button" className="mushroom-game-primary" onClick={resetGame}>Tornar-hi <RotateCcw size={17} aria-hidden="true" /></button>
            </div>
          </>
        ) : null}
      </div>

    </section>
  );
}
