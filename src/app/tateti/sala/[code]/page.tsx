"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TatetiBoard } from "@/components/TatetiBoard";
import { getSocket } from "@/lib/socket";
import {
  Board,
  Mark,
  PublicPlayer,
  RoomStatus,
  TatetiSize,
  createEmptyBoard,
} from "@/lib/types";

export default function TatetiSalaPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";

  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<TatetiSize>(3);
  const [board, setBoard] = useState<Board>(() => createEmptyBoard(3));
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [yourTurn, setYourTurn] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
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
      currentTurnId: string | null;
      yourTurn: boolean;
      board: Board;
      boardSize: TatetiSize;
      marks: Record<string, Mark>;
      isDraw: boolean;
      winnerId: string | null;
    }) {
      setPlayerId(payload.playerId);
      sessionStorage.setItem("playerId", payload.playerId);
      setPlayers(payload.players);
      setStatus(payload.status);
      setCurrentTurnId(payload.currentTurnId);
      setYourTurn(payload.yourTurn);
      setBoard(payload.board);
      setBoardSize(payload.boardSize);
      setMarks(payload.marks);
      setIsDraw(payload.isDraw);
      setWinnerId(payload.winnerId);
    }

    function onPlayerJoined({ players: joined }: { players: PublicPlayer[] }) {
      setPlayers(joined);
    }

    function onGameStarted(payload: {
      players: PublicPlayer[];
      currentTurnId: string | null;
      yourTurn: boolean;
      board: Board;
      boardSize: TatetiSize;
      marks: Record<string, Mark>;
    }) {
      setPlayers(payload.players);
      setStatus("playing");
      setCurrentTurnId(payload.currentTurnId);
      setYourTurn(payload.yourTurn);
      setBoard(payload.board);
      setBoardSize(payload.boardSize);
      setMarks(payload.marks);
      setWinnerId(null);
      setIsDraw(false);
      setError("");
    }

    function onBoardUpdated(payload: {
      board: Board;
      boardSize: TatetiSize;
      nextTurnId: string | null;
    }) {
      setBoard(payload.board);
      setBoardSize(payload.boardSize);
      setCurrentTurnId(payload.nextTurnId);
      const active = sessionStorage.getItem("playerId");
      if (active) setYourTurn(payload.nextTurnId === active);
    }

    function onGameOver(payload: {
      winnerId: string | null;
      isDraw: boolean;
      players: PublicPlayer[];
      board: Board;
      boardSize: TatetiSize;
    }) {
      setStatus("finished");
      setWinnerId(payload.winnerId);
      setIsDraw(payload.isDraw);
      setPlayers(payload.players);
      setBoard(payload.board);
      setBoardSize(payload.boardSize);
      setYourTurn(false);
      setCurrentTurnId(null);
    }

    function onRematchStarted(payload: {
      currentTurnId: string | null;
      yourTurn: boolean;
      players: PublicPlayer[];
      board: Board;
      boardSize: TatetiSize;
      marks: Record<string, Mark>;
    }) {
      setStatus("playing");
      setCurrentTurnId(payload.currentTurnId);
      setYourTurn(payload.yourTurn);
      setPlayers(payload.players);
      setBoard(payload.board);
      setBoardSize(payload.boardSize);
      setMarks(payload.marks);
      setWinnerId(null);
      setIsDraw(false);
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
    socket.on("boardUpdated", onBoardUpdated);
    socket.on("gameOver", onGameOver);
    socket.on("rematchStarted", onRematchStarted);
    socket.on("playerDisconnected", onPlayerDisconnected);
    socket.on("error", onError);

    if (socket.connected) setConnected(true);

    if (!storedPlayerId && storedNickname) {
      socket.emit("joinRoom", {
        code,
        nickname: storedNickname,
        gameType: "tateti",
      });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("roomJoined", onRoomJoined);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("gameStarted", onGameStarted);
      socket.off("boardUpdated", onBoardUpdated);
      socket.off("gameOver", onGameOver);
      socket.off("rematchStarted", onRematchStarted);
      socket.off("playerDisconnected", onPlayerDisconnected);
      socket.off("error", onError);
    };
  }, [code]);

  return (
    <main className="page">
      <h1 className="brand">Tateti</h1>

      <div className="card" style={{ maxWidth: "32rem" }}>
        {!connected ? (
          <p style={{ textAlign: "center", color: "var(--ink-muted)" }}>
            Conectando...
          </p>
        ) : (
          <TatetiBoard
            code={code}
            players={players}
            status={status}
            currentTurnId={currentTurnId}
            board={board}
            boardSize={boardSize}
            marks={marks}
            yourTurn={yourTurn}
            playerId={playerId}
            winnerId={winnerId}
            isDraw={isDraw}
            onPlace={(index) => {
              setError("");
              getSocket().emit("placeMark", { index });
            }}
            onRematch={() => {
              setError("");
              getSocket().emit("rematch");
            }}
            error={error}
          />
        )}
      </div>

      <Link href="/tateti" className="back-link">
        ← Volver
      </Link>
    </main>
  );
}
