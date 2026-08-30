import Link from "next/link";
import { BookOpenCheck, ExternalLink } from "lucide-react";
import { editorialAuthors, editorialTeam, getEditorialMetadata } from "@/data/editorial";
import type { SourceReference } from "@/src/lib/types";

function formatEditorialDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    dateStyle: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

export function EditorialAttribution({
  contentId,
  showUpdatedAt = true,
  sources,
}: {
  contentId: string;
  showUpdatedAt?: boolean;
  sources: SourceReference[];
}) {
  const editorial = getEditorialMetadata(contentId);
  const author = editorialAuthors[editorial.authorId];
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];

  return (
    <aside className="editorial-panel" aria-label="Autoria, revisió i fonts">
      <div className="editorial-summary">
        <div className="editorial-panel-heading">
          <BookOpenCheck size={18} aria-hidden="true" />
          <div>
            <span>Autoria</span>
            <strong><Link href="/equip-editorial#autoria">{author.name}</Link></strong>
          </div>
        </div>
        <dl className={`editorial-meta${showUpdatedAt ? "" : " editorial-meta-without-date"}`}>
          <div><dt>Editor</dt><dd><Link href="/equip-editorial">{editorialTeam.name}</Link></dd></div>
          {showUpdatedAt ? (
            <div><dt>Actualitzat</dt><dd><time dateTime={editorial.updatedAt}>{formatEditorialDate(editorial.updatedAt)}</time></dd></div>
          ) : null}
          <div><dt>Revisió</dt><dd>{editorial.reviewStatus === "expert-reviewed" ? "Micològica independent" : "Editorial, no micològica"}</dd></div>
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
