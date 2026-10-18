import index from '../../../../../data/reference/valentine/buildings/registry.json';
import type { BuildingDefinition, FloorDefinition, RoomLayout } from './BuildingTypes';

const base='../../../../../data/reference/valentine/buildings/';
const buildingFiles=import.meta.glob('../../../../../data/reference/valentine/buildings/*/building.json',{eager:true,import:'default'});
const floorFiles=import.meta.glob('../../../../../data/reference/valentine/buildings/*/floors/*.json',{eager:true,import:'default'});
const policies={ 'confirmed-open':'recognizable-adaptation','confirmed-closed':'blank-wood',unknown:'provisional-wood' };

function check(value:unknown,message:string):asserts value {if(!value)throw new Error(message);}
function object(value:unknown):Record<string,unknown> {check(value && typeof value==='object' && !Array.isArray(value),'Expected definition object');return value as Record<string,unknown>;}
function path(value:unknown):string {check(typeof value==='string' && /^[a-z0-9-]+(?:\/[a-z0-9.-]+)*\.json$/.test(value) && !value.includes('..'),'Invalid catalog path');return value;}

export function createBuildingRegistry(definitions:BuildingDefinition[]) {
  const byId=new Map<string,BuildingDefinition>(),byPlacement=new Map<string,BuildingDefinition>();
  for(const b of definitions){
    check(typeof b.id==='string' && b.id.length>0 && !byId.has(b.id),`Duplicate/invalid building ID: ${b.id}`);
    check(policies[b.originalAccess.status]===b.interiorPolicy,`Invalid interior policy: ${b.id}`);
    check(b.originalAccess.status==='unknown' || b.originalAccess.evidenceRefs.length>0,`Original access lacks evidence: ${b.id}`);
    check(b.originalAccess.status!=='confirmed-open' || b.recognitionFeatures.length>0,`Original room lacks recognition: ${b.id}`);
    const floors=new Set<string>();
    for(const floor of b.floors){
      const c=floor.layout;
      check(floor.id && !floors.has(floor.id),`Duplicate floor: ${b.id}`);floors.add(floor.id);
      check([c.x,c.z,c.width,c.depth,c.floorY,c.front,c.doorX,c.doorWidth,c.rampStart,c.rampLow].every(Number.isFinite)
        && c.width>0 && c.depth>0 && c.doorWidth>0 && c.doorWidth<c.width && [1,-1].includes(c.frontDirection),`Invalid room layout: ${b.id}`);
      check(Math.abs(c.front-(c.z+c.frontDirection*c.depth/2))<.02 && (c.rampStart-c.front)*c.frontDirection>0,`Invalid entrance layout: ${b.id}`);
      check(c.doorX-c.doorWidth/2>=c.x-c.width/2 && c.doorX+c.doorWidth/2<=c.x+c.width/2,`Door outside layout: ${b.id}`);
      if(c.appearance){
        const safe=(url:unknown)=>typeof url==='string'&&/^[a-zA-Z0-9_./-]+$/.test(url)&&!url.startsWith('/')&&!url.split('/').some(part=>!part||part==='.'||part==='..');
        for(const entry of Object.values(c.appearance.textures??{}))check(entry&&safe(entry.url)&&[entry.repeat,entry.offset].every(pair=>pair===undefined||Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite)),`Invalid appearance texture: ${b.id}`);
        check(c.appearance.models===undefined||Array.isArray(c.appearance.models),`Invalid appearance models: ${b.id}`);
        for(const model of c.appearance.models??[])check(model&&safe(model.url)&&model.position&&model.size
          &&[model.position.x,model.position.y,model.position.z,model.size.x,model.size.y,model.size.z,model.yaw??0].every(Number.isFinite)
          &&model.size.x>0&&model.size.y>0&&model.size.z>0&&Array.isArray(model.replaces)&&model.replaces.length>0
          &&model.replaces.every(id=>c.fixtures?.some(fixture=>fixture.id===id)),`Invalid appearance model: ${b.id}`);
      }
    }
    for(const action of b.actions) if(action.floorId)check(floors.has(action.floorId),`Unknown action floor: ${b.id}/${action.id}`);
    for(const source of b.sourcePlacementIds){check(!byPlacement.has(source),`Duplicate placement: ${source}`);byPlacement.set(source,b);}
    byId.set(b.id,b);
  }
  return {all:definitions,playable:definitions.filter(b=>b.floors.length>0),byId,byPlacement};
}

function loadDefinitions():BuildingDefinition[] {
  return index.buildings.map(reference=>{
    const file=path(reference.file),raw=object(buildingFiles[base+file]);
    check(raw.schemaVersion===1 && raw.id===reference.id,'Catalog definition mismatch');
    const interior=object(raw.interior);
    const refs=interior.floorDefinitions as {id:string;file:string}[];check(Array.isArray(refs),'Missing floor list');
    const floors:FloorDefinition[]=refs.map(ref=>{
      const floor=object(floorFiles[base+file.replace('building.json','')+path(ref.file)]);
      check(floor.schemaVersion===1 && floor.id===ref.id,'Floor definition mismatch');
      return {id:ref.id,label:String(floor.label),layout:{...object(floor.layout),key:`${reference.id}-${ref.id}`,placementId:(raw.sourcePlacementIds as string[])[0]} as unknown as RoomLayout};
    });
    return {id:reference.id,name:String(raw.name),sourcePlacementIds:raw.sourcePlacementIds,
      originalAccess:raw.originalAccess,interiorPolicy:interior.policy,recognitionFeatures:interior.recognitionFeatures,
      floors,actions:raw.actions} as BuildingDefinition;
  });
}

export const BUILDINGS=createBuildingRegistry(loadDefinitions());
