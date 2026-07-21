import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  GameType,
  RoomState,
  SNAKE_TICK_MS,
  ServerToClientEvents,
  TATETI_SIZES,
} from "../lib/types";
import {
  createRoom,
  finishViborita,
  getPlayerInRoom,
  getRoomByCode,
  getRoomBySocketId,
  handleDisconnect,
  joinRoom,
  processGuess,
  processPlaceMark,
  startGame,
  startRematch,
  toPublicRoomState,
} from "./game";
import { setSnakeDirection, tickViborita, toPublicViborita } from "./snake";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const VALID_GAMES: GameType[] = ["adivina", "tateti", "viborita"];
const snakeLoops = new Map<string, ReturnType<typeof setInterval>>();

function stopSnakeLoop(code: string): void {
  const timer = snakeLoops.get(code);
  if (timer) {
    clearInterval(timer);
    snakeLoops.delete(code);
  }
}

function startSnakeLoop(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string
): void {
  stopSnakeLoop(roomCode);

  const loop = setInterval(() => {
    const room = getRoomByCode(roomCode);
    if (!room || room.gameType !== "viborita" || room.status !== "playing") {
      stopSnakeLoop(roomCode);
      return;
    }

    const winnerId = tickViborita(room);

    if (room.viborita) {
      io.to(room.code).emit("snakeState", {
        viborita: toPublicViborita(room.viborita),
        players: toPublicRoomState(room).players,
      });
    }

    if (winnerId) {
      finishViborita(room, winnerId);
      stopSnakeLoop(roomCode);
      io.to(room.code).emit("gameOver", {
        winnerId: room.winnerId,
        isDraw: false,
        secret: null,
        players: toPublicRoomState(room).players,
        board: room.board,
        boardSize: room.boardSize,
        viborita: room.viborita ? toPublicViborita(room.viborita) : null,
      });
    }
  }, SNAKE_TICK_MS);

  snakeLoops.set(roomCode, loop);
}

