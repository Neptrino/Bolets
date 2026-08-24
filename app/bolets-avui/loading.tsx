import { Clock3, Map } from "lucide-react";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export default function MushroomsTodayLoading() {
  return (
    <PageShell as="article">
      <PageHeader
        eyebrow={<><Map size={15} /> Predicció amb les últimes dades disponibles</>}
        title={<>Bolets avui<br /><PageTitleAccent>a Catalunya.</PageTitleAccent></>}
        description="Comparem totes les espècies comestibles en temporada i destaquem la millor cel·la de cada territori. La puntuació combina l’hàbitat adequat amb les condicions per fructificar-hi; no confirma presència ni garanteix trobar bolets."
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
