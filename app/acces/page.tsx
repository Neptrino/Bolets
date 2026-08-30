import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccessForm } from "@/components/findings/access-form";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { resolveAccessDestination } from "@/src/lib/findings/access-destination";
import { getPublicAuthCapabilities } from "@/src/lib/supabase/auth-capabilities";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = { title: "Accés a El meu bosc", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ retorn?: string | string[] }>;
}) {
  const [user, query, auth] = await Promise.all([
    getAuthenticatedUser(),
    searchParams,
    getPublicAuthCapabilities(),
  ]);
  if (user) redirect(resolveAccessDestination(query.retorn));

  return <PageShell className="findings-page finding-auth-wrap"><PageHeader eyebrow="Compte personal" title={<>El teu <PageTitleAccent>bosc</PageTitleAccent></>} description="Entra per desar espècies i territoris, veure el resum privat de la temporada i sincronitzar troballes. La captura al camp continua funcionant sense connexió." /><Suspense fallback={<p className="finding-notice">Preparant l’accés…</p>}><AccessForm googleEnabled={auth.google} /></Suspense></PageShell>;
}
