export type PptChoice = "rock" | "paper" | "scissors";

export type PptPhase = "choosing" | "revealed";

export interface PptState {
  phase: PptPhase;
  deadline: number;
  choices: Record<string, PptChoice | null>;
}

export interface PublicPptState {
  phase: PptPhase;
  deadline: number;
  yourChoice: PptChoice | null;
  ready: Record<string, boolean>;
  /** Solo se completa al revelar */
  choices: Record<string, PptChoice | null> | null;
}

export const PPT_CHOOSE_MS = 5000;

export const PPT_OPTIONS: {
  choice: PptChoice;
  emoji: string;
  label: string;
}[] = [
  { choice: "rock", emoji: "✊", label: "Piedra" },
  { choice: "paper", emoji: "✋", label: "Papel" },
  { choice: "scissors", emoji: "✌️", label: "Tijera" },
];

export function pptEmoji(choice: PptChoice | null | undefined): string {
  if (!choice) return "❔";
  return PPT_OPTIONS.find((option) => option.choice === choice)?.emoji ?? "❔";
}

export function pptLabel(choice: PptChoice | null | undefined): string {
  if (!choice) return "Sin elegir";
  return PPT_OPTIONS.find((option) => option.choice === choice)?.label ?? "Sin elegir";
}

export function isPptChoice(value: unknown): value is PptChoice {
  return value === "rock" || value === "paper" || value === "scissors";
}

export function createPptState(playerIds: string[]): PptState {
  const choices: Record<string, PptChoice | null> = {};
  for (const id of playerIds) {
    choices[id] = null;
  }

  return {
    phase: "choosing",
    deadline: Date.now() + PPT_CHOOSE_MS,
    choices,
  };
}

export function toPublicPpt(
  state: PptState,
  viewerId: string,
  revealed: boolean
): PublicPptState {
  const ready: Record<string, boolean> = {};
  for (const [playerId, choice] of Object.entries(state.choices)) {
    ready[playerId] = choice !== null;
  }

  const showChoices = revealed || state.phase === "revealed";

  return {
    phase: showChoices ? "revealed" : "choosing",
    deadline: state.deadline,
    yourChoice: state.choices[viewerId] ?? null,
    ready,
    choices: showChoices ? { ...state.choices } : null,
  };
}

/** Compara dos jugadas. null = no eligió a tiempo. */
export function comparePpt(
  a: PptChoice | null,
  b: PptChoice | null
): "a" | "b" | "draw" {
  if (a === null && b === null) return "draw";
  if (a === null) return "b";
  if (b === null) return "a";
  if (a === b) return "draw";

  if (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  ) {
    return "a";
  }

  return "b";
}
