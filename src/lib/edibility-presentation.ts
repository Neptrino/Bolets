import type { EdibilityStatus } from "@/src/lib/types";

interface EdibilityPresentation {
  label: string;
}

const presentations: Record<EdibilityStatus, EdibilityPresentation> = {
  excellent_edible: {
    label: "Excel·lent comestible",
  },
  edible: {
    label: "Comestible",
  },
  edible_with_conditions: {
    label: "Comestible amb condicions",
  },
  not_recommended: {
    label: "No recomanat",
  },
  inedible: {
    label: "No comestible",
  },
  toxic: {
    label: "Tòxic",
  },
  dangerously_toxic: {
    label: "Molt tòxic",
  },
  unknown: {
    label: "Desconegut",
  },
};

export function getEdibilityPresentation(status: EdibilityStatus) {
  return presentations[status];
}
