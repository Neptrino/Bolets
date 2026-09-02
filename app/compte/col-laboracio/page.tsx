import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, MapPinned } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { ContributionGuide } from "@/components/contribution-guide";
import { ContributionHistory, ContributionPanel } from "@/components/contribution-panel";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { listUserContributionRequests, readContributorAccess } from "@/src/lib/contributions/server";
import { readOwnerContributionFindingOptions } from "@/src/lib/findings/reads.server";
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

export default async function AccountContributionPage({
  searchParams,
}: {
  searchParams: Promise<{ troballa?: string | string[] }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/compte/col-laboracio");
  const [access, requests, findingOptions, query] = await Promise.all([
    readContributorAccess(user.id),
    listUserContributionRequests(user.id),
    readOwnerContributionFindingOptions(user.id),
    searchParams,
  ]);
  const pending = requests.some((request) => request.status === "pending");
  const requestedFindingId = Array.isArray(query.troballa) ? query.troballa[0] : query.troballa;
  const initialFindingId = findingOptions.some((finding) => finding.id === requestedFindingId)
    ? requestedFindingId
    : undefined;

  return (
    <PageShell className="findings-page">
      <PageHeader
        eyebrow="Compte personal"
        title={<>Col·laboració i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Consulta el teu nivell d’accés, proposa una aportació útil i segueix-ne la revisió."
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
            {access.level === "contributor" && access.activeUntil
              ? `Sectors d’1 km i 250 m fins al ${dateFormatter.format(new Date(access.activeUntil))}`
              : access.level === "finding" && access.activeUntil
                ? `Sectors d’1 km fins al ${dateFormatter.format(new Date(access.activeUntil))}`
              : "Mapa públic amb sectors de 2,5 km"}
          </h2>
          <span>
            {access.level === "contributor"
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
      <div className="account-contribution-layout">
        <div className="account-content">
          <ContributionPanel
            findingOptions={findingOptions}
            initialFindingId={initialFindingId}
            initialPending={pending}
          />
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
            activeUntil={access.level === "contributor" ? access.fineActiveUntil : null}
          />
        ) : (
          <p className="contribution-history-empty">Encara no has enviat cap aportació.</p>
        )}
      </section>
    </PageShell>
  );
}
