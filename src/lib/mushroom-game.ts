export type MushroomGameTone = "edible" | "caution" | "danger";

export type MushroomGameEntry = {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  habitat: string;
  features: string[];
  image: {
    src: string;
    alt: string;
    attribution: string;
    license: string;
    sourceUrl: string;
  };
  statusLabel: string;
  statusTone: MushroomGameTone;
  choices: Array<{ id: string; label: string }>;
  specimen:
    | "cep"
    | "chanterelle"
    | "milkcap"
    | "fly-agaric"
    | "death-cap"
    | "cluster"
    | "royal-amanita"
    | "parasol"
    | "inkcap"
    | "morel"
    | "oyster"
    | "russula"
    | "yellowfoot"
    | "fairy-ring"
    | "devil-bolete";
};

export type MushroomGameRoundEntry = MushroomGameEntry & {
  position: { x: number; y: number };
};

export const MUSHROOM_GAME_SIZE = 6;

const ROUND_POSITIONS = [
  { x: 18, y: 69 },
  { x: 34, y: 79 },
  { x: 52, y: 68 },
  { x: 68, y: 77 },
  { x: 82, y: 69 },
  { x: 91, y: 83 },
] as const;

function shuffled<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }
  return result;
}

export function selectMushroomRound(
  entries: readonly MushroomGameEntry[],
  previousIds: readonly string[] = [],
  random: () => number = Math.random,
): MushroomGameRoundEntry[] {
  if (entries.length < MUSHROOM_GAME_SIZE) {
    throw new Error(`Mushroom game needs at least ${MUSHROOM_GAME_SIZE} species.`);
  }

  const shuffledEntries = shuffled(entries, random);
  const chosen = shuffledEntries.slice(0, MUSHROOM_GAME_SIZE);
  const previous = new Set(previousIds);

  if (previous.size === MUSHROOM_GAME_SIZE && chosen.every((entry) => previous.has(entry.id))) {
    const replacement = shuffledEntries.slice(MUSHROOM_GAME_SIZE).find((entry) => !previous.has(entry.id));
    if (replacement) chosen[chosen.length - 1] = replacement;
  }

  const positions = shuffled(ROUND_POSITIONS, random);
  return chosen.map((entry, index) => ({
    ...entry,
    choices: shuffled(entry.choices, random),
    position: positions[index] as { x: number; y: number },
  }));
}

export function scoreForAttempt(attempt: number) {
  if (attempt <= 1) return 100;
  if (attempt === 2) return 70;
  return 40;
}

export function rankForScore(score: number, totalSpecimens: number) {
  const maximum = totalSpecimens * scoreForAttempt(1);
  const ratio = maximum > 0 ? score / maximum : 0;

  if (ratio >= 0.9) return "Ull de linx";
  if (ratio >= 0.7) return "Naturalista atent";
  return "Aprenent del sotabosc";
}
