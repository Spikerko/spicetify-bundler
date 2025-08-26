import { LastProcessedCodeString, LastProcessedCSSString } from "./bundler.ts";

const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

type SocketMessageParams = {
  type: string;
  content: unknown;
  identifier: string;
  typeOfMessage: string;
};

const formatSocketMessage = ({
  type,
  content,
  identifier,
  typeOfMessage
}: SocketMessageParams): string => {
  return JSON.stringify({
    Type: typeOfMessage,
    ContentType: type,
    Content: content,
    Identifier: identifier
  });
};

const clients = new Set<WebSocket>();

export let wsRunning = false;

export function startWSServer() {
  wsRunning = false;
  Deno.serve({
    port: 9235,
    onListen() {
      wsRunning = true;
    },
  }, (req: Request) => {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      clients.add(socket);
    };

    socket.onmessage = (event) => {
      const unparsedMessage = event.data;
      const message = JSON.parse(unparsedMessage);
    
      if (message.Type === "request") {
        if (message.ContentType === "bundle_request") {
          if (message.Content === "code") {
            socket.send(formatSocketMessage({
              type: "response",
              typeOfMessage: "response",
              identifier: message.Identifier,
              content: LastProcessedCodeString
            }))
          } else if (message.Content === "styles") {
            socket.send(formatSocketMessage({
              type: "response",
              typeOfMessage: "response",
              identifier: message.Identifier,
              content: LastProcessedCSSString
            }))
          }
        }
      }

    };

    socket.onclose = () => {
      clients.delete(socket);
    };

    socket.onerror = (_) => {
      clients.delete(socket);
    };

    return response;
  });
}

// deno-lint-ignore no-explicit-any
export const updateClientContent = (type: "StyleChange" | "CodeChange", updatedContent: any) => {
  if (clients.size <= 0) {
    // console.log("[WsServer] No clients to update for", type);
    return;
  }

  // console.log(`[WsServer] Updating ${clients.size} client(s) with type: ${type}`);

  for (const client of clients) {
    try {
      if (type === "StyleChange") {
        // console.log("[WsServer] Sending style update to client");
        client.send(formatSocketMessage({
          type: "event",
          typeOfMessage: "event",
          identifier: generateRandomString(),
          content: {
            UpdateTo: updatedContent,
            EventType: "css_reload"
          }
        }));
      } else if (type === "CodeChange") {
        // console.log("[WsServer] Sending code change event to client");
        client.send(formatSocketMessage({
          type: "event",
          typeOfMessage: "event",
          identifier: generateRandomString(),
          content: {
            EventType: "code_reload"
          }
        }));
      }
    } catch (err) {
      console.error("[WsServer] Failed to send update to client:", err);
    }
  }
};

export const broadcastBundlingError = () => {
  if (clients.size <= 0) {
    return;
  }

  for (const client of clients) {
    try {
      client.send(formatSocketMessage({
        type: "event",
        typeOfMessage: "event",
        identifier: generateRandomString(),
        content: {
          EventType: "bundle_error"
        }
      }));
    } catch (err) {
      console.error("[WsServer] Failed to send bundling error to client:", err);
    }
  }
}