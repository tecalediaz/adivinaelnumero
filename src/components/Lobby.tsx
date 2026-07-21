"use client";

import { PublicPlayer, RoomStatus } from "@/lib/types";

interface LobbyProps {
  code: string;
  players: PublicPlayer[];
  status: RoomStatus;
}

export function Lobby({ code, players, status }: LobbyProps) {
  return (
    <div>
      <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
        Código de sala
      </p>
      <p className="room-code">{code}</p>
      <p style={{ textAlign: "center", marginBottom: "1rem" }}>
        <span className={`status-pill status-${status}`}>
          {status === "waiting" && "Esperando rival"}
          {status === "playing" && "En juego"}
          {status === "finished" && "Terminada"}
          {status === "aborted" && "Cerrada"}
        </span>
      </p>

      <ul className="players-list">
        {players.map((player) => (
          <li key={player.id}>
            <span className="player-dot" />
            <span className="player-name">{player.nickname}</span>
            <span className="player-wins">
              {player.wins} {player.wins === 1 ? "victoria" : "victorias"}
            </span>
          </li>
        ))}
        {players.length < 2 && (
          <li>
            <span className="player-dot waiting" />
            Esperando jugador...
          </li>
        )}
      </ul>

      {status === "waiting" && (
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Compartí el código con tu amigo para que se una.
        </p>
      )}

      {status === "waiting" && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copiar código
        </button>
      )}
    </div>
  );
}
