"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Map, Menu, X } from "lucide-react";
import brandMark from "@/app/icon.svg";

const links = [
  { href: "/bolets", label: "Bolets" },
  { href: "/zones", label: "Zones" },
  { href: "/compare", label: "Comparador" },
  { href: "/metode", label: "Mètode" }
];

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
          {links.map((link) => <Link key={link.href} href={link.href} onClick={closeMobileNav}>{link.label}</Link>)}
        </nav>
      </details>
    </header>
  );
}
