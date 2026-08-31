import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, BookOpenText, Link2, Plus } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EditorialSafetyNotice } from "@/components/editorial-safety-notice";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { collectingSources, mushroomPoisoningSource } from "@/data/field-guide-sources";
import { absoluteUrl, articleMetadata, metaDescription, pageTitle, SITE_URL } from "@/src/lib/seo";
import type { SourceReference } from "@/src/lib/types";
import { FaqFragmentNavigation } from "./fragment-navigation";
import styles from "./page.module.css";

const path = "/preguntes-frequents-bolets";
const title = pageTitle("Anar a buscar bolets: preguntes freqüents");
const description = metaDescription("Respostes per anar a buscar bolets a Catalunya: temporada, pluja, boscos, identificació, permisos i cistell. Amb enllaços a guies i fonts oficials.");

type HuntingQuestion = {
  id: string;
  question: string;
  answer: ReactNode;
  sources?: SourceReference[];
};

type HuntingTopic = {
  id: string;
  label: string;
  title: string;
  questions: HuntingQuestion[];
};

const topics: HuntingTopic[] = [
  {
    id: "quan-anar-hi",
    label: "Quan anar-hi",
    title: "Temporada, pluja i temps",
    questions: [
      {
        id: "temporada",
        question: "Quan és temporada de bolets a Catalunya?",
        answer: <>La tardor concentra bona part de la temporada, però no és l’única època: cada espècie té el seu calendari i les condicions del bosc poden avançar, retardar o interrompre la fructificació. Consulta el <Link href="/temporada">calendari de bolets per mesos</Link> i la <Link href="/bolets-de-tardor">guia de bolets de tardor</Link>. Un mes favorable no confirma que n’estiguin sortint avui.</>,
      },
      {
        id: "despres-de-ploure",
        question: "Quants dies després de ploure surten els bolets?",
        answer: <>No hi ha un nombre de dies que serveixi per a totes les espècies i tots els boscos. Importen la humitat prèvia del sòl, com s’ha repartit la pluja i la temperatura; un xàfec aïllat pot no ser suficient. A la guia de <Link href="/quan-surten-els-bolets-despres-de-ploure">quan surten els bolets després de ploure</Link> expliquem aquests factors i els límits del mapa.</>,
      },
      {
        id: "calor-i-vent",
        question: "La calor i el vent poden frenar els bolets encara que hagi plogut?",
        answer: <>Sí: la pluja no és l’única condició que compta. La calor i el vent sec poden afavorir la pèrdua d’aigua i deixar unes condicions desfavorables malgrat la pluja recent. Llegeix <Link href="/quan-surten-els-bolets-despres-de-ploure">què canvia al bosc després de ploure</Link> i contrasta-ho amb les <Link href="/bolets-avui">condicions actuals per territori</Link>; no hi ha un llindar universal per a tots els bolets.</>,
      },
    ],
  },
  {
    id: "on-buscar",
    label: "On buscar",
    title: "Zones i boscos",
    questions: [
      {
        id: "cap-de-setmana",
        question: "On trobar bolets avui o aquesta setmana?",
        answer: <>Comença per comparar les <Link href="/bolets-avui">condicions de bolets avui</Link> i la data de les lectures. Després, consulta les <Link href="/zones">zones de Catalunya</Link> per entendre l’hàbitat i les espècies de cada territori. Les dades actuals no garanteixen el temps del cap de setmana ni que hi trobaràs bolets: abans de sortir, confirma també la previsió meteorològica i els avisos d’accés del lloc.</>,
      },
      {
        id: "boscos",
        question: "En quins boscos creixen els rovellons i els ceps?",
        answer: <>No busquis només un nom de comarca: cal que el tipus de bosc sigui adequat per a l’espècie. La <Link href="/zones/rovellons">guia de rovellons i pinetells</Link> se centra en les pinedes; la <Link href="/zones/ceps">guia de ceps</Link> distingeix diverses espècies amb arbres associats i calendaris diferents. El tipus de bosc és una pista, no una prova que hi hagi bolets ni una identificació de l’exemplar.</>,
      },
      {
        id: "mapa-i-presencia",
        question: "Una zona favorable al mapa garanteix que hi trobaré bolets?",
        answer: <>No. El <Link href="/map">mapa de bolets</Link> compara el terreny i les condicions del moment; no mostra observacions ni punts de recol·lecció confirmats. Una valoració alta no garanteix que n’hi hagi, i una valoració zero tampoc demostra absència. Consulta <Link href="/metode">com funciona el mapa i quins límits té</Link> abans d’interpretar-lo com una recomanació de sortida.</>,
      },
    ],
  },
  {
    id: "identificacio",
    label: "Identificació",
    title: "Reconèixer abans de collir",
    questions: [
      {
        id: "bolets-comestibles",
        question: "Com puc saber si un bolet és comestible o verinós?",
        answer: <>Cal identificar l’exemplar amb seguretat; una fotografia semblant, el resultat d’una app o un sol tret no són suficients per decidir consumir-lo. Les <Link href="/bolets-comestibles">fitxes de bolets comestibles</Link> ajuden a estudiar-los, i les de <Link href="/bolets-verinosos">bolets verinosos</Link> expliquen confusions, però no validen el que has collit. Si tens dubtes, no el consumeixis i consulta una persona experta o una associació micològica.</>,
        sources: [officialSafetySource],
      },
      {
        id: "intoxicacio",
        question: "Què faig si sospito una intoxicació per bolets?",
        answer: <>Demana assistència mèdica immediata: no esperis que el malestar passi ni que una guia en línia identifiqui el bolet. Els símptomes poden trigar hores a aparèixer. Si en conserves, porta restes dels bolets, crus o cuits, al centre sanitari sense endarrerir l’atenció. Les altres persones que n’hagin menjat també han de rebre assistència, encara que es trobin bé. La <Link href="/bolets-verinosos">guia de bolets verinosos</Link> és informativa i no substitueix l’atenció mèdica.</>,
        sources: [mushroomPoisoningSource],
      },
      {
        id: "rovello-i-pinetell",
        question: "Rovelló i pinetell són el mateix bolet?",
        answer: <>Els noms populars poden agrupar-los, però al nostre catàleg distingim el rovelló (<i>Lactarius sanguifluus</i>) del pinetell (<i>Lactarius deliciosus</i>). La <Link href="/compare/rovello-vs-pinetell">comparació entre rovelló i pinetell</Link> explica les diferències, inclòs el làtex; aquest tret per si sol no és suficient per identificar-los. Per situar-los dins del grup, consulta la <Link href="/zones/rovellons">guia de rovellons</Link>.</>,
      },
      {
        id: "menjar-crus",
        question: "Els bolets comestibles es poden menjar crus?",
        answer: <>Que una espècie es consideri comestible no vol dir que sigui adequada per menjar crua. L’ACSA recomana cuinar correctament tots els bolets. Consulta les condicions de consum de cada espècie a les <Link href="/bolets-comestibles">fitxes de bolets comestibles</Link>; la cocció no substitueix una identificació segura.</>,
        sources: [officialSafetySource],
      },
    ],
  },
  {
    id: "recolleccio-responsable",
    label: "Recol·lecció responsable",
    title: "Permisos i cura de la collita",
    questions: [
      {
        id: "permisos",
        question: "Cal un permís per collir bolets? S’ha de pagar?",
        answer: <>Depèn del bosc: no hi ha un carnet únic que autoritzi a collir a tot Catalunya. Hi ha restriccions locals i espais amb tiquet, mentre que en d’altres la recol·lecció particular és gratuïta. Revisa la <Link href="/normativa-bolets">guia de permisos per collir bolets</Link> i l’apartat de <Link href="/normativa-bolets#collecting-cost">cost i excepcions</Link>. Confirma les condicions vigents amb el gestor; pagar l’aparcament no equival a tenir permís de recol·lecció.</>,
        sources: [collectingSources.ruralAgents, collectingSources.altPirineuLeisure],
      },
      {
        id: "quantitat",
        question: "Quants quilos de bolets puc collir?",
        answer: <>No extrapolis el límit d’un bosc a tot Catalunya. Comprova si la finca o l’espai fixa una quota, a qui s’aplica i per a quina data i activitat. A les <Link href="/normativa-bolets#collecting-local-rules">regles de recol·lecció per espai</Link> diferenciem exemples locals i dates de les fonts; una quantitat publicada en un any anterior no confirma el límit vigent.</>,
        sources: [collectingSources.ruralAgents],
      },
      {
        id: "tallar-o-arrencar",
        question: "És millor tallar o arrencar els bolets?",
        answer: <>No ho converteixis en una regla universal. Un estudi de llarg termini en boscos suïssos no va detectar una reducció de les collites futures ni en tallar ni en arrencar; en canvi, el trepig va reduir el nombre de bolets. Això no justifica collir sense límits ni remoure el sòl. Respecta les normes del lloc i les <Link href="/normativa-bolets#collecting-care">bones pràctiques de recol·lecció</Link>; el resultat de l’estudi no es pot extrapolar a qualsevol bosc o manera de collir.</>,
        sources: [collectingSources.harvestingStudy, collectingSources.ruralAgents],
      },
      {
        id: "cistell",
        question: "És millor portar un cistell o una bossa per als bolets?",
        answer: <>L’ACSA recomana un cistell rígid i airejat, preferentment de vímet, per evitar que els bolets es deteriorin durant la collita. El recipient no fa segur un bolet mal identificat. Recull només els que coneixes bé i consulta també com <Link href="/normativa-bolets#collecting-care">respectar el bosc quan culls bolets</Link>.</>,
        sources: [officialSafetySource],
      },
      {
        id: "amb-nens",
        question: "Com preparar una sortida a buscar bolets amb nens?",
        answer: <>Tria un recorregut conegut i adequat a l’edat i la condició física del grup. Consulta el temps, porta aigua, menjar, roba visible i mitjans d’orientació, mantén el contacte visual i planifica el retorn abans que es faci fosc. Les <Link href="/zones">guies de zones</Link> expliquen el context del bosc, però no certifiquen itineraris aptes per a infants. Revisa també les <Link href="/normativa-bolets">normes d’accés i recol·lecció</Link> abans de sortir.</>,
        sources: [collectingSources.mountainSafety],
      },
    ],
  },
];

