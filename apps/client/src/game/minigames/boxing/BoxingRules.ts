export type AttackType = 'jab' | 'cross' | 'hook';

export interface Fighter {
  hp: number; // 0 - 100
  stamina: number; // 0 - 100
  isGuarding: boolean;
  knockdowns: number;
}

export function executeAttack(
  attacker: Fighter,
  defender: Fighter,
  attack: AttackType
): { attacker: Fighter; defender: Fighter; damage: number; hit: boolean } {
  const baseDamage = attack === 'jab' ? 8 : attack === 'cross' ? 18 : 28;
  const staminaCost = attack === 'jab' ? 5 : attack === 'cross' ? 15 : 25;

  const newAttackerStamina = Math.max(0, attacker.stamina - staminaCost);
  let damage = baseDamage;

  if (defender.isGuarding) {
    damage = Math.floor(baseDamage * 0.2); // 80% absorbed
  }

  const newDefenderHp = Math.max(0, defender.hp - damage);
  const isKnockedDown = newDefenderHp <= 0;

  return {
    attacker: { ...attacker, stamina: newAttackerStamina },
    defender: {
      ...defender,
      hp: isKnockedDown ? 0 : newDefenderHp,
      knockdowns: isKnockedDown ? defender.knockdowns + 1 : defender.knockdowns,
    },
    damage,
    hit: true,
  };
}

