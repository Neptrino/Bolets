import { AlertTriangle, Check, CircleHelp, ShieldAlert } from "lucide-react";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import type { EdibilityStatus } from "@/src/lib/types";

export function EdibilityBadge({ status, compact = false }: { status: EdibilityStatus; compact?: boolean }) {
  const Icon = status.includes("toxic") ? ShieldAlert : status === "unknown" ? CircleHelp : status.includes("conditions") || status === "not_recommended" ? AlertTriangle : Check;
  return <span className={`edibility-badge ${status} ${compact ? "compact" : ""}`}><Icon size={compact ? 13 : 15} />{getEdibilityPresentation(status).label}</span>;
}
