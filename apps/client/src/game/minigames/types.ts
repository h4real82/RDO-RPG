export interface Venue {buildingId:string;floorId:string;actionId:string}
export interface LocalGame {readonly isOpen:boolean;open():void;dispose():void}
export interface GameModule {create(parent:HTMLElement,variant:unknown,venue:Venue):LocalGame}
export interface ResolvedGame {variant:unknown;load:()=>Promise<GameModule>}
export interface GameResolver {resolve(gameId:string,variantId:string):ResolvedGame}
export interface MinigameDefinition {id:string;status:string;modes:string[];variants:Map<string,unknown>;load?:()=>Promise<GameModule>}
