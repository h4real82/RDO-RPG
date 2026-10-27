import { expect, it } from 'vitest';
import { BUILDINGS, createBuildingRegistry } from './BuildingRegistry';

it('loads all catalog records but only actual floor files become runtime interiors',()=>{
  expect(BUILDINGS.all).toHaveLength(35);
  expect(BUILDINGS.playable.map(b=>b.id).sort()).toEqual([
    "bank",
    "church",
    "doctor",
    "general-store",
    "gunsmith",
    "hotel",
    "law-office",
    "second-saloon",
    "sheriff-house",
    "shipping-stand",
    "smithfields-saloon",
    "smithy",
    "station",
    "val-01-aucbarns-barn2",
    "val-01-aucbarns-barn3",
    "val-01-aucyard-barn",
    "val-01-aucyard-chkcoop",
    "val-01-aucyard-shed",
    "val-01-aucyard-stable2",
    "val-01-aucyard-stables",
    "val-03-jail-ext",
    "val-03-stable-ext",
    "val-05-pigpen-a",
    "val-05-res-a",
    "val-05-res-c",
    "val-05-res-d",
    "val-05-res-e",
    "val-06-auchouseb-ext",
    "val-07-magic-ticketbooth",
    "val-07-magiclantern-ext",
    "val-07-resf-ext",
    "val-auchouse-ext",
    "val-freightstn"
]);
  expect(BUILDINGS.byId.get('bank')?.floors[0].layout.floorY).toBe(117.77);
  expect(BUILDINGS.byId.get('hotel')?.floors).toHaveLength(2);
  expect(BUILDINGS.byId.get('hotel')?.floors[0].layout.floorY).toBe(117.1);
  expect(BUILDINGS.byId.get('hotel')?.floors[1].layout.floorY).toBe(120.6);
  // The fabricated station upper floor was removed from the registered building.
  expect(BUILDINGS.byId.get('station')?.floors.map(floor=>floor.id)).toEqual(['ground']);
  expect(BUILDINGS.byId.get('val-01-aucbarns-barn2')?.floors).toHaveLength(2);
  expect(BUILDINGS.byId.get('val-01-aucbarns-barn3')?.floors).toHaveLength(2);
  expect(BUILDINGS.byId.get('general-store')?.floors[0].layout.floorY).toBe(116.9);
  expect(BUILDINGS.byId.get('gunsmith')?.floors[0].layout.floorY).toBe(118.5);
  expect(BUILDINGS.byId.get('doctor')?.floors[0].layout.floorY).toBe(118.42);
  expect(BUILDINGS.byId.get('val-03-jail-ext')?.floors[0].layout.floorY).toBe(118.4);
  expect(BUILDINGS.byId.get('station')?.floors[0].layout.floorY).toBe(112.95);
  expect(BUILDINGS.byId.get('second-saloon')?.floors[0].layout.floorY).toBe(117);
  expect(BUILDINGS.byId.get('church')?.floors[0].layout.floorY).toBe(123.7);
  expect(BUILDINGS.byId.get('smithy')?.floors[0].layout.floorY).toBe(115.35);
  expect(BUILDINGS.byId.get('val-05-res-a')?.floors[0].layout.floorY).toBe(120.25);
  expect(BUILDINGS.byId.get('val-05-res-c')?.floors[0].layout.floorY).toBe(122.45);
  expect(BUILDINGS.byId.get('val-05-res-d')?.floors[0].layout.floorY).toBe(137.5);
  expect(BUILDINGS.byId.get('val-05-res-e')?.floors[0].layout.floorY).toBe(127.2);
  // Measured source candidates are planning records until their own floor files
  // and entrance routes have been implemented; never count them as playable.
  for(const id of ['val-03-default-jail','val-butcher-collapsed'])expect(BUILDINGS.byId.get(id)?.floors,id).toEqual([]);
});

