import * as THREE from 'three';

export class WallWithDoorway {
    public group: THREE.Group;
    public colliders: THREE.Box3[] = [];

    constructor(
        width: number, 
        height: number, 
        thickness: number, 
        doorWidth: number, 
        doorHeight: number, 
        doorOffsetX: number, 
        material: THREE.Material
    ) {
        this.group = new THREE.Group();
        
        // Ensure door doesn't exceed wall dimensions
        const dW = Math.min(doorWidth, width - 0.2);
        const dH = Math.min(doorHeight, height - 0.1);
        
        // Left wall segment
        const leftWidth = (width / 2) + doorOffsetX - (dW / 2);
        if (leftWidth > 0) {
            const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(leftWidth, height, thickness), material);
            leftMesh.position.set(-width / 2 + leftWidth / 2, height / 2, 0);
            leftMesh.castShadow = true;
            leftMesh.receiveShadow = true;
            this.group.add(leftMesh);
            this.colliders.push(new THREE.Box3().setFromObject(leftMesh));
        }

        // Right wall segment
        const rightWidth = (width / 2) - doorOffsetX - (dW / 2);
        if (rightWidth > 0) {
            const rightMesh = new THREE.Mesh(new THREE.BoxGeometry(rightWidth, height, thickness), material);
            rightMesh.position.set(width / 2 - rightWidth / 2, height / 2, 0);
            rightMesh.castShadow = true;
            rightMesh.receiveShadow = true;
            this.group.add(rightMesh);
            this.colliders.push(new THREE.Box3().setFromObject(rightMesh));
        }

        // Top wall segment (above door)
        const topHeight = height - dH;
        if (topHeight > 0) {
            const topMesh = new THREE.Mesh(new THREE.BoxGeometry(dW, topHeight, thickness), material);
            topMesh.position.set(doorOffsetX, dH + topHeight / 2, 0);
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            this.group.add(topMesh);
            this.colliders.push(new THREE.Box3().setFromObject(topMesh));
        }
    }
}
