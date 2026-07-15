/**
 * WebSocket Manager
 * Manages one authenticated WS connection per user.
 * Used for real-time logout events AND follow-up reminders.
 */
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pratham-tours-secret-key-1234';

// userId (number) -> WebSocket instance
export const wsConnections = new Map();

/**
 * Send a typed message to a specific user.
 * Returns true if the user was connected, false otherwise.
 */
export const sendToUser = (userId, type, payload = {}) => {
  const ws = wsConnections.get(userId);
  if (ws && ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify({ type, data: payload }));
    return true;
  }
  return false;
};

/**
 * Attach the WebSocket server to the existing HTTP server.
 * URL: ws://host/ws?token=<JWT>
 */
export const initWebSocketServer = (httpServer) => {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via token in query string
    const params = new URL(req.url, 'http://localhost').searchParams;
    const token = params.get('token');

    if (!token) {
      ws.close(4001, 'Unauthorized: no token');
      return;
    }

    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch {
      ws.close(4001, 'Unauthorized: invalid token');
      return;
    }

    // Close any stale connection for the same user
    const existing = wsConnections.get(userId);
    if (existing && existing.readyState === 1) {
      existing.close(4000, 'Replaced by new connection');
    }
    wsConnections.set(userId, ws);

    // Acknowledge connection
    ws.send(JSON.stringify({ type: 'connected', data: { userId } }));

    ws.on('close', () => {
      if (wsConnections.get(userId) === ws) {
        wsConnections.delete(userId);
      }
    });

    ws.on('error', () => {
      if (wsConnections.get(userId) === ws) {
        wsConnections.delete(userId);
      }
    });

    // Heartbeat: keep connection alive with a ping every 30s
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Terminate stale connections every 30 seconds
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('[WS] WebSocket server initialized at /ws');
  return wss;
};
