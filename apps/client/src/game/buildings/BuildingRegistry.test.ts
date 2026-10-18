import { expect, it } from 'vitest';
import { BUILDINGS, createBuildingRegistry } from './BuildingRegistry';

it('loads all catalog records but only actual floor files become runtime interiors',()=>{
  expect(BUILDINGS.all).toHaveLength(31);
  expect(BUILDINGS.playable.map(b=>b.id).sort()).toEqual(['bank','smithfields-saloon']);
  expect(BUILDINGS.byId.get('bank')?.floors[0].layout.floorY).toBe(117.77);
  expect(BUILDINGS.byId.get('hotel')?.floors).toEqual([]);
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
