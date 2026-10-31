import { describe, it, expect } from 'vitest';
import mapCompletion from '../../../../../data/reference/valentine/map-completion.json';

describe('Authored Decorative Large Objects & Animals (H4R-127)', () => {
  it('defines steam train on Valentine station rail track with valid yaw and coordinates', () => {
    const train = mapCompletion.decorativeWorldObjects?.steamTrain;
    expect(train).toBeDefined();
    expect(train.id).toBe('val-station-steam-train');
    // Station coordinates range around x: -171, z: -618
    expect(train.position.x).toBeCloseTo(-171.0, 1);
    expect(train.position.z).toBeCloseTo(-618.0, 1);
    expect(train.yaw).toBeCloseTo(-0.635, 2);
  });

  it('defines stagecoaches and freight wagons along key roads and yards', () => {
    const carriages = mapCompletion.decorativeWorldObjects?.carriages;
    expect(carriages).toBeDefined();
    expect(carriages.length).toBe(5);

    const stagecoaches = carriages.filter((c: any) => c.kind === 'stagecoach');
    expect(stagecoaches.length).toBe(2);

    const freightWagons = carriages.filter((c: any) => c.kind === 'freight-wagon');
    expect(freightWagons.length).toBe(3);
    expect(freightWagons.some((w: any) => w.covered === true)).toBe(true);
  });

  it('defines hitched horses, town dogs and farm chickens with required biological postures', () => {
    const animals = mapCompletion.decorativeWorldObjects?.animals;
    expect(animals).toBeDefined();

    // Hitched horses
    expect(animals.hitchedHorses?.length).toBe(5);
    const coats = new Set(animals.hitchedHorses.map((h: any) => h.coat));
    expect(coats.has('chestnut')).toBe(true);
    expect(coats.has('bay')).toBe(true);
    expect(coats.has('black')).toBe(true);
    expect(coats.has('palomino')).toBe(true);

    // Town dogs
    expect(animals.streetDogs?.length).toBe(3);
    expect(animals.streetDogs.some((d: any) => d.pose === 'sleeping')).toBe(true);
    expect(animals.streetDogs.some((d: any) => d.pose === 'sitting')).toBe(true);

    // Chickens
    expect(animals.chickens?.length).toBe(6);
    expect(animals.chickens.some((c: any) => typeof c.perchedY === 'number')).toBe(true);
  });
});
