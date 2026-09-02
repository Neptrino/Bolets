import {
  AlertTriangle,
  ClipboardList,
  Globe2,
  History,
  LockKeyhole,
  Users,
} from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/page-layout";
import type { CommunityStatus as CommunityStatusData } from "@/src/lib/community-status-server";

import styles from "./dashboard.module.css";

const numberFormatter = new Intl.NumberFormat("ca-ES");

export function CommunityOverview({
  status,
  error,
}: {
  status: CommunityStatusData | null;
  error: string | null;
}) {
  return (
    <section className={styles.communitySection} aria-labelledby="community-overview">
      <SectionHeader
        meta="Comunitat"
        title="Usuaris i troballes"
        titleId="community-overview"
        description="Una lectura agregada de l’activitat. No consulta correus, coordenades exactes, notes ni fotografies privades."
      />
      {status ? (
        <div className={styles.communityGrid}>
          <Link className={styles.communityCard} href="/admin/usuaris">
            <Users aria-hidden="true" />
            <div>
              <span>Usuaris registrats</span>
              <strong>{numberFormatter.format(status.registeredUsers)}</strong>
              <small>Comptes creats per accedir a les troballes.</small>
            </div>
          </Link>
          <Link className={styles.communityCard} href="/admin/troballes?state=published">
            <ClipboardList aria-hidden="true" />
            <div>
              <span>Troballes enviades</span>
              <strong>{numberFormatter.format(status.submittedFindings)}</strong>
              <small>{numberFormatter.format(status.submittedFindingsLast7Days)} durant els últims 7 dies</small>
            </div>
          </Link>
          <Link className={styles.communityCard} href="/admin/troballes?state=published&visibility=public">
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
          <Link className={styles.communityCard} href="/admin/troballes?state=draft">
            <History aria-hidden="true" />
            <div>
              <span>Esborranys sense acabar</span>
              <strong>{numberFormatter.format(status.draftFindings)}</strong>
              <small>Informes iniciats que encara no s’han enviat.</small>
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
