import Link from "next/link";
import { seasonGuides, type SeasonGuideId } from "@/src/lib/season-guides";

export function SeasonGuideSwitcher({ current }: { current: SeasonGuideId }) {
  return (
    <nav className="season-guide-switcher" aria-label="Guies de bolets per estació">
      {seasonGuides.map((guide) => (
        <Link
          aria-current={guide.id === current ? "page" : undefined}
          className={guide.id === current ? "is-current" : undefined}
          href={guide.path}
          key={guide.id}
        >
          {guide.id}
        </Link>
      ))}
    </nav>
  );
}
