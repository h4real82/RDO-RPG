import { describe, expect, it } from 'vitest';
import { Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { prepareDrawableMaterialPreview } from './DrawableMaterialPreview';

describe('prepareDrawableMaterialPreview', () => {
  it('brightens dark porch wood and roof shingle materials to authentic warm western tones', () => {
    const group = new Group();
    const porchTex = new Texture();
    porchTex.name = 'val_cs_woodporch_1_ab';
    const porchMat = new MeshStandardMaterial({ map: porchTex, color: 0xffffff });
    const porchMesh = new Mesh(undefined, porchMat);

    const roofTex = new Texture();
    roofTex.name = 'nbx_roofs_shingle11_ab';
    const roofMat = new MeshStandardMaterial({ map: roofTex, color: 0xffffff });
    const roofMesh = new Mesh(undefined, roofMat);

    group.add(porchMesh, roofMesh);
    prepareDrawableMaterialPreview(group);

    expect(porchMat.userData.rdo_charred_wood_repaired).toBe(true);
    expect(porchMat.color.r).toBeGreaterThan(2.0);
    expect(porchMat.color.g).toBeGreaterThan(1.8);

    expect(roofMat.userData.rdo_charred_wood_repaired).toBe(true);
    expect(roofMat.color.r).toBeGreaterThan(1.5);
  });
});
