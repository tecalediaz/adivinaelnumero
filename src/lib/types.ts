export type Hint = "higher" | "lower" | "correct";

export type RoomStatus = "waiting" | "playing" | "finished" | "aborted";

export interface Player {
  id: string;
  nickname: string;
  socketId: string;
}

export interface GuessEntry {
  playerId: string;
  nickname: string;
  value: number;
  hint: Hint;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  players: Player[];
  hostId: string;
  secret: number | null;
  currentTurnId: string | null;
  guesses: GuessEntry[];
  winnerId: string | null;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
}

export interface PublicRoomState {
  code: string;
  status: RoomStatus;
  players: PublicPlayer[];
  currentTurnId: string | null;
  guesses: GuessEntry[];
  winnerId: string | null;
}

export interface ClientToServerEvents {
  createRoom: (payload: { nickname: string }) => void;
  joinRoom: (payload: { code: string; nickname: string }) => void;
  guess: (payload: { value: number }) => void;
  rematch: () => void;
}

export interface ServerToClientEvents {
  roomCreated: (payload: { code: string; playerId: string }) => void;
  roomJoined: (payload: {
    code: string;
    playerId: string;
    players: PublicPlayer[];
    yourTurn: boolean;
    status: RoomStatus;
    guesses: GuessEntry[];
    currentTurnId: string | null;
  }) => void;
  playerJoined: (payload: { players: PublicPlayer[] }) => void;
  gameStarted: (payload: {
    players: PublicPlayer[];
    currentTurnId: string;
    yourTurn: boolean;
  }) => void;
  guessResult: (payload: {
    playerId: string;
    nickname: string;
    value: number;
    hint: Hint;
    nextTurnId: string | null;
    guesses: GuessEntry[];
  }) => void;
  gameOver: (payload: { winnerId: string; secret: number }) => void;
  rematchStarted: (payload: {
    currentTurnId: string;
    yourTurn: boolean;
    guesses: GuessEntry[];
  }) => void;
  playerDisconnected: (payload: { message: string }) => void;
  error: (payload: { message: string }) => void;
}

export const MIN_NUMBER = 0;
export const MAX_NUMBER = 1000;
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
