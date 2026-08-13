import { Star, TriangleAlert } from "lucide-react";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import type { CulinaryProfile, EdibilityStatus } from "@/src/lib/types";

export function CulinaryRating({
  profile,
  status,
  compact = false,
}: {
  profile: Pick<CulinaryProfile, "kind" | "rating" | "ratingLabel">;
  status: EdibilityStatus;
  compact?: boolean;
}) {
  const isSafetyWarning = profile.kind === "safety";
  const label = isSafetyWarning
    ? getEdibilityPresentation(status).label
    : profile.ratingLabel;
  const ariaLabel = isSafetyWarning
    ? `Advertiment de consum: ${label}`
    : `Valor culinari orientatiu: ${label}, ${profile.rating} de 3 estrelles`;

  return (
    <span
      className={`culinary-rating ${status}${isSafetyWarning ? " safety-warning" : ""}${compact ? " compact" : ""}`}
      aria-label={ariaLabel}
      title={isSafetyWarning ? "Advertiment de seguretat" : "Valor culinari orientatiu; no substitueix una identificació experta"}
    >
      {isSafetyWarning ? (
        <TriangleAlert
          className="culinary-warning-icon"
          size={compact ? 15 : 17}
          aria-hidden="true"
        />
      ) : (
        <span className="culinary-stars" aria-hidden="true">
          {[1, 2, 3].map((value) => (
            <Star
              key={value}
              size={compact ? 13 : 15}
              className={value <= profile.rating ? "is-filled" : ""}
            />
          ))}
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
