export type GameType = "adivina" | "tateti";

export type Hint = "higher" | "lower" | "correct";

export type RoomStatus = "waiting" | "playing" | "finished" | "aborted";

export type Mark = "X" | "O";

export type Cell = Mark | null;

export type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];

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
  board: Board;
  marks: Record<string, Mark>;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  wins: number;
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
  marks: Record<string, Mark>;
  secret: number | null;
}

export interface ClientToServerEvents {
  createRoom: (payload: { nickname: string; gameType: GameType }) => void;
  joinRoom: (payload: {
    code: string;
    nickname: string;
    gameType: GameType;
  }) => void;
  guess: (payload: { value: number }) => void;
  placeMark: (payload: { index: number }) => void;
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
    marks: Record<string, Mark>;
    isDraw: boolean;
    winnerId: string | null;
  }) => void;
  playerJoined: (payload: { players: PublicPlayer[] }) => void;
  gameStarted: (payload: {
    players: PublicPlayer[];
    currentTurnId: string;
    yourTurn: boolean;
    board: Board;
    marks: Record<string, Mark>;
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
    nextTurnId: string | null;
    playerId: string;
    index: number;
    mark: Mark;
  }) => void;
  gameOver: (payload: {
    winnerId: string | null;
    isDraw: boolean;
    secret: number | null;
    players: PublicPlayer[];
    board: Board;
  }) => void;
  rematchStarted: (payload: {
    currentTurnId: string;
    yourTurn: boolean;
    guesses: GuessEntry[];
    players: PublicPlayer[];
    board: Board;
    marks: Record<string, Mark>;
  }) => void;
  playerDisconnected: (payload: { message: string }) => void;
  error: (payload: { message: string }) => void;
}

export const MIN_NUMBER = 0;
export const MAX_NUMBER = 10000;
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const EMPTY_BOARD: Board = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

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
      "Clásico 3x3 online. Jugá con un amigo, turnos alternados y marcador acumulado.",
    path: "/tateti",
  },
};
