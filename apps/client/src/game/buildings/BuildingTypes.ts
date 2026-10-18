export interface Position {x:number;y:number;z:number}
export interface RoomAppearance {
 textures?:Record<string,{url:string;repeat?:[number,number];offset?:[number,number]}>;
 models?:{url:string;replaces:string[];position:Position;size:Position;yaw?:number}[];
}
export interface RoomLayout {
  appearance?:RoomAppearance;
  yaw?:number;
  porch?:{x:number;z:number;width:number;depth:number;stairs:{id:string;from:Position;to:Position;width:number}[]};
  furnishingStyle?:'saloon';
  key:string; placementId:string; frontDirection:1|-1; x:number;z:number;width:number;depth:number;
  fixtures?:{kind?:string;yaw?:number;id:string;position:Position;size:Position;color:string;collision:boolean}[];
  wallTargets?:{id:string;position:Position;radius:number;yaw:number}[];
  floorY:number;front:number;doorX:number;doorWidth:number;rampStart:number;rampLow:number;
}
export interface FloorDefinition {id:string;label:string;layout:RoomLayout}
export interface BuildingAction {
  kind?:'game'|'music'|'drinks'|'bank';label?:string;
  approach?:{position:Position;radius:number};id:string;gameId?:string;variantId?:string;floorId?:string;position?:Position;interactionPosition?:Position;radius?:number}
export interface BuildingDefinition {
  id:string;name:string;sourcePlacementIds:string[];
  originalAccess:{status:'confirmed-open'|'confirmed-closed'|'unknown';evidenceRefs:unknown[]};
  interiorPolicy:'recognizable-adaptation'|'blank-wood'|'provisional-wood';recognitionFeatures:string[];
  floors:FloorDefinition[];actions:BuildingAction[];
}
