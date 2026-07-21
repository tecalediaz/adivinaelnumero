"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { GameType, TATETI_SIZES, TatetiSize } from "@/lib/types";

interface HomeFormProps {
  gameType: GameType;
}

export function HomeForm({ gameType }: HomeFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [boardSize, setBoardSize] = useState<TatetiSize>(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  function handleCreate() {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Ingresá un nickname.");
      return;
    }

    setError("");
    setLoading("create");

    const socket = getSocket();

    const onCreated = ({
      code,
      playerId,
    }: {
      code: string;
      playerId: string;
      gameType: GameType;
    }) => {
      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("nickname", trimmed);
      sessionStorage.setItem("gameType", gameType);
      cleanup();
      router.push(`/${gameType}/sala/${code}`);
    };

    const onError = ({ message }: { message: string }) => {
      setError(message);
      setLoading(null);
      cleanup();
    };

    function cleanup() {
      socket.off("roomCreated", onCreated);
      socket.off("error", onError);
    }

    socket.on("roomCreated", onCreated);
    socket.on("error", onError);
    socket.emit("createRoom", {
      nickname: trimmed,
      gameType,
      boardSize: gameType === "tateti" ? boardSize : undefined,
    });
  }

  function handleJoin() {
    const trimmedNick = nickname.trim();
    const trimmedCode = roomCode.trim().toUpperCase();

    if (!trimmedNick) {
      setError("Ingresá un nickname.");
      return;
    }
    if (!trimmedCode || trimmedCode.length !== 4) {
      setError("Ingresá un código de sala válido (4 caracteres).");
      return;
    }

    sessionStorage.setItem("nickname", trimmedNick);
    sessionStorage.setItem("gameType", gameType);
    sessionStorage.removeItem("playerId");
    router.push(`/${gameType}/sala/${trimmedCode}`);
  }

  return (
    <div className="card">
      {error && <div className="error-banner">{error}</div>}

      <div className="field">
        <label htmlFor="nickname">Tu nickname</label>
        <input
          id="nickname"
          type="text"
          placeholder="Ej: Ana"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          autoComplete="off"
        />
      </div>

      {gameType === "tateti" && (
        <div className="field">
          <label>Tamaño del tablero</label>
          <div className="size-options">
            {TATETI_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={`size-option ${boardSize === size ? "active" : ""}`}
                onClick={() => setBoardSize(size)}
              >
                {size}×{size}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Se necesita una línea de {boardSize} para ganar.
          </p>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleCreate}
        disabled={loading !== null}
      >
        {loading === "create" ? "Creando..." : "Crear sala"}
      </button>

      <div className="divider">o unirse</div>

      <div className="field">
        <label htmlFor="roomCode">Código de sala</label>
        <input
          id="roomCode"
          type="text"
          placeholder="Ej: A7K2"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={4}
          autoComplete="off"
        />
      </div>

      <button
        className="btn btn-secondary"
        onClick={handleJoin}
        disabled={loading !== null}
      >
        {loading === "join" ? "Uniéndose..." : "Unirse a sala"}
      </button>
    </div>
  );
}
