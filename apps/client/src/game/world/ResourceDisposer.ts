interface Disposable {
  dispose(): void;
}

interface ResourceNode {
  geometry?: Disposable;
  material?: MaterialResource | MaterialResource[];
}

interface MaterialResource extends Disposable { [key: string]: unknown; }

interface TraversableResource {
  traverse(visit: (node: any) => void): void;
}

export function disposeObjectResources(object: TraversableResource): void {
  const disposed = new Set<Disposable>();
  const dispose = (resource: Disposable | undefined): void => {
    if (!resource || disposed.has(resource)) return;
    disposed.add(resource);
    resource.dispose();
  };

  object.traverse((node: ResourceNode) => {
    dispose(node.geometry);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && 'dispose' in value && typeof (value as Disposable).dispose === 'function') dispose(value as Disposable);
      }
      dispose(material);
    }
  });
}
