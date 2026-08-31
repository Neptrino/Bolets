import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CurrentSeasonGuideLink } from "@/components/current-season-guide-link";
import { InstallApp } from "@/components/install-app";
import { seasonGuides } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";

const seasonalFooterGuides = seasonGuides.map(({ path, cardTitle, months }) => ({
  path,
  cardTitle,
  months,
}));

function InstagramMark() {
  return (
    <svg aria-hidden="true" fill="none" height="17" viewBox="0 0 24 24" width="17">
      <rect height="18" rx="5" stroke="currentColor" strokeWidth="2" width="18" x="3" y="3" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" fill="currentColor" r="1.25" />
    </svg>
  );
}

export function SiteFooter() {
  const initialMonth = monthInTimeZone();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner page-width">
        <div className="site-footer-identity">
          <div className="site-footer-brand">
            <Link href="/" aria-label="Bolets Atles, inici">
              <BrandMark size={42} variant="single" aria-hidden="true" />
              <span>BOLETS·ATLES</span>
            </Link>
            <span>CATALUNYA · {new Date().getFullYear()}</span>
          </div>
          <p className="site-footer-safety">No identifiquis ni consumeixis bolets sense confirmació experta.</p>
          <Link
            className="site-footer-social"
            href="/instagram"
            rel="me noopener noreferrer"
            target="_blank"
          >
            <InstagramMark /> Instagram
          </Link>
        </div>
        <nav className="site-footer-links" aria-label="Guies i informació editorial">
          <Link href="/bolets-avui">Bolets avui</Link>
          <Link href="/troballes">Troballes comunitàries</Link>
          <Link href="/troballes/nova">Anota una troballa</Link>
          <Link href="/zones">Zones</Link>
          <Link href="/zones/rovellons">Rovellons a Catalunya</Link>
          <Link href="/guies">Guies locals</Link>
          <Link href="/compare">Comparador d’espècies</Link>
          <Link href="/temporada">Temporada de bolets</Link>
          <CurrentSeasonGuideLink guides={seasonalFooterGuides} initialMonth={initialMonth} />
          <Link href="/quan-surten-els-bolets-despres-de-ploure">Després de ploure</Link>
          <Link href="/conservar-bolets">Conservar i congelar bolets</Link>
          <Link href="/parts-dun-bolet">Parts d’un bolet</Link>
          <Link href="/normativa-bolets">Permisos i recol·lecció</Link>
          <Link href="/preguntes-frequents-bolets">Preguntes freqüents</Link>
          <Link href="/equip-editorial">Equip editorial</Link>
          <Link href="/avis-legal">Avís legal i privadesa</Link>
        </nav>
        <InstallApp />
      </div>
    </footer>
  );
}
