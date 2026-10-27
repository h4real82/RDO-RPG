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

export const STARTING_COINS = 5000;
export const BANK_CATALOG_VERSION = 'valentine-bank-v1';
export const BANK_CATALOG: Readonly<Record<string, { label: string; coins: number }>> = Object.freeze({
 potion_red: Object.freeze({ label: 'Roter Trank', coins: 25 }),
});
export function saleQuote(itemId: string): { label: string; coins: number } | undefined {
 return Object.prototype.hasOwnProperty.call(BANK_CATALOG, itemId) ? BANK_CATALOG[itemId] : undefined;
}
