import Phaser from 'phaser';
import { Client } from 'colyseus.js';
import { WorldState } from '@nes-rdo/shared';
import { discordManager } from './discord';
import { WorldScene } from './scenes/WorldScene';

async function bootstrap() {
  console.log('[Bootstrap] Initializing NES-RDO Discord Activity...');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');

  // Step 1: Initialize Discord Embedded App SDK & Authenticate
  const profile = await discordManager.initialize();

  // Step 2: Establish Colyseus WebSocket Connection
  // Determine server endpoint (supports Discord Proxy, Vite dev proxy, and direct connection)
  const isSecure = window.location.protocol === 'https:';
  const wsProtocol = isSecure ? 'wss:' : 'ws:';
  
  let endpoint = `${wsProtocol}//${window.location.host}`;
  if (window.location.port === '3000' && !discordManager.isEmbedded) {
    // Local standalone dev server fallback
    endpoint = `${wsProtocol}//${window.location.hostname}:2567`;
  }

  console.log(`[Bootstrap] Connecting to Colyseus endpoint: ${endpoint}`);
  const client = new Client(endpoint);

  try {
    const room = await client.joinOrCreate<WorldState>('world_room', {
      discordId: profile.id,
      username: profile.username,
      avatar: profile.avatar
    });

    console.log(`[Bootstrap] Joined world_room successfully with sessionId: ${room.sessionId}`);

    if (statusBadge) statusBadge.classList.add('connected');
    if (statusText) statusText.textContent = `Online: ${profile.username}`;

    // Step 3: Initialize Phaser 3 Game Engine with 1080p HD Configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 1920,
      height: 1080,
      pixelArt: false,
      roundPixels: false,
      antialias: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [WorldScene]
    };

    const game = new Phaser.Game(config);
    game.scene.start('WorldScene', { client, room, profile });

    room.onLeave((code) => {
      console.warn(`[Bootstrap] Left room with code: ${code}`);
      if (statusBadge) statusBadge.classList.remove('connected');
      if (statusText) statusText.textContent = 'Disconnected';
    });

  } catch (error) {
    console.error('[Bootstrap] Failed to connect to game room:', error);
    if (statusText) statusText.textContent = 'Connection failed';
  }
}

// Start application
bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error during bootstrap:', err);
});
