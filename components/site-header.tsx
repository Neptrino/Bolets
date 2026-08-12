import Image from "next/image";
import Link from "next/link";
import { Map, Menu } from "lucide-react";
import brandMark from "@/app/icon.svg";

const links = [
  { href: "/species", label: "Espècies" },
  { href: "/compare", label: "Comparador" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Bolets de Catalunya, inici">
        <Image className="brand-mark" src={brandMark} alt="" width={36} height={36} loading="eager" />
        <span className="brand-lockup">
          <strong>BOLETS</strong>
          <small>ATLES · CATALUNYA</small>
        </span>
      </Link>
      <nav className="primary-nav" aria-label="Navegació principal">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <Link href="/map" className="header-map-link"><Map size={15} /> Mapa de predicció</Link>
      <button className="menu-button" aria-label="Obre la navegació"><Menu size={20} /></button>
    </header>
  );
}
