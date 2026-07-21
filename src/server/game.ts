import {
  Board,
  GameType,
  GuessEntry,
  Hint,
  MAX_NUMBER,
  MIN_NUMBER,
  Mark,
  Player,
  PublicPlayer,
  PublicRoomState,
  ROOM_CODE_CHARS,
  ROOM_CODE_LENGTH,
  RoomState,
  TATETI_SIZES,
  TatetiSize,
  createEmptyBoard,
  gameTypeLabel,
} from "../lib/types";
import {
  createViboritaState,
  resetViboritaForRematch,
  toPublicViborita,
} from "./snake";

const rooms = new Map<string, RoomState>();

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[index];
  }
  return code;
}

function generateSecret(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
}

function toPublicPlayers(players: Player[]): PublicPlayer[] {
  return players.map(({ id, nickname, wins }) => ({ id, nickname, wins }));
}

export function toPublicRoomState(room: RoomState): PublicRoomState {
  return {
    code: room.code,
    gameType: room.gameType,
    status: room.status,
    players: toPublicPlayers(room.players),
    currentTurnId: room.currentTurnId,
    guesses: room.guesses,
    winnerId: room.winnerId,
    isDraw: room.isDraw,
    board: room.board,
    boardSize: room.boardSize,
    marks: { ...room.marks },
    secret: room.status === "finished" ? room.secret : null,
    viborita: room.viborita ? toPublicViborita(room.viborita) : null,
  };
}

export function createRoom(
  nickname: string,
  socketId: string,
  gameType: GameType,
  boardSize: TatetiSize = 3
): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const size = TATETI_SIZES.includes(boardSize) ? boardSize : 3;
  const playerId = crypto.randomUUID();
  const room: RoomState = {
    code,
    gameType,
    status: "waiting",
    players: [{ id: playerId, nickname: nickname.trim(), socketId, wins: 0 }],
    hostId: playerId,
    currentTurnId: null,
    winnerId: null,
    isDraw: false,
    secret: null,
    guesses: [],
    boardSize: size,
    board: createEmptyBoard(size),
    marks: {},
    viborita: null,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  nickname: string,
  socketId: string,
  gameType: GameType
): { room: RoomState; playerId: string } | { error: string } {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    return { error: "La sala no existe." };
  }

  if (room.gameType !== gameType) {
    return {
      error: `Esa sala es de ${gameTypeLabel(room.gameType)}.`,
    };
  }

  if (room.status === "aborted") {
    return { error: "La sala fue cerrada." };
  }

  if (room.players.length >= 2) {
    return { error: "La sala ya está llena." };
  }

  const playerId = crypto.randomUUID();
  room.players.push({
    id: playerId,
    nickname: nickname.trim(),
    socketId,
    wins: 0,
  });

  return { room, playerId };
}

function pickRandomStarterId(room: RoomState): string {
  const index = Math.floor(Math.random() * room.players.length);
  return room.players[index].id;
}

function assignMarks(room: RoomState, starterId: string): void {
  const other = room.players.find((player) => player.id !== starterId);
  room.marks = {
    [starterId]: "X",
    ...(other ? { [other.id]: "O" } : {}),
  };
}

export function startGame(room: RoomState): void {
  room.status = "playing";
  room.winnerId = null;
  room.isDraw = false;

  if (room.gameType === "adivina") {
    const starterId = pickRandomStarterId(room);
    room.currentTurnId = starterId;
    room.secret = generateSecret();
    room.guesses = [];
    room.board = createEmptyBoard(room.boardSize);
    room.marks = {};
    room.viborita = null;
    return;
  }

  if (room.gameType === "tateti") {
    const starterId = pickRandomStarterId(room);
    room.currentTurnId = starterId;
    room.secret = null;
    room.guesses = [];
    room.board = createEmptyBoard(room.boardSize);
    assignMarks(room, starterId);
    room.viborita = null;
    return;
  }

  // viborita
  room.currentTurnId = null;
  room.secret = null;
  room.guesses = [];
  room.marks = {};
  room.board = createEmptyBoard(3);
  room.viborita = createViboritaState([
    room.players[0].id,
    room.players[1].id,
  ]);
}

export function getRoomByCode(code: string): RoomState | undefined {
  return rooms.get(code.trim().toUpperCase());
}

