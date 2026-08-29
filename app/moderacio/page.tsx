import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ModerationQueue } from "@/components/findings/moderation-queue";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { readFindingProfile } from "@/src/lib/findings/reads.server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Moderació de troballes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/moderacio");
  if (!(await readFindingProfile(user.id)).moderator) notFound();
  return <PageShell className="findings-page"><PageHeader eyebrow="Espai privat" title={<>Moderació de <PageTitleAccent>troballes</PageTitleAccent></>} description="La cua mostra només la publicació generalitzada i l’avís. No exposa coordenades exactes ni notes privades." /><ModerationQueue /></PageShell>;
}
