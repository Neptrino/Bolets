import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, MapPinned, WifiOff } from "lucide-react";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "Sense connexió",
  description: "Aquesta pàgina encara no està desada per consultar-la sense cobertura.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <PageShell className="offline-page">
      <PageHeader
        eyebrow={<><WifiOff size={15} /> Sense connexió</>}
        title={<>Ara mateix no<br /><PageTitleAccent>hi ha cobertura.</PageTitleAccent></>}
        description="No hem pogut carregar aquesta pàgina perquè no hi ha connexió i encara no la tenies desada al dispositiu."
        layout="split"
        tone="forest"
      />

      <aside className="offline-note">
        <CloudOff size={21} aria-hidden="true" />
        <p>
          <strong>El mapa sí que funciona sense cobertura</strong> a les zones que hagis
          descarregat abans de sortir, i a la cartografia que ja hagis consultat. La resta
          del web necessita connexió.
        </p>
      </aside>

      <p className="offline-actions">
        <Link href="/map" className="header-map-link">
          <MapPinned size={15} aria-hidden="true" /> Obre el mapa
        </Link>
      </p>
    </PageShell>
  );
}
