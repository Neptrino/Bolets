import type { Metadata } from "next";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";

import { suppressBacklinkAction } from "./actions";
import styles from "./unsubscribe.module.css";

export const metadata: Metadata = {
  title: "Baixa de comunicacions",
  description: "Atura les comunicacions editorials de Bolets Atles.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; fet?: string; error?: string }>;
}) {
  const params = await searchParams;
  const done = params.fet === "1";
  return (
    <PageShell as="article" className={styles.shell}>
      <PageHeader
        eyebrow="Preferències de comunicació"
        title={done ? <>Baixa <PageTitleAccent>confirmada</PageTitleAccent></> : <>Atura els <PageTitleAccent>correus</PageTitleAccent></>}
        description={done
          ? "Aquesta adreça ha quedat exclosa permanentment de la prospecció editorial de Bolets Atles."
          : "Confirma que no vols rebre cap altre missatge editorial de Bolets Atles."}
        tone="forest"
      />
      {!done && params.token ? (
        <form action={suppressBacklinkAction} className={styles.panel}>
          <input type="hidden" name="token" value={params.token} />
          <p>La baixa bloqueja qualsevol comunicació editorial futura amb aquesta adreça.</p>
          <button type="submit">Confirma la baixa</button>
        </form>
      ) : null}
      {!done && (!params.token || params.error) ? (
        <p className={styles.error}>L’enllaç no és vàlid o ja no es pot verificar.</p>
      ) : null}
    </PageShell>
  );
}
