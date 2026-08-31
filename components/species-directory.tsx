"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CookingPot, Leaf, Search, ShieldAlert, Snowflake, Sprout, Sun, X } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { SeasonGuideId } from "@/src/lib/season-guides";
import type { Month } from "@/src/lib/types";

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
}: {
  species: SpeciesCardProfile[];
  currentMonth: Month;
  seasonShortcuts: Array<{ id: SeasonGuideId; href: string; label: string }>;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => species.filter((item) => {
    const haystack = [item.identity.commonName, item.identity.scientificName, ...item.identity.alternateNames, item.identity.family].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [query, species]);
  return (
    <section className="directory-shell">
      <div className="directory-controls">
        <div className="directory-summary">
          <strong>{matches.length}</strong>
          <span>{matches.length === 1 ? "espècie" : "espècies"}</span>
        </div>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="visually-hidden">Cerca espècies</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca per nom català, gènere o família" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Neteja la cerca">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>
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
        {query ? `Resultats per “${query}”` : "Ordenades alfabèticament pel nom català"}
      </p>
      <div className="species-grid">{matches.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} currentMonth={currentMonth} />)}</div>
      {!matches.length && <div className="empty-state">No hem trobat cap espècie amb aquests criteris.</div>}
    </section>
  );
}
