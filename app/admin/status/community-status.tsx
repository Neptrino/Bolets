import {
  AlertTriangle,
  ClipboardList,
  Flag,
  Globe2,
  History,
  LockKeyhole,
  MessageCircleQuestion,
  Users,
} from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/page-layout";
import type { CommunityStatus as CommunityStatusData } from "@/src/lib/community-status-server";

import styles from "./status.module.css";

const numberFormatter = new Intl.NumberFormat("ca-ES");

export function CommunityStatus({
  status,
  error,
}: {
  status: CommunityStatusData | null;
  error: string | null;
}) {
  return (
    <section className={`${styles.section} ${styles.communitySection}`} aria-labelledby="community-status">
      <SectionHeader
        meta="Comunitat"
        title="Usuaris i troballes"
        titleId="community-status"
        description="Recompte agregat dels comptes i de les troballes comunicades. Aquest tauler no consulta correus, coordenades exactes, notes ni fotografies privades."
      />
      {status ? (
        <div className={styles.communityGrid}>
          <Link className={styles.communityCard} data-tone="forest" href="/admin/status/users">
            <Users aria-hidden="true" />
            <div>
              <span>Usuaris registrats</span>
              <strong>{numberFormatter.format(status.registeredUsers)}</strong>
              <small>Comptes creats per accedir a les troballes.</small>
            </div>
          </Link>
          <Link className={styles.communityCard} data-tone="clay" href="/admin/status/findings?state=published">
            <ClipboardList aria-hidden="true" />
            <div>
              <span>Troballes enviades</span>
              <strong>{numberFormatter.format(status.submittedFindings)}</strong>
              <small>{numberFormatter.format(status.submittedFindingsLast7Days)} durant els últims 7 dies</small>
            </div>
          </Link>
          <Link className={styles.communityCard} data-tone="blue" href="/admin/status/findings?state=published&visibility=public">
            <Globe2 aria-hidden="true" />
            <div>
              <span>Troballes públiques</span>
              <strong>{numberFormatter.format(status.publicFindings)}</strong>
              <small>
                <LockKeyhole aria-hidden="true" />
                {numberFormatter.format(status.privateFindings)} de privades
              </small>
            </div>
          </Link>
          <Link className={styles.communityCard} data-tone="amber" href="/admin/status/findings?state=published&verification=pending">
            <MessageCircleQuestion aria-hidden="true" />
            <div>
              <span>Pendents de consens</span>
              <strong>{numberFormatter.format(status.pendingVerificationFindings)}</strong>
              <small>Troballes públiques que admeten validació de la comunitat.</small>
            </div>
          </Link>
          <Link className={styles.communityCard} data-tone="stone" href="/admin/status/findings?state=draft">
            <History aria-hidden="true" />
            <div>
              <span>Esborranys sense acabar</span>
              <strong>{numberFormatter.format(status.draftFindings)}</strong>
              <small>Informes iniciats que encara no s’han enviat.</small>
            </div>
          </Link>
          <Link className={styles.communityCard} data-tone={status.openModerationFlags > 0 ? "red" : "forest"} href="/admin/status/reports?status=open">
            <Flag aria-hidden="true" />
            <div>
              <span>Avisos de moderació oberts</span>
              <strong>{numberFormatter.format(status.openModerationFlags)}</strong>
              <small>{status.openModerationFlags > 0 ? "Requereixen revisió." : "No hi ha avisos pendents."}</small>
            </div>
          </Link>
        </div>
      ) : (
        <div className={styles.communityUnavailable} role="status">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>No es poden carregar les dades de comunitat</strong>
            <span>{error}</span>
          </div>
        </div>
      )}
    </section>
  );
}
