import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";
import {
  createRoom,
  getPlayerInRoom,
  getRoomBySocketId,
  handleDisconnect,
  joinRoom,
  processGuess,
  startGame,
  startRematch,
  toPublicRoomState,
} from "./game";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket: AppSocket) => {
    socket.on("createRoom", ({ nickname }) => {
      const trimmed = nickname?.trim();
      if (!trimmed) {
        socket.emit("error", { message: "Ingresá un nickname." });
        return;
      }

      const room = createRoom(trimmed, socket.id);
      const player = room.players[0];

      socket.join(room.code);
      socket.emit("roomCreated", { code: room.code, playerId: player.id });
    });

    socket.on("joinRoom", ({ code, nickname }) => {
      const trimmed = nickname?.trim();
      if (!trimmed) {
        socket.emit("error", { message: "Ingresá un nickname." });
        return;
      }

      const result = joinRoom(code, trimmed, socket.id);
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
        players: publicState.players,
        yourTurn: room.currentTurnId === playerId,
        status: room.status,
        guesses: room.guesses,
        currentTurnId: room.currentTurnId,
      });

      if (room.players.length === 2) {
        socket.to(room.code).emit("playerJoined", {
          players: publicState.players,
        });

        for (const roomPlayer of room.players) {
          io.to(roomPlayer.socketId).emit("gameStarted", {
            players: publicState.players,
            currentTurnId: room.currentTurnId!,
            yourTurn: roomPlayer.id === room.currentTurnId,
          });
        }
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

      if (gameOver && room.secret !== null && room.winnerId) {
        io.to(room.code).emit("gameOver", {
          winnerId: room.winnerId,
          secret: room.secret,
          players: toPublicRoomState(room).players,
        });
      }
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

      startRematch(room);
      const publicPlayers = toPublicRoomState(room).players;

      for (const player of room.players) {
        io.to(player.socketId).emit("rematchStarted", {
          currentTurnId: room.currentTurnId!,
          yourTurn: player.id === room.currentTurnId,
          guesses: room.guesses,
          players: publicPlayers,
        });
      }
    });

    socket.on("disconnect", () => {
      const result = handleDisconnect(socket.id);
      if (!result) return;

      const { room, message } = result;
      socket.to(room.code).emit("playerDisconnected", { message });
    });
  });
}
