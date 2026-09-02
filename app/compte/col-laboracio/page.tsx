import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, MapPinned } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { ContributionGuide } from "@/components/contribution-guide";
import { ContributionHistory, ContributionPanel } from "@/components/contribution-panel";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { listUserContributionRequests, readContributorAccess } from "@/src/lib/contributions/server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Col·laboració",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function AccountContributionPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/compte/col-laboracio");
  const [access, requests] = await Promise.all([
    readContributorAccess(user),
    listUserContributionRequests(user.id),
  ]);
  const pending = requests.some((request) => request.status === "pending");

  return (
    <PageShell className="findings-page account-page">
      <AccountNav current="contributions" />
      <PageHeader
        eyebrow="Compte personal"
        title={<>Col·laboració i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Consulta el teu nivell d’accés, proposa una aportació útil i segueix-ne la revisió."
      />
      <section
        className="contribution-account-status"
        data-active={access.active ? "true" : "false"}
        aria-labelledby="contribution-account-status-title"
      >
        <span className="contribution-account-status-icon" aria-hidden="true">
          {access.active ? <CheckCircle2 size={24} /> : <MapPinned size={24} />}
        </span>
        <div>
          <p>Estat del mapa detallat</p>
          <h2 id="contribution-account-status-title">
            {access.administrator
              ? "Accés d’administració: sectors d’1 km i 250 m"
              : access.level === "contributor" && access.activeUntil
              ? `Sectors d’1 km i 250 m fins al ${dateFormatter.format(new Date(access.activeUntil))}`
              : access.level === "finding" && access.activeUntil
                ? `Sectors d’1 km fins al ${dateFormatter.format(new Date(access.activeUntil))}`
              : "Mapa públic amb sectors de 2,5 km"}
          </h2>
          <span>
            {access.administrator
              ? "El rol d’administració té accés a tot el detall disponible."
              : access.level === "contributor"
              ? "Tens obert tot el detall disponible. Una nova aportació aprovada hi afegeix 30 dies."
              : access.level === "finding"
                ? "La troballa pública amb foto ha obert 1 km durant 7 dies. Una aportació aprovada obre també 250 m."
                : "Una troballa pública amb foto obre 1 km durant 7 dies; una aportació aprovada obre també 250 m durant 30 dies."}
          </span>
        </div>
        {access.active ? (
          <Link href="/map">
            Obrir el mapa <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        ) : null}
      </section>
      {access.level !== "contributor" || !access.active ? <aside className="contribution-finding-note" aria-labelledby="contribution-finding-note-title">
        <span className="contribution-finding-note-icon" aria-hidden="true"><MapPinned size={22} /></span>
        <div>
          <p>Publicació directa · sense revisió</p>
          <h2 id="contribution-finding-note-title">Una troballa pública amb foto obre els sectors d’1 km durant 7 dies</h2>
          <span>Es publica des del quadern i no s’envia en aquest formulari. Les fotos continuen lligades a la troballa i no passen al catàleg automàticament.</span>
        </div>
        <Link href="/troballes/nova">
          Anotar una troballa <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </aside> : null}
      <div className="account-contribution-layout">
        <div className="account-content">
          <ContributionPanel initialPending={pending} />
          <section className="contribution-account-history" aria-labelledby="contribution-account-history-title">
            <SectionHeader
              meta="Seguiment"
              title="Historial d’aportacions"
              titleId="contribution-account-history-title"
              description="Consulta què has enviat, l’estat de cada revisió i quin accés ha obert cada aportació aprovada."
            />
            {requests.length ? (
              <ContributionHistory
                requests={requests}
                activeUntil={access.level === "contributor" ? access.fineActiveUntil : null}
              />
            ) : (
              <p className="contribution-history-empty">Encara no has enviat cap aportació.</p>
            )}
          </section>
        </div>
        <ContributionGuide showResolution={false} />
      </div>
    </PageShell>
  );
}
