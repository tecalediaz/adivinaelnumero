"use client";

import { useEffect, useState } from "react";
import {
  PPT_OPTIONS,
  PublicPlayer,
  PublicPptState,
  PptChoice,
  RoomStatus,
  pptEmoji,
  pptLabel,
} from "@/lib/types";
import { Lobby } from "./Lobby";

interface PptBoardProps {
  code: string;
  players: PublicPlayer[];
  status: RoomStatus;
  playerId: string | null;
  winnerId: string | null;
  isDraw: boolean;
  ppt: PublicPptState | null;
  onChoose: (choice: PptChoice) => void;
  onRematch: () => void;
  error: string;
}

export function PptBoard({
  code,
  players,
  status,
  playerId,
  winnerId,
  isDraw,
  ppt,
  onChoose,
  onRematch,
  error,
}: PptBoardProps) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const winner = players.find((p) => p.id === winnerId);
  const isChoosing = status === "playing" && ppt?.phase === "choosing";
  const opponent = players.find((p) => p.id !== playerId);

  useEffect(() => {
    if (!ppt?.deadline || !isChoosing) {
      setSecondsLeft(0);
      return;
    }

    function tick() {
      const left = Math.max(0, Math.ceil((ppt!.deadline - Date.now()) / 1000));
      setSecondsLeft(left);
    }

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [ppt?.deadline, isChoosing]);

  return (
    <div>
      <Lobby code={code} players={players} status={status} />

      {error && <div className="error-banner">{error}</div>}

      {status === "aborted" && (
        <p style={{ textAlign: "center", color: "var(--danger)", marginTop: "1rem" }}>
          La partida fue interrumpida.
        </p>
      )}

      {(status === "playing" || status === "finished") && ppt && (
        <>
          {isChoosing && (
            <div className="ppt-timer">
              <span className="ppt-timer-count">{secondsLeft}</span>
              <p>Elegí tu mano</p>
            </div>
          )}

          {isChoosing && (
            <div className="ppt-choices">
              {PPT_OPTIONS.map((option) => (
                <button
                  key={option.choice}
                  type="button"
                  className={`ppt-choice ${
                    ppt.yourChoice === option.choice ? "selected" : ""
                  }`}
                  onClick={() => onChoose(option.choice)}
                >
                  <span className="ppt-choice-emoji">{option.emoji}</span>
                  <span className="ppt-choice-label">{option.label}</span>
                </button>
              ))}
            </div>
          )}

          {isChoosing && (
            <p className="ppt-ready-line">
              {ppt.yourChoice
                ? `Elegiste ${pptEmoji(ppt.yourChoice)} ${pptLabel(ppt.yourChoice)}`
                : "Todavía no elegiste"}
              {" · "}
              {opponent
                ? ppt.ready[opponent.id]
                  ? `${opponent.nickname} ya eligió`
                  : `${opponent.nickname} está eligiendo…`
                : "Esperando rival…"}
            </p>
          )}

          {(ppt.phase === "revealed" || status === "finished") && ppt.choices && (
            <div className="ppt-reveal">
              {players.map((player) => {
                const choice = ppt.choices?.[player.id] ?? null;
                return (
                  <div key={player.id} className="ppt-reveal-card">
                    <p className="ppt-reveal-name">{player.nickname}</p>
                    <span className="ppt-reveal-emoji">{pptEmoji(choice)}</span>
                    <p className="ppt-reveal-label">{pptLabel(choice)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {status === "finished" && (
        <div className="winner-banner">
          {isDraw ? (
            <p>
              <strong>Empate</strong>.
            </p>
          ) : winner ? (
            <p>
              <strong>{winner.nickname}</strong> ganó la ronda
              {winner.id === playerId ? " ¡Felicitaciones!" : "!"}
            </p>
          ) : null}
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
            Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
