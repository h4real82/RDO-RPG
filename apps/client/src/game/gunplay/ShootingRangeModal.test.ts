// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { ShootingRangeModal } from './ShootingRangeModal';
import { LocalAccountStore, createDefaultGuestProfile } from '../economy/LocalAccountStore';
import { WalletService } from '../economy/WalletService';

describe('ShootingRangeModal', () => {
  let parent: HTMLElement;
  let range: ShootingRangeModal;
  let changedCount: number;

  beforeEach(() => {
    const profile = createDefaultGuestProfile();
    profile.coins = '0';
    LocalAccountStore.saveProfile(profile);
    WalletService.setActiveProfile(null, false);

    parent = document.createElement('div');
    document.body.appendChild(parent);
    changedCount = 0;
    range = new ShootingRangeModal(parent, () => { changedCount++; });
  });

  it('initializes with 6 rounds of ammunition and targets', () => {
    const dialog = range.open();
    expect(range.isOpen).toBe(true);
    expect(dialog.panel.dataset.venue).toBe('shooting_range');
    expect(dialog.content.textContent).toContain('(6/6)');

    range.close();
    expect(range.isOpen).toBe(false);
  });

  it('allows shooting targets and reloading cylinder', () => {
    const dialog = range.open();
    expect(dialog.content.textContent).toContain('(6/6)');

    // Click first bottle target
    const targetBtns = Array.from(dialog.content.querySelectorAll('button')).filter(b => b.textContent?.includes('Pkt'));
    expect(targetBtns.length).toBeGreaterThanOrEqual(3);
    targetBtns[0]?.click();

    expect(dialog.content.textContent).toContain('(5/6)');
    expect(dialog.content.textContent).toContain('10 Pkt');

    // Reload cylinder
    const reloadBtn = Array.from(dialog.content.querySelectorAll('button')).find(b => b.textContent?.includes('nachladen'));
    expect(reloadBtn).toBeDefined();
    reloadBtn?.click();

    expect(dialog.content.textContent).toContain('(6/6)');

    range.close();
    expect(range.isOpen).toBe(false);
  });
});