export function getRoomBySocketId(socketId: string): RoomState | undefined {
  for (const room of rooms.values()) {
    if (room.players.some((player) => player.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

export function getPlayerInRoom(
  room: RoomState,
  socketId: string
): Player | undefined {
  return room.players.find((player) => player.socketId === socketId);
}

export function evaluateGuess(secret: number, value: number): Hint {
  if (value === secret) return "correct";
  return value < secret ? "higher" : "lower";
}

export function processGuess(
  room: RoomState,
  playerId: string,
  value: number
): { entry: GuessEntry; gameOver: boolean } | { error: string } {
  if (room.gameType !== "adivina") {
    return { error: "Esta sala no es de Adivina el número." };
  }

  if (room.status !== "playing") {
    return { error: "La partida no está en curso." };
  }

  if (room.currentTurnId !== playerId) {
    return { error: "No es tu turno." };
  }

  if (!Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER) {
    return {
      error: `Ingresá un número entero entre ${MIN_NUMBER} y ${MAX_NUMBER}.`,
    };
  }

  if (room.secret === null) {
    return { error: "La partida no está lista." };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { error: "Jugador no encontrado." };
  }

  const hint = evaluateGuess(room.secret, value);
  const entry: GuessEntry = {
    playerId,
    nickname: player.nickname,
    value,
    hint,
  };

  room.guesses.push(entry);

  if (hint === "correct") {
    room.status = "finished";
    room.winnerId = playerId;
    room.isDraw = false;
    room.currentTurnId = null;
    player.wins += 1;
    return { entry, gameOver: true };
  }

  const otherPlayer = room.players.find((p) => p.id !== playerId);
  room.currentTurnId = otherPlayer?.id ?? null;
  return { entry, gameOver: false };
}

function checkWinner(board: Board, size: TatetiSize): Mark | null {
  const need = size;

  // Rows
  for (let y = 0; y < size; y++) {
    const first = board[y * size];
    if (!first) continue;
    let win = true;
    for (let x = 1; x < need; x++) {
      if (board[y * size + x] !== first) {
        win = false;
        break;
      }
    }
    if (win) return first;
  }

  // Cols
  for (let x = 0; x < size; x++) {
    const first = board[x];
    if (!first) continue;
    let win = true;
    for (let y = 1; y < need; y++) {
      if (board[y * size + x] !== first) {
        win = false;
        break;
      }
    }
    if (win) return first;
  }

  // Diagonal \
  {
    const first = board[0];
    if (first) {
      let win = true;
      for (let i = 1; i < need; i++) {
        if (board[i * size + i] !== first) {
          win = false;
          break;
        }
      }
      if (win) return first;
    }
  }

  // Diagonal /
  {
    const first = board[size - 1];
    if (first) {
      let win = true;
      for (let i = 1; i < need; i++) {
        if (board[i * size + (size - 1 - i)] !== first) {
          win = false;
          break;
        }
      }
      if (win) return first;
    }
  }

  return null;
}

function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function processPlaceMark(
  room: RoomState,
  playerId: string,
  index: number
):
  | { mark: Mark; gameOver: boolean; isDraw: boolean }
  | { error: string } {
  if (room.gameType !== "tateti") {
    return { error: "Esta sala no es de Tateti." };
  }

  if (room.status !== "playing") {
    return { error: "La partida no está en curso." };
  }

  if (room.currentTurnId !== playerId) {
    return { error: "No es tu turno." };
  }

  const maxIndex = room.boardSize * room.boardSize - 1;
  if (!Number.isInteger(index) || index < 0 || index > maxIndex) {
    return { error: "Casilla inválida." };
  }

  if (room.board[index] !== null) {
    return { error: "Esa casilla ya está ocupada." };
  }

  const mark = room.marks[playerId];
  if (!mark) {
    return { error: "No tenés ficha asignada." };
  }

  room.board[index] = mark;

  const winningMark = checkWinner(room.board, room.boardSize);
  if (winningMark) {
    room.status = "finished";
    room.isDraw = false;
    room.currentTurnId = null;
    const winner = room.players.find((p) => room.marks[p.id] === winningMark);
    if (winner) {
      room.winnerId = winner.id;
      winner.wins += 1;
    }
    return { mark, gameOver: true, isDraw: false };
  }

  if (isBoardFull(room.board)) {
    room.status = "finished";
    room.isDraw = true;
    room.winnerId = null;
    room.currentTurnId = null;
    return { mark, gameOver: true, isDraw: true };
  }

  const otherPlayer = room.players.find((p) => p.id !== playerId);
  room.currentTurnId = otherPlayer?.id ?? null;
  return { mark, gameOver: false, isDraw: false };
}

export function startRematch(room: RoomState): void {
  room.status = "playing";
  room.winnerId = null;
  room.isDraw = false;

  if (room.gameType === "adivina") {
    room.currentTurnId = pickRandomStarterId(room);
    room.secret = generateSecret();
    room.guesses = [];
    return;
  }

  if (room.gameType === "tateti") {
    const starterId = pickRandomStarterId(room);
    room.currentTurnId = starterId;
    room.secret = null;
    room.guesses = [];
    room.board = createEmptyBoard(room.boardSize);
    assignMarks(room, starterId);
    return;
  }

  room.currentTurnId = null;
  room.secret = null;
  room.guesses = [];
  resetViboritaForRematch(room);
}

export function handleDisconnect(socketId: string): {
  room: RoomState;
  message: string;
} | null {
  const room = getRoomBySocketId(socketId);
  if (!room) return null;

  const player = getPlayerInRoom(room, socketId);
  if (!player) return null;

  room.status = "aborted";
  room.currentTurnId = null;

  return {
    room,
    message: `${player.nickname} se desconectó. La partida terminó.`,
  };
}

export function finishViborita(room: RoomState, winnerId: string): void {
  room.status = "finished";
  room.winnerId = winnerId;
  room.isDraw = false;
  room.currentTurnId = null;
  const winner = room.players.find((p) => p.id === winnerId);
  if (winner) {
    winner.wins += 1;
  }
}
