import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { SFUServer } from './sfu';
import { WebSocketSignalingServer } from './websocket';
import logger from '../utils/logger';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SFU Server
const sfuServer = new SFUServer(process.env.REDIS_URL);

// Initialize WebSocket Server
let wsServer: WebSocketSignalingServer;

// REST API Routes
app.post('/api/rooms', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const roomId = sfuServer.createRoom(name);
    res.json({ roomId, name });
  } catch (error: any) {
    logger.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = sfuServer.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room.getRoomState());
  } catch (error: any) {
    logger.error('Error getting room:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    sfuServer.deleteRoom(roomId);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting room:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = sfuServer.getStats();
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rooms/:roomId/chat', (req, res) => {
try {
const { roomId } = req.params;
const room = sfuServer.getRoom(roomId);
if (!room) {
  return res.status(404).json({ error: 'Room not found' });
}

res.json({ messages: room.getChatHistory() });
} catch (error: any) {
logger.error('Error getting chat history:', error);
res.status(500).json({ error: error.message });
}
});
app.get('/health', (req, res) => {
res.json({ status: 'ok', timestamp: Date.now() });
});
// Start server
const PORT = process.env.PORT || 3000;
async function startServer() {
try {
// Initialize SFU
await sfuServer.initialize();
wsServer = new WebSocketSignalingServer(server, sfuServer);

server.listen(PORT, () => {
  logger.info(`SFU Server running on port ${PORT}`);
  logger.info(`WebSocket signaling available at ws://localhost:${PORT}/signaling`);
});
} catch (error) {
logger.error('Failed to start server:', error);
process.exit(1);
}
}
// Graceful shutdown
process.on('SIGTERM', async () => {
logger.info('SIGTERM received, shutting down gracefully');
wsServer.shutdown();
await sfuServer.shutdown();
server.close(() => {
logger.info('Server closed');
process.exit(0);
});
});
process.on('SIGINT', async () => {
logger.info('SIGINT received, shutting down gracefully');
wsServer.shutdown();
await sfuServer.shutdown();
server.close(() => {
logger.info('Server closed');
process.exit(0);
});
});
startServer();
export { app, server, sfuServer, wsServer };