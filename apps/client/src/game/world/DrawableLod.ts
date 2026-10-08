import type { Object3D } from 'three';

const levels = ['hi', 'med', 'low', 'vlow'];

function sourceLevel(node: Object3D): number {
  const match = /(?:^|__)lod_(hi|med|low|vlow)(?:__|$)/.exec(node.name);
  return match ? levels.indexOf(match[1]) : -1;
}

export function selectHighestDrawableLod(root: Object3D): void {
  let best = Infinity;
  root.traverse((node) => {
    const level = sourceLevel(node);
    if (level >= 0) best = Math.min(best, level);
  });
  root.traverse((node) => {
    const level = sourceLevel(node);
    if (level >= 0 && level !== best) node.visible = false;
  });
}
