import itemsData from '../data/items.json';
import tilesetsData from '../data/tilesets.json';
import worldMap01 from '../data/maps/world_map_01.json';
import poisData from '../data/pois.json';
import { ItemDefinition, MapData, POIDefinition } from '@rdo-rpg/shared';

export const items: ItemDefinition[] = itemsData as ItemDefinition[];
export const tilesets = tilesetsData;
export const maps: Record<string, MapData> = {
  [worldMap01.id]: worldMap01 as MapData
};
export const pois: POIDefinition[] = poisData as POIDefinition[];

export function getItemById(id: string): ItemDefinition | undefined {
  return items.find((item) => item.id === id);
}

export function getMapById(id: string): MapData | undefined {
  return maps[id];
}

export function getPOIById(id: string): POIDefinition | undefined {
  return pois.find((poi) => poi.id === id);
}
