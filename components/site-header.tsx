"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Map, Menu, X } from "lucide-react";
import brandMark from "@/app/icon.svg";

const links = [
  { href: "/bolets", label: "Bolets", mobileLabel: "Bolets", featured: false },
  { href: "/zones", label: "Zones", mobileLabel: "Zones", featured: false },
  { href: "/guies", label: "Guies", mobileLabel: "Guies locals", featured: false },
  { href: "/compare", label: "Comparador", mobileLabel: "Comparador", featured: false },
  { href: "/metode", label: "Mètode", mobileLabel: "Mètode", featured: false },
  { href: "/bolets-avui", label: "Avui", mobileLabel: "Bolets avui", featured: true }
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const mobileNav = useRef<HTMLDetailsElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    mobileNav.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        mobileNav.current?.removeAttribute("open");
        setMobileOpen(false);
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (mobileNav.current && !mobileNav.current.contains(event.target as Node)) {
        mobileNav.current.removeAttribute("open");
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [mobileOpen]);

  const closeMobileNav = () => {
    mobileNav.current?.removeAttribute("open");
    setMobileOpen(false);
  };

  const isCurrentLink = (href: (typeof links)[number]["href"]) =>
    pathname === href || (href === "/guies" && pathname.startsWith("/zones/"));

  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Bolets de Catalunya, inici">
        <Image className="brand-mark" src={brandMark} alt="Bolets Atles" width={36} height={36} loading="eager" />
        <span className="brand-lockup">
          <strong>BOLETS</strong>
          <small>ATLES · CATALUNYA</small>
        </span>
      </Link>
      <nav className="primary-nav" aria-label="Navegació principal">
        {links.map((link) => <Link key={link.href} href={link.href} className={link.featured ? "primary-nav-today" : undefined} aria-current={isCurrentLink(link.href) ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <Link href="/map" className="header-map-link"><Map size={16} aria-hidden="true" /> <span>Mapa de predicció</span></Link>
      <details
        ref={mobileNav}
        className="mobile-nav"
        onToggle={() => setMobileOpen(mobileNav.current?.open ?? false)}
      >
        <summary
          className="menu-button"
          aria-label="Navegació"
          aria-controls="mobile-navigation-panel"
          aria-expanded={mobileOpen}
        >
          <Menu className="menu-icon menu-icon-open" size={20} aria-hidden="true" />
          <X className="menu-icon menu-icon-close" size={20} aria-hidden="true" />
        </summary>
        <nav id="mobile-navigation-panel" className="mobile-nav-panel" aria-label="Navegació mòbil">
          {links.map((link) => <Link key={link.href} href={link.href} className={link.featured ? "primary-nav-today" : undefined} aria-current={isCurrentLink(link.href) ? "page" : undefined} onClick={closeMobileNav}>{link.mobileLabel}</Link>)}
        </nav>
      </details>
    </header>
  );
}
