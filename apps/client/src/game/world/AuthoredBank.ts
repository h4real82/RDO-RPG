import { BoxGeometry, CircleGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import {createSaloonFurniture,makeWoodTexture} from '../interiors/SaloonFurniture';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import type { RoomLayout } from '../buildings/BuildingTypes';

/** Deliberately simplified game geometry, not a recovered Rockstar interior.
 * Anchor: manifest val_bank.glb, source extents ~ +/-6 X, +/-9 Z.
 * Floor/ramp/door dimensions are authored for clear 2.5D traversal. */
export const BANK_GAMEPLAY = Object.freeze(BUILDINGS.byId.get('bank')!.floors[0].layout);
export type AuthoredRoomConfig = RoomLayout;

export function createAuthoredRoom(c:AuthoredRoomConfig): { support: Group; walls: Group; interior:Group; dispose(): void } {
  const support = new Group(), walls = new Group(),interior=new Group();interior.visible=false;
  for (const group of [support, walls,interior]) {
    group.userData.provenance = 'authored-gameplay';
    group.userData.sourceAsset = `authored-gameplay/${c.key}`;
  }
  const floorTexture=makeWoodTexture();const floorMaterial = new MeshStandardMaterial({ color: floorTexture?'#a5a095':'#827766', map:floorTexture??null,roughness: 1 });
  floorMaterial.userData.interiorRole='floor';
  const seamMaterial = new MeshStandardMaterial({ color: '#61472e', roughness: 1 });
  const markerMaterial = new MeshStandardMaterial({ color: '#d8bb70', emissive: '#705021', emissiveIntensity: 0.35 });
  const wallMaterial = new MeshStandardMaterial({ side: DoubleSide });
  const visibleWallMaterial=new MeshStandardMaterial({color:'#4c3a30',roughness:1});
  visibleWallMaterial.userData.interiorRole='wood';
  const box = (group: Group, name: string, x: number, y: number, z: number, w: number, h: number, d: number, material = floorMaterial): void => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.name = name;
    mesh.position.set(x, y, z); group.add(mesh);
  };
  box(support, `authored-${c.key}-floor`, c.x, c.floorY - 0.08, c.z, c.width, 0.16, c.depth);
  for (let x = c.x - c.width / 2 + 0.6; x < c.x + c.width / 2; x += 0.6)
    box(support, 'plank-seam', x, c.floorY + 0.001, c.z, 0.012, 0.002, c.depth, seamMaterial);
  const left = c.doorX - 1.1, right = c.doorX + 1.1;
  if(!c.porch){
  const rampGeometry = new BufferGeometry();
  rampGeometry.setAttribute('position', new Float32BufferAttribute([
    left,c.rampLow,c.rampStart, right,c.rampLow,c.rampStart,
    right,c.floorY,c.front, left,c.floorY,c.front,
  ], 3));
  rampGeometry.setIndex(c.frontDirection===-1?[0,2,1,0,3,2]:[0,1,2,0,2,3]);
  rampGeometry.computeVertexNormals();
  const ramp = new Mesh(rampGeometry, floorMaterial); ramp.name = `authored-${c.key}-access-ramp`;ramp.userData.exteriorAccess=true;ramp.userData.physicsOnly=true; support.add(ramp);
  }
  for(const child of support.children)if(!child.userData.exteriorAccess)child.userData.interiorSurface=true;
  if(c.porch){
    const porch=c.porch;box(support,'veranda-support',porch.x,c.floorY-.08,porch.z,porch.width,.16,porch.depth);
    const deck=support.children.at(-1)!;deck.userData.exteriorAccess=true;deck.userData.physicsOnly=true;
    for(const stair of porch.stairs){
      const dx=stair.to.x-stair.from.x,dz=stair.to.z-stair.from.z,length=Math.hypot(dx,dz),sx=-dz/length*stair.width/2,sz=dx/length*stair.width/2;
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([stair.from.x+sx,stair.from.y,stair.from.z+sz,stair.from.x-sx,stair.from.y,stair.from.z-sz,stair.to.x-sx,stair.to.y,stair.to.z-sz,stair.to.x+sx,stair.to.y,stair.to.z+sz],3));geometry.setIndex([0,2,1,0,3,2]);geometry.computeVertexNormals();
      const ramp=new Mesh(geometry,floorMaterial);ramp.name=`stair-${stair.id}`;ramp.userData.exteriorAccess=true;ramp.userData.physicsOnly=true;support.add(ramp);
    }
    const rail=(name:string,x:number,z:number,w:number,d:number)=>box(walls,name,x,c.floorY+.25,z,w,2.5,d,wallMaterial);
    const outer=porch.z+c.frontDirection*porch.depth/2,w=porch.width/2,half=1.1;
    rail('veranda-front-west',porch.x-(w+half)/2,outer,w-half,.12);rail('veranda-front-east',porch.x+(w+half)/2,outer,w-half,.12);
    for(const side of [-1,1])for(const dir of [-1,1])rail('veranda-side-rail',porch.x+side*w,porch.z+dir*(porch.depth/4+.39),.12,(porch.depth-1.55)/2);
  }
  // Threshold stripe shows the actual accessible opening rather than an implied doorway.
  box(support, 'entrance-stripe', c.doorX, c.floorY + 0.006, c.front - c.frontDirection*0.1, c.doorWidth, 0.01, 0.22, markerMaterial);
  support.children.at(-1)!.userData.interiorSurface=true;
  const west = c.x - c.width / 2, east = c.x + c.width / 2;
  const wall = (name: string, x: number, z: number, w: number, d: number): void => {
    box(walls,name,x,c.floorY+1.5,z,w,3,d,wallMaterial);
    box(interior,`${name}-cutaway`,x,c.floorY+.43,z,w,.86,d,visibleWallMaterial);
    const upperMaterial=new MeshStandardMaterial({color:'#839597',roughness:1,transparent:true,opacity:.55,depthWrite:false});
    upperMaterial.userData.interiorRole='wallpaper';
    box(interior,`${name}-upper`,x,c.floorY+1.85,z,w,2,d,upperMaterial);
    const upper=interior.children.at(-1)!;upper.userData.wallNormal={x:name==='east-wall'?1:name==='west-wall'?-1:0,z:name==='east-wall' || name==='west-wall'?0:name==='rear-wall'?-c.frontDirection:c.frontDirection};
  };
  wall('west-wall', west, c.z, 0.2, c.depth); wall('east-wall', east, c.z, 0.2, c.depth);
  wall('rear-wall', c.x, c.z - c.frontDirection*c.depth / 2, c.width, 0.2);
  const doorLeft = c.doorX-c.doorWidth/2, doorRight = c.doorX+c.doorWidth/2;
  wall('front-left', (west+doorLeft)/2, c.front, doorLeft-west, 0.2);
  wall('front-right', (east+doorRight)/2, c.front, east-doorRight, 0.2);
  const furnishingMaterials:MeshStandardMaterial[]=[];
  for(const fixture of c.fixtures??[]){
    const material=new MeshStandardMaterial({color:fixture.color,roughness:1});furnishingMaterials.push(material);
    const p=fixture.position,size=fixture.size;
    if(fixture.kind){const furniture=createSaloonFurniture(fixture.kind,size.x,size.z);furniture.name=fixture.id;furniture.position.set(p.x,p.y,p.z);furniture.rotation.y=fixture.yaw??0;interior.add(furniture);}
    else box(interior,fixture.id,p.x,p.y,p.z,size.x,size.y,size.z,material);
    if(fixture.collision){const yaw=fixture.yaw??0;box(walls,fixture.id,p.x,p.y+(fixture.kind?size.y/2:0),p.z,Math.abs(size.x*Math.cos(yaw))+Math.abs(size.z*Math.sin(yaw)),size.y,Math.abs(size.x*Math.sin(yaw))+Math.abs(size.z*Math.cos(yaw)),wallMaterial);}
  }
  for(const target of c.wallTargets??[]){
    const board=new Group();board.name=target.id;board.position.set(target.position.x,target.position.y,target.position.z);board.rotation.y=target.yaw;
    for(const [index,radius,color]of [[0,target.radius,'#453a2c'],[1,target.radius*.5,'#c5b389'],[2,target.radius*.15,'#a22e20']] as const){
      const material=new MeshStandardMaterial({color,side:DoubleSide,roughness:1});furnishingMaterials.push(material);
      const disc=new Mesh(new CircleGeometry(radius,32),material);disc.position.z=index*.003;board.add(disc);
    }interior.add(board);
  }
  for(const group of [support,walls,interior]){
    group.position.set(c.x,0,c.z);group.rotation.y=c.yaw??0;
    for(const child of group.children){child.position.x-=c.x;child.position.z-=c.z;}
    group.updateWorldMatrix(true,true);
  }
  return {support,walls,interior,dispose():void {
    for (const group of [support,walls,interior]) group.traverse(object=> {if(object instanceof Mesh)object.geometry.dispose();});
    const materials=new Set<MeshStandardMaterial>([floorMaterial,seamMaterial,markerMaterial,wallMaterial,visibleWallMaterial,...furnishingMaterials]);
    interior.traverse(object=>{if(object instanceof Mesh){const items=Array.isArray(object.material)?object.material:[object.material];for(const m of items)if(m instanceof MeshStandardMaterial)materials.add(m);}});
    materials.forEach(m=>m.dispose());floorTexture?.dispose();
  }};
}

export function createAuthoredBank(): ReturnType<typeof createAuthoredRoom> {return createAuthoredRoom(BANK_GAMEPLAY);}
