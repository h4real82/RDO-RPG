import { describe, expect, it } from 'vitest';
import { executeAttack, type Fighter } from './BoxingRules';

describe('BoxingRules', () => {
  it('applies guard damage mitigation', () => {
    const attacker: Fighter = { hp: 100, stamina: 100, isGuarding: false, knockdowns: 0 };
    const unguarded: Fighter = { hp: 100, stamina: 100, isGuarding: false, knockdowns: 0 };
    const guarded: Fighter = { hp: 100, stamina: 100, isGuarding: true, knockdowns: 0 };

    const hitUnguarded = executeAttack(attacker, unguarded, 'cross');
    const hitGuarded = executeAttack(attacker, guarded, 'cross');

    expect(hitUnguarded.damage).toBe(18);
    expect(hitGuarded.damage).toBeLessThan(5);
  });
});

