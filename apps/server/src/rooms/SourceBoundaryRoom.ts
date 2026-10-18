import { Room, Client } from 'colyseus';
import { Schema, MapSchema, type } from '@colyseus/schema';
import { advanceSourcePosition, SourceIntent, SourceBoundary } from './SourceBoundarySimulation';

class SourcePlayer extends Schema {
  @type('number') x = -310.1441;
  @type('number') z = -788.7001;
}
class SourceState extends Schema {
  @type('string') coordinateSpace = 'three-xz-metres';
  @type('string') boundaryId = '';
  @type('number') tick = 0;
  @type({ map: SourcePlayer }) players = new MapSchema<SourcePlayer>();
}

/** Boundary-authoritative source room; legacy world_room keeps its pixel contract.
 * Terrain / building collision and the full source multiplayer client are separate gates.
 */
export class SourceBoundaryRoom extends Room<SourceState> {
  maxClients = 64;
  private boundary!: SourceBoundary;
  private intents = new Map<string, SourceIntent & { received: number }>();

  async onCreate() {
    const { createPlayableBoundary, VALENTINE_BOUNDARY } = await import('@rdo-rpg/world-contracts');
    this.boundary=createPlayableBoundary(VALENTINE_BOUNDARY.polygon, VALENTINE_BOUNDARY.playerRadiusMetres);
    this.setState(new SourceState());
    this.state.boundaryId=VALENTINE_BOUNDARY.id;
    await this.setMetadata({coordinateSpace:this.state.coordinateSpace,boundaryId:this.state.boundaryId,scope:'boundary-only'});
    this.onMessage('move_intent',(client, message: unknown)=> {
      try {
        if (!this.state.players.has(client.sessionId) || !message || typeof message!=='object') return;
        const data=message as Record<string,unknown>;
        if (typeof data.dx!=='number' || typeof data.dz!=='number' || !Number.isFinite(data.dx) || !Number.isFinite(data.dz)
          || Math.abs(data.dx)>1 || Math.abs(data.dz)>1) {
          this.intents.delete(client.sessionId); return;
        }
        this.intents.set(client.sessionId,{dx:data.dx,dz:data.dz,sprint:data.sprint===true,received:Date.now()});
      } catch (error) { this.intents.delete(client.sessionId); console.error('Source intent rejected.',error); }
    });
    // Position and travel claims have no authoritative meaning in this room.
    for (const name of ['move','travel','interact']) this.onMessage(name,(client)=> {
      client.send('movement_rejected',{reason:'intent-only',coordinateSpace:this.state.coordinateSpace});
    });
    this.setSimulationInterval((deltaMs)=> {
      this.state.tick++;
      for (const [id,player] of this.state.players) {
        const intent=this.intents.get(id);
        if (!intent || Date.now()-intent.received>500) continue;
        const next=advanceSourcePosition(player,intent,deltaMs,this.boundary);
        player.x=next.x; player.z=next.z;
      }
    },50);
  }

  onJoin(client: Client) {
    const player=new SourcePlayer();
    if (!this.boundary.contains(player)) throw new Error('Source spawn outside boundary');
    this.state.players.set(client.sessionId,player);
    client.send('boundary',{id:this.state.boundaryId,coordinateSpace:this.state.coordinateSpace,scope:'boundary-only'});
  }
  onLeave(client: Client) { this.intents.delete(client.sessionId); this.state.players.delete(client.sessionId); }
}
