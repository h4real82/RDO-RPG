import { describe, expect, it } from 'vitest';
import { calculateArrowFlight, evaluateTargetScore } from './ArcheryRules';

describe('ArcheryRules', () => {
  it('applies muscle jitter when bow is held too long', () => {
    const fresh = calculateArrowFlight(1.0, 0, 0, 30);
    const fatigued = calculateArrowFlight(2.5, 0, 0, 30);
    expect(fresh.fatigueJitter).toBe(0);
    expect(fatigued.fatigueJitter).toBeGreaterThan(0);
  });

  it('awards 10 points for bullseye and 0 for distant miss', () => {
    expect(evaluateTargetScore(0.02, 0.01).points).toBe(10);
    expect(evaluateTargetScore(2.5, 1.0).points).toBe(0);
  });
});

