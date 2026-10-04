# 🗺️ NES-RDO Architecture Blueprint

> **NES-RDO (Retro Discord Online RPG)**  
> An authoritative multiplayer retro 2D RPG designed and built natively as a **Discord Activity** using **Phaser 3**, **Colyseus**, and **TypeScript** in a unified monorepo.

---

## 1. System Overview & Vision

NES-RDO brings classic 8-bit / 16-bit JRPG aesthetics and real-time social multiplayer mechanics directly into Discord voice channels and text chats without requiring external downloads or desktop installations.

```mermaid
flowchart TD
    subgraph Discord Environment
        DA[Discord Desktop / Web / Mobile App]
        IF[Activity iFrame]
        SDK[@discord/embedded-app-sdk]
    end

    subgraph Client Application [apps/client]
        BOOT[Bootstrap / Auth Handshake]
        PH[Phaser 3 Engine]
        SCENE[WorldScene: 16x16 Grid & Interpolation]
        COL_CLI[Colyseus.js Client]
    end

    subgraph Gateway / Proxy [infra]
        CAD[Caddy Reverse Proxy & TLS]
    end

    subgraph Backend Server [apps/server]
        EXP[Express HTTP / API]
        OAUTH[Discord OAuth2 Token Exchange]
        COL_SRV[Colyseus Server]
        ROOM[WorldRoom: 20Hz Simulation & Tile Validation]
    end

    subgraph Shared Core [packages/*]
        SHARED[@nes-rdo/shared: Schema, Constants, Types]
        CONTENT[@nes-rdo/content: Items, Maps, Tilesets]
    end

    DA --> IF
    IF --> BOOT
    BOOT --> SDK
    BOOT --> PH
    PH --> SCENE
    SCENE --> COL_CLI

    COL_CLI <-->|WebSocket / 20Hz State Sync| CAD
    BOOT <-->|HTTP /api/token| CAD
    CAD <--> EXP
    CAD <--> COL_SRV

    EXP --> OAUTH
    COL_SRV --> ROOM

    ROOM -.-> SHARED
    ROOM -.-> CONTENT
    SCENE -.-> SHARED
    SCENE -.-> CONTENT
```

---

## 2. Core Architecture Pillars

### 2.1 Monorepo Structure (`pnpm-workspace.yaml`)

```text
nes-rdo/
├── apps/
│   ├── client/                  # Frontend (Phaser 3 + Vite + TypeScript)
│   └── server/                  # Authoritative Backend (Node.js + Colyseus + Express)
├── packages/
│   ├── shared/                  # Colyseus Schema definitions, constants, shared types
│   └── content/                 # Static content (JSON item definitions, maps, tilesets)
├── infra/                       # Caddyfile & Docker Compose deployment
└── docs/                        # Architecture and design specifications
```

---

## 3. Client Architecture (`apps/client`)

The client runs within Discord's secure iframe sandbox and uses **Phaser 3** configured with pixel-art rendering rules and the `@discord/embedded-app-sdk`.

### 3.1 Discord Handshake & Authentication Flow

1. **Detection**: Client inspects `window.location !== window.parent.location`.
2. **Handshake**: Initializes `DiscordSDK(CLIENT_ID)` and calls `sdk.ready()`.
3. **Authorization**: Requests authorization code with `identify` and `guilds` scopes.
4. **Token Exchange**: Posts code to backend `/api/token` which handles Discord OAuth2 token retrieval securely.
5. **Standalone Fallback**: When developed locally in a standard browser tab, a mock guest profile is used automatically for testing without Discord dependencies.

### 3.2 Phaser 3 Engine & Scene Layering

- **Rendering**: Scaled 480x320 pixel-art canvas with `image-rendering: pixelated` and `Phaser.Scale.FIT`.
- **Grid Movement**: 16x16 pixel tile navigation.
- **Interpolation**: Client interpolates player positions across server ticks using linear easing (`TICK_INTERVAL_MS * 1.5`) to eliminate visual jitter.
- **Input Throttling**: Movement keys (WASD / Arrows) are captured and throttled to prevent network flooding.

---

## 4. Server Architecture (`apps/server`)

### 4.1 Authoritative Simulation Loop (20Hz)

The server runs an authoritative game loop at **20Hz** (50ms per tick) via Colyseus `setSimulationInterval`:

- **Deterministic Step**: Calculates movement resolutions, status tick expirations, and NPC behavior.
- **Binary Delta Synchronization**: Utilizes `@colyseus/schema` for compact binary delta encoding sent to all connected clients in the room.

### 4.2 Tile-Based Movement Validation & Anti-Cheat

Clients send *intents* rather than absolute coordinates. `WorldRoom` verifies every movement step:

1. Target coordinates are calculated based on player orientation and directional vector.
2. Boundaries of the current map (`packages/content`) are checked.
3. The map `collisionLayer` (0 = walkable, 1 = obstacle/solid) is queried.
4. Only valid moves update `player.position.targetX` and `targetY`.

---

## 5. Shared Schema & Data Pipeline

### 5.1 Colyseus Schema (`packages/shared/src/schema.ts`)

| Schema | Fields | Description |
|---|---|---|
| `Position` | `x`, `y`, `targetX`, `targetY`, `mapId`, `direction`, `isMoving` | Represents spatial grid position and movement state |
| `Stats` | `hp`, `maxHp`, `mp`, `maxMp`, `level`, `exp`, `attack`, `defense`, `speed` | Core RPG combat and progression attributes |
| `ItemStack` | `id`, `itemId`, `quantity`, `slotIndex` | Inventory item instances linked to content definitions |
| `Player` | `id`, `sessionId`, `discordId`, `username`, `avatar`, `position`, `stats`, `inventory`, `isOnline` | Full player state entity |
| `WorldState` | `players`, `serverTime`, `mapId`, `tick` | Root room state synchronized across the network |

### 5.2 Game Content Pipeline (`packages/content`)

- `data/items.json`: Item catalog containing consumables, equipment, and modifiers.
- `data/tilesets.json`: Tileset properties including passability rules.
- `data/maps/`: 2D tilemaps containing layer arrays and dedicated `collisionLayer` grids.

---

## 6. Infrastructure & Discord Activity Gateway (`infra`)

### 6.1 Discord Proxying & CSP Requirements

Discord Activities are loaded over HTTPS within an iframe through Discord's edge proxy (`.discordsays.com`). Caddy is configured with required headers:

```caddyfile
Content-Security-Policy "frame-ancestors https://*.discord.com https://discord.com;"
X-Frame-Options "ALLOW-FROM https://discord.com"
```

### 6.2 Service Mapping

- **`:80 / :443`**: Caddy Reverse Proxy
- **`/api/*`**: Routed to Node.js Express API (`server:2567`)
- **`/colyseus/*`, `/matchmake/*`**: WebSocket upgrade routed to Colyseus (`server:2567`)
- **`/*`**: Static asset delivery (`client:3000`)

---

## 7. Development Roadmap

- [x] Monorepo setup (Vite + Phaser 3 + Colyseus + Express + Shared Schemas)
- [x] Discord Embedded App SDK integration with mock fallback
- [x] 20Hz Authoritative WorldRoom with tile collision validation
- [x] Docker & Caddy reverse proxy configuration
- [ ] Multi-map zone transitions & portals
- [ ] Turn-based / Real-time grid combat system
- [ ] Persistent database layer (PostgreSQL / Prisma or Redis session store)
- [ ] NPC dialogue trees and quest state tracking
- [ ] Party / Guild system integrated with Discord Voice Channels
