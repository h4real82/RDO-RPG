const fs = require('fs');
const file = 'apps/client/src/world/ValentineBuilder.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add buildHollowBuilding helper
if (!code.includes('buildHollowBuilding')) {
  code = code.replace(
    '  private buildTerrain() {',
    `  private buildHollowBuilding(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material) {
    const t = 0.15;
    const group = new THREE.Group();
    group.position.set(x, y, z);
    
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
    front.position.set(0, 0, d/2 - t/2);
    front.castShadow = true; front.receiveShadow = true;
    this.registerOccluder(front);
    group.add(front);

    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), mat);
    back.position.set(0, 0, -d/2 + t/2);
    back.castShadow = true; back.receiveShadow = true;
    this.registerOccluder(back);
    group.add(back);

    const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t*2), mat);
    left.position.set(-w/2 + t/2, 0, 0);
    left.castShadow = true; left.receiveShadow = true;
    this.registerOccluder(left);
    group.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t*2), mat);
    right.position.set(w/2 - t/2, 0, 0);
    right.castShadow = true; right.receiveShadow = true;
    this.registerOccluder(right);
    group.add(right);

    this.scene.add(group);
  }

  private buildTerrain() {`
  );
}

// 2. Replace solid boxes with buildHollowBuilding
code = code.replace(
  /const gfGeo = new THREE\.BoxGeometry\(w, h1, d\);\s*const gf = new THREE\.Mesh\(gfGeo, this\.woodDarkMat\);\s*gf\.position\.set\(x, h1 \/ 2, z\);\s*gf\.castShadow = true;\s*gf\.receiveShadow = true;\s*this\.scene\.add\(gf\);/g,
  'this.buildHollowBuilding(x, h1 / 2, z, w, h1, d, this.woodDarkMat);'
);
code = code.replace(
  /const ffGeo = new THREE\.BoxGeometry\(w, h2, d\);\s*const ff = new THREE\.Mesh\(ffGeo, this\.woodDarkMat\);\s*ff\.position\.set\(x, h1 \+ h2 \/ 2, z\);\s*ff\.castShadow = true;\s*ff\.receiveShadow = true;\s*this\.registerOccluder\(ff\);\s*this\.scene\.add\(ff\);/g,
  'this.buildHollowBuilding(x, h1 + h2 / 2, z, w, h2, d, this.woodDarkMat);'
);
code = code.replace(
  /const bodyGeo = new THREE\.BoxGeometry\(w, wallH, d\);\s*const body = new THREE\.Mesh\(bodyGeo, this\.([a-zA-Z0-9_]+)\);\s*body\.position\.set\(x, wallH \/ 2, z\);\s*body\.castShadow = true;\s*body\.receiveShadow = true;\s*this\.scene\.add\(body\);/g,
  'this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.$1);'
);
code = code.replace(
  /const body = new THREE\.Mesh\(new THREE\.BoxGeometry\(w, wallH, d\), this\.([a-zA-Z0-9_]+)\);\s*body\.position\.set\(x, wallH \/ 2, z\);\s*body\.castShadow = true;\s*body\.receiveShadow = true;\s*this\.scene\.add\(body\);/g,
  'this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.$1);'
);
code = code.replace(
  /const b1 = new THREE\.Mesh\(new THREE\.BoxGeometry\(w1, h1, d1\), this\.([a-zA-Z0-9_]+)\);\s*b1\.position\.set\(x1, h1 \/ 2, z1\);\s*b1\.castShadow = true;\s*b1\.receiveShadow = true;\s*this\.scene\.add\(b1\);/g,
  'this.buildHollowBuilding(x1, h1 / 2, z1, w1, h1, d1, this.$1);'
);
code = code.replace(
  /const b2 = new THREE\.Mesh\(new THREE\.BoxGeometry\(w2, h2, d2\), this\.([a-zA-Z0-9_]+)\);\s*b2\.position\.set\(x2, h2 \/ 2, z2\);\s*b2\.castShadow = true;\s*b2\.receiveShadow = true;\s*this\.scene\.add\(b2\);/g,
  'this.buildHollowBuilding(x2, h2 / 2, z2, w2, h2, d2, this.$1);'
);
code = code.replace(
  /const barnGeo = new THREE\.BoxGeometry\(w, wallH, d\);\s*const barn = new THREE\.Mesh\(barnGeo, this\.([a-zA-Z0-9_]+)\);\s*barn\.position\.set\(x, wallH \/ 2, z\);\s*barn\.castShadow = true;\s*barn\.receiveShadow = true;\s*this\.scene\.add\(barn\);/g,
  'this.buildHollowBuilding(x, wallH / 2, z, w, wallH, d, this.$1);'
);
code = code.replace(
  /const frontBody = new THREE\.Mesh\(new THREE\.BoxGeometry\(fW, fH, fD\), this\.([a-zA-Z0-9_]+)\);\s*frontBody\.position\.set\(x - 2\.0, fH \/ 2, z \+ 2\.2\);\s*frontBody\.castShadow = true;\s*frontBody\.receiveShadow = true;\s*this\.scene\.add\(frontBody\);/g,
  'this.buildHollowBuilding(x - 2.0, fH / 2, z + 2.2, fW, fH, fD, this.$1);'
);
code = code.replace(
  /const jailBody = new THREE\.Mesh\(new THREE\.BoxGeometry\(jW, jH, jD\), this\.([a-zA-Z0-9_]+)\);\s*jailBody\.position\.set\(x \+ 4\.2, jH \/ 2, z - 1\.8\);\s*jailBody\.castShadow = true;\s*jailBody\.receiveShadow = true;\s*this\.scene\.add\(jailBody\);/g,
  'this.buildHollowBuilding(x + 4.2, jH / 2, z - 1.8, jW, jH, jD, this.$1);'
);
code = code.replace(
  /const house = new THREE\.Mesh\(new THREE\.BoxGeometry\(sW, sH, sD\), this\.([a-zA-Z0-9_]+)\);\s*house\.position\.set\(x, sH \/ 2, z\);\s*house\.castShadow = true;\s*house\.receiveShadow = true;\s*this\.scene\.add\(house\);/g,
  'this.buildHollowBuilding(x, sH / 2, z, sW, sH, sD, this.$1);'
);

