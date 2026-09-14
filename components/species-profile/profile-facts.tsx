import type { ReactNode } from "react";

export type ProfileFact = {
  key: string;
  term: ReactNode;
  detail: ReactNode;
  icon?: ReactNode;
  /** Long values (lists, several sentences) take the full width. */
  wide?: boolean;
};

/* The one fact pattern every profile section uses: an icon disc, a bold
   label and the value, laid out as unboxed tiles in two columns on wide
   screens and one column on phones. */
export function ProfileFacts({ items, label, className }: {
  items: ProfileFact[];
  label?: string;
  className?: string;
}) {
  return (
    <dl className={className ? `profile-facts ${className}` : "profile-facts"} aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className={item.wide ? "wide" : undefined}>
          <dt>
            {item.icon && <span className="profile-fact-icon" aria-hidden="true">{item.icon}</span>}
            <span>{item.term}</span>
          </dt>
          <dd>{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
