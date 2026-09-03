"use client";

import { KeyRound, ShieldX, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormSelect } from "@/components/ui/form-select";

import { grantUserMapAccessAction, revokeUserMapAccessAction } from "./actions";
import styles from "./user-access-dialog.module.css";

const levelOptions = [
  { value: "finding", label: "Sectors d’1 km" },
  { value: "contributor", label: "Sectors d’1 km i 250 m" },
];

const durationOptions = [
  { value: "7", label: "7 dies" },
  { value: "30", label: "30 dies" },
  { value: "90", label: "90 dies" },
  { value: "365", label: "1 any" },
];

function SubmitButton({ children, tone }: { children: string; tone?: "danger" }) {
  const { pending } = useFormStatus();
  return <button type="submit" data-tone={tone} disabled={pending}>{pending ? "Desant…" : children}</button>;
}

export function UserAccessDialog({
  accessActive,
  accessLabel,
  expiresAt,
  isAdministrator,
  userId,
  userLabel,
}: {
  accessActive: boolean;
  accessLabel: string;
  expiresAt: string | null;
  isAdministrator: boolean;
  userId: string;
  userLabel: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [accessLevel, setAccessLevel] = useState("contributor");
  const [durationDays, setDurationDays] = useState("30");

  if (isAdministrator) return <span className={styles.permanent}>Permanent</span>;

  return (
    <>
      <button className={styles.trigger} type="button" onClick={() => dialog.current?.showModal()}>
        Gestionar accés
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className={styles.card}>
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label="Tancar">
            <X size={20} aria-hidden="true" />
          </button>
          <header className={styles.header}>
            <span aria-hidden="true"><KeyRound size={22} /></span>
            <div>
              <p>Accés manual al mapa</p>
              <h2 id={titleId}>{userLabel}</h2>
              <small>
                {accessActive
                  ? `${accessLabel}${expiresAt ? ` · fins al ${new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt))}` : ""}`
                  : "Només mapa públic"}
              </small>
            </div>
          </header>

          <form action={grantUserMapAccessAction} className={styles.form}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="accessLevel" value={accessLevel} />
            <input type="hidden" name="durationDays" value={durationDays} />
            <fieldset>
              <legend>Concedir o ampliar l’accés</legend>
              <div className={styles.fieldGrid}>
                <label>
                  Nivell
                  <FormSelect
                    aria-label="Nivell d’accés al mapa"
                    value={accessLevel}
                    options={levelOptions}
                    onValueChange={setAccessLevel}
                    portalContainer={dialog}
                  />
                </label>
                <label>
                  Durada
                  <FormSelect
                    aria-label="Durada de l’accés al mapa"
                    value={durationDays}
                    options={durationOptions}
                    onValueChange={setDurationDays}
                    portalContainer={dialog}
                  />
                </label>
              </div>
              <label>
                Motiu
                <input name="reason" minLength={3} maxLength={1000} required placeholder="Per què es concedeix aquest accés?" />
              </label>
              <p>Si aquest nivell ja és actiu, els dies s’afegeixen després de la seva caducitat actual.</p>
              <div className={styles.actions}><SubmitButton>Concedir accés</SubmitButton></div>
            </fieldset>
          </form>

          {accessActive ? (
            <form action={revokeUserMapAccessAction} className={styles.form} data-tone="danger">
              <input type="hidden" name="userId" value={userId} />
              <fieldset>
                <legend><ShieldX size={18} aria-hidden="true" /> Retirar l’accés</legend>
                <label>
                  Motiu de revocació
                  <input name="reason" minLength={3} maxLength={1000} required />
                </label>
                <p>La revocació tanca tots els accessos temporals actius d’aquest compte.</p>
                <div className={styles.actions}><SubmitButton tone="danger">Retirar l’accés</SubmitButton></div>
              </fieldset>
            </form>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
