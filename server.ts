import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./src/lib/types";
import { registerSocketHandlers } from "./src/server/socket-handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

function getAllowedOrigins(): string | string[] | boolean {
  const origins = process.env.ALLOWED_ORIGINS;
  if (!origins) {
    return dev ? "*" : false;
  }
  return origins.split(",").map((origin) => origin.trim());
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
