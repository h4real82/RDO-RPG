import index from '../../../../../data/reference/minigames/registry.json';
import type {MinigameDefinition} from './types';
const files=import.meta.glob('../../../../../data/reference/minigames/*/game.json',{eager:true,import:'default'});
const variants=import.meta.glob('../../../../../data/reference/minigames/*/variants/*.json',{eager:true,import:'default'});
const base='../../../../../data/reference/minigames/';
export function createMinigameRegistry(all:MinigameDefinition[]){
  const definitions=new Map<string,MinigameDefinition>();
  for(const definition of all){if(definitions.has(definition.id))throw new Error('Duplicate minigame');definitions.set(definition.id,definition);}
  return {all,resolve(gameId:string,variantId:string){
    const game=definitions.get(gameId);
    if(!game?.load || !game.modes.includes('local-practice'))throw new Error('Dieses Spiel ist noch nicht verfügbar.');
    const variant=game.variants.get(variantId);if(!variant)throw new Error('Diese Spielvariante ist nicht verfügbar.');
    return {variant,load:game.load};
  }};
}
const LOADERS: Record<string, () => Promise<unknown>> = {
  darts: () => import('./darts/definition'),
  poker: () => import('./poker/definition'),
  blackjack: () => import('./blackjack/definition'),
  archery: () => import('./archery/definition'),
  boxing: () => import('./boxing/definition'),
  'color-cards': () => import('./color-cards/definition'),
  'horse-race': () => import('./horse-race/definition'),
  'mini-golf': () => import('./golf/definition'),
  schwimmen: () => import('./schwimmen/definition'),
  wettsaufen: () => import('./wettsaufen/definition'),
};
export const MINIGAMES=createMinigameRegistry(index.games.map(ref=>{
  const raw=files[base+ref.file] as {id:string;implementationStatus:string;implementedModes:string[];variants:{id:string;file:string}[]};
  if(!raw || raw.id!==ref.id)throw new Error('Invalid game catalog');
  const configs=new Map<string,unknown>();
  for(const variant of raw.variants){
    const value=variants[base+ref.file.replace('game.json','')+variant.file] as {id:string;gameId:string};
    if(!value || value.id!==variant.id || value.gameId!==raw.id || configs.has(value.id))throw new Error('Invalid game variant');
    configs.set(value.id,value);
  }
  return {id:raw.id,status:raw.implementationStatus,modes:raw.implementedModes,variants:configs,
    load:(LOADERS[raw.id] as unknown as MinigameDefinition['load']) ?? undefined};
}));