const sources = [...new Map(topics.flatMap((topic) => topic.questions.flatMap((question) => question.sources ?? [])).map((source) => [source.url, source])).values()];

export const metadata = articleMetadata(path, title, description);

export default function MushroomHuntingFaqPage() {
  const url = absoluteUrl(path);

  return (
    <PageShell as="article">
      <FaqFragmentNavigation />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: "Preguntes freqüents sobre anar a buscar bolets",
            description, url, inLanguage: "ca",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            citation: sources.map((source) => source.url),
            ...editorialArticleFields("preguntes-frequents-bolets"),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") },
              { "@type": "ListItem", position: 3, name: "Preguntes freqüents sobre bolets", item: url },
            ],
          },
        ],
      }} />
      <PageHeader
        eyebrow={<><BookOpenText size={15} aria-hidden="true" /> Preguntes freqüents</>}
        title={<>Anar a buscar bolets,<br /><PageTitleAccent>dubtes freqüents.</PageTitleAccent></>}
        description="Quan anar-hi, on buscar, com evitar confusions i què comprovar abans de collir. Quinze respostes curtes amb guies per aprofundir-hi."
        tone="forest"
      />
      <nav className={styles.topics} aria-label="Temes de les preguntes freqüents">
        {topics.map((topic) => (
          <a href={`#${topic.id}`} key={topic.id}>
            {topic.label}<ArrowDown size={16} aria-hidden="true" />
          </a>
        ))}
      </nav>
      <EditorialSafetyNotice />
      {topics.map((topic, topicIndex) => (
        <section className="seo-guide-section" key={topic.id} aria-labelledby={topic.id}>
          <SectionHeader meta={`0${topicIndex + 1} · ${topic.label}`} title={topic.title} titleId={topic.id} />
          <div className={styles.questions}>
            {topic.questions.map((item, questionIndex) => (
              // The browser may reveal a fragment's ancestor before hydration.
              <details className={styles.question} key={item.id} data-faq-question open={topicIndex === 0 && questionIndex === 0} suppressHydrationWarning>
                <summary>
                  <h3>{item.question}</h3>
                  <Plus size={20} aria-hidden="true" />
                </summary>
                {/* A fragment inside the answer lets the browser reveal its
                    closed details ancestor, including without JavaScript. */}
                <div className={styles.answer} id={item.id}>
                  <p>{item.answer}</p>
                  {item.sources && <ul className={styles.sources} aria-label="Fonts d’aquesta resposta">
                    {item.sources.map((source) => <li key={source.id}>Font: <a href={source.url}>{source.publisher}</a></li>)}
                  </ul>}
                  <a className={styles.permalink} href={`#${item.id}`} aria-label={`Enllaç a aquesta resposta: ${item.question}`}>
                    <Link2 size={14} aria-hidden="true" /> Enllaç a aquesta resposta
                  </a>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
      <EditorialAttribution contentId="preguntes-frequents-bolets" sources={sources} />
    </PageShell>
  );
}
