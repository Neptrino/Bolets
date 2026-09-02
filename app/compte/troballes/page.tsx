import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { FindingAccessCta } from "@/components/findings/finding-access-cta";
import { PersonalFindings } from "@/components/findings/personal-findings";
import { JournalSummary } from "@/components/my-forest/dashboard";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { readOwnerJournalSummary } from "@/src/lib/my-forest/journal.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Les meves troballes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PersonalFindingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/compte/troballes");
  const journal = await readOwnerJournalSummary(user.id);

  return (
    <PageShell className="findings-page account-page">
      <AccountNav current="findings" />
      <PageHeader
        eyebrow="Mapa i llista privats"
        title={<>Les meves <PageTitleAccent>troballes</PageTitleAccent></>}
        description="Aquí pots veure el punt exacte només quan vas decidir conservar-lo. La vista pública no rep mai aquestes coordenades."
      />
      <FindingAccessCta secondaryHref="/troballes" secondaryLabel="Veure l’atles públic" />
      <div className="account-journal-layout">
        <JournalSummary summary={journal} />
        <PersonalFindings />
      </div>
    </PageShell>
  );
}
