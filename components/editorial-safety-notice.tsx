import { ShieldAlert } from "lucide-react";
import { Notice } from "@/components/notice";

export function EditorialSafetyNotice() {
  return (
    <Notice icon={ShieldAlert} title="Informació editorial, sense revisió micològica independent." className="intent-safety-note" aria-label="Abast de la guia">
      Aquesta guia reuneix informació de les fonts citades i del catàleg. No és una clau d’identificació ni permet decidir si un exemplar es pot consumir. Davant del dubte, no el consumeixis.
    </Notice>
  );
}
