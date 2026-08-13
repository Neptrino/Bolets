import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CircleSlash2,
  CloudRain,
  CloudSun,
  Database,
  Droplets,
  Equal,
  ExternalLink,
  FlaskConical,
  Gauge,
  Grid3X3,
  Layers3,
  Map,
  Mountain,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Sigma,
  Sprout,
  ThermometerSun,
  Trees,
} from "lucide-react";
import { speciesProfiles } from "@/data/species";
import { suitabilityScale } from "@/src/lib/suitability-scale";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Mètode del mapa de bolets",
  description:
    "Fórmules, factors, llindars i límits dels mapes d’hàbitat potencial i de predicció de Bolets Atles.",
  alternates: { canonical: "/metode" },
  openGraph: {
    url: "/metode",
    title: "Mètode del mapa de bolets",
    description: "Com calculem l’hàbitat potencial i les condicions de fructificació dels bolets de Catalunya.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mètode del mapa de bolets",
    description: "Com calculem l’hàbitat potencial i les condicions de fructificació dels bolets de Catalunya.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

const sharedModel = speciesProfiles[0].modelConfig;

const factorSymbols: Record<string, string> = {
  forest: "H",
  soil: "S",
  rainfall: "P",
  soilMoisture: "M",
  temperature: "T",
  altitude: "A",
  humidity: "HR",
  seasonality: "E",
};

function suitabilityRange(index: number) {
  const band = suitabilityScale[index];
  const nextBand = suitabilityScale[index + 1];
  return nextBand ? `${band.minimum}—${nextBand.minimum - 1}` : `${band.minimum}—100`;
}

function AltitudeCurve() {
  return (
    <figure className="method-curve" aria-labelledby="altitude-curve-title">
      <figcaption id="altitude-curve-title">
        <span>Resposta d’altitud A(h)</span>
        <small>La mateixa corba s’aplica al mapa estàtic i al factor d’altitud.</small>
      </figcaption>
      <svg viewBox="0 0 720 230" role="img" aria-label="La puntuació puja de zero a 75 abans del límit mínim, arriba a 100 dins del rang central i baixa simètricament després del límit màxim.">
        <g className="curve-grid">
          <line x1="64" y1="30" x2="64" y2="182" />
          <line x1="64" y1="182" x2="681" y2="182" />
          <line x1="64" y1="68" x2="681" y2="68" />
          <line x1="64" y1="96" x2="681" y2="96" />
        </g>
        <path className="curve-area" d="M92 182 L180 96 L268 68 L477 68 L565 96 L653 182 Z" />
        <path className="curve-line" d="M92 182 L180 96 L268 68 L477 68 L565 96 L653 182" />
        <g className="curve-dots">
          <circle cx="92" cy="182" r="5" />
          <circle cx="180" cy="96" r="5" />
          <circle cx="268" cy="68" r="5" />
          <circle cx="477" cy="68" r="5" />
          <circle cx="565" cy="96" r="5" />
          <circle cx="653" cy="182" r="5" />
        </g>
        <g className="curve-labels">
          <text x="52" y="72">100</text>
          <text x="53" y="100">75</text>
          <text x="58" y="187">0</text>
          <text x="92" y="209" textAnchor="middle">mín − 100 m</text>
          <text x="180" y="209" textAnchor="middle">mín</text>
          <text x="372" y="50" textAnchor="middle">interior ecològic · 100</text>
          <text x="565" y="209" textAnchor="middle">màx</text>
          <text x="653" y="209" textAnchor="middle">màx + 100 m</text>
        </g>
      </svg>
      <p>Els 100 m interiors de cada extrem fan la transició de 75 a 100. En rangs més estrets que 200 m, les dues transicions es troben al punt mitjà.</p>
    </figure>
  );
}

function Formula({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="method-formula" aria-label={label}>
      {children}
    </div>
  );
}

export default function MethodPage() {
  return (
    <div className="method-page">
      <section className="method-hero">
        <div className="method-hero-orbit method-hero-orbit-one" aria-hidden="true" />
        <div className="method-hero-orbit method-hero-orbit-two" aria-hidden="true" />
        <div className="page-width method-hero-grid">
          <div className="method-hero-copy">
            <p className="eyebrow light"><ShieldCheck size={15} /> Mètode obert</p>
            <h1>Cap caixa<br /><i>negra.</i></h1>
            <p>Expliquem com passem d’una cel·la de territori a un indicador de compatibilitat. Què suma, què limita i quan preferim no publicar cap puntuació.</p>
            <nav className="method-jump-links" aria-label="Índex del mètode">
              <a href="#distribucio">01 · Distribució</a>
              <a href="#prediccio">02 · Predicció</a>
              <a href="#publicacio">03 · Publicació</a>
              <a href="#fonts">04 · Fonts</a>
            </nav>
          </div>
          <div className="method-hero-equation" aria-label="Resum de la fórmula de predicció">
            <div className="method-equation-meta">
              <span>MODEL DE FRUCTIFICACIÓ</span>
              <span>0—100</span>
            </div>
            <div className="method-equation-main">
              <span className="method-equation-score">F</span>
              <Equal aria-hidden="true" />
              <span className="method-equation-fraction">
                <span><Sigma aria-hidden="true" /> w<sub>i</sub> · s<sub>i</sub></span>
                <span><Sigma aria-hidden="true" /> w<sub>i</sub></span>
              </span>
            </div>
            <div className="method-equation-legend">
              <p><b>s<sub>i</sub></b> resposta ambiental de cada factor</p>
              <p><b>w<sub>i</sub></b> pes versionat per a l’espècie</p>
            </div>
            <div className="method-equation-stamp">
              <Database size={16} /> Configuració ecològica única per a fitxes i mapes
            </div>
          </div>
        </div>
        <a href="#principi" className="method-scroll"><ArrowDown size={16} /> Comenceu pel principi</a>
      </section>

      <section id="principi" className="page-width method-principle" aria-labelledby="principle-title">
        <div className="method-section-heading">
          <p className="eyebrow">Una distinció important</p>
          <h2 id="principle-title">On pot viure no és<br />el mateix que si fructifica ara.</h2>
        </div>
        <div className="method-dual-track">
          <article>
            <span className="method-track-number">01</span>
            <Trees size={25} />
            <h3>Distribució potencial</h3>
            <p>Una lectura estàtica de coberta, altitud i pH. Delimita on l’ecologia coneguda és compatible.</p>
            <strong>No utilitza el temps d’avui.</strong>
          </article>
          <div className="method-not-equal" aria-label="no és igual"><CircleSlash2 size={24} /></div>
          <article>
            <span className="method-track-number">02</span>
            <CloudRain size={25} />
            <h3>Predicció actual</h3>
            <p>Combina aquell hàbitat amb pluja, humitat, temperatura i moment de temporada.</p>
            <strong>No és una garantia de trobar bolets.</strong>
          </article>
        </div>
      </section>

      <section id="distribucio" className="method-band method-band-blue">
        <div className="page-width method-chapter">
          <aside className="method-chapter-index" aria-hidden="true">
            <span>01</span>
            <div />
            <small>DISTRIBUCIÓ</small>
          </aside>
          <div className="method-chapter-body">
            <header className="method-chapter-header">
              <div>
                <p className="eyebrow"><Grid3X3 size={15} /> Model estàtic</p>
                <h2>Primer, filtrem<br />el territori.</h2>
              </div>
              <p>Catalunya es divideix en cel·les base verificades de 250 × 250 m. Cada cel·la ha de passar tres portes ecològiques abans de poder aparèixer al mapa.</p>
            </header>

            <div className="method-gates" aria-label="Tres portes de compatibilitat ecològica">
              <article>
                <span>01</span>
                <Trees size={23} />
                <h3>Coberta</h3>
                <p>Sumem la fracció real de cobertes que coincideixen amb boscos, arbres associats o hostes de l’espècie.</p>
              </article>
              <article>
                <span>02</span>
                <Gauge size={23} />
                <h3>Altitud</h3>
                <p>La cota ha de quedar dins del rang ecològic o del marge exterior de 100 m. La vora rep menys intensitat.</p>
              </article>
              <article>
                <span>03</span>
                <Sprout size={23} />
                <h3>pH del sòl</h3>
                <p>Quan l’espècie té un rang de pH documentat, el pH de la cel·la ha de quedar dins d’aquest rang. Sense evidència verificada, no es publica.</p>
              </article>
            </div>

            <div className="method-static-formulas">
              <article className="method-formula-card">
                <span className="method-formula-kicker">COBERTURA EXACTA · 250 m</span>
                <Formula label="La cobertura compatible és la suma de les fraccions de coberta coincidents, sempre que l'altitud i el pH siguin compatibles.">
                  C<sub>250</sub> = <Sigma size={28} /> q<sub>j compatible</sub> · 𝟙<sub>A(h)&gt;0</sub> · 𝟙<sub>pH dins rang</sub>
                </Formula>
                <p><b>q<sub>j</sub></b> és la proporció mostrejada de cada coberta. Per tant, un 35% de pineda compatible aporta 0,35: mai converteix tota la cel·la en un 100%.</p>
              </article>
              <article className="method-formula-card method-formula-card-accent">
                <span className="method-formula-kicker">INTENSITAT DEL BLAU</span>
                <Formula label="La intensitat del mapa és la cobertura compatible multiplicada pel pes d'altitud.">
                  I<sub>250</sub> = C<sub>250</sub> · A(h)
                </Formula>
                <p>La predicció conserva <b>C</b> com a factor d’hàbitat i <b>A</b> com a factor d’altitud separat; així no els compta dues vegades.</p>
              </article>
            </div>

            <AltitudeCurve />

            <div className="method-aggregation">
              <div className="method-aggregation-copy">
                <p className="eyebrow"><Layers3 size={15} /> Quan allunyem el mapa</p>
                <h3>No engrandim una etiqueta.<br />Agreguem les cel·les base.</h3>
                <p>Per a una cel·la de costat <b>g</b>, el denominador és tot el seu mosaic de 250 m. Això manté estable el percentatge encara que només en veiem un fragment a la pantalla.</p>
              </div>
              <div className="method-aggregation-equations">
                <Formula label="La cobertura agregada és la suma de cobertures base dividida pel nombre de cel·les base del mosaic.">
                  C<sub>g</sub> = <span className="method-inline-fraction"><span>Σ C<sub>250</sub></span><span>(g / 250)²</span></span>
                </Formula>
                <Formula label="La intensitat agregada és la suma de cobertures ponderades per altitud dividida pel nombre de cel·les base.">
                  I<sub>g</sub> = <span className="method-inline-fraction"><span>Σ (C<sub>250</sub> · A(h))</span><span>(g / 250)²</span></span>
                </Formula>
                <Formula label="La idoneïtat d'altitud agregada es calcula només dins de la cobertura compatible.">
                  A<sub>g</sub> = <span className="method-inline-fraction"><span>I<sub>g</sub></span><span>C<sub>g</sub></span></span>
                </Formula>
                <p>En predicció, el color de la puntuació es barreja amb el color d’exclusió segons <b>C<sub>g</sub></b>. Una clapa petita compatible no tenyeix tot el sector com si fos uniforme.</p>
                <small>Resolucions de visualització: 250 m, 1 km, 2,5 km, 5 km i 10 km.</small>
              </div>
            </div>

            <aside className="method-occurrence-note">
              <Database size={24} />
              <div>
                <h3>I les observacions històriques?</h3>
                <p>Els registres de FungaCAT/GBIF només corroboren presència passada en quadrícules generalitzades d’almenys 10 km. No entren en cap fórmula, no amplien l’hàbitat i l’absència de registres mai compta com a absència de l’espècie.</p>
              </div>
              <strong>pes = 0</strong>
            </aside>
          </div>
        </div>
      </section>

      <section id="prediccio" className="method-band method-band-paper">
        <div className="page-width method-chapter">
          <aside className="method-chapter-index" aria-hidden="true">
            <span>02</span>
            <div />
            <small>PREDICCIÓ</small>
          </aside>
          <div className="method-chapter-body">
            <header className="method-chapter-header">
              <div>
                <p className="eyebrow"><Sigma size={15} /> Model dinàmic</p>
                <h2>Després, llegim<br />el moment.</h2>
              </div>
              <p>Cada factor produeix una resposta entre 0 i 100. El resultat inicial és una mitjana ponderada dels factors coneguts, sempre que la cel·la superi abans els criteris de publicació.</p>
            </header>

            <div className="method-score-equation">
              <Formula label="La puntuació inicial és la mitjana ponderada de les respostes dels factors coneguts.">
                F<sub>base</sub> = arrodoneix&nbsp;
                <span className="method-inline-fraction method-inline-fraction-large">
                  <span>Σ w<sub>i</sub> s<sub>i</sub></span>
                  <span>Σ w<sub>i</sub></span>
                </span>
              </Formula>
              <p>Els pesos sumen 100%. Són configuració versionada, no valors escrits només per a aquesta pàgina.</p>
            </div>

            <div className="method-factor-grid">
              {sharedModel.factors.map((factor, index) => (
                <article key={factor.id} style={{ "--factor-weight": `${factor.weight * 100}%`, "--factor-order": index } as React.CSSProperties}>
                  <div className="method-factor-topline">
                    <span>{factorSymbols[factor.id]}</span>
                    <strong>{Math.round(factor.weight * 100)}%</strong>
                  </div>
                  <h3>{factor.label}</h3>
                  <p>{factor.explanation}</p>
                  <div className="method-factor-bar" aria-hidden="true"><span /></div>
                </article>
              ))}
            </div>

            <div className="method-subscore-heading">
              <p className="eyebrow">Dins dels factors</p>
              <h3>Les respostes que més transformem</h3>
              <p><b>clamp(x)</b> limita qualsevol resultat a l’interval 0—100.</p>
            </div>

            <div className="method-subscore-grid">
              <article className="method-subscore method-subscore-rain">
                <div className="method-subscore-title"><CloudRain size={24} /><div><span>P · PLUJA I MEMÒRIA HÍDRICA</span><h4>Un pols recent, corregit per la memòria del sòl.</h4></div></div>
                <div className="method-rain-steps">
                  <div>
                    <b>1 · Pluja efectiva recent</b>
                    <Formula label="La pluja efectiva recent descompta la meitat de l'evapotranspiració de referència i dona la meitat de pes als dies quatre a set.">
                      R<sub>ef</sub> = max(0, R<sub>3</sub> − 0,5 ET<sub>3</sub>) + 0,5 max(0, R<sub>4–7</sub> − 0,5 ET<sub>4–7</sub>)
                    </Formula>
                    <p>Pols recent = clamp(R<sub>ef</sub> / 15 mm × 100)</p>
                  </div>
                  <div>
                    <b>2 · Preparació anterior</b>
                    <Formula label="La preparació anterior combina mitjana, mínim i tendència d'humitat del sòl, balanç hídric i retenció de la ratxa seca.">
                      Q = 0,30 M̄<sub>7</sub> + 0,15 M<sub>mín7</sub> + 0,15 ΔM<sub>7</sub> + 0,25 B<sub>8–30</sub> + 0,15 L<sub>seca</sub>
                    </Formula>
                    <p><b>B<sub>8–30</sub></b> compara pluja i ET₀ dels dies 8—30. <b>L<sub>seca</sub></b> = clamp((1 − dies secs / 14) × 100).</p>
                  </div>
                  <div>
                    <b>3 · Resposta final</b>
                    <Formula label="La pluja final és el màxim entre el pols recent i l'arrossegament anterior, modulat per la dependència de la humitat prèvia.">
                      P = max(pols, 0,5 B<sub>8–30</sub> L<sub>seca</sub> / 100) · ((1 − d) + dQ / 100)
                    </Formula>
                    <p><b>d</b> tradueix la dependència d’humitat prèvia: moderada 0,55 · important 0,70 · molt important o essencial 0,85 · valor general 0,65.</p>
                  </div>
                </div>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><Sprout size={24} /><div><span>M · HUMITAT DEL SÒL</span><h4>Distància al nivell preferit.</h4></div></div>
                <Formula label="La humitat del sòl perd punts linealment a mesura que s'allunya del valor objectiu.">
                  M = clamp(100 − |m − μ| / 0,20 × 100)
                </Formula>
                <p>μ = 0,16 si la preferència és baixa · 0,24 si és mitjana · 0,32 si és alta. El factor usa la mitjana de 24 h, amb el valor actual com a alternativa.</p>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><ThermometerSun size={24} /><div><span>T · TEMPERATURA</span><h4>Rang ideal amb memòria de 10 dies.</h4></div></div>
                <Formula label="Dins del rang de temperatura la resposta és cent; fora, perd punts segons la distància dividida per l'amplada del rang.">
                  T = 100 dins [T<sub>mín</sub>, T<sub>màx</sub>]; fora: max(0, 100 − distància / amplada × 100)
                </Formula>
                <p>La referència és la mitjana de 10 dies. Una temperatura mínima ≤ 0 °C limita el factor a 10, o a 35 si la fitxa documenta tolerància. Una temperatura màxima situada ≥ 3 °C o ≥ 6 °C per sobre de l’ideal el limita a 50 o 25.</p>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><Gauge size={24} /><div><span>HR + E · ATMOSFERA I TEMPORADA</span><h4>Resposta ràpida amb memòria limitada.</h4></div></div>
                <Formula label="Cada finestra d'humitat relativa puntua 100 entre el 65 % i el 90 %; fora d’aquest interval, resta 2 punts per cada punt de distància respecte del 75 %.">
                  H(h) = 100 si 65 ≤ h ≤ 90; fora: max(0, 100 − 2|h − 75|)
                </Formula>
                <p>La base és <b>H(HR̄<sub>24 h</sub>)</b>. Si la mitjana de 7 dies és inferior al 65% i dona una resposta pitjor, HR = 0,75 H(HR̄<sub>24 h</sub>) + 0,25 H(HR̄<sub>7 d</sub>); en cap altre cas la finestra setmanal augmenta o redueix la puntuació. Sense aquesta finestra, conservem la base de 24 h.</p>
                <div className="method-season-scale" aria-label="Puntuacions d'activitat estacional">
                  <span><i />Inactiva <b>0</b></span>
                  <span><i />Possible <b>35</b></span>
                  <span><i />Moderada <b>65</b></span>
                  <span><i />Bona <b>85</b></span>
                  <span><i />Pic <b>100</b></span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="publicacio" className="method-band method-band-dark">
        <div className="page-width method-chapter">
          <aside className="method-chapter-index" aria-hidden="true">
            <span>03</span>
            <div />
            <small>PUBLICACIÓ</small>
          </aside>
          <div className="method-chapter-body">
            <header className="method-chapter-header">
              <div>
                <p className="eyebrow light"><ShieldCheck size={15} /> Prudència abans que precisió aparent</p>
                <h2>De vegades, la millor<br />puntuació és cap.</h2>
              </div>
              <p>No omplim buits amb suposicions. Abans de pintar una cel·la, comprovem actualitat, evidència estàtica i completitud. Després apliquem límits ecològics que una mitjana no pot compensar.</p>
            </header>

            <div className="method-publication-grid">
              <article className="method-publish-card method-publish-withhold">
                <span><CircleSlash2 size={21} /> ES MOSTRA «SENSE DADES»</span>
                <ul>
                  <li><Check size={16} /> La instantània és antiga.</li>
                  <li><Check size={16} /> Falta hàbitat compatible o evidència del sòl.</li>
                  <li><Check size={16} /> Falta pluja, humitat del sòl o temperatura.</li>
                  <li><Check size={16} /> Els factors coneguts pesen menys del 70%.</li>
                </ul>
              </article>
              <article className="method-publish-card method-publish-zero">
                <span><CircleSlash2 size={21} /> RESULTAT FORÇAT A 0</span>
                <ul>
                  <li><Check size={16} /> Cobertura ecològica exacta = 0.</li>
                  <li><Check size={16} /> Altitud al límit exterior o més enllà.</li>
                  <li><Check size={16} /> Mes d’activitat inactiva per a l’espècie.</li>
                </ul>
              </article>
              <article className="method-publish-card method-publish-cap">
                <span><Gauge size={21} /> RESULTAT LIMITAT</span>
                <ul>
                  <li><Check size={16} /> Gelada recent: màxim 20; 55 amb tolerància documentada.</li>
                  <li><Check size={16} /> Mes només possible: màxim 55.</li>
                  <li><Check size={16} /> Estrès actual: pluja, temperatura, sòl i humitat imposen un sostre.</li>
                </ul>
              </article>
            </div>

            <div className="method-stress">
              <div>
                <p className="eyebrow light">El sostre d’estrès</p>
                <h3>Un factor molt dolent no pot quedar amagat dins d’una bona mitjana.</h3>
                <p>Per cada factor dinàmic per sota de 45, definim la severitat <b>e = (45 − s) / 45</b>. Ordenem les severitats i fem servir les dues més grans.</p>
              </div>
              <Formula label="El sostre d'estrès és cinquanta-cinc menys vint vegades la severitat més gran i trenta-cinc vegades la segona.">
                sostre = max(0, arrodoneix(55 − 20e<sub>1</sub> − 35e<sub>2</sub>))
              </Formula>
            </div>

            <div className="method-label-scale" aria-label="Etiquetes finals segons puntuació">
              <div className="method-label-scale-heading">
                <span>ETIQUETA FINAL</span>
                <small>després dels valors zero i dels límits</small>
              </div>
              <div className="method-label-ranges">
                {suitabilityScale.map((band, index) => (
                  <span key={band.id} style={{ backgroundColor: band.color }}>
                    <b>{suitabilityRange(index)}</b>
                    {band.label}
                  </span>
                ))}
              </div>
            </div>

            <aside className="method-resolution-note">
              <Map size={25} />
              <div>
                <h3>Resolució de pantalla ≠ resolució de la font</h3>
                <p>La cel·la visible pot ser de 250 m a 10 km, però sempre conserva la resolució real del relleu, la coberta, el sòl i el proveïdor meteorològic. La geologia conserva per separat l’escala cartogràfica 1:50.000, que no equival a una resolució de 50 m. Les condicions agregades preserven també mínimes, màximes, vent i hores de gelada.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="fonts" className="method-band method-band-sources">
        <div className="page-width method-chapter">
          <aside className="method-chapter-index" aria-hidden="true">
            <span>04</span>
            <div />
            <small>FONTS</small>
          </aside>
          <div className="method-chapter-body">
            <header className="method-chapter-header">
              <div>
                <p className="eyebrow"><Database size={15} /> Traçabilitat de principi a fi</p>
                <h2>D’on surten<br />les dades.</h2>
              </div>
              <p>Cada valor publicat conserva la font, la data i la resolució o escala d’origen. Les capes estàtiques es preparen fora de línia; les condicions ambientals s’ingereixen al servidor i mai es demanen directament des del navegador.</p>
            </header>

            <div className="method-source-lanes" aria-label="Flux de les fonts cap als dos models">
              <span><Mountain size={18} /> Territori estàtic</span>
              <i aria-hidden="true" />
              <span><CloudSun size={18} /> Condicions dinàmiques</span>
              <i aria-hidden="true" />
              <span><Database size={18} /> Instantània normalitzada</span>
              <i aria-hidden="true" />
              <span><Sigma size={18} /> Distribució + predicció</span>
            </div>

            <div className="method-source-group">
              <div className="method-source-group-heading">
                <span>01</span>
                <div>
                  <p className="eyebrow">Territori estàtic</p>
                  <h3>La base de cada cel·la de 250 m</h3>
                </div>
                <small>Rebuild versionat · no depèn del temps d’avui</small>
              </div>
              <div className="method-source-grid method-source-grid-static">
                <article className="method-source-card">
                  <div className="method-source-card-top"><Mountain size={24} /><span>ICGC</span></div>
                  <h4>Model d’elevacions del terreny</h4>
                  <p>WCS del MDT de Catalunya. Mostregem una altitud per cel·la i la fem servir a la porta d’hàbitat i a la resposta A(h).</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>5 / 15 m</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>reconstrucció estàtica</dd></div>
                    <div><dt>Ús</dt><dd>distribució + predicció</dd></div>
                    <div><dt>Llicència</dt><dd>CC BY 4.0</dd></div>
                  </dl>
                  <a href="https://www.icgc.cat/ca/Geoinformacio-i-mapes/Geoinformacio-en-linia-Geoserveis/WMS-i-WCS-Elevacions/WCS-del-Model-dElevacions-del-Terreny" target="_blank" rel="noreferrer">Fitxa oficial <ExternalLink size={14} /></a>
                </article>

                <article className="method-source-card">
                  <div className="method-source-card-top"><Trees size={24} /><span>ICGC · 2024</span></div>
                  <h4>Mapa de cobertes del sòl</h4>
                  <p>Raster de 41 classes. El mostregem cada 50 m i retenim totes les fraccions reconegudes, no només la coberta dominant.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>1 m</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>reconstrucció estàtica</dd></div>
                    <div><dt>Ús</dt><dd>cobertura compatible</dd></div>
                    <div><dt>Llicència</dt><dd>CC BY 4.0</dd></div>
                  </dl>
                  <a href="https://www.icgc.cat/ca/Geoinformacio-i-mapes/Mapes/Mapa-de-cobertes-del-sol-de-Catalunya" target="_blank" rel="noreferrer">Fitxa oficial <ExternalLink size={14} /></a>
                </article>

                <article className="method-source-card">
                  <div className="method-source-card-top"><FlaskConical size={24} /><span>ISRIC · SoilGrids 2.0</span></div>
                  <h4>Propietats del sòl</h4>
                  <p>pH, argila, sorra i llim. El pH actua com a porta ecològica; les fraccions granulomètriques descriuen la textura.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>250 m</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>reconstrucció estàtica</dd></div>
                    <div><dt>Ús</dt><dd>hàbitat + factor sòl</dd></div>
                    <div><dt>Llicència</dt><dd>CC BY 4.0</dd></div>
                  </dl>
                  <a href="https://docs.isric.org/globaldata/soilgrids/index.html" target="_blank" rel="noreferrer">Documentació oficial <ExternalLink size={14} /></a>
                </article>

                <article className="method-source-card">
                  <div className="method-source-card-top"><Layers3 size={24} /><span>ICGC · v3r0</span></div>
                  <h4>Mapa geològic de Catalunya</h4>
                  <p>Unitats geològiques a escala 1:50.000. Estimem la cobertura dins de cada cel·la canònica de 250 m amb una malla de mostreig de 50 m i agreguem els nivells més grossos per àrea. És evidència contextual: no entra en cap puntuació.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>escala 1:50.000</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>reconstrucció estàtica</dd></div>
                    <div><dt>Ús</dt><dd>context geològic · pes 0</dd></div>
                    <div><dt>Llicència</dt><dd>CC BY 4.0</dd></div>
                  </dl>
                  <a href="https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-geologica-i-geofisica/Cartografia-geologica/Mapa-geologic-150000" target="_blank" rel="noreferrer">Fitxa oficial <ExternalLink size={14} /></a>
                </article>

                <article className="method-source-card method-source-card-mask">
                  <div className="method-source-card-top"><Map size={24} /><span>ICGC</span></div>
                  <h4>Límit terrestre de Catalunya</h4>
                  <p>La màscara versionada retalla totes les quadrícules a terra catalana. No afegeix ni resta punts al model.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Detall oficial</dt><dd>1:5.000</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>versió fixada</dd></div>
                    <div><dt>Ús</dt><dd>retall cartogràfic</dd></div>
                    <div><dt>Pes</dt><dd>0</dd></div>
                  </dl>
                  <a href="https://www.icgc.cat/ca/Geoinformacio-i-mapes/Dades-i-productes/Geoinformacio-cartografica/Divisions-administratives" target="_blank" rel="noreferrer">Fitxa oficial <ExternalLink size={14} /></a>
                </article>
              </div>
            </div>

            <div className="method-source-group">
              <div className="method-source-group-heading">
                <span>02</span>
                <div>
                  <p className="eyebrow">Condicions dinàmiques</p>
                  <h3>El temps i la memòria recent</h3>
                </div>
                <small>Ingestió autenticada · instantània diària</small>
              </div>
              <div className="method-source-grid method-source-grid-dynamic">
                <article className="method-source-card method-source-card-weather">
                  <div className="method-source-card-top"><CloudSun size={24} /><span>MÉTÉO-FRANCE · OPEN-METEO</span></div>
                  <h4>AROME France</h4>
                  <p>Temperatura, humitat relativa, precipitació, vent i ET₀. Les sèries horàries alimenten les finestres de 24 h, la memòria d’humitat relativa de 7 dies, les finestres hídriques de 3/7/30 dies i els extrems de temperatura de 10 dies.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>2,5 km · horari</dd></div>
                    <div><dt><RefreshCw size={14} /> Proveïdor</dt><dd>cada 3 h</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>diari</dd></div>
                    <div><dt>Ús</dt><dd>P · T · HR</dd></div>
                  </dl>
                  <a href="https://open-meteo.com/en/docs/meteofrance-api" target="_blank" rel="noreferrer">Documentació del model <ExternalLink size={14} /></a>
                </article>

                <article className="method-source-card method-source-card-moisture">
                  <div className="method-source-card-top"><Droplets size={24} /><span>OPEN-METEO · LAND MODEL</span></div>
                  <h4>Humitat del sòl superficial</h4>
                  <p>Contingut volumètric a 3—9 cm. Conservem valor actual, mínim, mitjana, màxim i tendència de 7 dies com una font separada i més gruixuda.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>9 km · horari</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>diari</dd></div>
                    <div><dt>Ús</dt><dd>M + memòria de P</dd></div>
                    <div><dt>Unitat</dt><dd>m³/m³</dd></div>
                  </dl>
                  <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Documentació de variables <ExternalLink size={14} /></a>
                </article>
              </div>
            </div>

            <div className="method-source-group method-source-group-evidence">
              <div className="method-source-group-heading">
                <span>03</span>
                <div>
                  <p className="eyebrow">Evidència independent</p>
                  <h3>Observacions històriques</h3>
                </div>
                <small>Presència només · actualització mensual</small>
              </div>
              <article className="method-source-evidence">
                <div className="method-source-card-top"><Database size={24} /><span>FUNGACAT · GBIF</span></div>
                <div>
                  <h4>Banco de datos de los hongos de Cataluña</h4>
                  <p>Filtrem registres amb problemes taxonòmics o espacials i generalitzem immediatament els acceptats a cel·les de 10 km. No desem ni publiquem coordenades exactes.</p>
                </div>
                <dl>
                  <div><dt>Dataset key</dt><dd>8583f4f6…45e9a</dd></div>
                  <div><dt>DOI</dt><dd>10.15468/ttivpp</dd></div>
                  <div><dt>Llicència</dt><dd>CC BY-NC 4.0</dd></div>
                  <div><dt>Pes al model</dt><dd>0</dd></div>
                </dl>
                <a href="https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a" target="_blank" rel="noreferrer">Fitxa i llicència <ExternalLink size={14} /></a>
              </article>
            </div>

            <aside className="method-source-trust-note">
              <ShieldCheck size={25} />
              <div>
                <h3>Una font no hereta la resolució de la cel·la</h3>
                <p>Una predicció pintada a 250 m pot compartir el mateix punt atmosfèric de 2,5 km i la mateixa humitat del sòl de 9 km amb moltes cel·les veïnes. Guardem resolucions i escales cartogràfiques per separat i exposem camps absents, antiguitat i confiança.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="method-cta">
        <div className="page-width">
          <div>
            <p className="eyebrow">Del mètode al territori</p>
            <h2>Ara llegiu el mapa<br />amb uns altres ulls.</h2>
          </div>
          <div>
            <p>Seleccioneu una espècie i una cel·la per veure la puntuació, els factors disponibles, la procedència i la incertesa que hi ha al darrere.</p>
            <Link href="/map" className="button">Obriu el mapa de predicció <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
