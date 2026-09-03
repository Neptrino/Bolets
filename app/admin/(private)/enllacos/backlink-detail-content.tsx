import { Calculator, ExternalLink, Link2, Mail, Search, ShieldCheck, UserRoundCheck } from "lucide-react";

import { SectionHeader } from "@/components/page-layout";
import type { BacklinkDelivery, BacklinkProspectDetail, BacklinkScoreFactorId, BacklinkStatus } from "@/src/lib/backlinks/types";

import { BacklinkManualControls } from "./backlink-manual-controls";
import { BacklinkDomainControl } from "./backlink-domain-control";
import { BacklinkRescanControl } from "./backlink-rescan-control";
import styles from "./backlinks.module.css";

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid",
});

const statusLabels: Record<BacklinkStatus, string> = {
  discovered: "Descoberta", ready: "Preparada", sent: "Enviada", linked: "Enllaçada",
  lost: "Perduda", suppressed: "Exclosa", failed: "Fallida",
};

const deliveryStatusLabels: Record<BacklinkDelivery["status"], string> = {
  pending: "Pendent", sending: "En curs", sent: "Enviat", failed: "Fallit", cancelled: "Cancel·lat",
};

const actionLabels: Record<BacklinkProspectDetail["actions"][number]["action"], string> = {
  manual_approve: "Aprovació manual",
  manual_exclude: "Exclusió manual",
  restore_automatic: "Retorn a la política automàtica",
  contact_update: "Contacte actualitzat",
  rescan: "Pàgina reescanejada",
};

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function emailPreviewDocument(html: string) {
  return `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff">${html}</body></html>`;
}

const scoreFactorLabels: Record<BacklinkScoreFactorId, string> = {
  base: "Base de la candidatura",
  "topic-relevance": "Rellevància temàtica",
  "institutional-domain": "Senyal institucional",
  "role-mailbox": "Bústia de funció",
  "external-link-propensity": "Propensió a citar fonts",
  "content-freshness": "Antiguitat del contingut",
  "existing-link": "Enllaç ja existent",
  "low-quality-signal": "Senyals de baixa qualitat",
};

function scoreFactorDetail(
  factor: NonNullable<BacklinkProspectDetail["scoreExplanation"]>["factors"][number],
  version: NonNullable<BacklinkProspectDetail["scoreExplanation"]>["version"],
) {
  const evidence = factor.evidence;
  if (factor.id === "base") return "Punt de partida per a una pàgina pública que podem inspeccionar.";
  if (factor.id === "topic-relevance") return evidence.length
    ? `Termes coincidents: ${evidence.join(", ")}.`
    : "No s’hi ha detectat cap terme de la campanya.";
  if (factor.id === "institutional-domain") return evidence.length
    ? `El domini conté el senyal ${evidence[0]}.`
    : "El domini no aporta cap senyal institucional.";
  if (factor.id === "role-mailbox") return factor.points > 0
    ? `Bústia editorial o institucional: ${evidence[0]}.`
    : evidence.length ? `La bústia ${evidence[0]} no és una bústia de funció.` : "No s’ha detectat cap contacte.";
  if (factor.id === "external-link-propensity") {
    const count = Number(evidence[0] ?? 0);
    if (version === "backlink-score-v1") {
      return `${count} ${count === 1 ? "citació editorial externa detectada" : "citacions editorials externes detectades"}. Aquest registre conserva l’escala anterior; reescaneja’l per aplicar el criteri actual.`;
    }
    if (count === 0) return "Cap citació editorial externa; és poc probable que aquesta pàgina n’afegeixi una.";
    if (count === 1) return "Una citació editorial externa; demostra que pot enllaçar, però el senyal encara és feble.";
    if (count === 2) return "Dues citacions editorials externes; és un patró inicial favorable i rep una bonificació moderada.";
    if (count >= 8) return `${count} citacions editorials externes; la bonificació queda limitada perquè el volum sol no distingeix una pàgina de referències d’una granja d’enllaços.`;
    return `${count} citacions editorials externes; és un patró de citació saludable.`;
  }
  if (factor.id === "content-freshness") {
    if (!evidence.length) return "No hi ha una data de publicació o actualització prou fiable; no s’aplica cap penalització.";
    const source = evidence[1] === "modified" ? "Última actualització fiable" : "Data de publicació fiable";
    if (factor.points <= -18) return `${source}: ${formatDate(evidence[0] ?? null)}. Té almenys vuit anys i rep la penalització màxima d’antiguitat.`;
    if (factor.points < 0) return `${source}: ${formatDate(evidence[0] ?? null)}. Té entre cinc i vuit anys i rep una penalització moderada.`;
    return `${source}: ${formatDate(evidence[0] ?? null)}. No és prou antiga per penalitzar-la.`;
  }
  if (factor.id === "existing-link") return factor.points < 0
    ? "La pàgina ja enllaça Bolets Atles; no és una oportunitat nova."
    : "No s’ha trobat cap enllaç existent a Bolets Atles.";
  return factor.points < 0
    ? `Senyal detectat: ${evidence.join(", ")}.`
    : "No s’han detectat fòrums, comentaris ni altres patrons de baixa qualitat.";
}

