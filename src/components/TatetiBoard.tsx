"use client";

import {
  Board,
  Mark,
  PublicPlayer,
  RoomStatus,
} from "@/lib/types";
import { Lobby } from "@/components/Lobby";

interface TatetiBoardProps {
  code: string;
  players: PublicPlayer[];
  status: RoomStatus;
  currentTurnId: string | null;
  board: Board;
  marks: Record<string, Mark>;
  yourTurn: boolean;
  playerId: string | null;
  winnerId: string | null;
  isDraw: boolean;
  onPlace: (index: number) => void;
  onRematch: () => void;
  error: string;
}

export function TatetiBoard({
  code,
  players,
  status,
  currentTurnId,
  board,
  marks,
  yourTurn,
  playerId,
  winnerId,
  isDraw,
  onPlace,
  onRematch,
  error,
}: TatetiBoardProps) {
  const currentPlayer = players.find((p) => p.id === currentTurnId);
  const winner = players.find((p) => p.id === winnerId);
  const yourMark = playerId ? marks[playerId] : null;
  const isPlaying = status === "playing";

  return (
    <div>
      <Lobby code={code} players={players} status={status} />

      {error && <div className="error-banner">{error}</div>}

      {status === "aborted" && (
        <p style={{ textAlign: "center", color: "var(--danger)", marginTop: "1rem" }}>
          La partida fue interrumpida.
        </p>
      )}

      {players.length === 2 && (
        <div className="marks-row">
          {players.map((player) => (
            <div key={player.id} className="mark-chip">
              <span className="mark-symbol">{marks[player.id] ?? "?"}</span>
              <span>
                {player.nickname}
                {player.id === playerId ? " (vos)" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {isPlaying && (
        <div className={`turn-indicator ${yourTurn ? "active" : ""}`}>
          {yourTurn ? (
            <p>
              Es <strong>tu turno</strong>
              {yourMark ? ` · jugás con ${yourMark}` : ""}.
            </p>
          ) : (
            <p>
              Turno de <strong>{currentPlayer?.nickname ?? "..."}</strong>
            </p>
          )}
        </div>
      )}

      {(isPlaying || status === "finished") && (
        <div className="tateti-grid" role="grid" aria-label="Tablero de tateti">
          {board.map((cell, index) => (
            <button
              key={index}
              type="button"
              className={`tateti-cell ${cell ? `filled-${cell.toLowerCase()}` : ""}`}
              onClick={() => onPlace(index)}
              disabled={!isPlaying || !yourTurn || cell !== null}
              aria-label={`Casilla ${index + 1}${cell ? `, ${cell}` : ""}`}
            >
              {cell}
            </button>
          ))}
        </div>
      )}

      {status === "finished" && (
        <div className="winner-banner">
          {isDraw ? (
            <p>
              <strong>Empate</strong>
            </p>
          ) : (
            winner && (
              <p>
                <strong>{winner.nickname}</strong> ganó la partida
                {winner.id === playerId ? " ¡Felicitaciones!" : "!"}
              </p>
            )
          )}
          <p className="score-summary">
            Marcador:{" "}
            {players.map((p) => `${p.nickname} ${p.wins}`).join(" — ")}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRematch}
            style={{ marginTop: "1rem" }}
          >
            Reiniciar juego
          </button>
        </div>
      )}
    </div>
  );
}
