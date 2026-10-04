import { Client } from 'colyseus.js';
import { WorldState } from '@rdo-rpg/shared';
import { discordManager } from './discord';
import { rpgMenuManager } from './menu';
import { ThreeWorld } from './world/ThreeWorld';

async function bootstrap() {
  console.log('[Bootstrap] Initializing RDO-RPG Discord Activity (Three.js 3D)...');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');

  // Step 1: Initialize Discord Embedded App SDK & Authenticate
  const profile = await discordManager.initialize();

  // Step 2: Establish Colyseus WebSocket Connection
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

    // Initialize Red Dead RPG Logbook Menu
    rpgMenuManager.init();
    const menuCharName = document.getElementById('menu-char-name');
    if (menuCharName) menuCharName.textContent = profile.username;

    // Step 3: Initialize Three.js 3D Tactical RPG Engine
    console.log('[Bootstrap] Launching Three.js 3D Engine...');
    const world3D = new ThreeWorld(client, room, profile);
    (window as any).__world3D = world3D;

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
