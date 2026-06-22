import { createServer, type IncomingMessage } from "http";
import next from "next";
import { loadEnvConfig } from "@next/env";
import { WebSocket, WebSocketServer } from "ws";

import { getReceiverEvents, subscribeReceiverEvents } from "./lib/receiver-store";

loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function sendJson(socket: WebSocket, event: string, data: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ event, data }));
}

async function main() {
  await app.prepare();

  // Vercel does not run this custom HTTP upgrade server. The app uses
  // /api/receive/:receiverId/stream (SSE) on Vercel and this WebSocket server
  // for local/self-hosted deployments.
  const server = createServer((request, response) => {
    handle(request, response);
  });
  const socketServer = new WebSocketServer({ noServer: true });

  socketServer.on("connection", (socket: WebSocket, _request: IncomingMessage, receiverId: string) => {
    sendJson(socket, "ready", { connected: true, receiverId });
    sendJson(socket, "init", { events: getReceiverEvents(receiverId) });

    const unsubscribe = subscribeReceiverEvents(receiverId, (event) => {
      sendJson(socket, "event", event);
    });

    socket.on("close", () => {
      unsubscribe();
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
    const match = url.pathname.match(/^\/socket\/receive\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const receiverId = decodeURIComponent(match[1] || "");
    if (!receiverId) {
      socket.destroy();
      return;
    }

    socketServer.handleUpgrade(request, socket, head, (websocket) => {
      socketServer.emit("connection", websocket, request, receiverId);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`Checkhooks ready on http://${hostname}:${port}`);
    console.log(`WebSocket receiver path: ws://localhost:${port}/socket/receive/:receiverId`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
