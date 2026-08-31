import { Clock3, Map } from "lucide-react";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export default function MushroomsTodayLoading() {
  return (
    <PageShell as="article">
      <PageHeader
        eyebrow={<><Map size={15} /> Condicions actuals per territori</>}
        title={<>On hi ha millors condicions<br /><PageTitleAccent>per als bolets avui?</PageTitleAccent></>}
        description="Comparem les espècies comestibles de temporada i destaquem el sector més favorable de cada territori. La valoració combina el bosc, el sòl i el temps recent; no confirma que hi hagi bolets."
        layout="split"
      />
      <section className="current-board current-board-loading" aria-busy="true" aria-live="polite">
        <Clock3 size={22} aria-hidden="true" />
        <div>
          <strong>Preparant la lectura d’avui…</strong>
          <p>Comprovem les condicions vigents de cada territori.</p>
        </div>
      </section>
    </PageShell>
  );
}
