"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CookingPot, Leaf, Search, ShieldAlert, Snowflake, Sprout, Sun, X, type LucideIcon } from "lucide-react";
import { SpeciesCollection } from "@/components/species-collection";
import type { CatalogueGroup } from "@/src/lib/catalogue-list";
import type { SeasonGuideId } from "@/src/lib/season-guides";
import type { Month } from "@/src/lib/types";
import { filterCatalogue } from "@/src/lib/catalogue-search";
import {
  catalogueFilterSearch,
  catalogueGroupOptions,
  catalogueSeasonOptions,
  emptyCatalogueFilters,
  matchesCatalogueFilters,
  type CatalogueDirectoryEntry,
  type CatalogueFilters,
} from "@/src/lib/catalogue-filters";

const groupIcons = {
  edible: CookingPot,
  toxic: ShieldAlert,
  other: X,
} satisfies Record<CatalogueGroup, LucideIcon>;

const seasonIcons = {
  primavera: Sprout,
  estiu: Sun,
  tardor: Leaf,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, LucideIcon>;

const groupGuides: Partial<Record<CatalogueGroup, { href: string; label: string }>> = {
  edible: { href: "/bolets-comestibles", label: "Guia de bolets comestibles" },
  toxic: { href: "/bolets-verinosos", label: "Guia de bolets verinosos" },
};

function FilterChip({ pressed, count, icon: Icon, label, onToggle }: {
  pressed: boolean;
  count: number;
  icon: LucideIcon;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="pill directory-filter" aria-pressed={pressed} disabled={!pressed && count === 0} onClick={onToggle}>
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
      <span className="directory-filter-count" aria-label={`${count} espècies`}>{count}</span>
    </button>
  );
}

export function SpeciesDirectory({
  species,
  currentMonth,
  seasonGuides,
  initialQuery = "",
  initialFilters = emptyCatalogueFilters,
}: {
  species: CatalogueDirectoryEntry[];
  currentMonth: Month;
  seasonGuides: Array<{ id: SeasonGuideId; href: string; label: string }>;
  initialQuery?: string;
  initialFilters?: CatalogueFilters;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(initialFilters);
  const searched = useMemo(() => filterCatalogue(species, query), [query, species]);
  const matches = useMemo(() => searched.filter((item) => matchesCatalogueFilters(item, filters)), [searched, filters]);
  const filtered = Boolean(query.trim() || filters.group || filters.season);
  const countFor = (next: CatalogueFilters) => searched.filter((item) => matchesCatalogueFilters(item, next)).length;
  const toggle = (key: keyof CatalogueFilters, value: CatalogueFilters[typeof key]) =>
    setFilters((current) => ({ ...current, [key]: current[key] === value ? null : value }));

  // Mirror the state in the address so a filtered view can be shared or reloaded.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current) { synced.current = true; return; }
    window.history.replaceState(null, "", `/bolets${catalogueFilterSearch(query, filters)}`);
  }, [query, filters]);

  const activeGuides = [
    filters.group ? groupGuides[filters.group] : undefined,
    filters.season ? seasonGuides.find((guide) => guide.id === filters.season) : undefined,
  ].filter((guide) => guide !== undefined);
  const groupParam = catalogueGroupOptions.find((option) => option.value === filters.group)?.param;

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
              <Link href="/bolets" onClick={(event) => { event.preventDefault(); setQuery(""); }} aria-label="Neteja la cerca" className="icon-tile directory-clear">
                <X size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
          {groupParam && <input type="hidden" name="tipus" value={groupParam} />}
          {filters.season && <input type="hidden" name="estacio" value={filters.season} />}
          <button type="submit" className="button directory-search-submit">Cerca</button>
        </form>
      </div>
      <p className="directory-help">Un mateix bolet pot tenir diversos noms. <Link href="/noms-de-bolets-catala-castella">Consulta el glossari</Link> o <Link href="/parts-dun-bolet">aprèn a observar-ne les parts</Link>.</p>
      <div className="directory-filters" role="group" aria-label="Filtra el catàleg">
        <div className="directory-filter-group" role="group" aria-labelledby="directory-filter-group">
          <span className="label-caps directory-filter-label" id="directory-filter-group">Comestibilitat</span>
          <div className="directory-filter-items">
            {catalogueGroupOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                icon={groupIcons[option.value]}
                pressed={filters.group === option.value}
                count={countFor({ ...filters, group: option.value })}
                onToggle={() => toggle("group", option.value)}
              />
            ))}
          </div>
        </div>
        <div className="directory-filter-group" role="group" aria-labelledby="directory-filter-season">
          <span className="label-caps directory-filter-label" id="directory-filter-season">Estació</span>
          <div className="directory-filter-items">
            {catalogueSeasonOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                icon={seasonIcons[option.value]}
                pressed={filters.season === option.value}
                count={countFor({ ...filters, season: option.value })}
                onToggle={() => toggle("season", option.value)}
              />
            ))}
          </div>
        </div>
      </div>
      <SpeciesCollection
        species={matches}
        currentMonth={currentMonth}
        toolbar={<>
          <p className="label-caps directory-count" aria-live="polite">
            {filtered
              ? `${matches.length} ${matches.length === 1 ? "resultat" : "resultats"}${query.trim() ? ` per “${query.trim()}”` : ""}`
              : "Ordenades alfabèticament pel nom català"}
          </p>
          {(filters.group || filters.season) && (
            <button type="button" className="directory-reset" onClick={() => setFilters(emptyCatalogueFilters)}>
              <X size={14} aria-hidden="true" /> Treu els filtres
            </button>
          )}
        </>}
        beforeGrid={activeGuides.length > 0 && (
          <p className="directory-guides">
            {activeGuides.map((guide) => (
              <Link key={guide.href} href={guide.href} className="text-link">{guide.label} <ArrowUpRight size={14} aria-hidden="true" /></Link>
            ))}
          </p>
        )}
      />
      {!matches.length && <div className="empty-state"><p>No hem trobat cap espècie amb aquests criteris. Prova un altre nom, treu algun filtre o consulta el glossari.</p><Link href="/bolets" onClick={(event) => { event.preventDefault(); setQuery(""); setFilters(emptyCatalogueFilters); }} className="text-link">Veure tot el catàleg</Link></div>}
    </section>
  );
}
