interface Disposable {
  dispose(): void;
}

interface ResourceNode {
  geometry?: Disposable;
  material?: Disposable | Disposable[];
}

interface TraversableResource {
  traverse(visit: (node: ResourceNode) => void): void;
}

export function disposeObjectResources(object: TraversableResource): void {
  const disposed = new Set<Disposable>();
  const dispose = (resource: Disposable | undefined): void => {
    if (!resource || disposed.has(resource)) return;
    disposed.add(resource);
    resource.dispose();
  };

  object.traverse((node) => {
    dispose(node.geometry);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(dispose);
  });
}
