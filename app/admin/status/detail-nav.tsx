import Link from "next/link";

import styles from "./details.module.css";

export function DetailNav({ current }: { current: "status" | "users" | "findings" | "reports" | "instagram" }) {
  return (
    <nav className={styles.detailNav} aria-label="Seccions de l’administració">
      <Link href="/admin/status" aria-current={current === "status" ? "page" : undefined}>Estat</Link>
      <Link href="/admin/status/users" aria-current={current === "users" ? "page" : undefined}>Usuaris</Link>
      <Link href="/admin/status/findings" aria-current={current === "findings" ? "page" : undefined}>Troballes</Link>
      <Link href="/admin/status/reports" aria-current={current === "reports" ? "page" : undefined}>Avisos</Link>
      <Link href="/admin/status/instagram" aria-current={current === "instagram" ? "page" : undefined}>Instagram</Link>
    </nav>
  );
}
