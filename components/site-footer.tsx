import { IntentLink as Link } from "@/components/intent-link";
import { Coffee } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { InstagramMark } from "@/components/instagram-mark";
import { InstallApp } from "@/components/install-app";
import { resolveSupportUrl } from "@/src/lib/support";

export function SiteFooter() {
  const supportUrl = resolveSupportUrl(process.env.SUPPORT_URL);

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
          {supportUrl ? (
            <div className="site-footer-support">
              <p>Ajuda’ns a mantenir l’atles obert i actualitzat.</p>
              <a
                href={supportUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                aria-label="Convida’ns a un cafè (s’obre en una pestanya nova)"
              >
                <Coffee size={17} strokeWidth={2.2} aria-hidden="true" />
                Convida’ns a un cafè
              </a>
            </div>
          ) : null}
          <InstallApp />
        </div>
        <nav className="site-footer-links" aria-label="Navegació del peu de pàgina">
          <div className="site-footer-group">
            <h2>Espècies i guies</h2>
            <Link href="/bolets">Espècies</Link>
            <Link href="/compare">Comparador d’espècies</Link>
            <Link href="/bolets-i-confusions">Bolets i confusions</Link>
            <Link href="/parts-dun-bolet">Parts d’un bolet</Link>
            <Link href="/bolets/infografia">Dibuixos de bolets</Link>
            <Link href="/temporada">Temporada</Link>
            <Link href="/preguntes-frequents-bolets">Preguntes freqüents</Link>
          </div>
          <div className="site-footer-group">
            <h2>Mapa i territori</h2>
            <Link href="/map">Mapa de bolets de Catalunya</Link>
            <Link href="/bolets-avui">Bolets avui</Link>
            <Link href="/guies">Guies locals</Link>
            <Link href="/mapa-pluja">Pluja acumulada</Link>
            <Link href="/quan-surten-els-bolets-despres-de-ploure">Després de ploure</Link>
            <Link href="/troballes">Troballes</Link>
            <Link href="/normativa-bolets">Permisos i recol·lecció</Link>
          </div>
          <div className="site-footer-group">
            <h2>Sobre Bolets</h2>
            <Link href="/metode">Mètode del mapa</Link>
            <Link href="/equip-editorial">Equip editorial</Link>
            <Link href="/col-labora">Col·labora</Link>
            <Link href="/avis-legal">Avís legal</Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}
