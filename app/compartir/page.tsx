import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Download, FlaskConical, MapPinned, Share2, ShieldCheck } from "lucide-react";
import { DailyShareActions } from "@/components/daily-share-actions";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  createFavourableDailySharePreviewCards,
  dailyShareImagePath,
  isLocalFavourablePreview,
  loadDailyShareCards,
  type DailyShareCard,
} from "@/src/lib/daily-share-cards";

// Keep the publication kit on the same twice-daily snapshot as /bolets-avui.
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Targetes diàries per compartir",
  description: "Targetes de condicions actuals de bolets per a Catalunya, les regions de predicció i els territoris locals de Zones.",
  alternates: { canonical: "/compartir" },
  robots: { index: false, follow: false },
};

type ShareSearchParams = Promise<{ preview?: string }>;

function FeaturedCard({ card, isPreview }: { card: DailyShareCard; isPreview: boolean }) {
  const previewParam = isPreview ? "&preview=favorable" : "";
  const feedImagePath = `${dailyShareImagePath(card.slug, "feed")}${previewParam}`;
  const storyImagePath = `${dailyShareImagePath(card.slug, "story")}${previewParam}`;

  return (
    <li>
      <div className="daily-share-card-meta">
        <div><span>{card.scopeLabel}</span><h3>{card.title}</h3></div>
        <Link href={card.mapPath}><MapPinned size={16} /> Veure lectura</Link>
      </div>
      <div className="daily-share-previews">
        <figure className="daily-share-preview daily-share-feed-preview">
          <figcaption><strong>Feed d’Instagram</strong><span>4:5 · 1080 × 1350</span></figcaption>
          <Image alt={`Targeta per al feed d’Instagram: ${card.title}`} height={1350} src={feedImagePath} unoptimized width={1080} />
        </figure>
        <figure className="daily-share-preview daily-share-story-preview">
          <figcaption><strong>Story d’Instagram</strong><span>vertical · 1080 × 1920</span></figcaption>
          <Image alt={`Targeta vertical per a Stories: ${card.title}`} height={1920} src={storyImagePath} unoptimized width={1080} />
        </figure>
      </div>
      <DailyShareActions disabled={isPreview} feedImagePath={feedImagePath} shareText={card.shareText} storyImagePath={storyImagePath} title={card.title} />
    </li>
  );
}

function CompactCard({ card }: { card: DailyShareCard }) {
  const reading = card.readings[0];

  return (
    <li className="daily-share-compact-card">
      <div>
        <span>{card.scopeLabel}</span>
        <h3>{card.title}</h3>
        <p>{reading ? `${reading.speciesName} · ${reading.score}/100 · ${reading.label}` : "Sense lectura publicada"}</p>
      </div>
      <Link href={card.mapPath}><MapPinned size={16} /> Veure lectura</Link>
    </li>
  );
}

async function PreviewNotice({ searchParams }: { searchParams: ShareSearchParams }) {
  const query = await searchParams;
  if (!isLocalFavourablePreview(query.preview)) return null;

  return (
    <aside className="daily-share-preview-notice">
      <FlaskConical size={19} aria-hidden="true" />
      <p><strong>Previsualització local.</strong> Aquestes condicions són simulades per revisar el disseny. Les accions de compartir estan desactivades.</p>
    </aside>
  );
}

async function ShareCardItems({ searchParams }: { searchParams: ShareSearchParams }) {
  const query = await searchParams;
  const isPreview = isLocalFavourablePreview(query.preview);
  const cards = isPreview ? createFavourableDailySharePreviewCards() : await loadDailyShareCards();
  const rankedCards = [...cards].sort((left, right) =>
    Number(right.available) - Number(left.available) ||
    (right.readings[0]?.score ?? -1) - (left.readings[0]?.score ?? -1) ||
    left.title.localeCompare(right.title, "ca")
  );
  const overviewCard = rankedCards.find((card) => card.scope === "overview" && card.available);
  const featuredZoneCards = rankedCards
    .filter((card) => card.scope !== "overview" && card.available)
    .slice(0, 5);
  const featuredCards = overviewCard ? [overviewCard, ...featuredZoneCards] : featuredZoneCards;
  const featuredSlugs = new Set(featuredCards.map((card) => card.slug));
  const compactCards = cards.filter((card) => !featuredSlugs.has(card.slug));

  return (
    <>
      {featuredCards.length > 0 ? featuredCards.map((card) => (
        <FeaturedCard card={card} isPreview={isPreview} key={card.slug} />
      )) : (
        <li className="daily-share-empty">
          <ShieldCheck size={22} aria-hidden="true" />
          <div><strong>Encara no hi ha targetes per publicar.</strong><p>Quan les dades vigents superin els controls, aquí apareixeran les cinc lectures de zona més altes.</p></div>
        </li>
      )}
      {compactCards.map((card) => <CompactCard card={card} key={card.slug} />)}
    </>
  );
}

function ShareCardsLoading() {
  return (
    <li className="daily-share-loading" role="status">
      <CalendarDays size={22} aria-hidden="true" />
      <div><strong>Preparant les lectures vigents…</strong><p>La pàgina ja és disponible mentre comprovem quines zones tenen una targeta publicable.</p></div>
    </li>
  );
}

export default function ShareDailyConditionsPage({ searchParams }: { searchParams: ShareSearchParams }) {
  return (
    <PageShell className="daily-share-page">
      <PageHeader
        eyebrow={<><Share2 size={15} /> Kit de publicació diària</>}
        title={<>Comparteix la lectura<br /><PageTitleAccent>de cada dia.</PageTitleAccent></>}
        description="La visió general mostra les tres zones més altes. Les cinc millors zones també tenen una imatge 4:5 per al feed i una versió vertical 9:16 per a Stories."
        layout="split"
        tone="forest"
      />

      <aside className="daily-share-intro">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Una targeta no és un mapa de recol·lecció.</strong> Només mostrem resultats publicables: les dades incompletes, antigues o sense verificar es mantenen com a no disponibles.</p>
      </aside>

      <Suspense fallback={null}><PreviewNotice searchParams={searchParams} /></Suspense>

      <section className="daily-share-grid" aria-labelledby="daily-share-grid-title">
        <header className="daily-share-grid-heading">
          <div><p className="eyebrow"><CalendarDays size={15} /> S’actualitza amb les dades vigents</p><h2 id="daily-share-grid-title">Targetes per publicar</h2></div>
          <p><Download size={16} /> La targeta general resumeix les tres zones més altes. A continuació hi ha les imatges de les cinc zones amb millor lectura publicable.</p>
        </header>
        <ol>
          <Suspense fallback={<ShareCardsLoading />}>
            <ShareCardItems searchParams={searchParams} />
          </Suspense>
        </ol>
      </section>
    </PageShell>
  );
}
