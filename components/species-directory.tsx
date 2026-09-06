"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CookingPot, Leaf, Search, ShieldAlert, Snowflake, Sprout, Sun, X } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { SeasonGuideId } from "@/src/lib/season-guides";
import type { Month } from "@/src/lib/types";
import { filterCatalogue } from "@/src/lib/catalogue-search";

const seasonShortcutIcons = {
  primavera: Sprout,
  estiu: Sun,
  tardor: Leaf,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Sprout>;

export function SpeciesDirectory({
  species,
  currentMonth,
  seasonShortcuts,
  initialQuery = "",
}: {
  species: SpeciesCardProfile[];
  currentMonth: Month;
  seasonShortcuts: Array<{ id: SeasonGuideId; href: string; label: string }>;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const matches = useMemo(() => filterCatalogue(species, query), [query, species]);
  return (
    <section className="directory-shell">
      <div className="directory-controls">
        <div className="directory-summary">
          <strong>{matches.length}</strong>
          <span>{matches.length === 1 ? "espècie" : "espècies"}</span>
        </div>
        <form action="/bolets" method="get" className="directory-search" role="search" aria-label="Cerca al catàleg">
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <label className="visually-hidden" htmlFor="catalogue-query">Cerca espècies</label>
            <input id="catalogue-query" name="q" maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom català, castellà o científic" />
            {query && (
              <Link href="/bolets" onClick={(event) => { event.preventDefault(); setQuery(""); }} aria-label="Neteja la cerca" className="directory-clear">
                <X size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
          <button type="submit" className="button directory-search-submit">Cerca</button>
        </form>
      </div>
      <p className="directory-help">Un mateix bolet pot tenir diversos noms. <Link href="/noms-de-bolets-catala-castella">Consulta el glossari</Link> o <Link href="/parts-dun-bolet">aprèn a observar-ne les parts</Link>.</p>
      <nav className="directory-shortcuts" aria-label="Explora el catàleg">
        <div className="directory-shortcut-group" role="group" aria-labelledby="directory-shortcuts-species">
          <span className="directory-shortcut-label" id="directory-shortcuts-species">Explora espècies</span>
          <div className="directory-shortcut-items">
            <Link href="/bolets-comestibles"><CookingPot size={16} aria-hidden="true" />Comestibles</Link>
            <Link href="/bolets-verinosos"><ShieldAlert size={16} aria-hidden="true" />Verinosos</Link>
            <Link href="/temporada"><CalendarDays size={16} aria-hidden="true" />Per mesos</Link>
          </div>
        </div>
        <div className="directory-shortcut-group" role="group" aria-labelledby="directory-shortcuts-seasons">
          <span className="directory-shortcut-label" id="directory-shortcuts-seasons">Per estacions</span>
          <div className="directory-shortcut-items">
            {seasonShortcuts.map((shortcut) => {
              const SeasonIcon = seasonShortcutIcons[shortcut.id];
              return <Link href={shortcut.href} key={shortcut.id}><SeasonIcon size={16} aria-hidden="true" />{shortcut.label}</Link>;
            })}
          </div>
        </div>
      </nav>
      <p className="directory-count" aria-live="polite">
        {query ? `${matches.length} ${matches.length === 1 ? "resultat" : "resultats"} per “${query}”` : "Ordenades alfabèticament pel nom català"}
      </p>
      <div className="species-grid">{matches.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} currentMonth={currentMonth} />)}</div>
      {!matches.length && <div className="empty-state"><p>No hem trobat cap espècie amb aquests criteris. Prova un altre nom o consulta el glossari.</p><Link href="/bolets" className="text-link">Veure tot el catàleg</Link></div>}
    </section>
  );
}