// Church modifications
code = code.replace(
  /const naveGeo = new THREE\.BoxGeometry\(8\.0, 6\.0, 14\.0\);\s*const naveMesh = new THREE\.Mesh\(naveGeo, this\.churchClapboardMat\);\s*naveMesh\.position\.set\(churchX, hillY \+ 3\.0, churchZ\);\s*naveMesh\.castShadow = true;\s*naveMesh\.receiveShadow = true;\s*this\.scene\.add\(naveMesh\);/g,
  'this.buildHollowBuilding(churchX, hillY + 3.0, churchZ, 8.0, 6.0, 14.0, this.churchClapboardMat);'
);

code = code.replace(
  /const transeptGeo = new THREE\.BoxGeometry\(15\.0, 6\.0, 6\.0\);\s*const transeptMesh = new THREE\.Mesh\(transeptGeo, this\.churchClapboardMat\);\s*transeptMesh\.position\.set\(churchX, hillY \+ 3\.0, churchZ - 1\.0\);\s*transeptMesh\.castShadow = true;\s*transeptMesh\.receiveShadow = true;\s*this\.scene\.add\(transeptMesh\);/g,
  'this.buildHollowBuilding(churchX, hillY + 3.0, churchZ - 1.0, 15.0, 6.0, 6.0, this.churchClapboardMat);'
);

code = code.replace(
  /const towerBaseGeo = new THREE\.BoxGeometry\(4\.5, 10\.0, 4\.5\);\s*const towerBase = new THREE\.Mesh\(towerBaseGeo, this\.churchClapboardMat\);\s*towerBase\.position\.set\(towerX, hillY \+ 5\.0, towerZ\);\s*towerBase\.castShadow = true;\s*towerBase\.receiveShadow = true;\s*this\.scene\.add\(towerBase\);/g,
  'this.buildHollowBuilding(towerX, hillY + 5.0, towerZ, 4.5, 10.0, 4.5, this.churchClapboardMat);'
);

// 3. Fix False Fronts to be 0.15 thickness
code = code.replace(
  /const ffGeo = new THREE\.BoxGeometry\(w \+ 0\.4, falseFrontH - wallH \+ 1\.2, 0\.35\);/g,
  'const ffGeo = new THREE.BoxGeometry(w + 0.4, falseFrontH - wallH + 1.2, 0.15);'
);
code = code.replace(
  /const ffGeo = new THREE\.BoxGeometry\(w \+ 0\.4, falseFrontH - wallH \+ 1\.4, 0\.35\);/g,
  'const ffGeo = new THREE.BoxGeometry(w + 0.4, falseFrontH - wallH + 1.4, 0.15);'
);
code = code.replace(
  /const ff = new THREE\.Mesh\(new THREE\.BoxGeometry\(w \+ 0\.4, ffH - wallH \+ 1\.2, 0\.35\), this\.stoneMat\);/g,
  'const ff = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, ffH - wallH + 1.2, 0.15), this.stoneMat);'
);
code = code.replace(
  /const peakGeo = new THREE\.BoxGeometry\(6\.0, 0\.8, 0\.36\);/g,
  'const peakGeo = new THREE.BoxGeometry(6.0, 0.8, 0.15);'
);

