import{expect,it}from'vitest';import{BUILDINGS}from'../buildings/BuildingRegistry';import{isOutdoorPoi}from'./LegacyPoiPolicy';
it('lets players walk into cinema and ticket booth without triggering their old exterior venue',()=>{
 const indoor=new Set(BUILDINGS.playable.flatMap(b=>b.sourcePlacementIds));for(const id of['val-07-magiclantern-ext','val-07-magic-ticketbooth','hotel','smithfields-saloon'])expect(isOutdoorPoi({category:'cinema',manifestRef:BUILDINGS.byId.get(id)!.sourcePlacementIds[0]},indoor)).toBe(false);
 expect(isOutdoorPoi({category:'archery',manifestRef:'valentine:archery-range'},indoor)).toBe(true);
});
