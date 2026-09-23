import Link from "next/link";
import { ArrowUpRight, BookOpenText, CalendarDays, CloudRain, Gamepad2, Languages, Leaf, MapPinned, Microscope, Refrigerator, Scale, Search, ShieldCheck, Snowflake, Sprout, Sun, TreePine, Trees, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SeasonGuideId } from "@/src/lib/season-guides";
import { SectionHeader } from "@/components/page-layout";

type HomeReferenceLink = { href: string; label: string; note: string; icon: LucideIcon };

const seasonIcons: Record<SeasonGuideId, LucideIcon> = { primavera: Leaf, estiu: Sun, tardor: Trees, hivern: Snowflake };

export function HomeReferenceFeature({ speciesCount, seasonGuide, children }: {
  speciesCount: number;
  seasonGuide: { id: SeasonGuideId; path: string; cardTitle: string; rangeSentence: string };
  children: ReactNode;
}) {
  const links: HomeReferenceLink[] = [
    { href: "/zones/ceps", label: "Ceps", note: "Quatre tipus, quan surten i on trobar-ne", icon: TreePine },
    { href: "/zones/rovellons", label: "Rovellons", note: "Rovelló i pinetell, temporada i zones", icon: Sprout },
    { href: "/compare", label: "Comparador d’espècies", note: "Distingeix les confusions habituals", icon: Scale },
    { href: "/noms-de-bolets-catala-castella", label: "Noms en català i castellà", note: "El nom que has sentit a casa", icon: Languages },
    { href: seasonGuide.path, label: seasonGuide.cardTitle, note: `Espècies actives ${seasonGuide.rangeSentence}`, icon: seasonIcons[seasonGuide.id] },
    { href: "/temporada", label: "Calendari de temporada", note: "Quan surt cada espècie", icon: CalendarDays },
    { href: "/guies", label: "Guies locals", note: "Comarques, massissos i indrets", icon: MapPinned },
    { href: "/quan-surten-els-bolets-despres-de-ploure", label: "Després de ploure", note: "Com respon cada espècie", icon: CloudRain },
    { href: "/conservar-bolets", label: "Conservar i congelar", note: "De la cistella a casa", icon: Refrigerator },
    { href: "/normativa-bolets", label: "Permisos i recol·lecció", note: "Normativa a Catalunya", icon: ShieldCheck },
    { href: "/parts-dun-bolet", label: "Les parts d’un bolet", note: "Aprèn a observar", icon: Microscope },
    { href: "/joc", label: "Joc del bosc", note: "Posa’t a prova", icon: Gamepad2 },
  ];
  return (
    <section className="card home-reference page-width" aria-labelledby="home-reference-title">
      <SectionHeader meta={<span className="home-reference-meta"><BookOpenText size={16} aria-hidden="true" />Cada bolet, una descoberta</span>} title="Guia d’espècies de bolets de Catalunya" titleId="home-reference-title" description={`Del nom que has sentit a casa als detalls que observes al bosc: ${speciesCount} fitxes amb fotografies, trets, hàbitat i temporada, incloses les espècies tòxiques.`} />
      <form action="/bolets" method="get" role="search" aria-label="Cerca un bolet" className="home-reference-searchbar">
        <label htmlFor="home-species-search">Quin bolet busques?</label>
        <div className="home-reference-input"><Search size={20} aria-hidden="true" /><input id="home-species-search" name="q" maxLength={120} placeholder="Rovelló, pinetell, Boletus…" /></div>
        <button className="button" type="submit">Cerca al catàleg <ArrowUpRight size={17} aria-hidden="true" /></button>
      </form>
      <div className="home-reference-season">
        <div className="section-topline"><div><p className="eyebrow">Comença aquí</p><h3>Espècies de temporada</h3></div><Link href="/bolets" className="text-link">Veure les {speciesCount} fitxes <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        {children}
      </div>
      <p className="label-caps home-reference-tiles-title">Consulta també</p>
      <nav className="home-reference-tiles" aria-label="Guies i eines de consulta">
        {links.map(({ href, label, note, icon: Icon }) => (
          <Link href={href} key={href}><Icon size={22} aria-hidden="true" /><strong>{label}</strong><small>{note}</small></Link>
        ))}
      </nav>
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