it('rejects duplicate identities, broken floor references and invalid access policies',()=>{
  const bank=BUILDINGS.byId.get('bank')!;
  expect(()=>createBuildingRegistry([bank,bank])).toThrow(/Duplicate/);
  expect(()=>createBuildingRegistry([{...bank,floors:[{...bank.floors[0],layout:{...bank.floors[0].layout,width:-1}}]}])).toThrow(/layout/);
  expect(()=>createBuildingRegistry([{...bank,interiorPolicy:'recognizable-adaptation'}])).toThrow(/policy/);
});

it('rejects unsafe source paths and invalid visual sizes before loading a room',()=>{
 const saloon=BUILDINGS.byId.get('smithfields-saloon')!;
 for(const corrupt of [((b:typeof saloon)=>{b.floors[0].layout.appearance!.models![0].url='../raw/model.glb';}),((b:typeof saloon)=>{b.floors[0].layout.appearance!.models![0].size.x=-1;})]){
  const copy=structuredClone(saloon);corrupt(copy);expect(()=>createBuildingRegistry([copy])).toThrow(/appearance/i);
 }
});

it('rejects stairs with missing destination floors or inconsistent landing heights',()=>{
 const hotel=BUILDINGS.byId.get('hotel')!;
 for(const corrupt of [((b:typeof hotel)=>{b.floors[0].layout.stairs![0].toFloorId='missing';}),((b:typeof hotel)=>{b.floors[0].layout.stairs![0].to.y+=1;}),((b:typeof hotel)=>{b.floors[0].layout.stairs![0].width=0;})]){
  const copy=structuredClone(hotel);corrupt(copy);expect(()=>createBuildingRegistry([copy])).toThrow(/stair/i);
 }
});
it('gives the hotel a bed and bath instead of relabelled dining tables',()=>{
 const fixtures=BUILDINGS.byId.get('hotel')!.floors.find(f=>f.id==='upper')!.layout.fixtures!;
 expect(fixtures.find(f=>f.id==='deluxe-bed')?.kind).toBe('bed');
 expect(fixtures.find(f=>f.id==='bathtub')?.kind).toBe('bathtub');
});

it('keeps every registered porch ramp below the physical support slope limit',()=>{
 for(const b of BUILDINGS.playable)for(const f of b.floors)for(const stair of f.layout.porch?.stairs??[]){
  const length=Math.hypot(stair.to.x-stair.from.x,stair.to.z-stair.from.z),rise=Math.abs(stair.to.y-stair.from.y);
  expect(length/Math.hypot(length,rise),`${b.id}/${stair.id}`).toBeGreaterThanOrEqual(.65);
 }
});

it('keeps the new Law Office and Sheriff-House pilots explicit about unknown original access',()=>{
 for(const id of ['law-office','sheriff-house']){
  const b=BUILDINGS.byId.get(id)!;expect(b.originalAccess.status).toBe('unknown');
  expect(b.floors).toHaveLength(1);expect(b.floors[0].layout.appearance?.textures?.floor.url).toBeTruthy();
  expect(b.floors[0].layout.fixtures).toEqual([]);
 }
});

it('registers the next three measured ground-floor pilots without inventing original access',()=>{
 for(const id of ['val-07-resf-ext','val-freightstn','val-auchouse-ext']){
  const b=BUILDINGS.byId.get(id)!;expect(b.originalAccess.status).toBe('unknown');
  expect(b.floors.map(f=>f.id)).toEqual(['ground']);
  expect(b.floors[0].layout.appearance?.textures?.floor.url).toBeTruthy();
 }
});


it('keeps the adapted smithy separate from the stable gameplay footprint',()=>{
 const smithy=BUILDINGS.byId.get('smithy')!.floors[0].layout,stable=BUILDINGS.byId.get('val-03-stable-ext')!.floors[0].layout;
 const zExtent=(c:typeof smithy)=>Math.abs(Math.sin(c.yaw??0))*c.width/2+Math.abs(Math.cos(c.yaw??0))*c.depth/2;
 expect(Math.abs(smithy.z-stable.z)-zExtent(smithy)-zExtent(stable)).toBeGreaterThan(3);
});
