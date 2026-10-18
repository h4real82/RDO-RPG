export interface AppSettings {
  version: 1;
  uiScale: number;
  pixelRatioCap: 1 | 1.5 | 2;
  reducedMotion: boolean;
}
export const APP_SETTINGS_KEY='rdo-rpg:app-settings:v1';
export function normalizeAppSettings(value: unknown, systemReducedMotion=false): AppSettings {
  const defaults: AppSettings={version:1,uiScale:100,pixelRatioCap:2,reducedMotion:systemReducedMotion};
  if (!value || typeof value!=='object' || (value as Record<string,unknown>).version!==1) return defaults;
  const data=value as Record<string,unknown>;
  return {
    version:1,
    uiScale:typeof data.uiScale==='number' && Number.isFinite(data.uiScale) ? Math.max(100,Math.min(150,Math.round(data.uiScale))) : 100,
    pixelRatioCap:[1,1.5,2].includes(data.pixelRatioCap as number) ? data.pixelRatioCap as AppSettings['pixelRatioCap'] : 2,
    reducedMotion:typeof data.reducedMotion==='boolean' ? data.reducedMotion : defaults.reducedMotion,
  };
}
export function loadAppSettings(storage?: Pick<Storage,'getItem'>,systemReducedMotion=false): AppSettings {
  try { return normalizeAppSettings(JSON.parse(storage?.getItem(APP_SETTINGS_KEY) ?? 'null'),systemReducedMotion); }
  catch { return normalizeAppSettings(null,systemReducedMotion); }
}
export function saveAppSettings(storage: Pick<Storage,'setItem'> | undefined,settings: AppSettings): boolean {
  try { if (!storage) return false; storage.setItem(APP_SETTINGS_KEY,JSON.stringify(normalizeAppSettings(settings))); return true; }
  catch { return false; }
}