function emitGameStarted(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  room: RoomState
): void {
  const publicState = toPublicRoomState(room);

  for (const roomPlayer of room.players) {
    io.to(roomPlayer.socketId).emit("gameStarted", {
      players: publicState.players,
      currentTurnId: room.currentTurnId,
      yourTurn: room.currentTurnId === roomPlayer.id,
      board: room.board,
      boardSize: room.boardSize,
      marks: publicState.marks,
      viborita: publicState.viborita,
    });
  }

  if (room.gameType === "viborita") {
    startSnakeLoop(io, room.code);
  }
}

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket: AppSocket) => {
    socket.on("createRoom", ({ nickname, gameType, boardSize }) => {
      const trimmed = nickname?.trim();
      if (!trimmed) {
        socket.emit("error", { message: "Ingresá un nickname." });
        return;
      }

      if (!VALID_GAMES.includes(gameType)) {
        socket.emit("error", { message: "Juego inválido." });
        return;
      }

      const size =
        gameType === "tateti" && boardSize && TATETI_SIZES.includes(boardSize)
          ? boardSize
          : 3;

      const room = createRoom(trimmed, socket.id, gameType, size);
      const player = room.players[0];

      socket.join(room.code);
      socket.emit("roomCreated", {
        code: room.code,
        playerId: player.id,
        gameType: room.gameType,
      });
    });

    socket.on("joinRoom", ({ code, nickname, gameType }) => {
      const trimmed = nickname?.trim();
      if (!trimmed) {
        socket.emit("error", { message: "Ingresá un nickname." });
        return;
      }

      if (!VALID_GAMES.includes(gameType)) {
        socket.emit("error", { message: "Juego inválido." });
        return;
      }

      const result = joinRoom(code, trimmed, socket.id, gameType);
      if ("error" in result) {
        socket.emit("error", { message: result.error });
        return;
      }

      const { room, playerId } = result;
      socket.join(room.code);

      if (room.players.length === 2) {
        startGame(room);
      }

      const publicState = toPublicRoomState(room);

      socket.emit("roomJoined", {
        code: room.code,
        playerId,
        gameType: room.gameType,
        players: publicState.players,
        yourTurn: room.currentTurnId === playerId,
        status: room.status,
        guesses: room.guesses,
        currentTurnId: room.currentTurnId,
        board: room.board,
        boardSize: room.boardSize,
        marks: publicState.marks,
        isDraw: room.isDraw,
        winnerId: room.winnerId,
        viborita: publicState.viborita,
      });

      if (room.players.length === 2) {
        socket.to(room.code).emit("playerJoined", {
          players: publicState.players,
        });
        emitGameStarted(io, room);
      }
    });

    socket.on("guess", ({ value }) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit("error", { message: "No estás en una sala." });
        return;
      }

      const player = getPlayerInRoom(room, socket.id);
      if (!player) {
        socket.emit("error", { message: "Jugador no encontrado." });
        return;
      }

      const result = processGuess(room, player.id, value);
      if ("error" in result) {
        socket.emit("error", { message: result.error });
        return;
      }

      const { entry, gameOver } = result;

      io.to(room.code).emit("guessResult", {
        playerId: entry.playerId,
        nickname: entry.nickname,
        value: entry.value,
        hint: entry.hint,
        nextTurnId: room.currentTurnId,
        guesses: room.guesses,
      });

      if (gameOver) {
        io.to(room.code).emit("gameOver", {
          winnerId: room.winnerId,
          isDraw: room.isDraw,
          secret: room.secret,
          players: toPublicRoomState(room).players,
          board: room.board,
          boardSize: room.boardSize,
          viborita: null,
        });
      }
    });

    socket.on("placeMark", ({ index }) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit("error", { message: "No estás en una sala." });
        return;
      }

      const player = getPlayerInRoom(room, socket.id);
      if (!player) {
        socket.emit("error", { message: "Jugador no encontrado." });
        return;
      }

      const result = processPlaceMark(room, player.id, index);
      if ("error" in result) {
        socket.emit("error", { message: result.error });
        return;
      }

      io.to(room.code).emit("boardUpdated", {
        board: room.board,
        boardSize: room.boardSize,
        nextTurnId: room.currentTurnId,
        playerId: player.id,
        index,
        mark: result.mark,
      });

      if (result.gameOver) {
        io.to(room.code).emit("gameOver", {
          winnerId: room.winnerId,
          isDraw: room.isDraw,
          secret: null,
          players: toPublicRoomState(room).players,
          board: room.board,
          boardSize: room.boardSize,
          viborita: null,
        });
      }
    });

    socket.on("setDirection", ({ direction }) => {
      const room = getRoomBySocketId(socket.id);
      if (!room) return;
      const player = getPlayerInRoom(room, socket.id);
      if (!player) return;
      setSnakeDirection(room, player.id, direction);
    });

    socket.on("rematch", () => {
      const room = getRoomBySocketId(socket.id);
      if (!room) {
        socket.emit("error", { message: "No estás en una sala." });
        return;
      }

      if (room.players.length < 2) {
        socket.emit("error", {
          message: "Se necesitan dos jugadores para reiniciar.",
        });
        return;
      }

      if (room.status !== "finished") {
        socket.emit("error", { message: "La partida aún no terminó." });
        return;
      }

      stopSnakeLoop(room.code);
      startRematch(room);
      const publicState = toPublicRoomState(room);

      for (const player of room.players) {
        io.to(player.socketId).emit("rematchStarted", {
          currentTurnId: room.currentTurnId,
          yourTurn: room.currentTurnId === player.id,
          guesses: room.guesses,
          players: publicState.players,
          board: room.board,
          boardSize: room.boardSize,
          marks: publicState.marks,
          viborita: publicState.viborita,
        });
      }

      if (room.gameType === "viborita") {
        startSnakeLoop(io, room.code);
      }
    });

    socket.on("disconnect", () => {
      const result = handleDisconnect(socket.id);
      if (!result) return;

      const { room, message } = result;
      stopSnakeLoop(room.code);
      socket.to(room.code).emit("playerDisconnected", { message });
    });
  });
}
