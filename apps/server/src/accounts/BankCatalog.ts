/** Authored economy v1; prices are game configuration, never inferred RDR2 values. */
export const BANK_CATALOG_VERSION='valentine-bank-v1';
export const BANK_CATALOG:Readonly<Record<string,{label:string;coins:number}>>=Object.freeze({
 potion_red:Object.freeze({label:'Roter Trank',coins:25}),
});
export function saleQuote(itemId:string){return Object.prototype.hasOwnProperty.call(BANK_CATALOG,itemId)?BANK_CATALOG[itemId]:undefined;}
