import { AlertTriangle, Check, CircleHelp, ShieldAlert } from "lucide-react";
import type { EdibilityStatus } from "@/src/lib/types";

const labels: Record<EdibilityStatus, string> = {
  excellent_edible: "Excel·lent comestible", edible: "Comestible", edible_with_conditions: "Comestible amb condicions", not_recommended: "No recomanat", inedible: "No comestible", toxic: "Tòxic", dangerously_toxic: "Molt tòxic", unknown: "Desconegut"
};

export function EdibilityBadge({ status, compact = false }: { status: EdibilityStatus; compact?: boolean }) {
  const Icon = status.includes("toxic") ? ShieldAlert : status === "unknown" ? CircleHelp : status.includes("conditions") || status === "not_recommended" ? AlertTriangle : Check;
  return <span className={`edibility-badge ${status} ${compact ? "compact" : ""}`}><Icon size={compact ? 13 : 15} />{labels[status]}</span>;
}
