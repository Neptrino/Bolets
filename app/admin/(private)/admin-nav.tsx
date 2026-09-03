"use client";

import {
  Activity,
  ClipboardList,
  Flag,
  HandHeart,
  Home,
  Link2,
  LogOut,
  Megaphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./admin-shell.module.css";

const sections: ReadonlyArray<{
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Inici", icon: Home, exact: true },
  { href: "/admin/usuaris", label: "Usuaris", icon: Users },
  { href: "/admin/troballes", label: "Troballes", icon: ClipboardList },
  { href: "/admin/avisos", label: "Avisos", icon: Flag },
  { href: "/admin/aportacions", label: "Aportacions", icon: HandHeart },
  { href: "/admin/publicacio", label: "Publicació", icon: Megaphone },
  { href: "/admin/enllacos", label: "Enllaços", icon: Link2 },
  { href: "/admin/operacions", label: "Operacions", icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.adminNav} aria-label="Seccions de l’administració">
      <div className={styles.adminLinks}>
        {sections.map(({ href, label, icon: Icon, exact }) => {
          const current = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link href={href} aria-current={current ? "page" : undefined} key={href}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
      <form action="/admin/session/logout" method="post">
        <button type="submit" aria-label="Tancar la sessió d’administració">
          <LogOut size={17} aria-hidden="true" />
          <span>Surt</span>
        </button>
      </form>
    </nav>
  );
}
