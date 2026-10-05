import * as THREE from 'three';
import { WallWithDoorway } from './WallWithDoorway';
import { TrueGableRoof } from './TrueGableRoof';
import { TerrainSystem } from './TerrainSystem';

export class Building {
    public group: THREE.Group;
    public colliders: THREE.Box3[] = [];
    public roofMeshes: THREE.Mesh[] = [];
    private playerInside = false;
    private width: number;
    private depth: number;

    constructor(
        x: number, 
        z: number, 
        width: number, 
        depth: number, 
        height: number, 
        rotationY: number,
        roofType: string,
        wallMat: THREE.Material,
        roofMat: THREE.Material,
        terrain: TerrainSystem,
        hasPorch: boolean = false
    ) {
        this.width = width;
        this.depth = depth;
        this.group = new THREE.Group();
        
        // Find terrain height at center to place building
        const y = terrain.getTerrainHeight(x, z);
        this.group.position.set(x, y, z);
        this.group.rotation.y = rotationY;

        const wallThickness = 0.2;

        // Front wall with door
        const frontWall = new WallWithDoorway(width, height, wallThickness, 1.2, 2.2, 0, wallMat);
        frontWall.group.position.set(0, 0, depth / 2 - wallThickness / 2);
        this.group.add(frontWall.group);
        this.colliders.push(...frontWall.colliders.map(c => c.applyMatrix4(frontWall.group.matrixWorld)));

        // Back wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness), wallMat);
        backWall.position.set(0, height / 2, -depth / 2 + wallThickness / 2);
        backWall.castShadow = true;
        this.group.add(backWall);
        this.colliders.push(new THREE.Box3().setFromObject(backWall));

        // Left wall
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth - wallThickness * 2), wallMat);
        leftWall.position.set(-width / 2 + wallThickness / 2, height / 2, 0);
        leftWall.castShadow = true;
        this.group.add(leftWall);
        this.colliders.push(new THREE.Box3().setFromObject(leftWall));

        // Right wall
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth - wallThickness * 2), wallMat);
        rightWall.position.set(width / 2 - wallThickness / 2, height / 2, 0);
        rightWall.castShadow = true;
        this.group.add(rightWall);
        this.colliders.push(new THREE.Box3().setFromObject(rightWall));

        // 2. Eckpfeiler: Setze an jede der vier Hausecken einen vertikalen Holzbalken [0.25, height, 0.25], der leicht hervorsteht
        const cornerGeo = new THREE.BoxGeometry(0.25, height, 0.25);
        const cornerOffsets = [
            { cx: -width / 2, cz: depth / 2 },
            { cx: width / 2, cz: depth / 2 },
            { cx: -width / 2, cz: -depth / 2 },
            { cx: width / 2, cz: -depth / 2 }
        ];

        cornerOffsets.forEach(({ cx, cz }) => {
            const cornerPost = new THREE.Mesh(cornerGeo, wallMat);
            cornerPost.position.set(cx, height / 2, cz);
            cornerPost.castShadow = true;
            cornerPost.receiveShadow = true;
            this.group.add(cornerPost);
        });

        // Floor
        const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
        const floor = new THREE.Mesh(floorGeo, terrain.getBoardwalkMat());
        floor.position.set(0, 0.05, 0);
        this.group.add(floor);

        // Roof
        // Guard: Dachüberhänge bei Gebäuden maximal 0.5 Einheiten über die Fassade
        const roofOverhang = 0.5;

        if (roofType === 'gable') {
            const roof = new TrueGableRoof(width, depth, roofMat, wallMat, width > depth ? 'x' : 'z', roofOverhang);
            roof.group.position.set(0, height, 0);
            this.group.add(roof.group);
            this.roofMeshes.push(...roof.roofMeshes);
            // Setup materials for transparency fade
            this.roofMeshes.forEach(mesh => {
                const clonedMat = (mesh.material as THREE.Material).clone();
                mesh.material = clonedMat;
            });
        } else if (roofType === 'flat') {
            // Flat roof with eaves cornice and overhang
            const flatRoof = new THREE.Mesh(new THREE.BoxGeometry(width + roofOverhang * 2, 0.2, depth + roofOverhang * 2), roofMat);
            flatRoof.position.set(0, height + 0.1, 0);
            this.group.add(flatRoof);
            this.roofMeshes.push(flatRoof);

            // Parapet / Ridge edge beam
            const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + roofOverhang * 2 + 0.05, 0.15, 0.15), wallMat);
            parapet.position.set(0, height + 0.25, (depth + roofOverhang * 2) / 2 - 0.075);
            this.group.add(parapet);
            this.roofMeshes.push(parapet);

            const clonedMat = (flatRoof.material as THREE.Material).clone();
            flatRoof.material = clonedMat;
            parapet.material = (parapet.material as THREE.Material).clone();
        } else if (roofType === 'barrel') {
            const barrelGeo = new THREE.CylinderGeometry(width / 2 + roofOverhang, width / 2 + roofOverhang, depth + roofOverhang * 2, 16, 1, false, 0, Math.PI);
            const barrelRoof = new THREE.Mesh(barrelGeo, roofMat);
            barrelRoof.rotation.z = Math.PI / 2;
            barrelRoof.rotation.x = Math.PI / 2;
            barrelRoof.position.set(0, height, 0);
            this.group.add(barrelRoof);
            this.roofMeshes.push(barrelRoof);
            const clonedMat = (barrelRoof.material as THREE.Material).clone();
            barrelRoof.material = clonedMat;
        }

        // 3. VERANDEN & DETAILS:
        // - Gebäude mit Vordach (Saloon, Store, Sheriff) erhalten:
        //   * Erhöhte Holz-Plattform als Eingangsstufe.
        //   * Zwei massive Holzpfosten, die das Vordach tragen.
        //   * Einen horizontalen Anbindebalken (Hitching Post) davor.
        if (hasPorch) {
            const porchDepth = 2.2;
            const porchFloorHeight = 0.25;

            // Erhöhte Holz-Plattform
            const porchFloor = new THREE.Mesh(
                new THREE.BoxGeometry(width, porchFloorHeight, porchDepth), 
                terrain.getBoardwalkMat()
            );
            porchFloor.position.set(0, porchFloorHeight / 2, depth / 2 + porchDepth / 2);
            porchFloor.receiveShadow = true;
            this.group.add(porchFloor);

            // Eingangsstufe vor der Plattform (Step down to ground/street)
            const stepGeo = new THREE.BoxGeometry(Math.min(width, 2.8), porchFloorHeight * 0.5, 0.4);
            const entryStep = new THREE.Mesh(stepGeo, terrain.getBoardwalkMat());
            entryStep.position.set(0, porchFloorHeight * 0.25, depth / 2 + porchDepth + 0.2);
            entryStep.receiveShadow = true;
            this.group.add(entryStep);
            
            // Zwei massive Holzpfosten, die das Vordach tragen [0.2, height, 0.2]
            const postGeo = new THREE.BoxGeometry(0.2, height, 0.2);
            const postXOffset = width / 2 - 0.4;
            
            const postLeft = new THREE.Mesh(postGeo, wallMat);
            postLeft.position.set(-postXOffset, height / 2, depth / 2 + porchDepth - 0.15);
            postLeft.castShadow = true;
            this.group.add(postLeft);

            const postRight = new THREE.Mesh(postGeo, wallMat);
            postRight.position.set(postXOffset, height / 2, depth / 2 + porchDepth - 0.15);
            postRight.castShadow = true;
            this.group.add(postRight);

            // Porch roof (Vordach mit gestufter Kante)
            const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.08, porchDepth + 0.2), roofMat);
            porchRoof.position.set(0, height, depth / 2 + porchDepth / 2);
            porchRoof.rotation.x = -0.08;
            porchRoof.castShadow = true;
            this.group.add(porchRoof);
            this.roofMeshes.push(porchRoof);
            const clonedMat = (porchRoof.material as THREE.Material).clone();
            porchRoof.material = clonedMat;

            // Horizontaler Anbindebalken (Hitching Post) vor der Veranda
            const hitchingGroup = new THREE.Group();
            const hitchDist = depth / 2 + porchDepth + 0.8;
            const hitchWidth = Math.min(width * 0.7, 3.2);

            const hPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), wallMat);
            hPost1.position.set(-hitchWidth / 2 + 0.1, 0.5, 0);
            hPost1.castShadow = true;
            hitchingGroup.add(hPost1);

            const hPost2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), wallMat);
            hPost2.position.set(hitchWidth / 2 - 0.1, 0.5, 0);
            hPost2.castShadow = true;
            hitchingGroup.add(hPost2);

            const hitchBar = new THREE.Mesh(new THREE.BoxGeometry(hitchWidth, 0.1, 0.1), wallMat);
            hitchBar.position.set(0, 0.9, 0);
            hitchBar.castShadow = true;
            hitchingGroup.add(hitchBar);

            hitchingGroup.position.set(0, 0, hitchDist);
            this.group.add(hitchingGroup);
        }
    }

    public updateVisibility(playerPos: THREE.Vector3) {
        // Convert player pos to local space to check if inside
        const localPos = this.group.worldToLocal(playerPos.clone());
        const padding = 0.5;
        
        const isInside = Math.abs(localPos.x) < this.width/2 + padding && 
                         Math.abs(localPos.z) < this.depth/2 + padding &&
                         localPos.y > -1 && localPos.y < 5; // Rough height check

        if (isInside !== this.playerInside) {
            this.playerInside = isInside;
            this.roofMeshes.forEach(mesh => {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.transparent = true;
                mat.opacity = isInside ? 0.15 : 1.0;
                mat.depthWrite = !isInside;
            });
        }
    }
}
