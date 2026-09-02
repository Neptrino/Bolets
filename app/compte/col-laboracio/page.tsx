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
    readContributorAccess(user.id),
    listUserContributionRequests(user.id),
  ]);
  const pending = requests.some((request) => request.status === "pending");

  return (
    <PageShell className="findings-page">
      <PageHeader
        eyebrow="Compte personal"
        title={<>Col·laboració i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Proposa una aportació útil, consulta’n la revisió i comprova fins quan tens obert el detall d’1 km i 250 m."
      />
      <AccountNav current="contributions" />
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
            {access.active && access.activeUntil
              ? `Accés actiu fins al ${dateFormatter.format(new Date(access.activeUntil))}`
              : "Mapa públic amb sectors de 2,5 km"}
          </h2>
          <span>
            {access.active
              ? "Pots consultar els sectors d’1 km i 250 m. Una nova aportació aprovada ampliarà l’accés."
              : "Una aportació aprovada obre els sectors d’1 km i 250 m durant el període indicat."}
          </span>
        </div>
        <Link href={access.active ? "/map" : "#nova-aportacio"}>
          {access.active ? "Obrir el mapa" : "Proposar una aportació"}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </section>
      <div className="account-contribution-layout">
        <div className="account-content">
          <ContributionPanel initialPending={pending} />
        </div>
        <ContributionGuide showResolution={false} />
      </div>
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
            activeUntil={access.active ? access.activeUntil : null}
          />
        ) : (
          <p className="contribution-history-empty">Encara no has enviat cap aportació.</p>
        )}
      </section>
    </PageShell>
  );
}
