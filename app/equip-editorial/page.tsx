import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, CircleAlert, Database, ShieldCheck } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { coreEditorialSources, editorialArticleFields, editorialTeam } from "@/data/editorial";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Equip editorial, metodologia i correccions",
  description: "Coneix com l’equip editorial de Bolets Atles compila, documenta i revisa la informació ecològica, d’identificació i de seguretat.",
  alternates: { canonical: "/equip-editorial" },
  openGraph: {
    url: "/equip-editorial",
    title: "Equip editorial de Bolets Atles",
    description: "Metodologia editorial, fonts, estat de revisió i procés públic de correccions.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function EditorialTeamPage() {
  return (
    <article className="seo-guide page-width">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Equip editorial, metodologia i correccions",
        url: absoluteUrl("/equip-editorial"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("equip-editorial"),
      }} />
      <header className="seo-guide-hero">
        <p className="eyebrow"><BookOpenCheck size={15} /> Transparència editorial</p>
        <h1>Equip editorial<br /><i>de Bolets Atles.</i></h1>
        <p>{editorialTeam.name} és l’autoria organitzativa del contingut. Bolets Atles n’és l’editor i el responsable de publicació.</p>
      </header>

      <div className="seo-guide-grid">
        <section><Database size={22} /><h2>Com compilem la informació</h2><p>Les fitxes parteixen de bibliografia micològica, catàlegs de biodiversitat i fonts oficials. Els trets d’identificació es contrasten entre fonts; la configuració ecològica versionada alimenta alhora les fitxes i el model, de manera que no hi ha dues definicions independents.</p></section>
        <section><ShieldCheck size={22} /><h2>Fonts i seguretat</h2><p>La cartografia s’alimenta de fonts amb procedència registrada, com l’ICGC. Les advertències de consum prioritzen les indicacions oficials de l’Agència Catalana de Seguretat Alimentària. Aquesta web és educativa i no presta un servei d’identificació.</p></section>
      </div>

      <aside className="intent-emergency-note">
        <CircleAlert size={23} aria-hidden="true" />
        <div><strong>Revisió micològica independent pendent.</strong><p>El contingut actual ha passat revisió editorial, però no s’atribueix cap revisió científica o micològica externa. Ho indiquem a cada pàgina sensible.</p></div>
      </aside>

      <section className="seo-guide-section">
        <p className="eyebrow">Correccions públiques</p>
        <h2>Com proposar una esmena</h2>
        <p>Si detectes un error, una font que falta o una afirmació que cal matisar, obre una incidència pública amb l’URL afectat, la proposta i la font que la sosté.</p>
        <Link className="button moss-button" href="https://github.com/Neptrino/Bolets/issues" target="_blank" rel="noreferrer">Obrir el registre d’incidències <ArrowUpRight size={16} /></Link>
      </section>

      <EditorialAttribution contentId="equip-editorial" sources={coreEditorialSources} />
    </article>
  );
}
