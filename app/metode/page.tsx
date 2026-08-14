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
import { suitabilityScale } from "@/src/lib/suitability-scale";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Mètode del mapa de bolets",
  description:
    "Fórmules, components, llindars i límits dels mapes d’hàbitat potencial i de condicions de Bolets Atles.",
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
        <small>La mateixa corba s’aplica al mapa estàtic i a l’hàbitat efectiu H.</small>
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
      <p>Els 100 m interiors de cada extrem fan la transició de 75% a 100%. En rangs més estrets de 200 m, les dues transicions es troben al punt mig. A les fórmules, A es normalitza a 0—1.</p>
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
            <p>Expliquem com passem d’una cel·la de territori a H, F i O: què representa cada magnitud, què la limita i quan preferim no publicar-la.</p>
            <nav className="method-jump-links" aria-label="Índex del mètode">
              <a href="#distribucio">01 · Distribució</a>
              <a href="#prediccio">02 · Condicions</a>
              <a href="#publicacio">03 · Publicació</a>
              <a href="#fonts">04 · Fonts</a>
            </nav>
          </div>
          <div className="method-hero-equation" aria-label="Resum de l’índex de condicions de fructificació">
            <div className="method-equation-meta">
              <span>ÍNDEX DE CONDICIONS</span>
              <span>0—100</span>
            </div>
            <div className="method-equation-main">
              <span className="method-equation-score">F</span>
              <Equal aria-hidden="true" />
              <span>100 · P · W<sup>α</sup> · T<sup>1−α</sup> · E</span>
            </div>
            <div className="method-equation-legend">
              <p><b>P</b> fenologia · <b>W</b> aigua · <b>T</b> temperatura</p>
              <p><b>E</b> extrems tèrmics · <b>α</b> balanç hidrotermal</p>
            </div>
            <div className="method-equation-stamp">
              <Database size={16} /> Índex ordinal · no és una probabilitat de presència
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
            <h3>Condicions actuals</h3>
            <p>Combina fenologia, estat hídric, temperatura i extrems tèrmics dins de l’hàbitat compatible.</p>
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
                <p>Sumem la fracció real de classes de coberta que coincideixen amb els tipus d’hàbitat configurats per a l’espècie. Aquesta capa no verifica arbres hoste individuals.</p>
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
                <Formula label="La intensitat del mapa és la cobertura compatible multiplicada per la resposta d'altitud.">
                  I<sub>250</sub> = C<sub>250</sub> · A(h)
                </Formula>
                <p>El model conserva <b>C</b> i <b>A</b> per calcular l’hàbitat efectiu <b>H = C · A</b>. Les condicions de fructificació es calculen després, només dins d’aquest hàbitat.</p>
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
                <p>Al mapa de condicions, el color correspon directament a la banda de l’índex d’oportunitat <b>O</b>, que ja incorpora la proporció d’hàbitat efectiu. L’opacitat no torna a aplicar <b>C<sub>g</sub></b>.</p>
                <small>Resolucions de visualització: 250 m, 1 km, 2,5 km, 5 km i 10 km.</small>
              </div>
            </div>

            <aside className="method-occurrence-note">
              <Database size={24} />
              <div>
                <h3>I les observacions històriques?</h3>
                <p>Els registres de FungaCAT/GBIF només corroboren presència passada en quadrícules generalitzades d’almenys 10 km. No entren en cap fórmula, no amplien l’hàbitat i l’absència de registres mai compta com a absència de l’espècie.</p>
              </div>
              <strong>fora d’H/F/O</strong>
            </aside>
          </div>
        </div>
      </section>

      <section id="prediccio" className="method-band method-band-paper">
        <div className="page-width method-chapter">
          <aside className="method-chapter-index" aria-hidden="true">
            <span>02</span>
            <div />
            <small>CONDICIONS</small>
          </aside>
          <div className="method-chapter-body">
            <header className="method-chapter-header">
              <div>
                <p className="eyebrow"><Sigma size={15} /> Model hidrotermal · v1</p>
                <h2>Després, llegim<br />el moment.</h2>
              </div>
              <p>Quatre respostes normalitzades entre 0 i 1 actuen conjuntament. Com que es multipliquen, una condició limitant no queda amagada per una altra de favorable.</p>
            </header>

            <div className="method-score-equation">
              <Formula label="L’índex condicional de fructificació és cent multiplicat per la fenologia, l’aigua elevada a alfa, la temperatura elevada a un menys alfa i el modificador d’extrems.">
                F = 100 · P · W<sup>α</sup> · T<sup>1−α</sup> · E
              </Formula>
              <p><b>F</b> descriu les condicions dins d’un hàbitat compatible. <b>α</b> regula el balanç entre aigua i temperatura: 0,60 per als ectomicorrízics, 0,65 per als sapròtrofs de sòl o virosta i els de prat, i 0,55 per als lignícoles, amb excepcions versionades per espècie.</p>
            </div>

            <div className="method-factor-grid">
              <article style={{ "--component-order": 0 } as React.CSSProperties}>
                <div className="method-factor-topline"><span>P</span><strong>0—1</strong></div>
                <h3>Fenologia</h3>
                <p>Una corba contínua situa el dia de l’any dins de la finestra habitual de fructificació.</p>
              </article>
              <article style={{ "--component-order": 1 } as React.CSSProperties}>
                <div className="method-factor-topline"><span>W</span><strong>0—1</strong></div>
                <h3>Estat hídric</h3>
                <p>Integra pluja, ET₀, ratxa seca i humitat superficial en una única resposta, sense comptar l’aigua dues vegades.</p>
              </article>
              <article style={{ "--component-order": 2 } as React.CSSProperties}>
                <div className="method-factor-topline"><span>T</span><strong>0—1</strong></div>
                <h3>Temperatura</h3>
                <p>Resposta no lineal al voltant de la finestra tèrmica configurada per a l’espècie.</p>
              </article>
              <article style={{ "--component-order": 3 } as React.CSSProperties}>
                <div className="method-factor-topline"><span>E</span><strong>0—1</strong></div>
                <h3>Extrems tèrmics</h3>
                <p>Les gelades i la calor recent redueixen el resultat dins de la fórmula, sense aplicar un sostre posterior.</p>
              </article>
            </div>

            <div className="method-subscore-heading">
              <p className="eyebrow">Dins dels components</p>
              <h3>Una resposta hidrotermal, no una suma de punts</h3>
              <p><b>clamp(x)</b> limita qualsevol resposta normalitzada a l’interval 0—1. Els paràmetres de v1 són priors experts de confiança baixa, no estimacions ajustades amb observacions.</p>
            </div>

            <div className="method-subscore-grid">
              <article className="method-subscore method-subscore-rain">
                <div className="method-subscore-title"><CloudRain size={24} /><div><span>W · ESTAT HÍDRIC UNIFICAT</span><h4>Pols recent, reserva anterior i assecat en una sola resposta.</h4></div></div>
                <div className="method-rain-steps">
                  <div>
                    <b>1 · Producte hídric</b>
                    <Formula label="L’estat hídric multiplica la resposta d’humitat del sòl, la preparació per pluja, la penalització de dèficit de pressió de vapor i la de ratxa seca.">
                      W = M · [(1 − ρ) + ρQ] · V<sup>βV</sup> · D<sup>βD</sup>
                    </Formula>
                    <p><b>ρ</b>, <b>βV</b> i <b>βD</b> són paràmetres versionats del gremi o de l’espècie. La humitat de l’aire no és un factor separat: el seu efecte d’assecat entra una sola vegada a <b>V</b>.</p>
                  </div>
                  <div>
                    <b>2 · Humitat i pluja efectiva</b>
                    <Formula label="La humitat combina tres quarts de la resposta de la mitjana setmanal d’aigua extractable relativa i un quart de la resposta del mínim setmanal.">
                      M = 0,75 R<sub>REW</sub>(mitjana<sub>7</sub>) + 0,25 R<sub>REW</sub>(mínim<sub>7</sub>)
                    </Formula>
                    <p><b>REW = (θ − θ<sub>marciment</sub>) / (θ<sub>camp</sub> − θ<sub>marciment</sub>)</b>, limitada a 0—1,4. Els dos llindars provenen d’una taula versionada per textura del sòl.</p>
                    <p><b>Q = 0,7 Hill(R<sub>ef</sub>, R<sub>50</sub>) + 0,3 Hill(N<sub>humit</sub>, N<sub>50</sub>)</b>, on Hill(x, x<sub>50</sub>) = x² / (x² + x<sub>50</sub>²). La finestra és de 14 o 21 dies segons el gremi, amb 26 dies per al cep. Cada dia humit té ≥ 1 mm i <b>R<sub>ef</sub> = max(0, pluja − N<sub>humit</sub> · 1 mm − 0,5 ET₀)</b>.</p>
                  </div>
                  <div>
                    <b>3 · Assecat atmosfèric i ratxa seca</b>
                    <Formula label="El dèficit de pressió de vapor i la ratxa seca decauen exponencialment només després dels seus llindars de gràcia.">
                      V = exp(−max(0, VPD<sub>7</sub> − v₀) / s<sub>v</sub>)<br />
                      D = exp(−max(0, dies secs − gràcia) / τ)
                    </Formula>
                    <p>La pluja, la humitat del sòl, el VPD i la ratxa seca queden consolidats en una única sortida <b>W</b>; no reapareixen com a puntuacions independents.</p>
                  </div>
                </div>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><ThermometerSun size={24} /><div><span>T · RESPOSTA TÈRMICA</span><h4>Un òptim, amb descens progressiu als dos costats.</h4></div></div>
                <Formula label="La temperatura segueix una corba exponencial centrada a l’òptim, amb una amplada diferent al costat fred i al càlid.">
                  T = 2<sup>−((T̄ − T<sub>òpt</sub>) / h<sub>costat</sub>)²</sup>
                </Formula>
                <p><b>T̄</b> és la mitjana configurada de 14 o 20 dies. Per a cada espècie, el punt mig de l’interval tèrmic numèric versionat inicialitza <b>T<sub>òpt</sub></b>, i cada extrem de l’interval correspon a mitja resposta. Una excepció explícita basada en literatura pot substituir aquests valors, com en el cas del cep. Així espècies fredòfiles i termòfiles no comparteixen la mateixa corba.</p>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><Gauge size={24} /><div><span>P · FENOLOGIA</span><h4>Dotze ancoratges mensuals formen una corba contínua.</h4></div></div>
                <Formula label="La fenologia interpola suaument dotze ancoratges mensuals amb una transició cosinus.">
                  u′ = (1 − cos(πu)) / 2<br />
                  P = (1 − u′)p<sub>mes</sub> + u′p<sub>mes següent</sub>
                </Formula>
                <p>Els dotze ancoratges provenen directament del calendari ecològic únic de l’espècie: inactiu = 0, possible = 0,25, moderat = 0,50, bo = 0,80 i pic = 1. Corresponen al centre de cada mes i es llegeixen en hora d’Europa/Madrid. Fora de la finestra biològica, <b>P = 0</b> i, per tant, <b>F = 0</b>.</p>
              </article>

              <article className="method-subscore">
                <div className="method-subscore-title"><Sprout size={24} /><div><span>E · EXTREMS TÈRMICS</span><h4>La interrupció forma part del producte.</h4></div></div>
                <Formula label="El modificador d’extrems decau a la meitat per cada vida mitjana configurada d’hores de gelada o calor.">
                  E = 2<sup>−hores gelada / vida mitjana gelada</sup> · 2<sup>−hores calor / vida mitjana calor</sup>
                </Formula>
                <p>Comptem gelada a ≤ 0 °C i calor a ≥ 27 °C durant la mateixa finestra de 14 o 20 dies que T. Les vides mitjanes representen la tolerància versionada, i el producte ja incorpora tota la reducció per extrems.</p>
              </article>
            </div>

            <div className="method-static-formulas">
              <article className="method-formula-card">
                <span className="method-formula-kicker">HÀBITAT EFECTIU</span>
                <Formula label="L’hàbitat efectiu és la cobertura compatible multiplicada per la resposta d’altitud.">
                  H = C · A
                </Formula>
                <p><b>C</b> és la fracció exacta de coberta que supera les portes estàtiques; <b>A</b> és la resposta d’altitud agregada dins d’aquella cobertura. Totes dues entren normalitzades entre 0 i 1. <b>H</b> és una fracció derivada d’àrea compatible efectiva, no una puntuació ni una probabilitat de presència.</p>
              </article>
              <article className="method-formula-card method-formula-card-accent">
                <span className="method-formula-kicker">ÍNDEX D’OPORTUNITAT DE CEL·LA</span>
                <Formula label="L’índex d’oportunitat és l’hàbitat efectiu multiplicat per l’índex condicional de fructificació.">
                  O = H · F
                </Formula>
                <p><b>F</b> respon «com són les condicions dins de l’hàbitat?»; <b>O</b> respon «quina oportunitat relativa representa tota la cel·la?». Tots dos són índexs ordinals, no probabilitats.</p>
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
              <p>No omplim buits ni tornem a repartir exponents entre els components disponibles. Abans de calcular una cel·la, comprovem actualitat, evidència estàtica i totes les entrades requerides.</p>
            </header>

            <div className="method-publication-grid">
              <article className="method-publish-card method-publish-withhold">
                <span><CircleSlash2 size={21} /> ES MOSTRA «SENSE DADES»</span>
                <ul>
                  <li><Check size={16} /> La instantània és antiga.</li>
                  <li><Check size={16} /> Falta evidència estàtica verificada.</li>
                  <li><Check size={16} /> Falta una entrada requerida de P, W, T o E.</li>
                  <li><Check size={16} /> Una finestra temporal no és completa.</li>
                </ul>
              </article>
              <article className="method-publish-card method-publish-zero">
                <span><CircleSlash2 size={21} /> RESULTAT FORÇAT A 0</span>
                <ul>
                  <li><Check size={16} /> Hàbitat efectiu H = 0 implica O = 0.</li>
                  <li><Check size={16} /> Fenologia P = 0 implica F = 0.</li>
                  <li><Check size={16} /> Qualsevol component nul anul·la el producte.</li>
                </ul>
              </article>
              <article className="method-publish-card method-publish-cap">
                <span><Gauge size={21} /> TRES LECTURES SEPARADES</span>
                <ul>
                  <li><Check size={16} /> H: hàbitat efectiu de la cel·la.</li>
                  <li><Check size={16} /> F: condicions dins de l’hàbitat.</li>
                  <li><Check size={16} /> O: oportunitat relativa a tota la cel·la.</li>
                </ul>
              </article>
            </div>

            <div className="method-stress">
              <div>
                <p className="eyebrow light">Co-limitació explícita</p>
                <h3>No hi ha mitjana compensatòria ni límits afegits després.</h3>
                <p>W i T es combinen geomètricament; P i E multipliquen el resultat. Les gelades i la calor ja formen part d’E, i la sequedat entra una sola vegada dins de W.</p>
              </div>
              <Formula label="Quan qualsevol component s’apropa a zero, el producte complet també s’apropa a zero.">
                x → 0 ⇒ F → 0
              </Formula>
            </div>

            <div className="method-label-scale" aria-label="Etiquetes finals segons puntuació">
              <div className="method-label-scale-heading">
                <span>BANDA ORDINAL D’O</span>
                <small>no equival a una probabilitat</small>
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
                <p>En el resum regional, la mediana i els quartils d’<b>O</b> donen el mateix pes a cada cel·la de visualització de 10 km amb hàbitat compatible verificat: <b>H</b> ja forma part d’<b>O</b> i no es torna a aplicar. El resum separat d’<b>F</b> sí que es pondera per <b>H</b>, perquè descriu les condicions dins de l’hàbitat. Cap dels dos és una probabilitat regional.</p>
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

            <div className="method-source-lanes" aria-label="Flux de les fonts cap a la distribució i els índexs">
              <span><Mountain size={18} /> Territori estàtic</span>
              <i aria-hidden="true" />
              <span><CloudSun size={18} /> Condicions dinàmiques</span>
              <i aria-hidden="true" />
              <span><Database size={18} /> Instantània normalitzada</span>
              <i aria-hidden="true" />
              <span><Sigma size={18} /> Distribució + H + índexs F/O</span>
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
                    <div><dt>Ús</dt><dd>distribució + hàbitat H</dd></div>
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
                    <div><dt>Ús</dt><dd>hàbitat + context hídric</dd></div>
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
                    <div><dt>Ús</dt><dd>context geològic · fora d’H/F/O</dd></div>
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
                    <div><dt>Ús en H/F/O</dt><dd>cap</dd></div>
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
                  <p>Temperatura, humitat relativa, precipitació, vent i ET₀. Les sèries horàries alimenten la temperatura mitjana de 14 o 20 dies, les hores d’extrems, la pluja efectiva, els dies humits i el VPD setmanal.</p>
                  <dl>
                    <div><dt><Ruler size={14} /> Origen</dt><dd>2,5 km · horari</dd></div>
                    <div><dt><RefreshCw size={14} /> Proveïdor</dt><dd>cada 3 h</dd></div>
                    <div><dt><RefreshCw size={14} /> Atles</dt><dd>diari</dd></div>
                    <div><dt>Ús</dt><dd>W · T · E</dd></div>
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
                    <div><dt>Ús</dt><dd>component W</dd></div>
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
                  <div><dt>Ús en H/F/O</dt><dd>cap</dd></div>
                </dl>
                <a href="https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a" target="_blank" rel="noreferrer">Fitxa i llicència <ExternalLink size={14} /></a>
              </article>
            </div>

            <aside className="method-source-trust-note">
              <ShieldCheck size={25} />
              <div>
                <h3>Una font no hereta la resolució de la cel·la</h3>
                <p>Un índex O pintat a 250 m pot compartir el mateix punt atmosfèric de 2,5 km i la mateixa humitat del sòl de 9 km amb moltes cel·les veïnes. Guardem resolucions i escales cartogràfiques per separat i exposem camps absents, antiguitat, confiança i versió del model.</p>
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
            <p>Seleccioneu una espècie i una cel·la per separar l’hàbitat efectiu H, les condicions F i l’oportunitat de cel·la O, amb la procedència i els límits de les dades.</p>
            <Link href="/map" className="button">Obriu el mapa de condicions <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
