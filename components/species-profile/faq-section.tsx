import { CircleHelp } from "lucide-react";
import { ProfileSection } from "@/components/species-profile/profile-section";
import { speciesHeadings } from "@/src/lib/species-headings";
import type { SpeciesFaq } from "@/src/lib/species-summary";
import type { CatalogueSpecies } from "@/src/lib/types";

/* The merged FAQ (curated questions first, generated ones after) sits below
   the knowledge sections and the map: the hero lead already answers first,
   so here it recaps the page in the question form people type. */
export function SpeciesFaqSection({ species, faqs }: { species: CatalogueSpecies; faqs: SpeciesFaq[] }) {
  if (faqs.length === 0) return null;
  const headings = speciesHeadings(species.identity.commonName);

  return (
    <ProfileSection species={species} id="preguntes" eyebrow="Preguntes habituals" title={headings.faq}>
      <div className="profile-faq">
        {faqs.map((faq) => (
          <article key={faq.question}>
            <h3><CircleHelp size={16} aria-hidden="true" /> {faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        ))}
      </div>
    </ProfileSection>
  );
}
