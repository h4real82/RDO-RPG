import { describe, expect, it } from 'vitest';
import { Group } from 'three';
import { InteriorActors } from './InteriorActors';

describe('InteriorActors', () => {
  it('registers and updates seated actor breathing and proximity turn', () => {
    const actors = new InteriorActors();
    const interior = new Group();
    interior.visible = true;

    const wrapper = new Group();
    wrapper.name = 'original-lobby-armchair';
    wrapper.userData.sourceAsset = 'interiors/hotel/hotel-lobby-woman.glb';
    wrapper.position.set(-327.4, 117.1, -764.5);
    wrapper.rotation.y = 0.35;

    const inner = new Group();
    inner.position.set(0, 0, 0);
    wrapper.add(inner);
    interior.add(wrapper);

    // Initial update far away (distance ~ 20m)
    actors.update(interior, { x: -300, y: 117.1, z: -764.5 }, 0.016, 1000);

    expect(actors.getActorState(wrapper)).toBe('seated');
    expect(inner.position.y).not.toBe(0); // breathing applied

    // Player approaches within interaction distance (2m)
    actors.update(interior, { x: -326.0, y: 117.1, z: -764.5 }, 0.5, 2000);
    expect(actors.getActorState(wrapper)).toBe('idle_greeting');
    expect(inner.rotation.y).not.toBe(0); // turned toward player

    // Player walks away (> 4m)
    actors.update(interior, { x: -340.0, y: 117.1, z: -764.5 }, 1.0, 3000);
    expect(actors.getActorState(wrapper)).toBe('seated');

    actors.dispose();
  });

  it('handles empty or hidden interior defensively', () => {
    const actors = new InteriorActors();
    const interior = new Group();
    interior.visible = false;

    expect(() => {
      actors.update(interior, { x: 0, y: 0, z: 0 }, 0.016, 1000);
    }).not.toThrow();

    expect(() => {
      // @ts-expect-error test null defense
      actors.update(null, null, 0.016, 1000);
    }).not.toThrow();
  });
});
