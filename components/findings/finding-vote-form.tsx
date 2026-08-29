"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CatalogueSpecies } from "@/src/lib/types";

export function FindingVoteForm({ findingId, species, initialSpeciesId, signedIn }: { findingId: string; species: CatalogueSpecies[]; initialSpeciesId: string; signedIn: boolean }) {
  const router = useRouter();
  const [speciesId, setSpeciesId] = useState(initialSpeciesId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const vote = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/findings/${findingId}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ speciesId }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) setMessage(response.status === 401 ? "Inicia sessió per validar aquesta identificació." : body.error);
    else { setMessage("Vot registrat. Gràcies per revisar la identificació."); router.refresh(); }
  };

  if (!signedIn) {
    const returnTo = encodeURIComponent(`/troballes/${findingId}`);
    return <div className="finding-vote-signin">
      <div>
        <strong>Vols ajudar a identificar-la?</strong>
        <p>Inicia sessió per deixar una validació i tornar directament a aquesta troballa.</p>
      </div>
      <Link className="finding-button" href={`/acces?retorn=${returnTo}`}>
        <LogIn size={18} aria-hidden="true" />
        Inicia sessió
      </Link>
    </div>;
  }

  return <form className="finding-stack" onSubmit={vote}>
    <label className="finding-field">La teva identificació<select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)}>{species.map((item) => <option value={item.speciesId} key={item.speciesId}>{item.identity.commonName} · {item.identity.scientificName}</option>)}</select></label>
    <button className="finding-button" disabled={busy}>{busy ? "Desant…" : "Validar identificació"}</button>
    {message ? <p className="finding-notice">{message}</p> : null}
    <small>Els vots revisen només el nom proposat. No confirmen que el bolet sigui comestible ni que la ubicació sigui autèntica.</small>
  </form>;
}
