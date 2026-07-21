import {
  Board,
  EMPTY_BOARD,
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
} from "../lib/types";

const rooms = new Map<string, RoomState>();

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

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
    marks: { ...room.marks },
    secret: room.status === "finished" ? room.secret : null,
  };
}

export function createRoom(
  nickname: string,
  socketId: string,
  gameType: GameType
): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

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
    board: [...EMPTY_BOARD] as Board,
    marks: {},
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
      error: `Esa sala es de ${room.gameType === "adivina" ? "Adivina el número" : "Tateti"}.`,
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

function assignMarks(room: RoomState): void {
  const [host, guest] = room.players;
  room.marks = {
    [host.id]: "X",
    [guest.id]: "O",
  };
}

export function startGame(room: RoomState): void {
  room.status = "playing";
  room.winnerId = null;
  room.isDraw = false;
  room.currentTurnId = room.hostId;

  if (room.gameType === "adivina") {
    room.secret = generateSecret();
    room.guesses = [];
    room.board = [...EMPTY_BOARD] as Board;
    room.marks = {};
  } else {
    room.secret = null;
    room.guesses = [];
    room.board = [...EMPTY_BOARD] as Board;
    assignMarks(room);
  }
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

function checkWinner(board: Board): Mark | null {
  for (const [a, b, c] of WIN_LINES) {
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return mark;
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

  if (!Number.isInteger(index) || index < 0 || index > 8) {
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

  const winningMark = checkWinner(room.board);
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
  room.currentTurnId = room.hostId;

  if (room.gameType === "adivina") {
    room.secret = generateSecret();
    room.guesses = [];
  } else {
    room.secret = null;
    room.guesses = [];
    room.board = [...EMPTY_BOARD] as Board;
    assignMarks(room);
  }
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
