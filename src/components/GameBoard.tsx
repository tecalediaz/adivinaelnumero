"use client";

import { FormEvent, useState } from "react";
import {
  GuessEntry,
  MAX_NUMBER,
  MIN_NUMBER,
  PublicPlayer,
  RoomStatus,
} from "@/lib/types";
import { GuessHistory } from "./GuessHistory";
import { Lobby } from "./Lobby";

interface GameBoardProps {
  code: string;
  players: PublicPlayer[];
  status: RoomStatus;
  currentTurnId: string | null;
  guesses: GuessEntry[];
  yourTurn: boolean;
  playerId: string | null;
  winnerId: string | null;
  secret: number | null;
  onGuess: (value: number) => void;
  onRematch: () => void;
  error: string;
}

export function GameBoard({
  code,
  players,
  status,
  currentTurnId,
  guesses,
  yourTurn,
  playerId,
  winnerId,
  secret,
  onGuess,
  onRematch,
  error,
}: GameBoardProps) {
  const [inputValue, setInputValue] = useState("");

  const currentPlayer = players.find((p) => p.id === currentTurnId);
  const winner = players.find((p) => p.id === winnerId);
  const isPlaying = status === "playing";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseInt(inputValue, 10);
    if (Number.isNaN(value)) return;
    onGuess(value);
    setInputValue("");
  }

  return (
    <div>
      <Lobby code={code} players={players} status={status} />

      {error && <div className="error-banner">{error}</div>}

      {status === "aborted" && (
        <p style={{ textAlign: "center", color: "var(--danger)", marginTop: "1rem" }}>
          La partida fue interrumpida.
        </p>
      )}

      {isPlaying && (
        <>
          <div className={`turn-indicator ${yourTurn ? "active" : ""}`}>
            {yourTurn ? (
              <p>
                Es <strong>tu turno</strong>. Adiviná un número entre {MIN_NUMBER} y{" "}
                {MAX_NUMBER}.
              </p>
            ) : (
              <p>
                Turno de <strong>{currentPlayer?.nickname ?? "..."}</strong>
              </p>
            )}
          </div>

          <form className="guess-form" onSubmit={handleSubmit}>
            <input
              type="number"
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              placeholder={`${MIN_NUMBER} – ${MAX_NUMBER}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!yourTurn}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!yourTurn || !inputValue.trim()}
            >
              Adivinar
            </button>
          </form>
        </>
      )}

      {status === "finished" && winner && secret !== null && (
        <div className="winner-banner">
          <p>
            <strong>{winner.nickname}</strong> ganó la partida
            {winner.id === playerId ? " ¡Felicitaciones!" : "!"}
          </p>
          <p className="secret-reveal">
            El número secreto era <strong>{secret}</strong>
          </p>
          <button className="btn btn-primary" onClick={onRematch} style={{ marginTop: "1rem" }}>
            Jugar de nuevo
          </button>
        </div>
      )}

      {(isPlaying || status === "finished") && (
        <GuessHistory guesses={guesses} />
      )}
    </div>
  );
}
