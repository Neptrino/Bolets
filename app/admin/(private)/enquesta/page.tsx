import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell, SectionHeader } from "@/components/page-layout";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { readAdminSurvey, SURVEY_PAGE_SIZE } from "@/src/lib/map-price-survey-admin.server";
import { MAP_PRICE_SURVEY_ANSWERS, MAP_PRICE_SURVEY_VERSION } from "@/src/lib/map-price-survey-config";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Enquesta · Administració", robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";
const date = new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" });

export default async function AdminSurveyPage({ searchParams }: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requireOperationalSession();
  const requested = Number((await searchParams).pagina ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 100_000 ? requested : 1;
  const result = await readAdminSurvey(page).catch(() => null);
  return <PageShell as="article" className="admin-page">
    <PageHeader eyebrow="Administració · enquesta" title="Què en pensa la comunitat?" tone="forest"
      description="Respostes desades a la base de dades, incloses les de navegadors que bloquegen l’analítica." />
    {!result ? <p role="alert">No s’han pogut carregar les respostes. Torna a carregar la pàgina.</p> : <div className={styles.results}>
      <section className={styles.section}>
        <SectionHeader title={`${result.total} respostes desades`} meta={MAP_PRICE_SURVEY_VERSION}
          description="Una resposta per navegador i versió. No equival necessàriament a una persona única." />
        <div className={styles.tableFrame} role="region" aria-label="Resultats de l’enquesta" tabIndex={0}>
          <table><caption className="visually-hidden">Distribució de totes les respostes</caption>
            <thead><tr><th scope="col">Resposta</th><th scope="col">Total</th><th scope="col">Percentatge</th></tr></thead>
            <tbody>{result.options.map((option) => <tr key={option.value}>
              <th scope="row">{option.label}</th><td>{option.count}</td>
              <td>{result.total ? (100 * option.count / result.total).toLocaleString("ca-ES", { maximumFractionDigits: 1 }) : "0"} %</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className={styles.section}>
        <SectionHeader title="Totes les respostes" description="De més recent a més antiga. Hora de Catalunya. Sense dades del compte ni adreces IP." />
        <div className={styles.tableFrame} role="region" aria-label="Respostes individuals" tabIndex={0}>
          <table><caption className="visually-hidden">Rebuts de l’enquesta, pàgina {page}</caption>
            <thead><tr><th scope="col">Data</th><th scope="col">Resposta</th><th scope="col">Rebut</th></tr></thead>
            <tbody>{result.receipts.map((receipt) => <tr key={receipt.id}>
              <td><time dateTime={receipt.created_at}>{date.format(new Date(receipt.created_at))}</time></td>
              <td>{MAP_PRICE_SURVEY_ANSWERS.find((option) => option.value === receipt.answer)?.label}</td>
              <td>{receipt.id}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!result.receipts.length && <p>No hi ha respostes en aquesta pàgina.</p>}
        <nav className={styles.pagination} aria-label="Pàgines de respostes">
          {page > 1 && <Link href={`/admin/enquesta?pagina=${page - 1}`}>Anterior</Link>}
          <span>Pàgina {page} de {Math.max(1, Math.ceil(result.total / SURVEY_PAGE_SIZE))}</span>
          {page * SURVEY_PAGE_SIZE < result.total && <Link href={`/admin/enquesta?pagina=${page + 1}`}>Següent</Link>}
        </nav>
      </section>
    </div>}
  </PageShell>;
}
