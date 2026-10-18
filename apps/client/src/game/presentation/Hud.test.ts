import { afterEach, expect, it, vi } from 'vitest';
import { Hud } from './Hud';

afterEach(() => { vi.unstubAllGlobals(); });

it('distinguishes missing terrain from a building obstacle', () => {
  const element = { textContent: '', setAttribute() {}, remove() {} };
  vi.stubGlobal('document', { createElement: () => element });
  const root = { appendChild() {} } as unknown as HTMLElement;
  const hud = new Hud(root);
  const position = { x: 0, y: 0, z: 0 };

  hud.update(position, undefined, undefined, 0, 'terrain');
  expect(element.textContent).toContain('Gelände fehlt in dieser Richtung');
  hud.update(position, undefined, undefined, 0, 'obstacle');
  expect(element.textContent).toContain('Gebäude im Weg');
  expect(element.textContent).not.toContain('Gelände fehlt');
  hud.dispose();
});

it('keeps production readout player-facing and does not reannounce unchanged frames', () => {
  let text = '', writes = 0;
  const element = { get textContent() { return text; }, set textContent(value: string) { text=value;writes++; },
    setAttribute() {}, remove() {} };
  vi.stubGlobal('document', { createElement: () => element });
  const root = { appendChild() {} } as unknown as HTMLElement;
  const hud = new Hud(root, false);
  const position = {x:12,y:2,z:34};
  hud.update(position,undefined,{x:200,y:300},1595);
  expect(text).toContain('Allein unterwegs');
  expect(text).not.toContain('Quellinventur');
  expect(text).not.toContain('X 12.0');
  const afterFirst=writes;
  hud.update(position,undefined,{x:200,y:300},1595);
  expect(writes).toBe(afterFirst);
  hud.update(position,'Saloon',undefined,1595,'boundary');
  expect(text).toContain('Saloon · F: Interagieren');
  expect(text).toContain('Ortsgrenze erreicht');
  hud.dispose();
});

it('reserves the upper interior view for wall-mounted interaction prompts', () => {
 const attributes:Record<string,string>={};
 const element={textContent:'',setAttribute(key:string,value:string){attributes[key]=value;},remove(){}};
 vi.stubGlobal('document',{createElement:()=>element});
 const hud=new Hud({appendChild(){}} as unknown as HTMLElement,false);
 hud.update({x:0,y:0,z:0},undefined,undefined,0,undefined,'Saloon · Erdgeschoss');
 expect(attributes['data-interior']).toBe('true');
 hud.update({x:0,y:0,z:0});expect(attributes['data-interior']).toBe('false');
});
