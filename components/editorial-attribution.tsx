import Link from "next/link";
import { BookOpenCheck, ExternalLink } from "lucide-react";
import { editorialTeam, getEditorialMetadata } from "@/data/editorial";
import type { SourceReference } from "@/src/lib/types";

function formatEditorialDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    dateStyle: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

export function EditorialAttribution({
  contentId,
  sources,
}: {
  contentId: string;
  sources: SourceReference[];
}) {
  const editorial = getEditorialMetadata(contentId);
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];

  return (
    <aside className="editorial-panel" aria-label="Autoria, revisió i fonts">
      <div className="editorial-summary">
        <div className="editorial-panel-heading">
          <BookOpenCheck size={18} aria-hidden="true" />
          <div>
            <span>Responsabilitat editorial</span>
            <strong><Link href="/equip-editorial">{editorialTeam.name}</Link></strong>
          </div>
        </div>
        <dl className="editorial-meta">
          <div><dt>Actualitzat</dt><dd><time dateTime={editorial.updatedAt}>{formatEditorialDate(editorial.updatedAt)}</time></dd></div>
          <div><dt>Revisió</dt><dd>{editorial.reviewStatus === "expert-reviewed" ? "Revisió micològica independent completada" : "Revisió editorial; revisió micològica independent pendent"}</dd></div>
        </dl>
      </div>
      {uniqueSources.length > 0 && (
        <div className="editorial-sources">
          <span>Fonts consultades</span>
          <ul>
            {uniqueSources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title} <ExternalLink size={13} aria-hidden="true" />
                </a>
                <small className="visually-hidden">Publicat per {source.publisher}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
