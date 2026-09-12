import { Clock3, Map } from "lucide-react";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export default function MushroomsTodayLoading() {
  return (
    <PageShell as="article" className="current-page-loading">
      <PageHeader
        eyebrow={<><Map size={15} /> Condicions actuals per territori</>}
        title={<>On trobar bolets avui<br /><PageTitleAccent>i aquesta setmana?</PageTitleAccent></>}
        titleAs="div"
        description="Compara les espècies comestibles de temporada i descobreix quins territoris de Catalunya tenen ara les condicions més favorables."
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
