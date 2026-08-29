"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpenText, MapPinned, Mountain, Search, Trees, X } from "lucide-react";
import {
  filterGuideDirectoryItems,
  type GuideDirectoryItem,
} from "@/src/lib/guide-directory";
import { FormSelect } from "@/components/ui/form-select";

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

export function GuideDirectory({ items }: { items: GuideDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const [habitat, setHabitat] = useState("");
  const [expanded, setExpanded] = useState(false);

  const species = useMemo(() => [...new Map(items.map((item) => [
    item.speciesId,
    item.speciesName,
  ])).entries()].sort((left, right) => catalanCollator.compare(left[1], right[1])), [items]);
  const areas = useMemo(() => [...new Map(items.map((item) => [
    item.areaSlug,
    item.areaName,
  ])).entries()].sort((left, right) => catalanCollator.compare(left[1], right[1])), [items]);
  const habitats = useMemo(() => [...new Set(items.flatMap((item) => item.habitats))]
    .sort(catalanCollator.compare), [items]);
  const filteredItems = useMemo(() => filterGuideDirectoryItems(items, {
    query,
    speciesId,
    areaSlug,
    habitat,
  }), [areaSlug, habitat, items, query, speciesId]);
  const hasFilters = Boolean(query || speciesId || areaSlug || habitat);
  const visibleItems = hasFilters || expanded ? filteredItems : filteredItems.slice(0, 16);

  function resetFilters() {
    setQuery("");
    setSpeciesId("");
    setAreaSlug("");
    setHabitat("");
    setExpanded(false);
  }

  return (
    <div className="guide-browser" data-local-guide-list>
      <div className="guide-browser-controls" aria-label="Filtres de les guies locals">
        <label className="guide-browser-search">
          <span>Cerca una guia</span>
          <span className="guide-browser-input"><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Espècie, indret o territori" /></span>
        </label>
        <div className="guide-browser-filter"><span>Espècie</span><FormSelect aria-label="Espècie" value={speciesId} onValueChange={setSpeciesId} emptyLabel="Totes les espècies" options={species.map(([value, label]) => ({ value, label }))} /></div>
        <div className="guide-browser-filter"><span>Territori</span><FormSelect aria-label="Territori" value={areaSlug} onValueChange={setAreaSlug} emptyLabel="Tots els territoris" options={areas.map(([value, label]) => ({ value, label }))} /></div>
        <div className="guide-browser-filter"><span>Hàbitat</span><FormSelect aria-label="Hàbitat" value={habitat} onValueChange={setHabitat} emptyLabel="Tots els hàbitats" options={habitats.map((name) => ({ value: name, label: name }))} /></div>
      </div>

      <div className="guide-browser-status">
        <p aria-live="polite"><strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? "guia local" : "guies locals"}</p>
        {hasFilters ? <button type="button" onClick={resetFilters}><X size={15} aria-hidden="true" /> Neteja els filtres</button> : null}
      </div>

      {filteredItems.length > 0 ? (
        <ol className="guide-browser-results">
          {visibleItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="guide-browser-card">
                <span className="guide-browser-card-kicker"><MapPinned size={14} aria-hidden="true" /> {item.placeType} · {item.areaName}</span>
                <div><h3>{item.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
                <p>{item.introduction}</p>
                <dl>
                  <div><dt><Trees size={14} aria-hidden="true" /> Hàbitat</dt><dd>{item.habitats.slice(0, 2).join(" · ")}</dd></div>
                  <div><dt><Mountain size={14} aria-hidden="true" /> Rang general</dt><dd>{item.altitudeLabel}</dd></div>
                </dl>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="guide-browser-empty">
          <BookOpenText size={24} aria-hidden="true" />
          <div><strong>No hi ha cap guia amb aquesta combinació.</strong><p>Proveu de treure un filtre o cercar un territori més ampli.</p></div>
          <button type="button" onClick={resetFilters}>Veure totes les guies</button>
        </div>
      )}
      {!hasFilters && !expanded && filteredItems.length > visibleItems.length ? (
        <button className="guide-browser-more" type="button" onClick={() => setExpanded(true)}>
          Mostra les {filteredItems.length - visibleItems.length} guies restants <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
