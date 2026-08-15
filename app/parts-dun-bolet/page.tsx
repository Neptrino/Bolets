import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleDot,
  MoveVertical,
  ScanLine,
  ShieldAlert,
  Sprout,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import {
  coreEditorialSources,
  editorialArticleFields,
} from "@/data/editorial";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  metaDescription,
  pageTitle,
  SITE_URL,
} from "@/src/lib/seo";

const canonicalPath = "/parts-dun-bolet";
const title = pageTitle("Parts d’un bolet: guia d’identificació");
const description = metaDescription("Apreneu les parts d’un bolet —barret, himeni, peu, anell, volva, espores i miceli— per descriure’l millor, sense identificar-lo només per un tret.");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalPath },
  openGraph: {
    type: "article",
    url: canonicalPath,
    title,
    description,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default function MushroomPartsGuidePage() {
  const canonicalUrl = absoluteUrl(canonicalPath);

  return (
    <PageShell as="article">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${canonicalUrl}#article`,
              headline: "Parts d’un bolet: guia d’identificació",
              description,
              url: canonicalUrl,
              inLanguage: "ca",
              isPartOf: { "@id": `${SITE_URL}/#website` },
              publisher: { "@id": `${SITE_URL}/#organization` },
              about: "Morfologia bàsica dels bolets",
              ...editorialArticleFields("parts-dun-bolet"),
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${canonicalUrl}#breadcrumb`,
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Bolets", item: absoluteUrl("/bolets") },
                { "@type": "ListItem", position: 3, name: "Parts d’un bolet", item: canonicalUrl },
              ],
            },
          ],
        }}
      />
      <PageHeader
        eyebrow={<><ScanLine size={15} /> Vocabulari d’identificació</>}
        title={<>Parts d’un bolet,<br /><PageTitleAccent>amb nom propi.</PageTitleAccent></>}
        description="Posar nom al que observem ajuda a descriure un bolet amb precisió. Aquesta guia explica els trets visibles i no visibles més habituals; no permet identificar ni consumir una espècie només amb un detall."
        layout="split"
      />

      <aside className="intent-safety-note">
        <ShieldAlert size={22} aria-hidden="true" />
        <div><strong>Cap part, per si sola, confirma l’espècie.</strong><p>Color, forma i mida canvien amb l’edat, la humitat i el lloc. Per a una identificació responsable cal contrastar diversos trets, incloses les confusions possibles, amb una persona experta.</p></div>
      </aside>

      <section className="seo-guide-section seo-guide-section--wide" aria-labelledby="visible-parts-title">
        <SectionHeader
          meta="Del barret a la base"
          title="Les parts visibles que convé descriure"
          titleId="visible-parts-title"
          description="No tots els bolets tenen totes aquestes estructures ni les mostren de la mateixa manera. Són una pauta d’observació, no una clau d’identificació."
        />
        <div className="seo-guide-grid">
          <section>
            <CircleDot size={21} aria-hidden="true" />
            <h3>Barret</h3>
            <p>És la part superior. Observeu-ne la forma, el marge, la superfície, el color i si conserva restes de vel. Un barret convex de jove pot aplanar-se o enfonsar-se en madurar.</p>
          </section>
          <section>
            <ScanLine size={21} aria-hidden="true" />
            <h3>Himeni</h3>
            <p>És la superfície fèrtil sota el barret. Pot tenir làmines, tubs amb porus, agulletes o plecs. Cal mirar com s’uneix al peu, el color i si canvia en tocar-lo.</p>
          </section>
          <section>
            <MoveVertical size={21} aria-hidden="true" />
            <h3>Peu</h3>
            <p>Sosté el barret en moltes espècies. Descriviu-ne la posició, el gruix, la textura, les fibres o reticles i si és buit o massís, sense arrencar-ne exemplars innecessàriament.</p>
          </section>
          <section>
            <CircleDot size={21} aria-hidden="true" />
            <h3>Anell, volva i base</h3>
            <p>L’anell és una resta de vel al peu. La volva és una beina o copa a la base. Són trets importants en algunes confusions, així que cal observar la base sencera sense deixar-la enterrada.</p>
          </section>
        </div>
      </section>

      <section className="seo-guide-section seo-guide-section--wide" aria-labelledby="less-visible-parts-title">
        <SectionHeader
          meta="Més enllà del cos visible"
          title="Carn, espores i miceli"
          titleId="less-visible-parts-title"
          description="El bolet és el cos fructífer temporal del fong. La major part de l’organisme viu al substrat o associada a les arrels, no dins de la cistella."
        />
        <div className="seo-guide-grid">
          <section>
            <Sprout size={21} aria-hidden="true" />
            <h3>Carn i reaccions</h3>
            <p>La carn interior pot ser compacta, fibrosa, fràgil o gelatinosa. Alguns bolets canvien de color en tallar-los o pressionar-los; aquest canvi només és un tret més que cal contrastar.</p>
          </section>
          <section>
            <ScanLine size={21} aria-hidden="true" />
            <h3>Espores i esporada</h3>
            <p>Les espores es formen a l’himeni. El color de l’esporada pot ajudar en una identificació experta, però requereix una observació controlada i no substitueix la resta de caràcters.</p>
          </section>
          <section>
            <Sprout size={21} aria-hidden="true" />
            <h3>Miceli</h3>
            <p>És la xarxa de filaments que viu al sòl, a la fusta o vinculada a les arrels. El bolet apareix quan el miceli fructifica; no és tota la vida del fong ni una prova que n’hi hagi cada any al mateix punt.</p>
          </section>
          <section>
            <ShieldAlert size={21} aria-hidden="true" />
            <h3>Olor i context</h3>
            <p>L’olor, l’arbre associat, el tipus de sòl i el moment de l’any completen la descripció. No tasteu exemplars per identificar-los i no utilitzeu cap tret aïllat per decidir si són comestibles.</p>
          </section>
        </div>
      </section>

      <section className="seo-guide-section seo-guide-section--wide" aria-labelledby="observation-title">
        <SectionHeader
          meta="Una observació útil"
          title="Què anotar abans de consultar una fitxa"
          titleId="observation-title"
        />
        <p>Fotografieu el bolet sencer, inclosa la base, i anoteu el bosc o substrat, la forma del barret, l’himeni, el peu, qualsevol anell o volva i els canvis de la carn. Després contrasteu aquests trets amb les fitxes i les espècies semblants, sense fer servir l’aplicació com a autorització de consum.</p>
        <nav className="rain-guide-actions" aria-label="Guies d’identificació relacionades">
          <Link href="/bolets">Consultar totes les fitxes <ArrowUpRight size={16} /></Link>
          <Link href="/bolets-comestibles">Veure bolets comestibles <ArrowUpRight size={16} /></Link>
          <Link href="/bolets-verinosos">Conèixer bolets verinosos <ArrowUpRight size={16} /></Link>
        </nav>
      </section>

      <EditorialAttribution contentId="parts-dun-bolet" sources={coreEditorialSources} />
    </PageShell>
  );
}
