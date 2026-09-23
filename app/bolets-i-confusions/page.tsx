import "@/app/styles/comparison-guides.css";
import "@/app/styles/lookalike-guide.css";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Microscope, Scale, ScanLine, ShieldAlert } from "lucide-react";
import { CatalogueSpeciesCell } from "@/components/catalogue-species-cell";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EditorialSafetyNotice } from "@/components/editorial-safety-notice";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { Notice } from "@/components/notice";
import { SpeciesIcon } from "@/components/species-icon";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { comparisonPagesBySlug } from "@/data/comparison-pages";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { identificationSteps } from "@/data/identification-method";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import {
  deadlyLookalikePairs,
  LOOKALIKE_GUIDE_PATH,
  lookalikeGroups,
  formatMonthRuns,
  lookalikeGuideAnchor,
  lookalikePairAnchor,
  otherHarmlessPairs,
  pairOverlapMonths,
  referenceImage,
  type LookalikePair,
} from "@/src/lib/lookalike-guide";
import { speciesArticle, speciesHeadings } from "@/src/lib/species-headings";
import { absoluteUrl, articleMetadata, metaDescription, pageTitle, SITE_URL, speciesPath } from "@/src/lib/seo";
import { breadcrumbSchema } from "@/src/lib/breadcrumb-schema";
import { monthInTimeZone, SEASON_MONTHS } from "@/src/lib/seasonality";
import type { CatalogueSpecies } from "@/src/lib/types";

const path = LOOKALIKE_GUIDE_PATH;
const headline = "Bolets típics de Catalunya i amb què es confonen";
const title = pageTitle(headline);
const description = metaDescription("Els bolets més buscats de Catalunya i els seus dobles tòxics: rovelló, cep, rossinyol, ou de reig, fredolic i moixernó. Diferències clau i fonts.");

export const metadata = articleMetadata(path, title, description);

// The calendar table flags the current month.
export const revalidate = 3600;

function lowerFirst(value: string) {
  return `${value.charAt(0).toLocaleLowerCase("ca-ES")}${value.slice(1)}`;
}

function PairPhoto({ species }: { species: CatalogueSpecies }) {
  const asset = referenceImage(species);
  const status = getEdibilityPresentation(species.identity.edibility);
  return (
    <figure>
      {asset && <div><MediaImage asset={asset} alt={asset.alt} fill sizes="(max-width: 760px) 44vw, 260px" /></div>}
      <figcaption>
        <strong><Link href={speciesPath(species)}>{species.identity.commonName}</Link></strong>
        <em>{species.identity.scientificName}</em>
        <small className={`label-caps comparison-risk-label ${species.identity.edibility}`}>{status.label}</small>
        {asset && !asset.hideCredit && <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.attribution} · {asset.license}</a>}
      </figcaption>
    </figure>
  );
}

