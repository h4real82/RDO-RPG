/** Registered room actions own their interaction. A legacy exterior POI must
 * not open a venue when the player merely clicks that building's entrance. */
export function isOutdoorPoi(poi:{category?:string;manifestRef?:string},indoorPlacements:ReadonlySet<string>):boolean{
 return poi.category!=='saloon-darts'&&!indoorPlacements.has(poi.manifestRef??'');
}
