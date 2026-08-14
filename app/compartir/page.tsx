import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Download, FlaskConical, MapPinned, Share2, ShieldCheck } from "lucide-react";
import { DailyShareActions } from "@/components/daily-share-actions";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { createFavourableDailySharePreviewCards, dailyShareImagePath, isLocalFavourablePreview, loadDailyShareCards } from "@/src/lib/daily-share-cards";
import { absoluteUrl } from "@/src/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Targetes diàries per compartir",
  description: "Targetes de condicions actuals de bolets per a Catalunya i cadascuna de les zones de predicció.",
  alternates: { canonical: "/compartir" },
  robots: { index: false, follow: false },
};

export default async function ShareDailyConditionsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const query = await searchParams;
  const isPreview = isLocalFavourablePreview(query.preview);
  const cards = isPreview ? createFavourableDailySharePreviewCards() : await loadDailyShareCards();
  const previewQuery = isPreview ? "?preview=favorable" : "";

  return (
    <PageShell className="daily-share-page">
      <PageHeader
        eyebrow={<><Share2 size={15} /> Kit de publicació diària</>}
        title={<>Comparteix la lectura<br /><PageTitleAccent>de cada dia.</PageTitleAccent></>}
        description="Targetes PNG actualitzades amb la mateixa lectura territorial que publiquem al mapa. Baixa una imatge, copia el text i comparteix-la on vulguis."
        layout="split"
        tone="forest"
      />

      <aside className="daily-share-intro">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Una targeta no és un mapa de recol·lecció.</strong> Només mostrem resultats publicables: les dades incompletes, antigues o sense verificar es mantenen com a no disponibles.</p>
      </aside>

      {isPreview ? <aside className="daily-share-preview-notice"><FlaskConical size={19} aria-hidden="true" /><p><strong>Previsualització local.</strong> Aquestes condicions són simulades per revisar el disseny. Les accions de compartir estan desactivades.</p></aside> : null}

      <section className="daily-share-grid" aria-labelledby="daily-share-grid-title">
        <header className="daily-share-grid-heading">
          <div><p className="eyebrow"><CalendarDays size={15} /> S’actualitza amb les dades vigents</p><h2 id="daily-share-grid-title">Catalunya i 9 zones</h2></div>
          <p><Download size={16} /> Cada PNG fa 1200 × 675 px, preparat per a X, LinkedIn o missatgeria. Al mòbil, el botó Comparteix prova d’adjuntar directament la imatge.</p>
        </header>
        <ol>
          {cards.map((card) => {
            const imagePath = `${dailyShareImagePath(card.slug)}${previewQuery}`;
            return (
              <li className={card.slug === "catalunya" ? "is-catalunya" : undefined} key={card.slug}>
                <div className="daily-share-preview">
                  <Image alt={`Targeta de condicions de bolets: ${card.title}`} height={675} priority={card.slug === "catalunya"} src={imagePath} unoptimized width={1200} />
                </div>
                <div className="daily-share-card-meta">
                  <div><span>{card.slug === "catalunya" ? "Visió general" : "Zona de predicció"}</span><h3>{card.title}</h3></div>
                  <Link href={card.mapPath}><MapPinned size={16} /> Veure lectura</Link>
                </div>
                <DailyShareActions disabled={isPreview} imagePath={imagePath} shareText={card.shareText} shareUrl={absoluteUrl(card.mapPath)} title={card.title} />
              </li>
            );
          })}
        </ol>
      </section>
    </PageShell>
  );
}