function PairCard({ pair }: { pair: LookalikePair }) {
  const { page, edible, lookalike } = pair;
  return (
    <article className="lookalike-pair" id={lookalikePairAnchor(page)}>
      <h3>{edible.identity.commonName} o {lowerFirst(lookalike.identity.commonName)}?</h3>
      <div className="poisonous-photo-pair">
        <PairPhoto species={edible} />
        <PairPhoto species={lookalike} />
      </div>
      <div className="lookalike-pair-text">
        <p><strong>Diferència clau.</strong> {page.decisiveDifference}</p>
        {page.fieldChecks && (
          <ul className="lookalike-checks">
            {page.fieldChecks.map((check) => <li key={check}>{check}</li>)}
          </ul>
        )}
        {page.confusionRisk && <p><strong>Per què importa.</strong> {page.confusionRisk}</p>}
        <Link className="text-link" href={`/compare/${page.slug}`}>
          Comparació completa: {page.shortTitle} <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function LookalikeGuidePage() {
  const url = absoluteUrl(path);
  const groups = lookalikeGroups.filter((group) => group.risky.length > 0);
  const deadly = deadlyLookalikePairs[0]?.lookalike;
  const currentMonth = monthInTimeZone();
  const currentMonthLabel = SEASON_MONTHS.find(({ key }) => key === currentMonth)!.label;
  const riskyPairs = groups.flatMap((group) => group.risky);
  const calendarRows = riskyPairs.map((pair) => {
    const months = pairOverlapMonths(pair);
    return { pair, months, now: Boolean(months?.includes(currentMonth)) };
  });
  const activeNow = calendarRows.filter((row) => row.now).length;
  const sources = [
    officialSafetySource,
    ...groups.flatMap((group) => [group.species, ...group.risky.map((pair) => pair.lookalike)]).flatMap((species) => species.references),
  ];

  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline,
            description,
            url,
            inLanguage: "ca",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            ...editorialArticleFields("bolets-i-confusions"),
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: groups.length,
              itemListElement: groups.map((group, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: speciesHeadings(group.species.identity.commonName).lookalikes,
                url: `${url}#${lookalikeGuideAnchor(group.species)}`,
              })),
            },
          },
          breadcrumbSchema([{ name: "Bolets", url: absoluteUrl("/bolets") }, { name: "Bolets i confusions", url }]),
        ],
      }} />
      <PageHeader
        eyebrow={<><ScanLine size={15} /> Guia · qui és qui al cistell</>}
        title={<>Bolets típics de Catalunya<br /><PageTitleAccent>i amb què es confonen.</PageTitleAccent></>}
        description="Els bolets comestibles més buscats a Catalunya, cadascun amb els dobles tòxics o mortals que poden acabar al mateix cistell i la diferència que els separa."
        layout="split"
      />
      <nav className="lookalike-jump" aria-label="Salta a una espècie">
        <span className="label-caps">Salta a</span>
        <ul>
          {groups.map((group) => (
            <li key={group.species.speciesId}>
              <a href={`#${lookalikeGuideAnchor(group.species)}`}>
                <SpeciesIcon speciesId={group.species.speciesId} size={32} />
                {group.species.identity.commonName}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="lookalike-group lookalike-method" aria-labelledby="lookalike-method-title">
        <SectionHeader
          meta="Mètode de camp"
          title="Com identificar un bolet, pas a pas"
          titleId="lookalike-method-title"
          description="Set comprovacions en l’ordre en què es fan al bosc. Cada pas porta a les parelles d’aquesta guia on és el que decideix. Si un sol pas no quadra, el bolet no va al cistell."
          actions={<Link className="text-link" href="/parts-dun-bolet">Parts d’un bolet <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        />
        <ol className="step-cards lookalike-steps">
          {identificationSteps.map((step) => (
            <li key={step.id}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <p className="lookalike-step-pairs">
                Decideix a{" "}
                {step.decisiveIn.map((slug, index) => (
                  <span key={slug}>
                    {index > 0 && (index === step.decisiveIn.length - 1 ? " i " : ", ")}
                    <a href={`#${lookalikePairAnchor(comparisonPagesBySlug[slug])}`}>{lowerFirst(comparisonPagesBySlug[slug].shortTitle)}</a>
                  </span>
                ))}.
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="catalogue-list" aria-labelledby="lookalike-calendar-title">
        <SectionHeader
          meta={`Al ${currentMonthLabel}, ${activeNow} de ${riskyPairs.length} coincideixen`}
          title="Quan coincideixen els bolets comestibles amb els seus dobles tòxics"
          titleId="lookalike-calendar-title"
          description="Els mesos en què cada bolet comestible i el seu doble fructifiquen alhora, segons els calendaris de temporada de les fitxes. És quan la confusió és més probable al bosc; fora d’aquests mesos el risc no desapareix."
        />
        <div className="card catalogue-list-scroll" role="region" aria-labelledby="lookalike-calendar-title" tabIndex={0}>
          <table className="lookalike-calendar">
            <thead>
              <tr>
                <th scope="col">Si culls</th>
                <th scope="col">Vigila</th>
                <th scope="col">Toxicitat</th>
                <th scope="col">Coincideixen</th>
                <th scope="col"><span className="visually-hidden">Enllaç a la parella</span></th>
              </tr>
            </thead>
            <tbody>
              {calendarRows.map(({ pair, months, now }) => (
                <tr key={pair.page.slug} className={now ? "lookalike-row-now" : undefined}>
                  <CatalogueSpeciesCell
                    speciesId={pair.edible.speciesId}
                    href={`#${lookalikeGuideAnchor(pair.edible)}`}
                    name={pair.edible.identity.commonName}
                    scientificName={pair.edible.identity.scientificName}
                  />
                  <td>
                    <a href={`#${lookalikePairAnchor(pair.page)}`}>{pair.lookalike.identity.commonName}</a>
                    <small className="lookalike-scientific">{pair.lookalike.identity.scientificName}</small>
                  </td>
                  <td><span className={`label-caps comparison-risk-label ${pair.lookalike.identity.edibility}`}>{getEdibilityPresentation(pair.lookalike.identity.edibility).label}</span></td>
                  <td>
                    {months ? formatMonthRuns(months) : "Sense calendari numèric"}
                    {now && <span className="pill lookalike-now">Ara</span>}
                  </td>
                  <td>
                    <a className="lookalike-row-link" href={`#${lookalikePairAnchor(pair.page)}`} aria-label={`Com distingir ${pair.edible.identity.commonName.toLocaleLowerCase("ca")} i ${pair.lookalike.identity.commonName.toLocaleLowerCase("ca")}`}>
                      Com distingir-los <ArrowDown size={15} aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {groups.map((group) => {
        const name = group.species.identity.commonName;
        const titleId = lookalikeGuideAnchor(group.species);
        return (
          <section className="lookalike-group" key={group.species.speciesId} aria-labelledby={titleId}>
            <SectionHeader
              meta={`${group.risky.length} ${group.risky.length === 1 ? "confusió de risc" : "confusions de risc"}`}
              title={`${speciesHeadings(name).lookalikes}?`}
              titleId={titleId}
              description={group.species.identity.shortDescription}
              actions={<Link className="text-link" href={speciesPath(group.species)}>Fitxa {speciesArticle(name).ofSpecies} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            />
            <div className="poisonous-comparison-grid">
              {group.risky.map((pair) => <PairCard key={pair.page.slug} pair={pair} />)}
            </div>
            {group.harmless.length > 0 && (
              <p className="lookalike-harmless">
                També s’assembla a altres comestibles, sense risc greu:{" "}
                {group.harmless.map((pair, index) => (
                  <span key={pair.page.slug}>{index > 0 && ", "}<Link href={`/compare/${pair.page.slug}`}>{pair.page.shortTitle}</Link></span>
                ))}.
              </p>
            )}
          </section>
        );
      })}

      {deadly && (
        <section className="lookalike-group" aria-labelledby="lookalike-deadly-title">
          <SectionHeader meta="La confusió que no perdona" title={`${deadly.identity.commonName}: el bolet mortal que es confon amb comestibles`} titleId="lookalike-deadly-title" />
          <Notice icon={ShieldAlert} title={`${deadly.identity.commonName} (${deadly.identity.scientificName})`} tone="emergency">
            {deadly.identity.shortDescription} Apareix a {deadlyLookalikePairs.length} de les confusions d’aquesta guia:{" "}
            {deadlyLookalikePairs.map((pair, index) => (
              <span key={pair.page.slug}>{index > 0 && " i "}<Link href={`/compare/${pair.page.slug}`}>{pair.page.shortTitle}</Link></span>
            ))}. <Link href={speciesPath(deadly)}>Obre’n la fitxa</Link> abans de collir amanites o bolets blancs amb làmines.
          </Notice>
        </section>
      )}

      {otherHarmlessPairs.length > 0 && (
        <section className="lookalike-group" aria-labelledby="lookalike-other-title">
          <SectionHeader
            meta="Sense risc greu"
            title="Altres bolets comestibles que s’assemblen entre ells"
            titleId="lookalike-other-title"
            description="Confondre-les no és perillós, però separar-les ajuda a llegir els trets que sí que importen en les confusions de risc."
          />
          <div className="poisonous-comparison-grid">
            {otherHarmlessPairs.map((pair) => <PairCard key={pair.page.slug} pair={pair} />)}
          </div>
        </section>
      )}

      <section className="lookalike-group" aria-labelledby="lookalike-emergency-title">
        <SectionHeader meta="Intoxicació" title="Si ja t’has menjat un bolet i tens dubtes" titleId="lookalike-emergency-title" />
        <Notice icon={ShieldAlert} title="Actua de seguida, encara que no tinguis símptomes." tone="emergency">
          Segueix la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a>, truca al 061 Salut Respon i conserva restes del bolet, crues o cuinades. Alguns símptomes greus triguen hores a aparèixer i una millora aparent no vol dir recuperació.
        </Notice>
        <nav className="species-topic-links lookalike-related" aria-label="Guies relacionades">
          <Link href="/bolets-verinosos"><ShieldAlert size={18} aria-hidden="true" /><span><strong>Bolets verinosos</strong><small>Totes les espècies tòxiques de Catalunya</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/compare"><Scale size={18} aria-hidden="true" /><span><strong>Comparador d’espècies</strong><small>Posa dos bolets cara a cara</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/parts-dun-bolet"><Microscope size={18} aria-hidden="true" /><span><strong>Parts d’un bolet</strong><small>Anell, volva, làmines i porus</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>

      <EditorialSafetyNotice />
      <EditorialAttribution contentId="bolets-i-confusions" sources={sources} />
    </PageShell>
  );
}
