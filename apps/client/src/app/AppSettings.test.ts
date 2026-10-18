import { describe, expect, it } from 'vitest';
import { loadAppSettings, saveAppSettings, normalizeAppSettings } from './AppSettings';

describe('local app settings',()=> {
  it('defaults corrupt/version-mismatched settings and validates supported values',()=> {
    expect(loadAppSettings({getItem:()=>'{broken'}).uiScale).toBe(100);
    expect(loadAppSettings({getItem:()=>'{"version":99,"uiScale":150}'}).uiScale).toBe(100);
    expect(normalizeAppSettings({version:1,uiScale:999,pixelRatioCap:9,reducedMotion:'yes'})).toEqual({version:1,uiScale:150,pixelRatioCap:2,reducedMotion:false});
  });
  it('persists a supported value and remains usable when storage is denied',()=> {
    let stored='';const storage={getItem:()=>stored,setItem:(_key:string,value:string)=>{stored=value;}};
    expect(saveAppSettings(storage,{version:1,uiScale:125,pixelRatioCap:1,reducedMotion:true})).toBe(true);
    expect(loadAppSettings(storage)).toEqual({version:1,uiScale:125,pixelRatioCap:1,reducedMotion:true});
    expect(loadAppSettings({getItem:()=>{throw new Error('blocked');}}).uiScale).toBe(100);
    expect(saveAppSettings({setItem:()=>{throw new Error('blocked');}},loadAppSettings(storage))).toBe(false);
  });
});
