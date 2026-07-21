"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TatetiBoard } from "@/components/TatetiBoard";
import { getSocket } from "@/lib/socket";
import {
  Board,
  EMPTY_BOARD,
  Mark,
  PublicPlayer,
  RoomStatus,
} from "@/lib/types";

export default function TatetiSalaPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() ?? "";

  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [status, setStatus] = useState<RoomStatus>("waiting");
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [board, setBoard] = useState<Board>([...EMPTY_BOARD] as Board);
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

    if (storedPlayerId) {
      setPlayerId(storedPlayerId);
    }

    if (storedPlayerId && storedNickname) {
      setPlayers([{ id: storedPlayerId, nickname: storedNickname, wins: 0 }]);
    }

    function onConnect() {
      setConnected(true);
    }

    function onRoomJoined({
      playerId: joinedPlayerId,
      players: joinedPlayers,
      status: roomStatus,
      currentTurnId: turnId,
      yourTurn: isYourTurn,
      board: roomBoard,
      marks: roomMarks,
      isDraw: roomDraw,
      winnerId: roomWinner,
    }: {
      playerId: string;
      players: PublicPlayer[];
      status: RoomStatus;
      currentTurnId: string | null;
      yourTurn: boolean;
      board: Board;
      marks: Record<string, Mark>;
      isDraw: boolean;
      winnerId: string | null;
    }) {
      setPlayerId(joinedPlayerId);
      sessionStorage.setItem("playerId", joinedPlayerId);
      setPlayers(joinedPlayers);
      setStatus(roomStatus);
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
      setBoard(roomBoard);
      setMarks(roomMarks);
      setIsDraw(roomDraw);
      setWinnerId(roomWinner);
    }

    function onPlayerJoined({ players: joinedPlayers }: { players: PublicPlayer[] }) {
      setPlayers(joinedPlayers);
    }

    function onGameStarted({
      players: gamePlayers,
      currentTurnId: turnId,
      yourTurn: isYourTurn,
      board: gameBoard,
      marks: gameMarks,
    }: {
      players: PublicPlayer[];
      currentTurnId: string;
      yourTurn: boolean;
      board: Board;
      marks: Record<string, Mark>;
    }) {
      setPlayers(gamePlayers);
      setStatus("playing");
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
      setBoard(gameBoard);
      setMarks(gameMarks);
      setWinnerId(null);
      setIsDraw(false);
      setError("");
    }

    function onBoardUpdated({
      board: updatedBoard,
      nextTurnId,
    }: {
      board: Board;
      nextTurnId: string | null;
    }) {
      setBoard(updatedBoard);
      setCurrentTurnId(nextTurnId);
      const activePlayerId = sessionStorage.getItem("playerId");
      if (activePlayerId) {
        setYourTurn(nextTurnId === activePlayerId);
      }
    }

    function onGameOver({
      winnerId: winner,
      isDraw: draw,
      players: updatedPlayers,
      board: finalBoard,
    }: {
      winnerId: string | null;
      isDraw: boolean;
      players: PublicPlayer[];
      board: Board;
    }) {
      setStatus("finished");
      setWinnerId(winner);
      setIsDraw(draw);
      setPlayers(updatedPlayers);
      setBoard(finalBoard);
      setYourTurn(false);
      setCurrentTurnId(null);
    }

    function onRematchStarted({
      currentTurnId: turnId,
      yourTurn: isYourTurn,
      players: updatedPlayers,
      board: newBoard,
      marks: newMarks,
    }: {
      currentTurnId: string;
      yourTurn: boolean;
      players: PublicPlayer[];
      board: Board;
      marks: Record<string, Mark>;
    }) {
      setStatus("playing");
      setCurrentTurnId(turnId);
      setYourTurn(isYourTurn);
      setPlayers(updatedPlayers);
      setBoard(newBoard);
      setMarks(newMarks);
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

    if (socket.connected) {
      setConnected(true);
    }

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

  function handlePlace(index: number) {
    setError("");
    getSocket().emit("placeMark", { index });
  }

  function handleRematch() {
    setError("");
    getSocket().emit("rematch");
  }

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
            marks={marks}
            yourTurn={yourTurn}
            playerId={playerId}
            winnerId={winnerId}
            isDraw={isDraw}
            onPlace={handlePlace}
            onRematch={handleRematch}
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
