"use client";

import {
  CloudCog,
  DatabaseZap,
  Gauge,
  Layers3,
  RefreshCw,
  Satellite,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { OperationalResyncTarget } from "@/src/lib/operational-resync";

import styles from "./status.module.css";

const commands = [
  {
    target: "all",
    eyebrow: "Seqüència completa",
    title: "Cicle diari complet",
    description: "Reinicia atmosfera, sòl, previsió i memòries; també actualitza regions i XEMA.",
    Icon: RefreshCw,
    primary: true,
  },
  {
    target: "spatial-atmosphere",
    eyebrow: "500 punts AROME",
    title: "Atmosfera espacial",
    description: "Recrea els fragments meteorològics i la pluja model per les tres sortides.",
    Icon: Satellite,
  },
  {
    target: "soil-forecast",
    eyebrow: "Sòl + cinc dies",
    title: "Sòl i previsió",
    description: "Torna a baixar la humitat superficial i la projecció meteorològica.",
    Icon: DatabaseZap,
  },
  {
    target: "regional-environment",
    eyebrow: "Lectura general",
    title: "Resums regionals",
    description: "Actualitza les lectures ambientals agregades de totes les regions.",
    Icon: CloudCog,
  },
  {
    target: "station-rain",
    eyebrow: "Últimes 48 hores",
    title: "Pluja XEMA",
    description: "Reimporta els pluviòmetres i conserva la finestra horària normalitzada.",
    Icon: Gauge,
  },
  {
    target: "condition-caches",
    eyebrow: "Capes publicades",
    title: "Memòries de puntuació",
    description: "Programa de nou les capes d’1, 2,5, 5 i 10 km des de la generació completa.",
    Icon: Layers3,
  },
] satisfies Array<{
  target: OperationalResyncTarget;
  eyebrow: string;
  title: string;
  description: string;
  Icon: typeof RefreshCw;
  primary?: boolean;
}>;

const refusalMessages: Record<string, string> = {
  "another-resync-is-being-prepared": "Ja s’està preparant una altra ordre.",
  "spatial-atmosphere-is-running": "L’atmosfera encara té un fragment actiu.",
  "soil-or-forecast-publication-is-running": "El sòl o la previsió s’estan publicant ara mateix.",
  "condition-cache-publication-is-running": "Les memòries s’estan publicant ara mateix.",
};

export function ResyncControls() {
  const router = useRouter();
  const [pendingTarget, setPendingTarget] = useState<OperationalResyncTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [fullCycleConfirmationOpen, setFullCycleConfirmationOpen] = useState(false);

  async function run(target: OperationalResyncTarget) {
    setPendingTarget(target);
    setMessage(null);
    try {
      const response = await fetch("/admin/status/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        reason?: string;
        requestIds?: number[];
        resetPipelines?: string[];
      };
      if (!response.ok) {
        throw new Error(
          (payload.reason && refusalMessages[payload.reason])
          || payload.error
          || "No s’ha pogut posar l’ordre a la cua.",
        );
      }
      const requestCount = payload.requestIds?.length ?? 0;
      setMessageKind("success");
      setMessage(requestCount > 0
        ? `Ordre acceptada: ${requestCount} ${requestCount === 1 ? "tasca" : "tasques"} en cua.`
        : "Ordre acceptada: les memòries es republicaran amb el cron local.");
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "No s’ha pogut posar l’ordre a la cua.");
    } finally {
      setPendingTarget(null);
    }
  }

  return <>
    <div className={styles.commandPanel}>
      <div className={styles.commandGrid}>
        {commands.map(({ target, eyebrow, title, description, Icon, primary }) => {
          const pending = pendingTarget === target;
          return (
            <button
              aria-busy={pending}
              className={styles.commandButton}
              data-primary={primary || undefined}
              disabled={pendingTarget !== null}
              key={target}
              onClick={() => {
                if (target === "all") setFullCycleConfirmationOpen(true);
                else void run(target);
              }}
              type="button"
            >
              <span className={styles.commandIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.commandCopy}>
                <span>{eyebrow}</span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <span className={styles.commandAction}>
                {pending ? <><RefreshCw aria-hidden="true" /> Preparant</> : "Executa"}
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.commandFooter}>
        <p>La darrera lectura observada continua publicada mentre es refà la generació. La previsió pot quedar temporalment oculta durant la seva reconstrucció.</p>
        <p
          className={styles.commandFeedback}
          data-kind={messageKind}
          role="status"
        >
          {message}
        </p>
      </div>
    </div>
    <ConfirmDialog
      open={fullCycleConfirmationOpen}
      busy={pendingTarget === "all"}
      title="Reiniciar tot el cicle diari?"
      description="Aquesta ordre refarà atmosfera, sòl, previsió i memòries, i pot consumir moltes peticions del proveïdor."
      confirmLabel="Reiniciar el cicle"
      busyLabel="Preparant…"
      icon={<RefreshCw aria-hidden="true" />}
      onCancel={() => setFullCycleConfirmationOpen(false)}
      onConfirm={() => { void run("all").finally(() => setFullCycleConfirmationOpen(false)); }}
    />
  </>;
}
