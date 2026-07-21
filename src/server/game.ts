import {
  GuessEntry,
  Hint,
  MAX_NUMBER,
  MIN_NUMBER,
  Player,
  PublicPlayer,
  PublicRoomState,
  ROOM_CODE_CHARS,
  ROOM_CODE_LENGTH,
  RoomState,
} from "../lib/types";

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
    status: room.status,
    players: toPublicPlayers(room.players),
    currentTurnId: room.currentTurnId,
    guesses: room.guesses,
    winnerId: room.winnerId,
  };
}

export function createRoom(nickname: string, socketId: string): RoomState {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const playerId = crypto.randomUUID();
  const room: RoomState = {
    code,
    status: "waiting",
    players: [{ id: playerId, nickname: nickname.trim(), socketId, wins: 0 }],
    hostId: playerId,
    secret: null,
    currentTurnId: null,
    guesses: [],
    winnerId: null,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  nickname: string,
  socketId: string
): { room: RoomState; playerId: string } | { error: string } {
  const normalizedCode = code.trim().toUpperCase();
  const room = rooms.get(normalizedCode);

  if (!room) {
    return { error: "La sala no existe." };
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

export function startGame(room: RoomState): void {
  room.status = "playing";
  room.secret = generateSecret();
  room.guesses = [];
  room.winnerId = null;
  room.currentTurnId = room.hostId;
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
    room.currentTurnId = null;
    player.wins += 1;
    return { entry, gameOver: true };
  }

  const otherPlayer = room.players.find((p) => p.id !== playerId);
  room.currentTurnId = otherPlayer?.id ?? null;
  return { entry, gameOver: false };
}

export function startRematch(room: RoomState): void {
  room.status = "playing";
  room.secret = generateSecret();
  room.guesses = [];
  room.winnerId = null;
  room.currentTurnId = room.hostId;
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

export function updatePlayerSocket(
  room: RoomState,
  playerId: string,
  socketId: string
): void {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.socketId = socketId;
  }
}

export function hintLabel(hint: Hint): string {
  switch (hint) {
    case "higher":
      return "Más alto";
    case "lower":
      return "Más bajo";
    case "correct":
      return "¡Correcto!";
  }
}
