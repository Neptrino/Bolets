import Link from "next/link";
import { ArrowUpRight, Refrigerator } from "lucide-react";

/* What to do with the basket once you are home. The detail lives on
   /conservar-bolets, which already carries a per-species anchor; this block
   answers the searched questions on the hub itself — netejar, guardar,
   congelar — and hands off rather than repeating that page. */
export interface HandlingStep {
  title: string;
  body: string;
}

export function SpeciesHandlingBlock({
  titleId,
  title,
  intro,
  steps,
  moreHref,
}: {
  titleId: string;
  title: string;
  intro: string;
  steps: readonly HandlingStep[];
  moreHref: string;
}) {
  return (
    <section className="rovellons-signals" aria-labelledby={titleId}>
      <header>
        <p className="eyebrow"><Refrigerator size={15} /> De la cistella a casa</p>
        <h2 id={titleId}>{title}</h2>
        <p>{intro}</p>
      </header>
      <div>
        {steps.map((step, index) => (
          <article key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
      <p className="guide-types-footnote">
        <Link href={moreHref} className="text-link">
          Com conservar i congelar els bolets, espècie per espècie <ArrowUpRight size={16} />
        </Link>
      </p>
    </section>
  );
}
