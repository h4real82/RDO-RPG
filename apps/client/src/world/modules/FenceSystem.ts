import * as THREE from 'three';
import { TerrainSystem } from './TerrainSystem';

export class FenceSystem {
    public group: THREE.Group;

    constructor(
        startX: number, 
        startZ: number, 
        endX: number, 
        endZ: number, 
        material: THREE.Material,
        terrain: TerrainSystem
    ) {
        this.group = new THREE.Group();
        
        const dist = Math.hypot(endX - startX, endZ - startZ);
        const segmentLen = 2.0;
        const count = Math.ceil(dist / segmentLen);
        const stepX = (endX - startX) / count;
        const stepZ = (endZ - startZ) / count;

        const postGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
        const railGeo = new THREE.BoxGeometry(segmentLen + 0.1, 0.08, 0.05);

        for (let i = 0; i <= count; i++) {
            const px = startX + i * stepX;
            const pz = startZ + i * stepZ;
            const py = terrain.getTerrainHeight(px, pz);

            // Post
            const post = new THREE.Mesh(postGeo, material);
            post.position.set(px, py + 0.6, pz);
            post.castShadow = true;
            this.group.add(post);

            // Rails
            if (i < count) {
                const nx = startX + (i + 1) * stepX;
                const nz = startZ + (i + 1) * stepZ;
                const ny = terrain.getTerrainHeight(nx, nz);

                const midX = (px + nx) / 2;
                const midZ = (pz + nz) / 2;
                const midY = (py + ny) / 2;

                const angleY = Math.atan2(stepZ, stepX);
                const angleZ = Math.atan2(ny - py, Math.hypot(stepX, stepZ));

                // Top Rail
                const topRail = new THREE.Mesh(railGeo, material);
                topRail.position.set(midX, midY + 1.0, midZ);
                topRail.rotation.order = 'YXZ';
                topRail.rotation.y = -angleY;
                topRail.rotation.z = angleZ;
                topRail.castShadow = true;
                this.group.add(topRail);

                // Bottom Rail
                const bottomRail = new THREE.Mesh(railGeo, material);
                bottomRail.position.set(midX, midY + 0.5, midZ);
                bottomRail.rotation.order = 'YXZ';
                bottomRail.rotation.y = -angleY;
                bottomRail.rotation.z = angleZ;
                bottomRail.castShadow = true;
                this.group.add(bottomRail);
            }
        }
    }
}
