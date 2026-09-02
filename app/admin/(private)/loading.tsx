import { LoaderCircle } from "lucide-react";

import { PageShell } from "@/components/page-layout";

import styles from "./admin-loading.module.css";

export default function AdminLoading() {
  return (
    <PageShell as="div" className={`admin-page ${styles.loadingShell}`}>
      <div className={styles.loadingPanel} role="status" aria-live="polite">
        <LoaderCircle aria-hidden="true" />
        <div>
          <strong>Carregant la secció</strong>
          <span>Preparant les dades d’administració…</span>
        </div>
      </div>
      <div className={styles.loadingBody} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </PageShell>
  );
}
