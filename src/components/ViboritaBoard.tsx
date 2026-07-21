"use client";

import { useEffect, useRef } from "react";
import {
  Direction,
  PublicPlayer,
  PublicViboritaState,
  RoomStatus,
} from "@/lib/types";
import { Lobby } from "@/components/Lobby";

interface ViboritaBoardProps {
  code: string;
  players: PublicPlayer[];
  status: RoomStatus;
  viborita: PublicViboritaState | null;
  playerId: string | null;
  winnerId: string | null;
  onDirection: (direction: Direction) => void;
  onRematch: () => void;
  error: string;
}

const COLORS = ["#3b82f6", "#f5f5f5"];

export function ViboritaBoard({
  code,
  players,
  status,
  viborita,
  playerId,
  winnerId,
  onDirection,
  onRematch,
  error,
}: ViboritaBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const winner = players.find((p) => p.id === winnerId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== "playing") return;
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };
      const direction = map[e.key];
      if (!direction) return;
      e.preventDefault();
      onDirection(direction);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDirection, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viborita) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cell = Math.floor(
      Math.min(720 / viborita.width, 480 / viborita.height)
    );
    const width = cell * viborita.width;
    const height = cell * viborita.height;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let x = 0; x <= viborita.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell, 0);
      ctx.lineTo(x * cell, height);
      ctx.stroke();
    }
    for (let y = 0; y <= viborita.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell);
      ctx.lineTo(width, y * cell);
      ctx.stroke();
    }

    for (const food of viborita.foods) {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(
        food.x * cell + cell / 2,
        food.y * cell + cell / 2,
        Math.max(3, cell * 0.28),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    viborita.snakes.forEach((snake, index) => {
      const color = COLORS[index % COLORS.length];
      snake.body.forEach((segment, i) => {
        ctx.fillStyle = color;
        ctx.globalAlpha = i === 0 ? 1 : 0.75;
        const pad = i === 0 ? 1 : 2;
        ctx.fillRect(
          segment.x * cell + pad,
          segment.y * cell + pad,
          cell - pad * 2,
          cell - pad * 2
        );
      });
      ctx.globalAlpha = 1;
    });
  }, [viborita]);

  const mySnake = viborita?.snakes.find((s) => s.playerId === playerId);

  return (
    <div>
      <Lobby code={code} players={players} status={status} />

      {error && <div className="error-banner">{error}</div>}

      {status === "aborted" && (
        <p style={{ textAlign: "center", color: "var(--danger)", marginTop: "1rem" }}>
          La partida fue interrumpida.
        </p>
      )}

      {viborita && (
        <>
          <div className="snake-hud">
            <div className="snake-target">
              Objetivo: <strong>{viborita.targetScore}</strong>
            </div>
            <div className="snake-scores">
              {viborita.snakes.map((snake, index) => {
                const player = players.find((p) => p.id === snake.playerId);
                return (
                  <div key={snake.playerId} className="snake-score-chip">
                    <span
                      className="snake-dot"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    <span>
                      {player?.nickname ?? "Jugador"}
                      {snake.playerId === playerId ? " (vos)" : ""}
                    </span>
                    <strong>
                      {snake.score} · len {snake.body.length}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>

          {(status === "playing" || status === "finished") && (
            <div className="snake-canvas-wrap">
              <canvas ref={canvasRef} className="snake-canvas" />
            </div>
          )}

          {status === "playing" && (
            <>
              <p className="snake-controls-hint">
                Controles: flechas o WASD
                {mySnake ? ` · tu vibora suma ${mySnake.score}` : ""}
              </p>
              <div className="snake-mobile-controls">
                <button type="button" onClick={() => onDirection("up")}>
                  ↑
                </button>
                <div>
                  <button type="button" onClick={() => onDirection("left")}>
                    ←
                  </button>
                  <button type="button" onClick={() => onDirection("down")}>
                    ↓
                  </button>
                  <button type="button" onClick={() => onDirection("right")}>
                    →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {status === "finished" && winner && (
        <div className="winner-banner">
          <p>
            <strong>{winner.nickname}</strong> llegó al objetivo
            {winner.id === playerId ? " ¡Felicitaciones!" : "!"}
          </p>
          {viborita && (
            <p className="score-summary">
              Objetivo {viborita.targetScore} —{" "}
              {viborita.snakes
                .map((s) => {
                  const p = players.find((pl) => pl.id === s.playerId);
                  return `${p?.nickname ?? "?"} ${s.score}`;
                })
                .join(" · ")}
            </p>
          )}
          <p className="score-summary">
            Victorias:{" "}
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
