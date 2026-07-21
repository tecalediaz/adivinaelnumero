"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PptBoard } from "@/components/PptBoard";
import { getSocket } from "@/lib/socket";
import {
  PptChoice,
  PublicPlayer,
  PublicPptState,
  RoomStatus,
} from "@/lib/types";

export default function PptSalaPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";

  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [ppt, setPpt] = useState<PublicPptState | null>(null);
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
      winnerId: string | null;
      isDraw: boolean;
      ppt: PublicPptState | null;
    }) {
      setPlayerId(payload.playerId);
      sessionStorage.setItem("playerId", payload.playerId);
      setPlayers(payload.players);
      setStatus(payload.status);
      setWinnerId(payload.winnerId);
      setIsDraw(payload.isDraw);
      setPpt(payload.ppt);
    }

    function onPlayerJoined({ players: joined }: { players: PublicPlayer[] }) {
      setPlayers(joined);
    }

    function onGameStarted(payload: {
      players: PublicPlayer[];
      ppt: PublicPptState | null;
    }) {
      setPlayers(payload.players);
      setStatus("playing");
      setPpt(payload.ppt);
      setWinnerId(null);
      setIsDraw(false);
      setError("");
    }

    function onPptUpdate(payload: { ppt: PublicPptState }) {
      setPpt(payload.ppt);
    }

    function onGameOver(payload: {
      winnerId: string | null;
      isDraw: boolean;
      players: PublicPlayer[];
      ppt: PublicPptState | null;
    }) {
      setStatus("finished");
      setWinnerId(payload.winnerId);
      setIsDraw(payload.isDraw);
      setPlayers(payload.players);
      setPpt(payload.ppt);
    }

    function onRematchStarted(payload: {
      players: PublicPlayer[];
      ppt: PublicPptState | null;
    }) {
      setStatus("playing");
      setPlayers(payload.players);
      setPpt(payload.ppt);
      setWinnerId(null);
      setIsDraw(false);
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
    socket.on("pptUpdate", onPptUpdate);
    socket.on("gameOver", onGameOver);
    socket.on("rematchStarted", onRematchStarted);
    socket.on("playerDisconnected", onPlayerDisconnected);
    socket.on("error", onError);

    if (socket.connected) setConnected(true);

    if (!storedPlayerId && storedNickname) {
      socket.emit("joinRoom", {
        code,
        nickname: storedNickname,
        gameType: "ppt",
      });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("gameStarted", onGameStarted);
      socket.off("pptUpdate", onPptUpdate);
      socket.off("gameOver", onGameOver);
      socket.off("rematchStarted", onRematchStarted);
      socket.off("playerDisconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [code]);

  function handleChoose(choice: PptChoice) {
    setError("");
    getSocket().emit("pptChoose", { choice });
  }

  function handleRematch() {
    setError("");
    getSocket().emit("rematch");
  }

  return (
    <main className="page">
      <h1 className="brand">Piedra, papel o tijera</h1>

      <div className="card" style={{ maxWidth: "34rem" }}>
        {!connected ? (
          <p style={{ textAlign: "center", color: "var(--ink-muted)" }}>
            Conectando...
          </p>
        ) : (
          <PptBoard
            code={code}
            players={players}
            status={status}
            playerId={playerId}
            winnerId={winnerId}
            isDraw={isDraw}
            ppt={ppt}
            onChoose={handleChoose}
            onRematch={handleRematch}
            error={error}
          />
        )}
      </div>

      <Link href="/ppt" className="back-link">
        ← Volver
      </Link>
    </main>
  );
}
