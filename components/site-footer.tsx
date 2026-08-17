import Link from "next/link";
import { CurrentSeasonGuideLink } from "@/components/current-season-guide-link";
import { InstallApp } from "@/components/install-app";
import { seasonGuides } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";

const seasonalFooterGuides = seasonGuides.map(({ path, cardTitle, months }) => ({
  path,
  cardTitle,
  months,
}));

export function SiteFooter() {
  const initialMonth = monthInTimeZone();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner page-width">
        <div className="site-footer-brand">
          <Link href="/" aria-label="Bolets Atles, inici">BOLETS·ATLES</Link>
          <span>CATALUNYA · {new Date().getFullYear()}</span>
        </div>
        <p className="site-footer-safety">
          <strong>Informació educativa</strong>
          <span>No identifiqueu ni consumiu bolets només amb aquesta aplicació.</span>
        </p>
        <nav className="site-footer-links" aria-label="Guies i informació editorial">
          <Link href="/bolets-avui">Bolets avui</Link>
          <Link href="/zones">Zones</Link>
          <Link href="/guies">Guies locals</Link>
          <CurrentSeasonGuideLink guides={seasonalFooterGuides} initialMonth={initialMonth} />
          <Link href="/quan-surten-els-bolets-despres-de-ploure">Després de ploure</Link>
          <Link href="/parts-dun-bolet">Parts d’un bolet</Link>
          <Link href="/equip-editorial">Equip editorial</Link>
          <Link href="/avis-legal">Avís legal i privadesa</Link>
        </nav>
        <InstallApp />
      </div>
    </footer>
  );
}
