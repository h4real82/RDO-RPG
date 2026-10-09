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
