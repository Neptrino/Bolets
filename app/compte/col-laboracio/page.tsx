import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { ContributionGuide } from "@/components/contribution-guide";
import { ContributionPanel } from "@/components/contribution-panel";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "Col·laboració",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountContributionPage() {
  if (!await getAuthenticatedUser()) redirect("/acces?retorn=/compte/col-laboracio");

  return (
    <PageShell className="findings-page">
      <PageHeader
        eyebrow="Compte personal"
        title={<>Col·laboració i <PageTitleAccent>mapa detallat</PageTitleAccent></>}
        description="Proposa una aportació útil, consulta’n la revisió i comprova fins quan tens obert el detall d’1 km i 250 m."
      />
      <AccountNav current="contributions" />
      <div className="account-contribution-layout">
        <div className="account-content">
          <ContributionPanel />
        </div>
        <ContributionGuide showResolution={false} />
      </div>
    </PageShell>
  );
}
