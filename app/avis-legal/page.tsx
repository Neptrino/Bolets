import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { editorialArticleFields, siteAuthor } from "@/data/editorial";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_NAME, SITE_URL } from "@/src/lib/seo";

const CONTACT_EMAIL = "bolets@neptrino.com";
const LEGAL_OWNER = "Neptrino Consulting SL";

export const metadata: Metadata = {
  title: "Avís legal, privadesa i condicions d’ús",
  description: "Titularitat del lloc, limitació de responsabilitat sobre la identificació de bolets, i com tractem les dades: sense galetes ni comptes d’usuari.",
  alternates: { canonical: "/avis-legal" },
  openGraph: {
    url: "/avis-legal",
    title: "Avís legal i privadesa",
    description: "Titularitat, condicions d’ús i privadesa de Bolets Atles.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function LegalPage() {
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Avís legal, privadesa i condicions d’ús",
        url: absoluteUrl("/avis-legal"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("avis-legal"),
      }} />
      <PageHeader
        eyebrow={<><Scale size={15} /> Informació legal</>}
        title={<>Avís legal<br /><PageTitleAccent>i privadesa.</PageTitleAccent></>}
        description={<>Qui hi ha darrere de {SITE_NAME}, en quines condicions es pot fer servir i què passa (i què no) amb les vostres dades.</>}
        layout="split"
      />

      <section className="seo-guide-section seo-guide-section--wide seo-guide-section--wide-prose" id="titularitat">
        <p className="eyebrow">Titularitat</p>
        <h2>Qui és el responsable del lloc</h2>
        <p>{SITE_NAME} ({SITE_URL}) és un projecte educatiu editat per {LEGAL_OWNER}, amb {siteAuthor.name} com a autor i responsable del contingut. Podeu contactar amb el titular per qualsevol qüestió relacionada amb el lloc a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. El lloc no ven productes ni serveis, no mostra publicitat i no cobra per l’accés.</p>
        <p>{LEGAL_OWNER} · NIF B75990788 · Carrer Joan Maragall, 36 · 08820 el Prat de Llobregat (Barcelona).</p>
      </section>

      <section className="seo-guide-section seo-guide-section--wide seo-guide-section--wide-prose" id="condicions">
        <p className="eyebrow">Condicions d’ús</p>
        <h2>Ús de la informació i limitació de responsabilitat</h2>
        <p>Tot el contingut de {SITE_NAME} és educatiu i orientatiu. Cap fitxa, comparació, mapa o predicció no constitueix una identificació micològica ni una garantia de comestibilitat. La identificació segura d’un bolet requereix la confirmació d’una persona experta amb l’exemplar al davant; no consumiu mai cap bolet basant-vos únicament en aquesta aplicació.</p>
        <p>El titular no es fa responsable dels danys derivats de decisions de recol·lecció o consum preses a partir del contingut del lloc, ni de la vigència de la normativa de recol·lecció de cada territori, que cal comprovar sempre amb la font oficial corresponent. Els mapes de compatibilitat ecològica són models probabilístics amb incertesa: indiquen condicions, no bolets.</p>
        <p>Si detecteu un error, el <a href="/equip-editorial">procés públic de correccions</a> descriu com proposar una esmena.</p>
      </section>

      <section className="seo-guide-section seo-guide-section--wide seo-guide-section--wide-prose" id="privadesa">
        <p className="eyebrow">Privadesa</p>
        <h2>Quines dades tractem</h2>
        <p>{SITE_NAME} no té comptes d’usuari, no fa servir galetes i no mostra cap bàner de consentiment perquè no hi ha res a consentir. En concret:</p>
        <p><strong>Mesura d’audiència.</strong> Fem servir Vercel Analytics i Speed Insights, sense galetes ni identificadors persistents: les visites es comptabilitzen de manera agregada i l’adreça IP es tracta de forma transitòria per servir la pàgina i descartar trànsit automatitzat. No hi ha seguiment entre llocs ni perfils publicitaris.</p>
        <p><strong>Geolocalització.</strong> Si autoritzeu la ubicació al mapa, la posició es fa servir només al vostre dispositiu per centrar la vista. No s’envia ni s’emmagatzema en cap servidor del lloc.</p>
        <p><strong>Preferències locals.</strong> Algunes preferències (com el fons de mapa triat) i les dades per al funcionament sense connexió es guarden al vostre navegador (localStorage i memòria cau). Podeu esborrar-les en qualsevol moment des de la configuració del navegador.</p>
        <p>Per exercir qualsevol dret sobre les vostres dades o fer qualsevol consulta de privadesa, escriviu a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>

      <section className="seo-guide-section seo-guide-section--wide seo-guide-section--wide-prose" id="continguts">
        <p className="eyebrow">Continguts i llicències</p>
        <h2>Fonts, fotografies i atribucions</h2>
        <p>Les fotografies d’espècies provenen de fonts amb llicència compatible i mantenen l’atribució al costat de cada imatge. Les dades meteorològiques i cartogràfiques s’atribueixen als seus proveïdors (Meteocat XEMA sota CC BY 4.0, Open-Meteo, ICGC, SoilGrids) a les pàgines on s’utilitzen. Si considereu que algun contingut vulnera drets de tercers, contacteu amb el titular i es revisarà.</p>
      </section>
    </PageShell>
  );
}
