"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import { commonNameDisplayLabel } from "@/src/lib/common-name";

export interface SpeciesNameGlossaryRow {
  speciesId: string;
  catalanName: string;
  catalanAlternatives: readonly string[];
  scientificName: string;
  spanish?: {
    primary: string;
    alternatives?: readonly string[];
  };
  path: string;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca-ES");
}

export function SpeciesNameGlossary({ rows }: { rows: readonly SpeciesNameGlossaryRow[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery.trim());
  const filteredRows = normalizedQuery
    ? rows.filter((row) => normalize([
        row.catalanName,
        ...row.catalanAlternatives,
        row.scientificName,
        row.spanish?.primary ?? "",
        ...(row.spanish?.alternatives ?? []),
      ].join(" ")).includes(normalizedQuery))
    : rows;

  return (
    <div className="species-name-glossary">
      <label className="species-name-search">
        <span>Busca un nom català, castellà o científic</span>
        <span className="species-name-search-control">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: rovelló, níscalo, Lactarius…"
          />
        </span>
      </label>
      <p className="species-name-result-count" aria-live="polite">
        {filteredRows.length} {filteredRows.length === 1 ? "espècie" : "espècies"}
      </p>
      <div className="species-name-table-wrap">
        <table className="species-name-table">
          <thead><tr><th scope="col">Català</th><th scope="col">Castellà</th><th scope="col">Nom científic</th></tr></thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.speciesId}>
                <th scope="row"><Link href={row.path}>{row.catalanName}</Link>{row.catalanAlternatives.length ? <small>{row.catalanAlternatives.join(" · ")}</small> : null}</th>
                <td>{row.spanish ? <><strong lang="es">{commonNameDisplayLabel(row.spanish.primary, "es-ES")}</strong>{row.spanish.alternatives?.length ? <small lang="es">{row.spanish.alternatives.join(" · ")}</small> : null}</> : <span className="species-name-unverified">Sense equivalència verificada</span>}</td>
                <td><i>{row.scientificName}</i></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredRows.length === 0 ? <p className="species-name-empty">No hem trobat cap nom coincident. Prova una variant o el nom científic.</p> : null}
    </div>
  );
}
