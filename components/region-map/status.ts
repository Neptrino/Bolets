import { GLOBAL_MINIMUM_GRID_SIZE_M } from "@/src/lib/global-map";
import { formatCellCount, type CellState, type HabitatEvidenceState } from "./support";

export type MapStatusCopy = {
  title: string;
  detail: string;
};

export function habitatEvidenceCopy(state: HabitatEvidenceState) {
  if (state.available === null) return "Carregant registres…";
  if (state.available === false) return "Els registres històrics no estan disponibles.";
  if (state.habitatCells) {
    return `${state.records} registres històrics; ${state.habitatCells} sectors coincideixen amb l’hàbitat.`;
  }
  if (state.cells) {
    return `${state.records} registres històrics; cap coincidència visible amb l’hàbitat.`;
  }
  return "Cap registre visible; no implica absència.";
}

export function mapStatusCopy({
  cellState,
  globalPrediction,
  showCompatibility,
}: {
  cellState: CellState;
  globalPrediction: boolean;
  showCompatibility: boolean;
}): MapStatusCopy {
  if (showCompatibility) {
    if (cellState.status === "ready") {
      return {
        title: "Zones que encaixen amb l’espècie",
        detail: cellState.truncated
          ? "Apropa el mapa per carregar la resta de la zona."
          : cellState.gridSizeM > 250
            ? "Apropa el mapa per veure més detall."
            : "Màxim detall disponible.",
      };
    }
    if (cellState.status === "loading") {
      return {
        title: "Comprovant l’hàbitat…",
        detail: "Estem carregant el bosc, l’altitud i el sòl d’aquesta zona.",
      };
    }
    if (cellState.status === "error") {
      return {
        title: "No s’ha pogut carregar el terreny adequat",
        detail: "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
      };
    }
    return {
      title: "Cap terreny adequat en aquesta vista",
      detail: "El bosc, l’altitud o el sòl d’aquesta vista no encaixen amb l’espècie.",
    };
  }

  if (cellState.status === "mixed") {
    return {
      title: "Hi ha sectors amb resultats diferents",
      detail: `${cellState.published ? `${formatCellCount(cellState.published)} amb valoració; ` : ""}${formatCellCount(cellState.excluded)} sense condicions favorables; ${formatCellCount(cellState.withheld)} sense informació suficient.`,
    };
  }
  if (cellState.status === "ready") {
    return {
      title: "Condicions disponibles",
      detail: globalPrediction && cellState.gridSizeM === GLOBAL_MINIMUM_GRID_SIZE_M
        ? "Tria una espècie concreta per veure més detall."
        : "Selecciona un sector per veure’n el detall.",
    };
  }
  if (cellState.status === "incompatible") {
    return {
      title: "Cap sector favorable en aquesta vista",
      detail: "L’hàbitat no encaixa o l’espècie és fora de temporada.",
    };
  }
  if (cellState.status === "withheld") {
    return {
      title: "No hi ha prou informació per valorar la zona",
      detail: "Algunes lectures són incompletes o massa antigues.",
    };
  }
  if (cellState.status === "loading") {
    return {
      title: "Carregant les condicions…",
      detail: "Consultant les lectures més recents.",
    };
  }
  if (cellState.status === "error") {
    return {
      title: "No s’ha pogut carregar aquesta zona",
      detail: "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
    };
  }
  return {
    title: "Encara no hi ha dades per a aquesta vista",
    detail: "Torna-ho a provar més tard o mou el mapa a una altra zona.",
  };
}
