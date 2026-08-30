"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import type { SpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { Month } from "@/src/lib/types";

export function SpeciesDirectory({
  species,
  currentMonth,
}: {
  species: SpeciesCardProfile[];
  currentMonth: Month;
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
      <p className="directory-count" aria-live="polite">
        {query ? `Resultats per “${query}”` : "Ordenades alfabèticament pel nom català"}
      </p>
      <div className="species-grid">{matches.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} currentMonth={currentMonth} />)}</div>
      {!matches.length && <div className="empty-state">No hem trobat cap espècie amb aquests criteris.</div>}
    </section>
  );
}