export function isBacklinkProspectId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function BacklinkDetailContent({
  error,
  minimumScore,
  prospect,
  returnTo,
  updated,
}: {
  error: string | null;
  minimumScore: number;
  prospect: BacklinkProspectDetail;
  returnTo: string;
  updated: string | null;
}) {
  return (
    <>
      <section className={styles.detailLead}>
        <div>
          <span className={styles.badge} data-status={prospect.status}>{statusLabels[prospect.status]}</span>
          <strong>{prospect.score}/100</strong>
          <small>{prospect.statusReason ?? "Sense motiu addicional"}</small>
        </div>
        <div className={styles.detailLeadLinks}>
          <a href={prospect.pageUrl} target="_blank" rel="noreferrer">Obre el recurs extern <ExternalLink aria-hidden="true" /></a>
          <a href={prospect.targetUrl} target="_blank" rel="noreferrer">Obre la destinació <ExternalLink aria-hidden="true" /></a>
        </div>
      </section>

      <section className={styles.detailSection} aria-labelledby={`prospect-score-${prospect.id}`}>
        <SectionHeader meta="Puntuació" title="Per què té aquesta nota?" titleId={`prospect-score-${prospect.id}`} description="Desglossament exacte guardat durant l’últim escaneig; les decisions manuals no alteren la nota." />
        {prospect.scoreExplanation ? (
          <div className={styles.scoreExplanation}>
            <header>
              <Calculator aria-hidden="true" />
              <div>
                <strong>{prospect.scoreExplanation.finalScore}/100</strong>
                <span>{prospect.scoreExplanation.finalScore >= minimumScore
                  ? `Supera el mínim automàtic de ${minimumScore}.`
                  : `Li falten ${minimumScore - prospect.scoreExplanation.finalScore} punts per arribar al mínim de ${minimumScore}.`}</span>
              </div>
            </header>
            <ol>
              {prospect.scoreExplanation.factors.map((factor) => (
                <li key={factor.id} data-neutral={factor.points === 0}>
                  <div><strong>{scoreFactorLabels[factor.id]}</strong><span>{scoreFactorDetail(factor, prospect.scoreExplanation!.version)}</span></div>
                  <b data-points={factor.points > 0 ? "positive" : factor.points < 0 ? "negative" : "neutral"}>
                    {factor.points > 0 ? "+" : ""}{factor.points}
                  </b>
                </li>
              ))}
            </ol>
            {prospect.scoreExplanation.rawScore !== prospect.scoreExplanation.finalScore ? (
              <small>Subtotal {prospect.scoreExplanation.rawScore}; la puntuació es limita a l’interval de 0 a 100.</small>
            ) : null}
          </div>
        ) : (
          <div className={styles.detailEmpty}>Aquest registre és anterior al desglossament. Reescaneja’l per calcular i guardar els factors exactes.</div>
        )}
        <BacklinkRescanControl error={error} prospectId={prospect.id} returnTo={returnTo} updated={updated} />
      </section>

      <BacklinkManualControls error={error} prospect={prospect} returnTo={returnTo} updated={updated} />

      <BacklinkDomainControl error={error} prospect={prospect} returnTo={returnTo} updated={updated} />

      <section className={styles.detailSection} aria-labelledby={`prospect-context-${prospect.id}`}>
        <SectionHeader meta="Origen i decisió" title="Context de l’oportunitat" titleId={`prospect-context-${prospect.id}`} description="Dades de la pàgina pública i decisió de la política automàtica." />
        <dl className={styles.detailFacts}>
          <Fact label="Organització" value={prospect.organization} />
          <Fact label="Domini" value={prospect.domain} />
          <Fact label="Campanya i consulta" value={`${prospect.campaignId} · ${prospect.searchQuery}`} />
          <Fact label="Contacte" value={prospect.contactEmail ?? "—"} />
          <Fact label="Font del contacte" value={prospect.contactSourceUrl ? <a href={prospect.contactSourceUrl} target="_blank" rel="noreferrer">Pàgina pública <ExternalLink aria-hidden="true" /></a> : "—"} />
          <Fact label="Enllaços editorials externs" value={prospect.outboundLinkCount ?? "No mesurat"} />
          <Fact label="Publicat" value={formatDate(prospect.contentPublishedAt)} />
          <Fact label="Actualitzat" value={formatDate(prospect.contentModifiedAt)} />
          <Fact label="Destinació" value={prospect.targetTitle} />
          <Fact label="Enviaments" value={`${prospect.sendCount} d’1 màxim`} />
        </dl>
      </section>

      <section className={styles.detailSection} aria-labelledby={`prospect-email-${prospect.id}`}>
        <SectionHeader meta="Comunicació" title="Correu editorial" titleId={`prospect-email-${prospect.id}`} description="Contingut exacte; el token signat de baixa es genera just abans de l’enviament." />
        {prospect.emailPreview ? (
          <article className={styles.messageCard}>
            <Mail aria-hidden="true" />
            <div>
              <span><strong>A:</strong> {prospect.emailPreview.recipient}</span>
              <span><strong>Assumpte:</strong> {prospect.emailPreview.subject}</span>
              <iframe
                className={styles.messagePreviewFrame}
                sandbox=""
                srcDoc={emailPreviewDocument(prospect.emailPreview.html)}
                title={`Previsualització del correu per a ${prospect.emailPreview.recipient}`}
              />
              <details className={styles.plainTextPreview}>
                <summary>Mostra la versió de text pla</summary>
                <pre>{prospect.emailPreview.body}</pre>
              </details>
            </div>
          </article>
        ) : <div className={styles.detailEmpty}>No hi ha cap correu pendent per a l’estat actual.</div>}
      </section>

      <section className={styles.detailSection} aria-labelledby={`prospect-verification-${prospect.id}`}>
        <SectionHeader meta="Auditoria" title="Enllaç i cicle de vida" titleId={`prospect-verification-${prospect.id}`} description="Contacte, verificació independent i canvis posteriors." />
        <div className={styles.auditGrid}>
          <article><Link2 aria-hidden="true" /><strong>{prospect.existingLink ? "Enllaç verificat" : "Sense enllaç verificat"}</strong><span>{prospect.linkAnchor ?? "Sense text d’ancoratge"}</span><small>{prospect.linkRel ? `rel=${prospect.linkRel}` : "Sense atribut rel registrat"}</small></article>
          <article><Search aria-hidden="true" /><strong>Descoberta</strong><span>{formatDate(prospect.discoveredAt)}</span><small>Comprovada {formatDate(prospect.lastCheckedAt)}</small></article>
          <article><Mail aria-hidden="true" /><strong>Contacte</strong><span>Primer enviament {formatDate(prospect.firstSentAt)}</span><small>Darrer enviament {formatDate(prospect.lastSentAt)}</small></article>
          <article><ShieldCheck aria-hidden="true" /><strong>Estat actual</strong><span>Actualitzat {formatDate(prospect.updatedAt)}</span><small>Acció següent {formatDate(prospect.nextActionAt)}</small></article>
        </div>
      </section>

      <section className={styles.detailSection} aria-labelledby={`prospect-deliveries-${prospect.id}`}>
        <SectionHeader meta="Historial" title="Enviaments" titleId={`prospect-deliveries-${prospect.id}`} description="Registre de l’únic correu permès per oportunitat." />
        {prospect.deliveries.length ? (
          <div className={styles.deliveryList}>
            {prospect.deliveries.map((delivery) => (
              <details key={delivery.id}>
                <summary>
                  <span className={styles.deliveryStatus} data-status={delivery.status}>{deliveryStatusLabels[delivery.status]}</span>
                  <strong>{delivery.kind === "initial" ? "Correu únic" : "Seguiment històric"}</strong>
                  <span>{formatDate(delivery.sentAt ?? delivery.createdAt)}</span>
                </summary>
                <div>
                  <span><strong>A:</strong> {delivery.recipient}</span>
                  <span><strong>Assumpte:</strong> {delivery.subject}</span>
                  <span><strong>Intents:</strong> {delivery.attemptCount}</span>
                  {delivery.lastError ? <span><strong>Error:</strong> {delivery.lastError}</span> : null}
                  <pre>{delivery.body}</pre>
                </div>
              </details>
            ))}
          </div>
        ) : <div className={styles.detailEmpty}>Encara no hi ha cap intent d’enviament.</div>}
      </section>

      <section className={styles.detailSection} aria-labelledby={`prospect-actions-${prospect.id}`}>
        <SectionHeader meta="Control humà" title="Historial de decisions" titleId={`prospect-actions-${prospect.id}`} description="Canvis manuals conservats separadament de la puntuació automàtica." />
        {prospect.actions.length ? (
          <ol className={styles.manualHistory}>
            {prospect.actions.map((action) => (
              <li key={action.id}>
                <UserRoundCheck aria-hidden="true" />
                <div>
                  <strong>{actionLabels[action.action]}</strong>
                  <span>{action.note}</span>
                  {action.previousScore !== null && action.nextScore !== null
                    ? <small>{action.previousScore}/100 → {action.nextScore}/100</small>
                    : action.previousContactEmail !== action.nextContactEmail
                    ? <small>{action.previousContactEmail ?? "Sense contacte"} → {action.nextContactEmail ?? "Sense contacte"}</small>
                    : <small>{statusLabels[action.previousStatus]} → {statusLabels[action.nextStatus]}</small>}
                </div>
                <time dateTime={action.createdAt}>{formatDate(action.createdAt)}</time>
              </li>
            ))}
          </ol>
        ) : <div className={styles.detailEmpty}>Encara no hi ha cap decisió manual.</div>}
      </section>
    </>
  );
}
