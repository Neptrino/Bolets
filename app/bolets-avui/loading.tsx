import "@/app/styles/current-readings.css";
import { Map } from "lucide-react";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { CurrentSearchAnswerLoading } from "@/components/current-search-answer-loading";

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
      <CurrentSearchAnswerLoading />
    </PageShell>
  );
}
