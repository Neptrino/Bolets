import { ShieldAlert } from "lucide-react";

export function EditorialSafetyNotice() {
  return (
    <aside className="intent-safety-note" aria-label="Abast de la guia">
      <ShieldAlert size={22} aria-hidden="true" />
      <div>
        <strong>Informació editorial, sense revisió micològica independent.</strong>
        <p>Aquesta guia reuneix informació de les fonts citades i del catàleg. No és una clau d’identificació ni permet decidir si un exemplar es pot consumir. Davant del dubte, no el consumiu.</p>
      </div>
    </aside>
  );
}
