"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SearchSelect } from "@/components/ui/query-select";
import type {
  ForestPreferenceOption,
  ForestPreferences,
} from "@/src/lib/my-forest/types";

type PreferenceManagerProps = {
  initial: ForestPreferences;
  speciesOptions: ForestPreferenceOption[];
  territoryOptions: ForestPreferenceOption[];
};

function PreferencePicker({
  label,
  placeholder,
  options,
  selected,
  busy,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: ForestPreferenceOption[];
  selected: string[];
  busy: boolean;
  onChange: (values: string[]) => void;
}) {
  const available = options.filter((option) => !selected.includes(option.value));
  const selectedOptions = selected.flatMap((value) => {
    const option = options.find((candidate) => candidate.value === value);
    return option ? [option] : [];
  });

  return (
    <fieldset className="forest-preference-fieldset">
      <legend>{label}</legend>
      <div className="forest-preference-add">
        <span>{placeholder}</span>
        <SearchSelect
          value={null}
          items={available.map((option) => ({
            value: option.value,
            label: `${option.label}${option.detail ? ` · ${option.detail}` : ""}`,
          }))}
          onValueChange={(option) => onChange([...selected, option.value])}
          variant="preference"
          className="forest-preference-select"
          placeholder={available.length ? "Cerca i tria…" : "Ja les has triat totes"}
          emptyMessage="No hi ha cap coincidència."
          disabled={busy || available.length === 0}
          resetOnSelect
          aria-label={placeholder}
        />
      </div>
      {selectedOptions.length ? (
        <ul className="forest-preference-chips" aria-label={`${label} desats`}>
          {selectedOptions.map((option) => (
            <li key={option.value}>
              <span><strong>{option.label}</strong>{option.detail ? <small>{option.detail}</small> : null}</span>
              <button
                type="button"
                aria-label={`Treure ${option.label}`}
                onClick={() => onChange(selected.filter((value) => value !== option.value))}
                disabled={busy}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="forest-preference-empty">Encara no n’has desat cap.</p>
      )}
    </fieldset>
  );
}

export function PreferenceManager({
  initial,
  speciesOptions,
  territoryOptions,
}: PreferenceManagerProps) {
  const router = useRouter();
  const [speciesIds, setSpeciesIds] = useState(initial.speciesIds);
  const [territorySlugs, setTerritorySlugs] = useState(initial.territorySlugs);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("Els canvis es desen automàticament.");
  const pending = useRef(false);
  const busy = saveState === "saving";

  const save = async (next: ForestPreferences) => {
    if (pending.current) return;
    pending.current = true;
    const previous = { speciesIds, territorySlugs };
    setSpeciesIds(next.speciesIds);
    setTerritorySlugs(next.territorySlugs);
    setSaveState("saving");
    setMessage("Desant els canvis…");

    try {
      const response = await fetch("/api/me/forest-preferences", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No s’han pogut desar les preferències.");
      }
      setSaveState("saved");
      setMessage("Canvis desats.");
      router.refresh();
    } catch (error) {
      setSpeciesIds(previous.speciesIds);
      setTerritorySlugs(previous.territorySlugs);
      setSaveState("error");
      setMessage(error instanceof Error
        ? error.message
        : "No s’han pogut desar les preferències.");
    } finally {
      pending.current = false;
    }
  };

  return (
    <div className="forest-preference-card">
      <PreferencePicker
        label="Espècies preferides"
        placeholder="Afegeix una espècie"
        options={speciesOptions}
        selected={speciesIds}
        busy={busy}
        onChange={(nextSpeciesIds) => void save({
          speciesIds: nextSpeciesIds,
          territorySlugs,
        })}
      />
      <PreferencePicker
        label="Territoris"
        placeholder="Afegeix una comarca, un massís o un paratge"
        options={territoryOptions}
        selected={territorySlugs}
        busy={busy}
        onChange={(nextTerritorySlugs) => void save({
          speciesIds,
          territorySlugs: nextTerritorySlugs,
        })}
      />
      <footer>
        <p>Només combinem opcions que ja tenen guia local i lectura territorial; no desem punts del mapa.</p>
        <p
          className={`forest-preference-sync is-${saveState}`}
          role={saveState === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {busy
            ? <LoaderCircle size={16} aria-hidden="true" />
            : saveState === "error"
              ? <X size={16} aria-hidden="true" />
              : <Check size={16} aria-hidden="true" />}
          {message}
        </p>
      </footer>
    </div>
  );
}
