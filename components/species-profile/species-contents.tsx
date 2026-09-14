"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "@/app/styles/species-contents.css";

export function SpeciesContents({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <nav className={`species-aside${expanded ? " is-expanded" : ""}`} aria-label="Contingut de la fitxa">
      <button className="species-contents-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        Contingut de la fitxa <ChevronDown size={18} aria-hidden="true" />
      </button>
      <noscript><style>{`.compact-species-page nav.species-aside > a { display: flex !important; } .species-contents-toggle { display: none !important; }`}</style></noscript>
      {children}
    </nav>
  );
}
