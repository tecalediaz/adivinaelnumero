import { createServer } from "http";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../src/lib/types";
import { registerSocketHandlers } from "../src/server/socket-handlers";

const port = parseInt(process.env.PORT || "3001", 10);

function getAllowedOrigins(): string | string[] | boolean {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    return process.env.NODE_ENV === "production" ? false : "*";
  }
  return origins.split(",").map((origin) => origin.trim());
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Socket server activo");
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(
  httpServer,
  {
    path: "/api/socketio",
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
    },
  }
);

registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`> Socket server listo en puerto ${port}`);
});
