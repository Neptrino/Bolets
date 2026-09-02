import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Accés operatiu",
  description: "Accés privat al tauler operatiu de Bolets.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function OperationalLoginPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=%2Fadmin");
  if (userHasAppRole(user, APP_ROLES.admin)) redirect("/admin");

  return (
    <PageShell as="article" className={styles.shell}>
      <PageHeader
        eyebrow="Sala de màquines · accés privat"
        title={<>Accés d’<PageTitleAccent>administració</PageTitleAccent></>}
        description="L’àrea privada reutilitza el compte de Bolets i només admet usuaris amb rol d’administració."
        tone="forest"
      />

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.icon} aria-hidden="true"><LockKeyhole /></div>
        <div className={styles.intro}>
          <p>Tauler privat</p>
          <h2 id="login-title">Aquest compte no té accés</h2>
          <span>Has iniciat sessió com {user.email ?? "un usuari sense correu"}, però el compte no té el rol d’administració.</span>
        </div>

        <div className={styles.actions}>
          <Link href="/compte/bosc">Torna al compte</Link>
          <form action="/admin/session/logout" method="post">
            <button type="submit">Canvia de compte</button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
