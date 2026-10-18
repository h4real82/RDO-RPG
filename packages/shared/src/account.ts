/** Public owner-only API shape. Never put provider secrets in these DTOs. */
export interface PlayerAccount {
 id:string;displayName:string;characterId:string;coins:string;
 inventory:{id:string;itemId:string;quantity:number;slot:number}[];
 discord:{id:string;name:string;avatar:string|null}|null;
}
export interface AccountCapabilities {
 accounts?:boolean;password?:boolean;discordLink?:boolean;
 persistentGameplay?:boolean;discordSessions?:boolean;
}
export type AccountState='checking'|'signed-out'|'authenticated'|'unavailable'|'verification-required'|'reset-requested'|'password-update';
