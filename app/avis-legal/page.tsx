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
  description: "Titularitat, limitació de responsabilitat i tractament de comptes, troballes, fotografies i ubicacions.",
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

      <section className="seo-guide-section" id="titularitat">
        <p className="eyebrow">Titularitat</p>
        <h2>Qui és el responsable del lloc</h2>
        <p>{SITE_NAME} ({SITE_URL}) és un projecte educatiu editat per {LEGAL_OWNER}, amb {siteAuthor.name} com a autor i responsable del contingut. Podeu contactar amb el titular per qualsevol qüestió relacionada amb el lloc a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. El lloc no ven productes ni serveis, no mostra publicitat i no cobra per l’accés.</p>
        <p>{LEGAL_OWNER} · NIF B75990788 · Carrer Joan Maragall, 36 · 08820 el Prat de Llobregat (Barcelona).</p>
      </section>

      <section className="seo-guide-section" id="condicions">
        <p className="eyebrow">Condicions d’ús</p>
        <h2>Ús de la informació i limitació de responsabilitat</h2>
        <p>Tot el contingut de {SITE_NAME} és educatiu i orientatiu. Cap fitxa, comparació, mapa o predicció no constitueix una identificació micològica ni una garantia de comestibilitat. La identificació segura d’un bolet requereix la confirmació d’una persona experta amb l’exemplar al davant; no consumeixis mai cap bolet basant-te únicament en aquesta aplicació.</p>
        <p>El titular no es fa responsable dels danys derivats de decisions de recol·lecció o consum preses a partir del contingut del lloc, ni de la vigència de la normativa de recol·lecció de cada territori, que cal comprovar sempre amb la font oficial corresponent. Els mapes són models comparatius amb incertesa: indiquen condicions, no bolets.</p>
        <p>Si detecteu un error, el <a href="/equip-editorial">procés públic de correccions</a> descriu com proposar una esmena.</p>
      </section>

      <section className="seo-guide-section" id="privadesa">
        <p className="eyebrow">Privadesa</p>
        <h2>Quines dades tractem</h2>
        <p><strong>Compte.</strong> Si feu servir el quadern de troballes, tractem el correu electrònic per enviar codis d’accés d’un sol ús i mantenir la sessió. El correu no es publica. La base jurídica és prestar el servei que heu demanat. Podeu crear un àlies opcional; només apareix en les troballes on l’activeu expressament.</p>
        <p><strong>Troballes i ubicació.</strong> El formulari pot recollir l’espècie proposada, el moment, fotografies, quantitat, notes i coordenades. Abans de desar-les podeu triar entre conservar el punt exacte per al vostre mapa privat o descartar-lo i conservar només la casella pública de 10 × 10 km. El punt exacte, l’hora, la quantitat, les notes i les fotos privades no formen part de cap resposta pública. En públic es mostra el dia, l’espècie proposada, la casella de 10 km i només les fotos i l’àlies que hàgiu autoritzat.</p>
        <p><strong>Funcionament sense connexió.</strong> Una troballa no sincronitzada —incloses les fotografies i, si ho heu triat, les coordenades— es desa a la base de dades local del navegador. Quan torna la connexió, intentem sincronitzar-la automàticament després que inicieu sessió. Podeu eliminar aquestes dades esborrant les dades del lloc al navegador. Les pujades temporals incompletes s’eliminen del servei d’emmagatzematge després del període operatiu de neteja.</p>
        <p><strong>Publicació i avisos.</strong> Publicar és opcional i es pot revertir. La identificació que es mostra és el nom indicat per la persona que publica la troballa i no implica cap verificació. Els avisos de moderació es tracten per protegir les persones usuàries i resoldre abusos.</p>
        <p><strong>Conservació i eliminació.</strong> Les dades privades es conserven fins que elimineu la troballa o el compte. En eliminar el compte s’esborren les troballes privades, les fotografies, les notes i les coordenades exactes. Les troballes que ja havíeu fet públiques poden conservar-se anonimitzades, sense compte ni àlies, només com a observació generalitzada de 10 km. Una dada eliminada pot romandre temporalment en còpies de seguretat xifrades fins que completi el cicle ordinari de retenció; aquestes còpies tenen accés restringit i no s’utilitzen per restaurar selectivament comptes eliminats.</p>
        <p><strong>Mesura d’audiència.</strong> Fem servir una instal·lació pròpia d’Umami sense galetes, respectant «Do Not Track» i sense recollir la consulta ni el fragment de l’URL. En una mostra de sessions públiques també recollim la posició anònima dels clics i el percentatge de desplaçament per crear mapes de calor; no enregistrem la sessió, el text introduït ni el contingut de la pàgina. Mesurem el rendiment de les pàgines públiques i comptem de manera anònima quan comença un flux d’accés, es crea un compte, es desa un esborrany local, una troballa acaba de sincronitzar-se o una infografia es prepara per baixar o es comparteix mitjançant el selector del sistema. Aquests esdeveniments no adjunten l’adreça electrònica, l’espècie, cap dada de la troballa ni metadades de la infografia. Les pàgines d’accés, compte, quadern privat, moderació i captura de troballes continuen excloses de les visites, del rendiment i dels mapes de calor. No hi ha seguiment entre llocs ni perfils publicitaris.</p>
        <p><strong>Preferències i seguretat.</strong> Algunes preferències i les respostes necessàries per al funcionament sense connexió es guarden al navegador. El servidor tracta temporalment l’adreça IP i registres tècnics imprescindibles per servir el lloc, limitar abusos i investigar incidències.</p>
        <p>Podeu accedir, rectificar, suprimir, limitar o oposar-vos al tractament i sol·licitar la portabilitat quan correspongui des del compte o escrivint a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. També podeu presentar una reclamació davant l’autoritat de protecció de dades competent.</p>
      </section>

      <section className="seo-guide-section" id="continguts">
        <p className="eyebrow">Continguts i llicències</p>
        <h2>Fonts, fotografies i atribucions</h2>
        <p>Les fotografies d’espècies provenen de fonts amb llicència compatible i mantenen l’atribució al costat de cada imatge. Les dades meteorològiques i cartogràfiques s’atribueixen als seus proveïdors (Meteocat XEMA sota CC BY 4.0, Open-Meteo, ICGC, SoilGrids) a les pàgines on s’utilitzen. Si considereu que algun contingut vulnera drets de tercers, contacteu amb el titular i es revisarà.</p>
        <p>Quan marqueu una fotografia de troballa com a pública, confirma que l’heu feta o que teniu permís per publicar-la, que no vulnera la intimitat de terceres persones i autoritzeu {SITE_NAME} a mostrar-la mentre la troballa sigui pública. Podeu revocar-ne la publicació des del vostre quadern. No pugeu rostres, matrícules, menors ni altres dades personals innecessàries.</p>
      </section>
    </PageShell>
  );
}
