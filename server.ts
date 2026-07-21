import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./src/lib/types";
import { registerSocketHandlers } from "./src/server/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
// No usar process.env.HOSTNAME: Render lo setea al hostname del contenedor
// y Next.js falla con eso.
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

function getAllowedOrigins(): string | string[] | boolean {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    // En el mismo dominio (Render) el cliente conecta al mismo origin.
    return true;
  }
  return origins.split(",").map((origin) => origin.trim());
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const httpServer = createServer((req, res) => {
      handle(req, res);
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

    httpServer.listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
