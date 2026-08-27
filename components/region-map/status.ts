import { GLOBAL_MINIMUM_GRID_SIZE_M } from "@/src/lib/global-map";
import { formatCellCount, type CellState, type HabitatEvidenceState } from "./support";

export type MapStatusCopy = {
  title: string;
  detail: string;
};

export function habitatEvidenceCopy(state: HabitatEvidenceState) {
  if (state.available === null) return "Carregant registres…";
  if (state.available === false) return "Registres de FungaCAT no disponibles.";
  if (state.habitatCells) {
    return `${state.records} registres en ${state.cells} quadrícules de 10 km; ${state.habitatCells} sectors coincideixen.`;
  }
  if (state.cells) {
    return `${state.records} registres en ${state.cells} quadrícules de 10 km; cap coincidència visible.`;
  }
  return "Cap registre visible; no implica absència.";
}

export function mapStatusCopy({
  cellState,
  globalPrediction,
  gridDimensions,
  showCompatibility,
}: {
  cellState: CellState;
  globalPrediction: boolean;
  gridDimensions: string;
  showCompatibility: boolean;
}): MapStatusCopy {
  if (showCompatibility) {
    if (cellState.status === "ready") {
      return {
        title: "Coberta del sòl, altitud i pH compatibles",
        detail: cellState.truncated
          ? `Resolució actual: ${gridDimensions}. Apropeu-vos per carregar la resta.`
          : cellState.gridSizeM > 250
            ? `Resolució actual: ${gridDimensions}. Apropeu-vos per veure la graella de 250 m.`
            : `Resolució actual: ${gridDimensions}.`,
      };
    }
    if (cellState.status === "loading") {
      return {
        title: "Comprovant coberta del sòl, altitud i pH…",
        detail: `Comprovant coberta del sòl, altitud i pH a ${gridDimensions}.`,
      };
    }
    if (cellState.status === "error") {
      return {
        title: "No s’han pogut carregar les zones compatibles",
        detail: "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
      };
    }
    return {
      title: "Cap zona compatible en aquesta vista",
      detail: "No hi ha cel·les on coincideixin la coberta del sòl, l’altitud i el pH requerits.",
    };
  }

  if (cellState.status === "mixed") {
    return {
      title: "Resultats mixtos a la vista",
      detail:
        `${cellState.published ? `Amb puntuació publicada: ${formatCellCount(cellState.published)}; ` : ""}` +
        `puntuació 0, amb contorn discontinu: ${formatCellCount(cellState.excluded)}; ` +
        `sense puntuació, en gris: ${formatCellCount(cellState.withheld)} perquè hi falten components requerits, dades vigents o evidència estàtica verificada.`,
    };
  }
  if (cellState.status === "ready") {
    return {
      title: "Predicció disponible",
      detail: globalPrediction && cellState.gridSizeM === GLOBAL_MINIMUM_GRID_SIZE_M
        ? `Resolució: ${gridDimensions}, la màxima del mapa combinat. Tria una espècie concreta per a la graella de 250 m.`
        : `Resolució: ${gridDimensions}.`,
    };
  }
  if (cellState.status === "incompatible") {
    return {
      title: `${cellState.excluded} cel·les amb puntuació 0`,
      detail: "Es mostren sense farciment de color i amb contorn discontinu: ara no tenen hàbitat compatible o l’espècie queda fora de la temporada activa.",
    };
  }
  if (cellState.status === "withheld") {
    return {
      title: "Cel·les disponibles, predicció retinguda",
      detail: "Falten components requerits, les dades són antigues o la cobertura no supera el llindar mínim.",
    };
  }
  if (cellState.status === "loading") {
    return {
      title: `Carregant la graella de ${gridDimensions}…`,
      detail: "Consultant l’última instantània ambiental per a aquesta vista.",
    };
  }
  if (cellState.status === "error") {
    return {
      title: "No s’han pogut carregar les cel·les",
      detail: "La base cartogràfica continua disponible; torna-ho a provar movent el mapa.",
    };
  }
  return {
    title: `Encara no hi ha cel·les de ${gridDimensions} publicades`,
    detail: "La predicció per cel·la s’activarà quan la ingestió espacial publiqui sòl, bosc, relleu i temps verificats.",
  };
}
