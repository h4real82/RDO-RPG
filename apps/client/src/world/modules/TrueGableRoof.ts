import * as THREE from 'three';

export class TrueGableRoof {
    public group: THREE.Group;
    public roofMeshes: THREE.Mesh[] = [];

    constructor(
        width: number, 
        depth: number, 
        material: THREE.Material, 
        wallMaterial: THREE.Material,
        axis: 'x' | 'z' = 'x',
        overhangParam: number = 0.5 // Default 0.5 (max 0.5 units guard)
    ) {
        this.group = new THREE.Group();
        
        const roofThickness = 0.08;
        const pitchHeight = 1.0; // Ridge height
        // ThreeJS Guard: Dachüberhänge bei Gebäuden dürfen maximal 0.5 Einheiten über die Fassade ragen
        const overhang = Math.min(Math.max(overhangParam, 0.5), 0.5);
        
        const wSpan = axis === 'x' ? width : depth;
        const lSpan = axis === 'x' ? depth : width;
        
        const halfSpan = wSpan / 2;
        const roofLen = lSpan + overhang * 2;
        const slopeLen = Math.hypot(halfSpan + overhang, pitchHeight);
        const angle = Math.atan2(pitchHeight, halfSpan + overhang);

        // 1. Gestufte Dachkanten / Schindelebenen (Stepped edge roof planes)
        // Main roof plane
        const planeGeo = new THREE.BoxGeometry(slopeLen, roofThickness, roofLen);
        // Eaves trim plane (gestufte Traufkante)
        const trimEdgeGeo = new THREE.BoxGeometry(slopeLen * 0.98, roofThickness * 0.7, roofLen + 0.04);
        
        // Left pitch
        const leftPitch = new THREE.Mesh(planeGeo, material);
        leftPitch.position.set(-halfSpan / 2 - overhang / 2, pitchHeight / 2, 0);
        leftPitch.rotation.z = angle;
        leftPitch.castShadow = true;
        this.group.add(leftPitch);
        this.roofMeshes.push(leftPitch);

        const leftTrim = new THREE.Mesh(trimEdgeGeo, material);
        leftTrim.position.set(-halfSpan / 2 - overhang / 2, pitchHeight / 2 + roofThickness * 0.35, 0);
        leftTrim.rotation.z = angle;
        leftTrim.castShadow = true;
        this.group.add(leftTrim);
        this.roofMeshes.push(leftTrim);

        // Right pitch
        const rightPitch = new THREE.Mesh(planeGeo, material);
        rightPitch.position.set(halfSpan / 2 + overhang / 2, pitchHeight / 2, 0);
        rightPitch.rotation.z = -angle;
        rightPitch.castShadow = true;
        this.group.add(rightPitch);
        this.roofMeshes.push(rightPitch);

        const rightTrim = new THREE.Mesh(trimEdgeGeo, material);
        rightTrim.position.set(halfSpan / 2 + overhang / 2, pitchHeight / 2 + roofThickness * 0.35, 0);
        rightTrim.rotation.z = -angle;
        rightTrim.castShadow = true;
        this.group.add(rightTrim);
        this.roofMeshes.push(rightTrim);

        // 2. Sichtbarer Firstbalken (Ridge Beam)
        const ridgeBeamGeo = new THREE.BoxGeometry(0.18, 0.18, roofLen + 0.1);
        const ridgeBeam = new THREE.Mesh(ridgeBeamGeo, wallMaterial);
        ridgeBeam.position.set(0, pitchHeight + 0.05, 0);
        ridgeBeam.castShadow = true;
        this.group.add(ridgeBeam);
        this.roofMeshes.push(ridgeBeam);

        if (axis === 'z') {
            leftPitch.rotation.set(angle, 0, 0);
            leftPitch.position.set(0, pitchHeight / 2, -halfSpan / 2 - overhang / 2);

            leftTrim.rotation.set(angle, 0, 0);
            leftTrim.position.set(0, pitchHeight / 2 + roofThickness * 0.35, -halfSpan / 2 - overhang / 2);
            
            rightPitch.rotation.set(-angle, 0, 0);
            rightPitch.position.set(0, pitchHeight / 2, halfSpan / 2 + overhang / 2);

            rightTrim.rotation.set(-angle, 0, 0);
            rightTrim.position.set(0, pitchHeight / 2 + roofThickness * 0.35, halfSpan / 2 + overhang / 2);
            
            // Adjust geometry for Z axis mapping
            const zPlaneGeo = new THREE.BoxGeometry(roofLen, roofThickness, slopeLen);
            const zTrimGeo = new THREE.BoxGeometry(roofLen + 0.04, roofThickness * 0.7, slopeLen * 0.98);
            leftPitch.geometry = zPlaneGeo;
            leftTrim.geometry = zTrimGeo;
            rightPitch.geometry = zPlaneGeo;
            rightTrim.geometry = zTrimGeo;

            ridgeBeam.geometry = new THREE.BoxGeometry(roofLen + 0.1, 0.18, 0.18);
            ridgeBeam.position.set(0, pitchHeight + 0.05, 0);
        }

        // Pediments (Gable walls closing the ends flush)
        const pedimentShape = new THREE.Shape();
        pedimentShape.moveTo(-halfSpan, 0);
        pedimentShape.lineTo(0, pitchHeight);
        pedimentShape.lineTo(halfSpan, 0);
        pedimentShape.lineTo(-halfSpan, 0);

        const extrudeSettings = { depth: 0.12, bevelEnabled: false };
        const pedGeo = new THREE.ExtrudeGeometry(pedimentShape, extrudeSettings);
        
        const frontPed = new THREE.Mesh(pedGeo, wallMaterial);
        frontPed.position.set(0, 0, axis === 'x' ? lSpan / 2 - 0.06 : wSpan / 2 - 0.06);
        if (axis === 'z') frontPed.rotation.y = Math.PI / 2;
        this.group.add(frontPed);

        const backPed = new THREE.Mesh(pedGeo, wallMaterial);
        backPed.position.set(0, 0, axis === 'x' ? -lSpan / 2 - 0.06 : -wSpan / 2 - 0.06);
        if (axis === 'z') backPed.rotation.y = Math.PI / 2;
        this.group.add(backPed);
    }
}
