import { type WorldManifest, worldManifestSchema } from '@rdo-rpg/world-contracts';

export class ManifestLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestLoadError';
  }
}

export async function loadValentineManifest(url = '/runtime/valentine/rdo_world_manifest.json'): Promise<WorldManifest> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new ManifestLoadError(`World manifest could not be loaded: ${String(error)}`);
  }
  if (!response.ok) throw new ManifestLoadError(`World manifest request failed with ${response.status}.`);

  const payload: unknown = await response.json();
  const parsed = worldManifestSchema.safeParse(payload);
  if (!parsed.success) throw new ManifestLoadError('World manifest is invalid.');
  const identities=new Set<string>();
  for(const placement of parsed.data.placements){
    if(identities.has(placement.id))throw new ManifestLoadError(`World manifest contains duplicate placement identity: ${placement.id}`);
    identities.add(placement.id);
  }
  return parsed.data;
}