// 4. Roofs and Awnings
code = code.replace(/const porchD = 1\.2;/g, 'const porchD = 1.0;');
code = code.replace(/new THREE\.BoxGeometry\(w \+ 0\.2, 0\.08, porchD\)/g, 'new THREE.BoxGeometry(w + 0.2, 0.04, porchD)');
code = code.replace(/new THREE\.BoxGeometry\(0\.2, h1, 0\.2\)/g, 'new THREE.BoxGeometry(0.08, h1, 0.08)');
code = code.replace(/const awningD = 1\.2;/g, 'const awningD = 1.0;');
code = code.replace(/new THREE\.BoxGeometry\(w \+ 0\.2, 0\.08, awningD\)/g, 'new THREE.BoxGeometry(w + 0.2, 0.04, awningD)');
code = code.replace(/new THREE\.BoxGeometry\(0\.18, 3\.6, 0\.18\)/g, 'new THREE.BoxGeometry(0.08, 3.6, 0.08)');
code = code.replace(/new THREE\.BoxGeometry\(0\.18, 3\.4, 0\.18\)/g, 'new THREE.BoxGeometry(0.08, 3.4, 0.08)');
code = code.replace(/new THREE\.BoxGeometry\(fW \+ 0\.2, 0\.08, porchD\)/g, 'new THREE.BoxGeometry(fW + 0.2, 0.04, porchD)');
code = code.replace(/new THREE\.BoxGeometry\(0\.18, 3\.2, 0\.18\)/g, 'new THREE.BoxGeometry(0.08, 3.2, 0.08)');
code = code.replace(/new THREE\.BoxGeometry\(platW, 0\.08, 1\.2\)/g, 'new THREE.BoxGeometry(platW, 0.04, 1.0)');
code = code.replace(/canopy\.position\.set\(x, 3\.8, z \+ sD \/ 2 \+ 0\.6\);/g, 'canopy.position.set(x, 3.8, z + sD / 2 + 0.5);');
code = code.replace(/new THREE\.BoxGeometry\(0\.18, 3\.8, 0\.18\)/g, 'new THREE.BoxGeometry(0.08, 3.8, 0.08)');

// 5. Boardwalks Y height
code = code.replace(/const nbH = 0\.25;/g, 'const nbH = 0.12;');
code = code.replace(/new THREE\.BoxGeometry\(2\.4, 0\.12, 0\.65\)/g, 'new THREE.BoxGeometry(2.4, 0.06, 0.65)');
code = code.replace(/step\.position\.set\(sx, 0\.06, nbZ \+ nbD \/ 2 \+ 0\.32\);/g, 'step.position.set(sx, 0.03, nbZ + nbD / 2 + 0.32);');

// 6. Roof properties
code = code.replace(/const cappedHeight = Math\.min\(height, 1\.2\);/g, 'const cappedHeight = Math.min(height, 0.8);');
code = code.replace(/const shingleThickness = 0\.08;/g, 'const shingleThickness = 0.04;');

// 7. Glowing Windows Replacement
code = code.replace(
  /private addGlowingWindows\(x: number, y: number, z: number, w: number, h: number\) \{\s*const win = new THREE\.Mesh\(new THREE\.PlaneGeometry\(w, h\), this\.windowGlowMat\);\s*win\.position\.set\(x, y, z\);\s*this\.scene\.add\(win\);\s*\}/g,
  `private addGlowingWindows(x: number, y: number, z: number, w: number, h: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const recess = 0.02;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.windowGlowMat);
    win.position.set(0, 0, recess);
    group.add(win);

    const frameThick = 0.08;
    const frameDepth = 0.12;
    const fZ = recess + frameDepth / 2 - 0.04;

    const top = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth), this.woodDarkMat);
    top.position.set(0, h / 2 + frameThick / 2, fZ);
    group.add(top);

    const bot = new THREE.Mesh(new THREE.BoxGeometry(w + frameThick * 2, frameThick, frameDepth), this.woodDarkMat);
    bot.position.set(0, -h / 2 - frameThick / 2, fZ);
    group.add(bot);

    const left = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), this.woodDarkMat);
    left.position.set(-w / 2 - frameThick / 2, 0, fZ);
    group.add(left);

    const right = new THREE.Mesh(new THREE.BoxGeometry(frameThick, h, frameDepth), this.woodDarkMat);
    right.position.set(w / 2 + frameThick / 2, 0, fZ);
    group.add(right);

    this.scene.add(group);
  }`
);

fs.writeFileSync(file, code);
console.log('ValentineBuilder updated.');
