"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GameBoard } from "@/components/GameBoard";
import { getSocket } from "@/lib/socket";
import {
  GuessEntry,
  PublicPlayer,
  RoomStatus,
} from "@/lib/types";

export default function SalaPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";

  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [yourTurn, setYourTurn] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [secret, setSecret] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!code) return;

    const socket = getSocket();
    const storedPlayerId = sessionStorage.getItem("playerId");
    const storedNickname = sessionStorage.getItem("nickname");

    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    }

    if (storedPlayerId && storedNickname) {
      setPlayers([{ id: storedPlayerId, nickname: storedNickname }]);
    }

    function onConnect() {
      setConnected(true);
    }

    function onRoomJoined({
      playerId: joinedPlayerId,
      players: joinedPlayers,
      status: roomStatus,
      guesses: roomGuesses,
      currentTurnId: turnId,
      yourTurn: isYourTurn,
    }: {
      playerId: string;
      players: PublicPlayer[];
      status: RoomStatus;
      guesses: GuessEntry[];
      currentTurnId: string | null;
      yourTurn: boolean;
    }) {
      setPlayerId(joinedPlayerId);
      sessionStorage.setItem("playerId", joinedPlayerId);
      setPlayers(joinedPlayers);
      setStatus(roomStatus);
      setGuesses(roomGuesses);
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
    }

    function onPlayerJoined({ players: joinedPlayers }: { players: PublicPlayer[] }) {
      setPlayers(joinedPlayers);
    }

    function onGameStarted({
      players: gamePlayers,
      currentTurnId: turnId,
      yourTurn: isYourTurn,
    }: {
      players: PublicPlayer[];
      currentTurnId: string;
      yourTurn: boolean;
    }) {
      setPlayers(gamePlayers);
      setStatus("playing");
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
      setGuesses([]);
      setWinnerId(null);
      setSecret(null);
      setError("");
    }

    function onGuessResult({
      nextTurnId,
      guesses: updatedGuesses,
    }: {
      playerId: string;
      nickname: string;
      value: number;
      hint: string;
      nextTurnId: string | null;
      guesses: GuessEntry[];
    }) {
      setGuesses(updatedGuesses);
      setCurrentTurnId(nextTurnId);
      const activePlayerId = sessionStorage.getItem("playerId");
      if (activePlayerId) {
        setYourTurn(nextTurnId === activePlayerId);
      }
    }

    function onGameOver({
      winnerId: winner,
      secret: revealedSecret,
    }: {
      winnerId: string;
      secret: number;
    }) {
      setStatus("finished");
      setWinnerId(winner);
      setSecret(revealedSecret);
      setYourTurn(false);
      setCurrentTurnId(null);
    }

    function onRematchStarted({
      currentTurnId: turnId,
      yourTurn: isYourTurn,
      guesses: clearedGuesses,
    }: {
      currentTurnId: string;
      yourTurn: boolean;
      guesses: GuessEntry[];
    }) {
      setStatus("playing");
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
      setGuesses(clearedGuesses);
      setWinnerId(null);
      setSecret(null);
      setError("");
    }

    function onPlayerDisconnected({ message }: { message: string }) {
      setStatus("aborted");
      setError(message);
      setYourTurn(false);
    }

    function onError({ message }: { message: string }) {
      setError(message);
    }

    socket.on("connect", onConnect);
    socket.on("roomJoined", onRoomJoined);
    socket.on("playerJoined", onPlayerJoined);
    socket.on("gameStarted", onGameStarted);
    socket.on("guessResult", onGuessResult);
    socket.on("gameOver", onGameOver);
    socket.on("rematchStarted", onRematchStarted);
    socket.on("playerDisconnected", onPlayerDisconnected);
    socket.on("error", onError);

    if (socket.connected) {
      setConnected(true);
    }

    if (!storedPlayerId && storedNickname) {
      socket.emit("joinRoom", { code, nickname: storedNickname });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("gameStarted", onGameStarted);
      socket.off("guessResult", onGuessResult);
      socket.off("gameOver", onGameOver);
      socket.off("rematchStarted", onRematchStarted);
      socket.off("playerDisconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [code]);

  function handleGuess(value: number) {
    setError("");
    getSocket().emit("guess", { value });
  }

  function handleRematch() {
    setError("");
    getSocket().emit("rematch");
  }

  return (
    <main className="page">
      <h1 className="brand">Adivina el número</h1>

      <div className="card" style={{ maxWidth: "32rem" }}>
        {!connected ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Conectando...
          </p>
        ) : (
          <GameBoard
            code={code}
            players={players}
            status={status}
            currentTurnId={currentTurnId}
            guesses={guesses}
            yourTurn={yourTurn}
            playerId={playerId}
            winnerId={winnerId}
            secret={secret}
            onGuess={handleGuess}
            onRematch={handleRematch}
            error={error}
          />
        )}
      </div>

      <Link href="/" className="back-link">
        ← Volver al inicio
      </Link>
    </main>
  );
}
