import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { AccountSettings } from "@/components/findings/account-settings";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Compte i privadesa", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/compte");
  return (
    <PageShell className="findings-page">
      <PageHeader
        eyebrow="Compte personal"
        title={<>Compte i <PageTitleAccent>privadesa</PageTitleAccent></>}
        description="Gestiona la identitat pública, les claus d’accés, les sessions i l’eliminació de les teves dades."
      />
      <AccountNav current="account" />
      <AccountSettings email={user.email ?? ""} />
    </PageShell>
  );
}
