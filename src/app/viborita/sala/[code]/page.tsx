"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ViboritaBoard } from "@/components/ViboritaBoard";
import { getSocket } from "@/lib/socket";
import {
  Direction,
  PublicPlayer,
  PublicViboritaState,
  RoomStatus,
} from "@/lib/types";

export default function ViboritaSalaPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";

  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [viborita, setViborita] = useState<PublicViboritaState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!code) return;

    const socket = getSocket();
    const storedPlayerId = sessionStorage.getItem("playerId");
    const storedNickname = sessionStorage.getItem("nickname");

    if (storedPlayerId) setPlayerId(storedPlayerId);
    if (storedPlayerId && storedNickname) {
      setPlayers([{ id: storedPlayerId, nickname: storedNickname, wins: 0 }]);
    }

    function onConnect() {
      setConnected(true);
    }

    function onRoomJoined(payload: {
      playerId: string;
      players: PublicPlayer[];
      status: RoomStatus;
      viborita: PublicViboritaState | null;
      winnerId: string | null;
    }) {
      setPlayerId(payload.playerId);
      sessionStorage.setItem("playerId", payload.playerId);
      setPlayers(payload.players);
      setStatus(payload.status);
      setViborita(payload.viborita);
      setWinnerId(payload.winnerId);
    }

    function onPlayerJoined({ players: joined }: { players: PublicPlayer[] }) {
      setPlayers(joined);
    }

    function onGameStarted(payload: {
      players: PublicPlayer[];
      viborita: PublicViboritaState | null;
    }) {
      setPlayers(payload.players);
      setStatus("playing");
      setViborita(payload.viborita);
      setWinnerId(null);
      setError("");
    }

    function onSnakeState(payload: {
      viborita: PublicViboritaState;
      players: PublicPlayer[];
    }) {
      setViborita(payload.viborita);
      setPlayers(payload.players);
    }

    function onGameOver(payload: {
      winnerId: string | null;
      players: PublicPlayer[];
      viborita: PublicViboritaState | null;
    }) {
      setStatus("finished");
      setWinnerId(payload.winnerId);
      setPlayers(payload.players);
      setViborita(payload.viborita);
    }

    function onRematchStarted(payload: {
      players: PublicPlayer[];
      viborita: PublicViboritaState | null;
    }) {
      setStatus("playing");
      setPlayers(payload.players);
      setViborita(payload.viborita);
      setWinnerId(null);
      setError("");
    }

    function onPlayerDisconnected({ message }: { message: string }) {
      setStatus("aborted");
      setError(message);
    }

    function onError({ message }: { message: string }) {
      setError(message);
    }

    socket.on("connect", onConnect);
    socket.on("roomJoined", onRoomJoined);
    socket.on("playerJoined", onPlayerJoined);
    socket.on("gameStarted", onGameStarted);
    socket.on("snakeState", onSnakeState);
    socket.on("gameOver", onGameOver);
    socket.on("rematchStarted", onRematchStarted);
    socket.on("playerDisconnected", onPlayerDisconnected);
    socket.on("error", onError);

    if (socket.connected) setConnected(true);

    if (!storedPlayerId && storedNickname) {
      socket.emit("joinRoom", {
        code,
        nickname: storedNickname,
        gameType: "viborita",
      });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("gameStarted", onGameStarted);
      socket.off("snakeState", onSnakeState);
      socket.off("gameOver", onGameOver);
      socket.off("rematchStarted", onRematchStarted);
      socket.off("playerDisconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [code]);

  function handleDirection(direction: Direction) {
    getSocket().emit("setDirection", { direction });
  }

  function handleRematch() {
    setError("");
    getSocket().emit("rematch");
  }

  return (
    <main className="page page-wide">
      <h1 className="brand">Viborita</h1>

      <div className="card card-wide">
        {!connected ? (
          <p style={{ textAlign: "center", color: "var(--ink-muted)" }}>
            Conectando...
          </p>
        ) : (
          <ViboritaBoard
            code={code}
            players={players}
            status={status}
            viborita={viborita}
            playerId={playerId}
            winnerId={winnerId}
            onDirection={handleDirection}
            onRematch={handleRematch}
            error={error}
          />
        )}
      </div>

      <Link href="/viborita" className="back-link">
        ← Volver
      </Link>
    </main>
  );
}
