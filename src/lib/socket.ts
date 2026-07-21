"use client";

import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./types";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function getSocketUrl(): string | undefined {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configuredUrl) return configuredUrl;
  if (typeof window !== "undefined") return window.location.origin;
  return undefined;
}

export function getSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> {
  if (!socket) {
    socket = io(getSocketUrl(), {
      path: "/api/socketio",
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
