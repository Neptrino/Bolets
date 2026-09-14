import { ArrowUpRight } from "lucide-react";
import type { PlaceProfile } from "@/data/location-pages";

/** External sites to prepare a visit: the editorial source plus the curated pair. */
export function LocalResources({ location }: { location: PlaceProfile }) {
  const resources = [
    { label: "Context local", ...location.source },
    ...location.resources,
  ];

  return (
    <aside className="local-resource-shelf" aria-labelledby="local-resources-title">
      <header>
        <p className="eyebrow">Més informació</p>
        <h3 id="local-resources-title">Descobreix {location.nameWithArticle}</h3>
        <p>Webs externes per preparar una visita i conèixer millor el territori.</p>
      </header>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            <a href={resource.url} target="_blank" rel="noreferrer" aria-label={`${resource.title} (s’obre en una pestanya nova)`}>
              <span>{resource.label}</span>
              <strong>{resource.title}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
