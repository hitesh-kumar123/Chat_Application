const originalPort = process.env.PORT;
const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const url = require('url');

// Load environment variables manually if .env exists
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').replace(/\r$/, '').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error('Error loading .env file:', e);
}

const PORT = originalPort || process.env.WS_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-that-is-at-least-32-chars-long-12345';
const BROADCAST_SECRET = process.env.WS_BROADCAST_SECRET || 'internal-websocket-broadcast-secret-key-999';

const userSockets = new Map(); // userId -> Set of sockets
const roomSockets = new Map(); // roomId -> Set of sockets
const socketInfo = new Map(); // socket -> { userId, userName, rooms: Set }

function verifyJWT(token) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    const data = `${headerB64}.${payloadB64}`;
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64url');

    if (signature !== signatureB64) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

// HTTP Server for handling broadcasts from Next.js app
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'POST' && parsedUrl.pathname === '/broadcast') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        const secretToken = authHeader.split(' ')[1];
        if (secretToken !== BROADCAST_SECRET) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }

        const payload = JSON.parse(body);
        const { roomId, userIds, type, data } = payload;

        if (userIds && Array.isArray(userIds)) {
          const messageStr = JSON.stringify({ type, data });
          userIds.forEach(uId => {
            const sockets = userSockets.get(uId);
            if (sockets) {
              sockets.forEach(ws => {
                if (ws.readyState === 1) {
                  ws.send(messageStr);
                }
              });
            }
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (!roomId || !type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing roomId or type' }));
          return;
        }

        const sockets = roomSockets.get(roomId);
        if (sockets) {
          const messageStr = JSON.stringify({ type, roomId, data });
          sockets.forEach(ws => {
            if (ws.readyState === 1) {
              ws.send(messageStr);
            }
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Broadcast handler error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// WebSocket Upgrade Handler
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url, true);
  let token = parsedUrl.query.token;

  if (!token && request.headers.cookie) {
    const cookies = request.headers.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('chat-session='));
    if (sessionCookie) {
      token = sessionCookie.split('=')[1];
    }
  }

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const user = verifyJWT(token);
  if (!user) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request, user);
  });
});

wss.on('connection', (ws, request, user) => {
  console.log(`User connected: ${user.name} (${user.id})`);

  if (!userSockets.has(user.id)) {
    userSockets.set(user.id, new Set());
  }
  userSockets.get(user.id).add(ws);

  socketInfo.set(ws, {
    userId: user.id,
    userName: user.name,
    rooms: new Set(),
  });

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', messageStr => {
    try {
      const message = JSON.parse(messageStr);
      const info = socketInfo.get(ws);
      if (!info) return;

      switch (message.type) {
        case 'JOIN_ROOM': {
          const { roomId } = message;
          if (!roomId) return;

          if (!roomSockets.has(roomId)) {
            roomSockets.set(roomId, new Set());
          }
          roomSockets.get(roomId).add(ws);
          info.rooms.add(roomId);
          break;
        }

        case 'LEAVE_ROOM': {
          const { roomId } = message;
          if (!roomId) return;

          const sockets = roomSockets.get(roomId);
          if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
              roomSockets.delete(roomId);
            }
          }
          info.rooms.delete(roomId);
          break;
        }

        case 'TYPING': {
          const { roomId, isTyping } = message;
          if (!roomId) return;

          const sockets = roomSockets.get(roomId);
          if (sockets) {
            const typingMsg = JSON.stringify({
              type: 'USER_TYPING',
              roomId,
              data: {
                userId: info.userId,
                userName: info.userName,
                isTyping,
              },
            });
            sockets.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(typingMsg);
              }
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.error('Error handling socket message:', e);
    }
  });

  ws.on('close', () => {
    const info = socketInfo.get(ws);
    if (info) {
      console.log(`User disconnected: ${info.userName} (${info.userId})`);

      const userSets = userSockets.get(info.userId);
      if (userSets) {
        userSets.delete(ws);
        if (userSets.size === 0) {
          userSockets.delete(info.userId);
        }
      }

      info.rooms.forEach(roomId => {
        const sockets = roomSockets.get(roomId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            roomSockets.delete(roomId);
          }
        }
      });

      socketInfo.delete(ws);
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
