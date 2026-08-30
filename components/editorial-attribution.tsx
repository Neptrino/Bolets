import Link from "next/link";
import { BookOpenCheck, ChevronDown, Database, ExternalLink } from "lucide-react";
import { editorialAuthors, editorialTeam, getEditorialMetadata } from "@/data/editorial";
import type { SourceReference } from "@/src/lib/types";

function formatEditorialDate(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    dateStyle: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

function uniqueSources(sources: SourceReference[]) {
  return [...new Map(sources.map((source) => [source.url, source])).values()];
}

function SourceLinks({ sources }: { sources: SourceReference[] }) {
  return (
    <ul>
      {sources.map((source) => (
        <li key={source.url}>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.title} <ExternalLink size={13} aria-hidden="true" />
          </a>
          <small className="visually-hidden">Publicat per {source.publisher}</small>
        </li>
      ))}
    </ul>
  );
}

export function EditorialAttribution({
  contentId,
  showUpdatedAt = true,
  sources,
  variant = "full",
}: {
  contentId: string;
  showUpdatedAt?: boolean;
  sources: SourceReference[];
  variant?: "full" | "compact";
}) {
  const editorial = getEditorialMetadata(contentId);
  const author = editorialAuthors[editorial.authorId];
  const deduplicatedSources = uniqueSources(sources);
  const reviewLabel = editorial.reviewStatus === "expert-reviewed"
    ? "Micològica independent"
    : "Editorial, no micològica";

  if (variant === "compact") {
    return (
      <aside className="editorial-panel editorial-panel--compact" aria-label="Autoria, revisió i fonts">
        <div className="editorial-compact-summary">
          <BookOpenCheck size={17} aria-hidden="true" />
          <p>
            <strong><Link href="/equip-editorial#autoria">{author.name}</Link></strong>
            {showUpdatedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Actualitzat <time dateTime={editorial.updatedAt}>{formatEditorialDate(editorial.updatedAt)}</time></span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span>{reviewLabel}</span>
          </p>
        </div>
        {deduplicatedSources.length > 0 && (
          <details className="editorial-compact-sources">
            <summary>
              Fonts consultades <span>{deduplicatedSources.length}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <SourceLinks sources={deduplicatedSources} />
          </details>
        )}
      </aside>
    );
  }

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
          <div><dt>Revisió</dt><dd>{reviewLabel}</dd></div>
        </dl>
      </div>
      {deduplicatedSources.length > 0 && (
        <div className="editorial-sources">
          <span>Fonts consultades</span>
          <SourceLinks sources={deduplicatedSources} />
        </div>
      )}
    </aside>
  );
}

export function DataSourceCredits({
  sources,
  label = "Dades i metodologia",
}: {
  sources: SourceReference[];
  label?: string;
}) {
  const publishers = [...new Map(
    uniqueSources(sources).map((source) => [source.publisher, source]),
  ).values()];

  if (publishers.length === 0) return null;

  return (
    <aside className="data-source-credits" aria-label={label}>
      <Database size={16} aria-hidden="true" />
      <strong>{label}</strong>
      <ul>
        {publishers.map((source) => (
          <li key={source.publisher}>
            <a href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
