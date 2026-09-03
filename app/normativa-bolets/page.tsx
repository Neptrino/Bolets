import Link from "next/link";
import { ArrowUpRight, MapPinned, ShieldAlert } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { collectingSources } from "@/data/field-guide-sources";
import { absoluteUrl, articleMetadata, metaDescription, pageTitle, SITE_URL } from "@/src/lib/seo";

const path = "/normativa-bolets";
const title = pageTitle("Permisos per collir bolets a Catalunya");
const description = metaDescription("Permisos per collir bolets: Aigüestortes, Virós, Esterri de Cardós, Poblet, Cadí i els Ports. Tiquets, límits i accés amb fonts oficials datades.");

export const metadata = articleMetadata(path, title, description);

export default function CollectingRulesGuidePage() {
  const url = absoluteUrl(path);
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article", "@id": `${url}#article`, headline: "Permisos per collir bolets a Catalunya: guia local",
            description, url, inLanguage: "ca",
            isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` },
            ...editorialArticleFields("normativa-bolets"),
          },
          {
            "@type": "BreadcrumbList", itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") },
              { "@type": "ListItem", position: 3, name: "Permisos i accés al bosc", item: url },
            ],
          },
        ],
      }} />
      <PageHeader
        eyebrow={<><MapPinned size={15} /> Abans de sortir</>}
        title={<>Permisos per collir bolets<br /><PageTitleAccent>a Catalunya.</PageTitleAccent></>}
        description="Una bona previsió de bolets no és un permís per entrar al bosc. Comprova les condicions d’accés, les regles del lloc i les restriccions del dia abans de preparar la sortida."
        layout="split"
      />
      <aside className="intent-safety-note">
        <ShieldAlert size={22} aria-hidden="true" />
        <div><strong>Una guia de consulta, no una autorització.</strong><p>Fonts consultades el <time dateTime="2026-08-27">27 d’agost de 2026</time>. Aquesta pàgina no substitueix la normativa aplicable ni els avisos vigents. Confirma sempre la situació amb el gestor de l’espai.</p></div>
      </aside>
      <section className="seo-guide-section" aria-labelledby="collecting-permit">
        <SectionHeader title="Cal un permís per collir bolets?" titleId="collecting-permit" meta="La resposta depèn del lloc" />
        <p><strong>No hi ha un carnet únic que t’autoritzi a collir bolets a tot Catalunya.</strong> Els Agents Rurals expliquen que hi ha excepcions en espais protegits i que ajuntaments i propietaris poden establir limitacions. Per això, cal concretar el bosc i l’activitat: visitar un parc, circular per una pista i recol·lectar-hi són coses diferents. <a href={collectingSources.ruralAgents.url}>Consulta les preguntes freqüents dels Agents Rurals.</a></p>
        <nav className="rain-guide-actions" aria-label="Anar a una secció de permisos">
          <a href="#collecting-local-rules">Regles per espai <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="#collecting-cost">Cost i excepcions <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="#collecting-groups">Sortides organitzades <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href="#collecting-checks">Abans de sortir <ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-cost">
        <SectionHeader title="Cal pagar per collir bolets?" titleId="collecting-cost" meta="Gratuïtat habitual, excepcions locals" />
        <p><strong>En general, la recol·lecció particular és gratuïta, però hi ha espais amb tiquet de pagament.</strong> És una orientació a partir de les fonts consultades, no una garantia per a qualsevol finca: els <a href={collectingSources.ruralAgents.url}>Agents Rurals expliquen les excepcions locals</a> i el <a href={collectingSources.altPirineuLeisure.url}>Parc Natural de l’Alt Pirineu descriu la gratuïtat habitual amb zones acotades de pagament</a>.</p>
        <p>El <a href="#collecting-viros">Bosc de Virós</a> i la <a href="#collecting-esterri">vall d’Esterri de Cardós</a> són dos d’aquests casos. Hi trobaràs els imports publicats, els límits i la data de la font; no són tarifes ni quotes aplicables a tot Catalunya.</p>
        <p>Que sigui gratuït no elimina les condicions de la propietat ni les restriccions d’accés. Igualment, pagar l’aparcament o una visita guiada no equival a obtenir un permís de recol·lecció.</p>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-local-rules">
        <SectionHeader title="Què canvia segons l’espai?" titleId="collecting-local-rules" meta="Sis casos concrets" description="Les condicions publicades no equivalen a confirmar l’obertura d’avui. Obre la font local i comprova el sector exacte abans de sortir." />
        <div className="seo-guide-grid collecting-area-grid">
          <section>
            <span className="eyebrow">Interior i perifèria diferents</span>
            <h3>Aigüestortes i Estany de Sant Maurici</h3>
            <p>La resposta oficial només permet collir bolets a la zona perifèrica de protecció, no a l’interior del parc nacional. El nom de la vall o de l’itinerari no és suficient: confirma en quin costat del límit ets.</p>
            <p><a href={collectingSources.aiguestortes.url}>Comprova la distinció a les preguntes freqüents del parc.</a></p>
          </section>
          <section aria-labelledby="collecting-viros">
            <span className="eyebrow">Tiquet local publicat</span>
            <h3 id="collecting-viros">Bosc de Virós</h3>
            <p>El Parc Natural de l’Alt Pirineu assenyala zones acotades a Araós i Ainet de Besan amb tiquet diari. No és un passi per a tot el parc.</p>
            <p><strong>Referència local: 5 € per persona i dia, màxim 15 kg.</strong> La font del parc està actualitzada el <time dateTime="2023-07-13">13 de juliol de 2023</time>; vigència per al 2026 no confirmada.</p>
            <p><a href={collectingSources.lleida.url}>Ara Lleida publicava 10 kg per al municipi d’Alins el 2022.</a> Confirma amb el gestor quin límit i quin sector cobreix el tiquet: les dues referències poden correspondre a àmbits o períodes diferents.</p>
            <p><a href={collectingSources.altPirineu.url}>Mira els punts de venda al capítol «Recol·lecció de bolets».</a></p>
          </section>
          <section aria-labelledby="collecting-esterri">
            <span className="eyebrow">Contacta abans de sortir</span>
            <h3 id="collecting-esterri">Vall d’Esterri de Cardós</h3>
            <p>El parc també hi publica un tiquet diari i recomana contactar abans amb l’Ajuntament per concretar la compra i l’estat de les vies d’accés.</p>
            <p><strong>Referència local: 3 € per persona i dia, màxim 10 kg.</strong> La font del parc està actualitzada el <time dateTime="2023-07-13">13 de juliol de 2023</time>; vigència per al 2026 no confirmada.</p>
            <p><a href={collectingSources.altPirineu.url}>Consulta el contacte i la informació oficial d’Esterri de Cardós.</a></p>
          </section>
          <section>
            <span className="eyebrow">Carnet actual no confirmat</span>
            <h3>Bosc de Poblet</h3>
            <p>La FAQ dels Agents Rurals esmenta una autorització de recol·lecció, però els consells del paratge no concreten un carnet individual ni una tarifa vigent. No podem resoldre aquesta manca de confirmació amb una notícia antiga. Pregunta al PNIN abans de donar per fet que cal pagar o que no cal permís.</p>
            <p><a href={collectingSources.poblet.url}>Consulta el paratge</a> i <a href={collectingSources.ruralAgents.url}>la referència dels Agents Rurals</a>. Les activitats organitzades tenen un tràmit propi.</p>
          </section>
          <section>
            <span className="eyebrow">Propietat i senyals</span>
            <h3>Cadí-Moixeró</h3>
            <p>La normativa del parc recorda que els bolets formen part dels recursos del propietari del bosc. No es poden collir a les finques on la propietat ho prohibeix amb la senyalització corresponent. Respecta també els accessos i les indicacions del personal del parc.</p>
            <p><a href={collectingSources.cadi.url}>Llegeix l’apartat de recol·lecció del Cadí-Moixeró.</a></p>
          </section>
          <section>
            <span className="eyebrow">Recol·lecció i grups</span>
            <h3>Els Ports</h3>
            <p>El parc exigeix respectar les prohibicions de recol·lecció senyalitzades per la propietat, la circulació regulada i les indicacions dels agents i gestors. Les visites en grup poden requerir autorització encara que no es cobri una entrada.</p>
            <p><a href={collectingSources.ports.url}>Consulta la regulació dels Ports i els límits dels grups.</a></p>
          </section>
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-groups">
        <SectionHeader title="Una sortida organitzada pot necessitar un altre tràmit" titleId="collecting-groups" meta="Particular, grup o activitat comercial" />
        <div className="seo-guide-grid collecting-area-grid">
          <section><h3>Poblet: antelació mínima d’un mes</h3><p>El paratge demana autorització prèvia per a qualsevol activitat organitzada i presentar la sol·licitud al registre de la Generalitat almenys un mes abans. <a href={collectingSources.poblet.url}>Consulta el procediment indicat pel PNIN.</a></p></section>
          <section><h3>Els Ports: persones i vehicles</h3><p>El parc fixa autorització prèvia per a visites de més de 40 persones, més de 4 vehicles o més de 7 motocicletes o ciclomotors. No cal superar tots tres llindars. <a href={collectingSources.ports.url}>Consulta les condicions dels Ports.</a></p></section>
        </div>
        <p><a href={collectingSources.authorisation.url}>Obre el tràmit oficial d’autorització d’activitats en espais naturals protegits.</a> Descriu l’activitat, el lloc, la data i els participants; presentar una sol·licitud no equival a tenir-la aprovada. El gestor pot establir condicions.</p>
        <p>Si la finalitat és comercial, no donis per fet que les condicions d’una sortida recreativa hi serveixen. Aquesta guia no cobreix els requisits de comercialització: concreta l’aprofitament amb el titular o gestor i consulta l’autoritat competent abans de vendre.</p>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-checks">
        <SectionHeader title="Quatre comprovacions abans de sortir" titleId="collecting-checks" meta="Permisos, accés i activitat" />
        <div className="seo-guide-grid">
          <section><h3>1. Identifica el lloc</h3><p>Concreta el municipi, la finca i, si escau, el parc o paratge. Pregunta al gestor o a la propietat quines condicions afecten la recol·lecció al lloc escollit. No extrapolis una resposta d’un bosc a un altre.</p></section>
          <section><h3>2. Confirma què vols fer</h3><p>Explica si és una sortida particular, una activitat organitzada o una recol·lecció comercial. Si cal tiquet, comprova a qui autoritza, per a quina data i sector, i amb quin límit. No donis per vigent un carnet o una quota que aparegui en un article antic.</p></section>
          <section><h3>3. Revisa el risc del dia</h3><p>Consulta el <a href={collectingSources.alfa.url}>mapa oficial del Pla Alfa</a> i els avisos del parc. El risc d’incendi pot comportar restriccions d’accés. El nostre mapa de bolets no mostra ni valida aquests permisos.</p></section>
          <section><h3>4. Comprova l’arribada</h3><p>Verifica les pistes obertes, la senyalització i l’aparcament autoritzat amb la informació local. Poder arribar a un bosc a peu no implica poder-hi circular amb vehicle o estacionar-hi en qualsevol punt. Una taxa d’aparcament o d’accés motoritzat no és un permís de recol·lecció.</p></section>
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-equipment">
        <SectionHeader title="Equip bàsic per anar a buscar bolets" titleId="collecting-equipment" meta="Cistell, orientació i tornada segura" />
        <div className="seo-guide-grid">
          <section><h3>Cistell rígid i airejat</h3><p>L’ACSA recomana un cistell, preferentment de vímet, que eviti aixafar els bolets. El recipient no fa segur un exemplar mal identificat i no justifica remoure la fullaraca.</p></section>
          <section><h3>Orientació i bateria</h3><p>Porta un mapa o una aplicació d’orientació, bateria suficient i una alternativa que no depengui de cobertura. Comparteix l’itinerari previst i fixa una hora de tornada.</p></section>
          <section><h3>Roba, aigua i visibilitat</h3><p>Adapta el calçat i la roba al terreny, porta aigua, menjar i una peça visible. No confiïs en una previsió de bolets com si fos una previsió meteorològica o d’accés.</p></section>
          <section><h3>Ganivet, no rasclet</h3><p>Si portes una eina de tall, guarda-la amb seguretat. No utilitzis rasclets ni eines per remoure el sòl o la molsa: malmeten el bosc i no ajuden a identificar l’exemplar.</p></section>
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="collecting-care">
        <SectionHeader title="Deixa el bosc en bon estat" titleId="collecting-care" meta="Recol·lecció responsable" />
        <p>La Xarxa de Parcs Naturals recomana no remoure la terra ni malmetre el bosc amb eines quan es busquen bolets, i collir només els que es coneixen bé. Recull les teves deixalles i respecta l’entorn. <a href={collectingSources.parks.url}>Consulta les recomanacions de recol·lecció de la Xarxa de Parcs.</a></p>
        <p>El permís d’accés i la seguretat alimentària són qüestions diferents: una autorització no identifica cap bolet. Davant del dubte, no el consumeixis i segueix els <a href={officialSafetySource.url}>consells de l’ACSA</a>.</p>
        <nav className="rain-guide-actions" aria-label="Preparar una sortida responsable">
          <Link href="/guies">Guies per territori <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/bolets-avui">Condicions de fructificació <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/bolets-verinosos">Seguretat i confusions <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/preguntes-frequents-bolets#recolleccio-responsable">Dubtes sobre recol·lecció responsable <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>
      <EditorialAttribution contentId="normativa-bolets" sources={[...Object.values(collectingSources), officialSafetySource]} />
    </PageShell>
  );
}
