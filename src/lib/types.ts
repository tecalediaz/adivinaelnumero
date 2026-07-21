export type GameType = "adivina" | "tateti" | "viborita" | "ppt";

export type { PptChoice, PptPhase, PptState, PublicPptState } from "./ppt";
export { PPT_CHOOSE_MS, PPT_OPTIONS, pptEmoji, pptLabel } from "./ppt";

import type { PptChoice, PptState, PublicPptState } from "./ppt";

export type Hint = "higher" | "lower" | "correct";

export type RoomStatus = "waiting" | "playing" | "finished" | "aborted";

export type Mark = "X" | "O";

export type Cell = Mark | null;

export type Board = Cell[];

export type TatetiSize = 3 | 4 | 5;

export type Direction = "up" | "down" | "left" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  nickname: string;
  socketId: string;
  wins: number;
}

export interface GuessEntry {
  playerId: string;
  nickname: string;
  value: number;
  hint: Hint;
}

export interface SnakePlayerState {
  playerId: string;
  body: Point[];
  direction: Direction;
  pendingDirection: Direction;
  score: number;
  alive: boolean;
}

export interface ViboritaState {
  width: number;
  height: number;
  snakes: SnakePlayerState[];
  foods: Point[];
  targetScore: number;
}

export interface RoomState {
  code: string;
  gameType: GameType;
  status: RoomStatus;
  players: Player[];
  hostId: string;
  currentTurnId: string | null;
  winnerId: string | null;
  isDraw: boolean;
  // Adivina
  secret: number | null;
  guesses: GuessEntry[];
  // Tateti
  boardSize: TatetiSize;
  board: Board;
  marks: Record<string, Mark>;
  // Viborita
  viborita: ViboritaState | null;
  // Piedra papel tijera
  ppt: PptState | null;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  wins: number;
}

export interface PublicSnake {
  playerId: string;
  body: Point[];
  direction: Direction;
  score: number;
}

export interface PublicViboritaState {
  width: number;
  height: number;
  snakes: PublicSnake[];
  foods: Point[];
  targetScore: number;
}

export interface PublicRoomState {
  code: string;
  gameType: GameType;
  status: RoomStatus;
  players: PublicPlayer[];
  currentTurnId: string | null;
  guesses: GuessEntry[];
  winnerId: string | null;
  isDraw: boolean;
  board: Board;
  boardSize: TatetiSize;
  marks: Record<string, Mark>;
  secret: number | null;
  viborita: PublicViboritaState | null;
  ppt: PublicPptState | null;
}

export interface ClientToServerEvents {
  createRoom: (payload: {
    nickname: string;
    gameType: GameType;
    boardSize?: TatetiSize;
  }) => void;
  joinRoom: (payload: {
    code: string;
    nickname: string;
    gameType: GameType;
  }) => void;
  guess: (payload: { value: number }) => void;
  placeMark: (payload: { index: number }) => void;
  setDirection: (payload: { direction: Direction }) => void;
  pptChoose: (payload: { choice: PptChoice }) => void;
  rematch: () => void;
}

export interface ServerToClientEvents {
  roomCreated: (payload: {
    code: string;
    playerId: string;
    gameType: GameType;
  }) => void;
  roomJoined: (payload: {
    code: string;
    playerId: string;
    gameType: GameType;
    players: PublicPlayer[];
    yourTurn: boolean;
    status: RoomStatus;
    guesses: GuessEntry[];
    currentTurnId: string | null;
    board: Board;
    boardSize: TatetiSize;
    marks: Record<string, Mark>;
    isDraw: boolean;
    winnerId: string | null;
    viborita: PublicViboritaState | null;
    ppt: PublicPptState | null;
  }) => void;
  playerJoined: (payload: { players: PublicPlayer[] }) => void;
  gameStarted: (payload: {
    players: PublicPlayer[];
    currentTurnId: string | null;
    yourTurn: boolean;
    board: Board;
    boardSize: TatetiSize;
    marks: Record<string, Mark>;
    viborita: PublicViboritaState | null;
    ppt: PublicPptState | null;
  }) => void;
  guessResult: (payload: {
    playerId: string;
    nickname: string;
    value: number;
    hint: Hint;
    nextTurnId: string | null;
    guesses: GuessEntry[];
  }) => void;
  boardUpdated: (payload: {
    board: Board;
    boardSize: TatetiSize;
    nextTurnId: string | null;
    playerId: string;
    index: number;
    mark: Mark;
  }) => void;
  snakeState: (payload: {
    viborita: PublicViboritaState;
    players: PublicPlayer[];
  }) => void;
  pptUpdate: (payload: { ppt: PublicPptState }) => void;
  gameOver: (payload: {
    winnerId: string | null;
    isDraw: boolean;
    secret: number | null;
    players: PublicPlayer[];
    board: Board;
    boardSize: TatetiSize;
    viborita: PublicViboritaState | null;
    ppt: PublicPptState | null;
  }) => void;
  rematchStarted: (payload: {
    currentTurnId: string | null;
    yourTurn: boolean;
    guesses: GuessEntry[];
    players: PublicPlayer[];
    board: Board;
    boardSize: TatetiSize;
    marks: Record<string, Mark>;
    viborita: PublicViboritaState | null;
    ppt: PublicPptState | null;
  }) => void;
  playerDisconnected: (payload: { message: string }) => void;
  error: (payload: { message: string }) => void;
}

export const MIN_NUMBER = 0;
export const MAX_NUMBER = 10000;
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const TATETI_SIZES: TatetiSize[] = [3, 4, 5];

export const SNAKE_WIDTH = 48;
export const SNAKE_HEIGHT = 32;
export const SNAKE_FOOD_COUNT = 14;
export const SNAKE_START_LENGTH = 3;
export const SNAKE_POINTS_PER_FOOD = 100;
export const SNAKE_TARGET_MIN = 2000;
export const SNAKE_TARGET_MAX = 5000;
export const SNAKE_TICK_MS = 110;

export function createEmptyBoard(size: TatetiSize): Board {
  return Array.from({ length: size * size }, () => null);
}

export const GAME_META: Record<
  GameType,
  { title: string; description: string; path: string }
> = {
  adivina: {
    title: "Adivina el número",
    description:
      "Turnense para encontrar el número secreto entre 0 y 10000. El primero que acierta gana.",
    path: "/adivina",
  },
  tateti: {
    title: "Tateti",
    description:
      "Elegí tablero 3x3, 4x4 o 5x5. Jugá online con turnos y marcador acumulado.",
    path: "/tateti",
  },
  viborita: {
    title: "Viborita",
    description:
      "Dos viboritas en un tablero grande. Comé, crecé y llegá primero al puntaje objetivo.",
    path: "/viborita",
  },
  ppt: {
    title: "Piedra, papel o tijera",
    description:
      "Tenés 5 segundos para elegir. Después se revelan las manos y el ganador suma una victoria.",
    path: "/ppt",
  },
};

export function gameTypeLabel(gameType: GameType): string {
  return GAME_META[gameType].title;
}
