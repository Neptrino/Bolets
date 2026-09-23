import type { Metadata } from "next";
import { IntentLink } from "@/components/intent-link";
import { PageHeader, PageShell } from "@/components/page-layout";

export const metadata: Metadata = {
  title: "Enquesta tancada",
  description: "L’enquesta sobre una possible quota del mapa detallat s’ha tancat i ja no accepta respostes.",
  alternates: { canonical: "/enquesta-mapa" },
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function MapPriceSurveyPage() {
  return <PageShell as="article">
    <PageHeader
      eyebrow="Enquesta tancada"
      title="L’enquesta de preu del mapa s’ha tancat"
      description="Gràcies a totes les persones que hi heu participat. Ja no acceptem respostes ni estem oferint cap subscripció de pagament."
      tone="forest"
    />
    <p>El mapa públic, les fitxes d’espècies i les opcions de col·laboració continuen disponibles.</p>
    <IntentLink href="/map" className="button">Explora el mapa públic</IntentLink>
  </PageShell>;
}
