import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import {
  isOperationalSessionAuthorized,
  OPERATIONAL_SESSION_COOKIE,
} from "@/src/lib/operational-status-auth";

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

const errorMessages: Record<string, string> = {
  auth: "L’usuari o la contrasenya no són correctes.",
  rate: "Hi ha hagut massa intents. Espera quinze minuts abans de tornar-ho a provar.",
};

export default async function OperationalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (await isOperationalSessionAuthorized(
    cookieStore.get(OPERATIONAL_SESSION_COOKIE)?.value,
  )) {
    redirect("/admin/status");
  }

  const query = await searchParams;
  const error = query.error ? errorMessages[query.error] : null;

  return (
    <PageShell as="article" className={styles.shell}>
      <PageHeader
        eyebrow="Sala de màquines · accés privat"
        title={<>Accés <PageTitleAccent>operatiu</PageTitleAccent></>}
        description="Inicia sessió per consultar la salut de les dades, les ingestes i els proveïdors."
        tone="forest"
      />

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.icon} aria-hidden="true"><LockKeyhole /></div>
        <div className={styles.intro}>
          <p>Tauler privat</p>
          <h2 id="login-title">Identifica’t</h2>
          <span>La sessió queda protegida en una galeta segura i caduca al cap de set dies.</span>
        </div>

        <form action="/admin/session" method="post" className={styles.form}>
          <label htmlFor="status-username">Usuari</label>
          <input
            autoComplete="username"
            autoFocus
            id="status-username"
            maxLength={128}
            name="username"
            required
            type="text"
          />

          <label htmlFor="status-password">Contrasenya</label>
          <input
            autoComplete="current-password"
            id="status-password"
            maxLength={256}
            name="password"
            required
            type="password"
          />

          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <button type="submit">Entra al tauler</button>
        </form>
      </section>
    </PageShell>
  );
}
