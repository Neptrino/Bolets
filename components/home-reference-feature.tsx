import Link from "next/link";
import { ArrowUpRight, BookOpenText, CalendarDays, Languages, Search, Snowflake, Trees } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";

export function HomeReferenceFeature({ speciesCount }: { speciesCount: number }) {
  return (
    <section className="home-reference page-width" aria-labelledby="home-reference-title">
      <SectionHeader meta="Un atles per consultar i descobrir" title="Cada bolet, una descoberta." titleId="home-reference-title" description="Del nom que has sentit a casa als detalls que observes al bosc. Troba la fitxa i continua explorant." />
      <div className="home-reference-body">
        <div className="home-reference-search">
          <form action="/bolets" method="get" role="search" aria-label="Cerca un bolet">
            <label htmlFor="home-species-search">Quin bolet busques?</label>
            <div className="home-reference-input"><Search size={20} aria-hidden="true" /><input id="home-species-search" name="q" maxLength={120} placeholder="Rovelló, pinetell, Boletus…" /></div>
            <button className="button" type="submit">Cerca al catàleg <ArrowUpRight size={17} aria-hidden="true" /></button>
          </form>
          <p>{speciesCount} fitxes amb noms, fotografies, trets, hàbitat i temporada. També hi trobaràs espècies tòxiques i sense interès culinari.</p>
          <Link href="/bolets" className="text-link">Explora totes les espècies <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <nav className="home-reference-topics" aria-label="Descobreix els bolets">
          <div><Languages size={23} aria-hidden="true" /><h3>Noms i confusions</h3><Link href="/noms-de-bolets-catala-castella">Noms catalans i castellans <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/compare">Espècies semblants <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div><CalendarDays size={23} aria-hidden="true" /><h3>Temporada i boscos</h3><Link href="/temporada">El calendari dels bolets <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/guies">Guies per territori <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div><Snowflake size={23} aria-hidden="true" /><h3>De la cistella a casa</h3><Link href="/conservar-bolets">Conservar i congelar <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/normativa-bolets">Permisos i recol·lecció <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <div><Trees size={23} aria-hidden="true" /><h3>Aprèn observant</h3><Link href="/parts-dun-bolet">Les parts d’un bolet <ArrowUpRight size={14} aria-hidden="true" /></Link><Link href="/joc">Posa’t a prova al joc del bosc <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
        </nav>
      </div>
    </section>
  );
}

export function HomeEditorialNote() {
  return (
    <section className="home-editorial-note page-width" aria-labelledby="home-editorial-title">
      <BookOpenText size={26} aria-hidden="true" />
      <div><p className="eyebrow">Un atles amb fonts i criteri</p><h2 id="home-editorial-title">Conèixer també és contrastar.</h2><p>Les fitxes citen les fonts i expliquen els límits de la informació. El contingut té revisió editorial, sense revisió micològica independent.</p></div>
      <Link href="/equip-editorial" className="text-link">Autoria, fonts i correccions <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </section>
  );
}
