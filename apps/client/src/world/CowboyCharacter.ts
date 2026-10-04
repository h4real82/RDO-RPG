import * as THREE from 'three';
import { GaitMode } from '@rdo-rpg/shared';

export class CowboyCharacter {
  public root: THREE.Group;
  private torsoGroup: THREE.Group;
  private headGroup: THREE.Group;
  private hatMesh: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private coatTailL: THREE.Mesh;
  private coatTailR: THREE.Mesh;

  private nameSprite: THREE.Sprite | null = null;
  private animTimer: number = 0;
  private currentHeading: number = 0;
  private isLocal: boolean;

  constructor(username: string = 'Outlaw', isLocal: boolean = true) {
    this.isLocal = isLocal;
    this.root = new THREE.Group();
    this.torsoGroup = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();

    // Initialize materials
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0x4a3222, // Rich dark brown leather duster
      roughness: 0.65,
      metalness: 0.05
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x221812, // Dark vest
      roughness: 0.8
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x8a9ba8, // Blue-grey chambray work shirt
      roughness: 0.75
    });

    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x2c221b, // Weathered slouch hat
      roughness: 0.6
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x242830, // Denim work trousers
      roughness: 0.85
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x18120e, // Blackened riding boots
      roughness: 0.5,
      metalness: 0.1
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd9a584, // Sunburned skin tone
      roughness: 0.6
    });

    const bandanaMat = new THREE.MeshStandardMaterial({
      color: 0x8b2522, // Crimson red wild rag / bandana
      roughness: 0.7
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc89d38, // Brass buckle / spurs
      metalness: 0.85,
      roughness: 0.3
    });

    // 1. Torso & Upper Body
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.68, 0.32);
    const torsoMesh = new THREE.Mesh(torsoGeo, vestMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torsoGroup.add(torsoMesh);

    // Shirt collar & chest
    const shirtMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.33), shirtMat);
    shirtMesh.position.set(0, 0.1, 0.01);
    this.torsoGroup.add(shirtMesh);

    // Gun belt & Holster
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.36), bootMat);
    belt.position.set(0, -0.3, 0);
    belt.castShadow = true;
    this.torsoGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), brassMat);
    buckle.position.set(0, -0.3, 0.19);
    this.torsoGroup.add(buckle);

    // Right hip holster
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.14), bootMat);
    holster.position.set(0.3, -0.4, 0.02);
    holster.rotation.z = -0.15;
    holster.castShadow = true;
    this.torsoGroup.add(holster);

    // Duster Coat Split Tails (Hanging behind and around hips)
    const tailGeo = new THREE.BoxGeometry(0.24, 0.65, 0.06);
    this.coatTailL = new THREE.Mesh(tailGeo, coatMat);
    this.coatTailL.position.set(-0.14, -0.58, -0.14);
    this.coatTailL.castShadow = true;
    this.torsoGroup.add(this.coatTailL);

    this.coatTailR = new THREE.Mesh(tailGeo, coatMat);
    this.coatTailR.position.set(0.14, -0.58, -0.14);
    this.coatTailR.castShadow = true;
    this.torsoGroup.add(this.coatTailR);

    // 2. Head & Slouch Cowboy Hat
    const headGeo = new THREE.BoxGeometry(0.3, 0.32, 0.3);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Red neckerchief bandana
    const bandana = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.25, 4), bandanaMat);
    bandana.rotation.x = Math.PI;
    bandana.position.set(0, -0.16, 0.1);
    this.headGroup.add(bandana);

    // Cowboy Hat Crown
    const crownGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.26, 12);
    this.hatMesh = new THREE.Mesh(crownGeo, hatMat);
    this.hatMesh.position.set(0, 0.26, -0.02);
    this.hatMesh.castShadow = true;

    // Curved Hat Brim
    const brimGeo = new THREE.CylinderGeometry(0.52, 0.54, 0.04, 16);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, -0.11, 0);
    brim.scale.set(1.15, 1, 1.35); // oval cowboy shape
    brim.castShadow = true;
    this.hatMesh.add(brim);

    // Hatband
    const hatband = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 12), brassMat);
    hatband.position.set(0, -0.07, 0);
    this.hatMesh.add(hatband);

    this.headGroup.add(this.hatMesh);
    this.headGroup.position.set(0, 0.52, 0);
    this.torsoGroup.add(this.headGroup);

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);

    const leftArmMesh = new THREE.Mesh(armGeo, coatMat);
    leftArmMesh.position.set(0, -0.28, 0);
    leftArmMesh.castShadow = true;
    this.leftArm.position.set(-0.35, 0.28, 0);
    this.leftArm.add(leftArmMesh);
    this.torsoGroup.add(this.leftArm);

    const rightArmMesh = new THREE.Mesh(armGeo, coatMat);
    rightArmMesh.position.set(0, -0.28, 0);
    rightArmMesh.castShadow = true;
    this.rightArm.position.set(0.35, 0.28, 0);
    this.rightArm.add(rightArmMesh);
    this.torsoGroup.add(this.rightArm);

    // 4. Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
    const bootGeo = new THREE.BoxGeometry(0.2, 0.35, 0.26);

    // Left Leg
    const leftThigh = new THREE.Mesh(legGeo, pantsMat);
    leftThigh.position.set(0, -0.25, 0);
    leftThigh.castShadow = true;
    this.leftLeg.add(leftThigh);

    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.58, 0.03);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);

    this.leftLeg.position.set(-0.16, 0.75, 0);
    this.root.add(this.leftLeg);

    // Right Leg
    const rightThigh = new THREE.Mesh(legGeo, pantsMat);
    rightThigh.position.set(0, -0.25, 0);
    rightThigh.castShadow = true;
    this.rightLeg.add(rightThigh);

    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.58, 0.03);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);

    this.rightLeg.position.set(0.16, 0.75, 0);
    this.root.add(this.rightLeg);

    // Assemble torso onto root
    this.torsoGroup.position.set(0, 1.05, 0);
    this.root.add(this.torsoGroup);

    // Add Name Tag Sprite for other players
    if (!isLocal || username) {
      this.createNameBadge(username);
    }
  }

  private createNameBadge(name: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(12, 9, 7, 0.8)';
    ctx.roundRect(8, 8, 240, 48, 6);
    ctx.fill();
    ctx.strokeStyle = this.isLocal ? '#22c55e' : '#d4af37';
    ctx.lineWidth = 2;
    ctx.roundRect(8, 8, 240, 48, 6);
    ctx.stroke();

    ctx.font = 'bold 22px "Cinzel", serif';
    ctx.fillStyle = '#f1ede4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.position.set(0, 2.2, 0);
    this.nameSprite.scale.set(2.2, 0.55, 1);
    this.root.add(this.nameSprite);
  }

  public update(delta: number, isMoving: boolean, gait: GaitMode = GaitMode.JOG, speedRatio: number = 1.0) {
    if (isMoving) {
      // Step frequency according to gait
      let freq = 10.0;
      let legSwing = 0.55;
      let armSwing = 0.65;
      let coatSway = 0.35;

      if (gait === GaitMode.WALK) {
        freq = 7.0;
        legSwing = 0.38;
        armSwing = 0.40;
        coatSway = 0.20;
      } else if (gait === GaitMode.SPRINT) {
        freq = 15.0;
        legSwing = 0.85;
        armSwing = 0.95;
        coatSway = 0.65;
      }

      this.animTimer += delta * freq * Math.max(0.5, speedRatio);

      // Leg swing (alternating)
      const legAngle = Math.sin(this.animTimer) * legSwing;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;

      // Arm swing (counter-balancing)
      const armAngle = Math.cos(this.animTimer) * armSwing;
      this.leftArm.rotation.x = -armAngle;
      this.rightArm.rotation.x = armAngle;

      // Hip & Torso vertical bounce
      const bounce = Math.abs(Math.sin(this.animTimer)) * 0.06;
      this.torsoGroup.position.y = 1.05 + bounce;

      // Coat tails dynamic trailing
      const tailFlutter = -0.15 - Math.sin(this.animTimer) * 0.12 - (gait === GaitMode.SPRINT ? 0.3 : 0.08);
      this.coatTailL.rotation.x = tailFlutter;
      this.coatTailR.rotation.x = tailFlutter;

      // Slight forward lean when running
      this.torsoGroup.rotation.x = gait === GaitMode.SPRINT ? 0.22 : 0.08;
    } else {
      // Idle breathing swagger
      this.animTimer += delta * 2.0;
      const breath = Math.sin(this.animTimer) * 0.015;

      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 10 * delta);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 10 * delta);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 10 * delta);
      this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 10 * delta);

      this.torsoGroup.position.y = 1.05 + breath;
      this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, 0, 10 * delta);
      this.coatTailL.rotation.x = THREE.MathUtils.lerp(this.coatTailL.rotation.x, 0, 8 * delta);
      this.coatTailR.rotation.x = THREE.MathUtils.lerp(this.coatTailR.rotation.x, 0, 8 * delta);
    }
  }

  public setHeading(headingRad: number, delta: number = 0.016) {
    // Three.js Y rotation: 0 = facing +Z (South), Math.PI/2 = facing +X (East), etc.
    let diff = headingRad - this.currentHeading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    this.currentHeading += diff * Math.min(1.0, 16.0 * delta);
    this.root.rotation.y = this.currentHeading;
  }

  public setPosition(x: number, y: number, z: number) {
    this.root.position.set(x, y, z);
  }
}
