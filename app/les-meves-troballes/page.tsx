import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PersonalFindings } from "@/components/findings/personal-findings";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Les meves troballes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PersonalFindingsPage() {
  if (!await getAuthenticatedUser()) redirect("/acces?retorn=/les-meves-troballes");
  return <PageShell className="findings-page"><PageHeader eyebrow="Mapa i llista privats" title={<>Les meves <PageTitleAccent>troballes</PageTitleAccent></>} description="Aquí pots veure el punt exacte només quan vas decidir conservar-lo. La vista pública no rep mai aquestes coordenades." actions={<div className="findings-actions"><Link className="finding-button" href="/troballes/nova">Anotar-ne una</Link><Link className="finding-button-secondary" href="/el-meu-bosc">El meu bosc</Link></div>} /><PersonalFindings /></PageShell>;
}
