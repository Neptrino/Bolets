"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import type { SpeciesProfile } from "@/src/lib/types";

export function SpeciesDirectory({ species }: { species: SpeciesProfile[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => species.filter((item) => {
    const haystack = [item.identity.commonName, item.identity.scientificName, ...item.identity.alternateNames, item.identity.family].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [query, species]);
  return (
    <section className="directory-shell">
      <div className="directory-controls">
        <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca per nom, gènere o família" /></label>
      </div>
      <p className="directory-count">{matches.length} espècies visibles</p>
      <div className="species-grid">{matches.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} />)}</div>
      {!matches.length && <div className="empty-state">No hem trobat cap espècie amb aquests criteris.</div>}
    </section>
  );
}
