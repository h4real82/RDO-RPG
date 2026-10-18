import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { WorldRoom } from './rooms/WorldRoom';
import { SourceBoundaryRoom } from './rooms/SourceBoundaryRoom';
import { config } from './config';
import { accountRuntime } from './accounts/AccountRuntime';

const app = express();
app.use(express.json({limit:'16kb'}));
const accounts=accountRuntime();
app.use('/api',accounts.router);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Discord Activity OAuth Token Exchange endpoint
app.post('/api/token', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code is required for token exchange' });
    }

    if (!config.discordClientId || !config.discordClientSecret) {
      return res.status(503).json({error:'Discord authentication is not configured'});
    }

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.discordClientId,
        client_secret: config.discordClientSecret,
        grant_type: 'authorization_code',
        code: code
      })
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error exchanging Discord token:', error);
    return res.status(500).json({ error: 'Failed to exchange token' });
  }
});

const server = http.createServer(app);

// Colyseus Game Server Setup
const gameServer = new Server({
  transport: new WebSocketTransport({
    server
  })
});

// Define Rooms
gameServer.define('world_room', WorldRoom);
gameServer.define('valentine_source', SourceBoundaryRoom);

// Start server
server.listen(config.port, () => {
  console.log(`[RDO-RPG Server] Listening on http://localhost:${config.port}`);
  console.log(`[Colyseus] Room 'world_room' registered and ready.`);
});
