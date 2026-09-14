import type { ReactNode } from "react";
import { BookOpen, ChefHat, CircleHelp, Languages, MapPinned, ScanLine, Share2, ShieldAlert, Sprout, type LucideIcon } from "lucide-react";

import { speciesProfileSections } from "@/src/lib/species-headings";
import type { CatalogueSpecies } from "@/src/lib/types";

const sectionIcons: Record<string, LucideIcon> = {
  "identificació": ScanLine,
  confusions: ShieldAlert,
  preguntes: CircleHelp,
  noms: Languages,
  cuina: ChefHat,
  ecologia: Sprout,
  "distribució": MapPinned,
  "targeta-de-camp": Share2,
  fonts: BookOpen,
};

export function ProfileSection({ species, id, title, eyebrow, className = "", action, children }: {
  species: CatalogueSpecies;
  id: string;
  title: string;
  eyebrow: string;
  className?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const section = speciesProfileSections(species).find((entry) => entry.id === id);
  const Icon = sectionIcons[id];
  return <section id={id} className={["content-section", "profile-section", className].filter(Boolean).join(" ")} aria-labelledby={`${id}-title`}>
    <header className="profile-section-heading">
      {Icon && <Icon className="profile-section-icon" size={24} strokeWidth={1.5} aria-hidden="true" />}
      <span className="profile-section-number" aria-hidden="true">{section?.number}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      {action}
    </header>
    {children}
  </section>;
}
