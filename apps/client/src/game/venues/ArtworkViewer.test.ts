// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { ArtworkViewer, DEFAULT_SALOON_ARTWORK } from './ArtworkViewer';

describe('ArtworkViewer', () => {
  it('opens dialog with artwork metadata and frame', () => {
    const parent = document.createElement('div');
    document.body.append(parent);

    const viewer = new ArtworkViewer();
    expect(viewer.isOpen).toBe(false);

    const dialog = viewer.open(parent, DEFAULT_SALOON_ARTWORK);
    expect(viewer.isOpen).toBe(true);

    const img = dialog.panel.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.src).toContain(DEFAULT_SALOON_ARTWORK.defaultUrl);

    const title = dialog.panel.querySelector('h3');
    expect(title?.textContent).toBe(DEFAULT_SALOON_ARTWORK.title);

    viewer.close();
    expect(viewer.isOpen).toBe(false);
    parent.remove();
  });

  it('provides a custom artwork upload button for user images', () => {
    const parent = document.createElement('div');
    document.body.append(parent);

    const onUpdate = vi.fn();
    const viewer = new ArtworkViewer(onUpdate);
    const dialog = viewer.open(parent);

    const input = dialog.panel.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.accept).toContain('image/png');

    const uploadBtn = Array.from(dialog.panel.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Eigenes Bild')
    );
    expect(uploadBtn).toBeDefined();

    viewer.close();
    parent.remove();
  });
});
