import { BoxGeometry, CircleGeometry, BufferGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,Path,Shape,ShapeGeometry } from 'three';
import {createSaloonFurniture,makeWoodTexture} from '../interiors/SaloonFurniture';
import {createDartboardCabinet} from '../interiors/DartboardCabinet';
import {getBuildingFloorMaterial} from '../interiors/BuildingFloors';
import { BUILDINGS } from '../buildings/BuildingRegistry';
import type { RoomLayout } from '../buildings/BuildingTypes';
import {batchAuthoredFurniture} from '../interiors/FurnitureBatch';
import levelDesign from '../../../../../data/reference/valentine/level-design.json';

/** Deliberately simplified game geometry, not a recovered Rockstar interior.
 * Anchor: manifest val_bank.glb, source extents ~ +/-6 X, +/-9 Z.
 * Floor/ramp/door dimensions are authored for clear 2.5D traversal. */
export const BANK_GAMEPLAY = Object.freeze(BUILDINGS.byId.get('bank')!.floors[0].layout);
export type AuthoredRoomConfig = RoomLayout;

export function createAuthoredRoom(c:AuthoredRoomConfig): { support: Group; walls: Group; interior:Group; dispose(): void } {
  const accessMargin=levelDesign.access.supportMargin;
  const support = new Group(), walls = new Group(),interior=new Group();interior.visible=false;
  interior.userData.exteriorVisible=Boolean(c.openPerimeter);
  for (const group of [support, walls,interior]) {
    group.userData.provenance = 'authored-gameplay';
    group.userData.sourceAsset = `authored-gameplay/${c.key}`;
  }
  const floorMaterial = getBuildingFloorMaterial(c.key); const floorTexture = floorMaterial.map;
  floorMaterial.userData.interiorRole='floor';
  const seamMaterial = new MeshStandardMaterial({ color: '#61472e', roughness: 1 });
  const markerMaterial = new MeshStandardMaterial({ color: '#d8bb70', emissive: '#705021', emissiveIntensity: 0.35 });
  const wallMaterial = new MeshStandardMaterial({ side: DoubleSide });
  const visibleWallMaterial=new MeshStandardMaterial({color:'#8c674b',roughness:1});
  visibleWallMaterial.userData.interiorRole='wood';
  const box = (group: Group, name: string, x: number, y: number, z: number, w: number, h: number, d: number, material = floorMaterial): void => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.name = name;
    mesh.position.set(x, y, z); group.add(mesh);
  };
  // Source render collision is replaced by this room. Close the foundation too:
  // a wall beginning at floor height otherwise lets a low player walk underneath.
  if(c.exteriorEntrance!==false){
    if(c.footprint){
      const shape=new Shape();c.footprint.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
      const foundation=new Mesh(new ExtrudeGeometry(shape,{depth:8,bevelEnabled:false}),wallMaterial);
      foundation.name='foundation';foundation.rotation.x=-Math.PI/2;foundation.position.y=c.floorY-8.12;walls.add(foundation);
    }else box(walls,'foundation',c.x,c.floorY-4.12,c.z,c.width,8,c.depth,wallMaterial);
  }
  if(c.footprint || c.floorHoles){
    const outline=c.footprint??[{x:c.x-c.width/2,z:c.z-c.depth/2},{x:c.x+c.width/2,z:c.z-c.depth/2},{x:c.x+c.width/2,z:c.z+c.depth/2},{x:c.x-c.width/2,z:c.z+c.depth/2}];
    const shape=new Shape();outline.forEach((p,index)=>index===0?shape.moveTo(p.x,-p.z):shape.lineTo(p.x,-p.z));shape.closePath();
    for(const points of c.floorHoles??[]){const hole=new Path();points.forEach((p,index)=>index===0?hole.moveTo(p.x,-p.z):hole.lineTo(p.x,-p.z));hole.closePath();shape.holes.push(hole);}
    const geometry=new ShapeGeometry(shape),uv=geometry.getAttribute('uv'),position=geometry.getAttribute('position');
    for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)-c.x+c.width/2)/c.width,(-position.getY(i)-c.z+c.depth/2)/c.depth);
    const floor=new Mesh(geometry,floorMaterial);floor.name=`authored-${c.key}-floor`;floor.rotation.x=-Math.PI/2;floor.position.y=c.floorY;support.add(floor);
  }else box(support, `authored-${c.key}-floor`, c.x, c.floorY - 0.08, c.z, c.width, 0.16, c.depth);
  for (let x = c.x - c.width / 2 + 0.6; !c.footprint && !c.floorHoles && x < c.x + c.width / 2; x += 0.6)
    box(support, 'plank-seam', x, c.floorY + 0.001, c.z, 0.012, 0.002, c.depth, seamMaterial);
  const left = c.doorX - c.doorWidth/2-accessMargin, right = c.doorX + c.doorWidth/2+accessMargin;
  const supportMaterial=floorMaterial.clone();supportMaterial.userData.interiorRole='support';
  const accessMaterial=new MeshStandardMaterial({color:'#5c4834',roughness:0.92,map:floorTexture??null});accessMaterial.userData.interiorRole='boardwalk';accessMaterial.userData.rdo_draw_bucket=2;
  const addVisibleStair=(id:string,from:{x:number;y:number;z:number},to:{x:number;y:number;z:number},width:number)=>{
    const visuals=new Group();visuals.name=`visible-access-${id}`;visuals.userData.exteriorAccess=true;visuals.visible=false;support.add(visuals);
    const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz),count=Math.max(1,Math.ceil(Math.abs(to.y-from.y)/.18));
    for(let i=0;i<count;i++){const t=(i+.5)/count;box(visuals,'access-tread',from.x+dx*t,from.y+(to.y-from.y)*(i+1)/count+.015,from.z+dz*t,width,.045,length/count+.02,accessMaterial);visuals.children.at(-1)!.rotation.y=Math.atan2(dx,dz);}
  };
  if(!c.porch && c.exteriorEntrance!==false){
  const rampGeometry = new BufferGeometry();
  rampGeometry.setAttribute('position', new Float32BufferAttribute([
    left,c.rampLow,c.rampStart, right,c.rampLow,c.rampStart,
    right,c.floorY,c.front, left,c.floorY,c.front,
  ], 3));
  rampGeometry.setIndex(c.frontDirection===-1?[0,2,1,0,3,2]:[0,1,2,0,2,3]);
  rampGeometry.computeVertexNormals();
  const ramp = new Mesh(rampGeometry, supportMaterial); ramp.name = `authored-${c.key}-access-ramp`;ramp.userData.exteriorAccess=true;ramp.userData.physicsOnly=true;ramp.userData.supportPriority=2; ramp.visible=false; support.add(ramp);
  addVisibleStair('entrance',{x:c.doorX,y:c.rampLow,z:c.rampStart},{x:c.doorX,y:c.floorY,z:c.front},c.doorWidth);
  }
  for(const child of support.children)if(!child.userData.exteriorAccess)child.userData.interiorSurface=true;
  if(c.porch){
    const porch=c.porch;box(support,'veranda-support',porch.x,c.floorY-.08,porch.z,porch.width+2*accessMargin,.16,porch.depth+2*accessMargin,supportMaterial);
    const deck=support.children.at(-1)!;deck.userData.exteriorAccess=true;deck.userData.physicsOnly=true;deck.userData.supportPriority=1;
    const deckVisual=new Group();deckVisual.name='visible-access-deck';deckVisual.userData.exteriorAccess=true;deckVisual.visible=false;support.add(deckVisual);box(deckVisual,'deck-planks',porch.x,c.floorY+.015,porch.z,porch.width,.04,porch.depth,accessMaterial);
    for(const stair of porch.stairs){
      const dx=stair.to.x-stair.from.x,dz=stair.to.z-stair.from.z,length=Math.hypot(dx,dz),sx=-dz/length*(stair.width/2+accessMargin),sz=dx/length*(stair.width/2+accessMargin);
      const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([stair.from.x+sx,stair.from.y,stair.from.z+sz,stair.from.x-sx,stair.from.y,stair.from.z-sz,stair.to.x-sx,stair.to.y,stair.to.z-sz,stair.to.x+sx,stair.to.y,stair.to.z+sz],3));geometry.setIndex([0,2,1,0,3,2]);geometry.computeVertexNormals();
      const ramp=new Mesh(geometry,supportMaterial);ramp.name=`stair-${stair.id}`;ramp.userData.exteriorAccess=true;ramp.userData.physicsOnly=true;ramp.userData.supportPriority=2;support.add(ramp);
      addVisibleStair(stair.id,stair.from,stair.to,stair.width);
    }
    // No invisible 2.5m walls around an open deck. They blocked diagonal stair
    // landings even where the source boardwalk visibly had no railing. Building
    // walls/foundations remain solid; support/drop limits guard tall ledges.
  }
  // Threshold stripe shows the actual accessible opening rather than an implied doorway.
  if(c.exteriorEntrance!==false){
    box(support, 'entrance-stripe', c.doorX, c.floorY + 0.006, c.front - c.frontDirection*0.1, c.doorWidth, 0.01, 0.22, markerMaterial);
    support.children.at(-1)!.userData.interiorSurface=true;
  }
  for(const stair of c.stairs??[]){
    const dx=stair.to.x-stair.from.x,dz=stair.to.z-stair.from.z,length=Math.hypot(dx,dz),sx=-dz/length*stair.width/2,sz=dx/length*stair.width/2;
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([stair.from.x+sx,stair.from.y,stair.from.z+sz,stair.from.x-sx,stair.from.y,stair.from.z-sz,stair.to.x-sx,stair.to.y,stair.to.z-sz,stair.to.x+sx,stair.to.y,stair.to.z+sz],3));geometry.setIndex([0,2,1,0,3,2]);geometry.computeVertexNormals();
    const ramp=new Mesh(geometry,floorMaterial);ramp.name=`interior-stair-${stair.id}`;ramp.userData.interiorSurface=true;ramp.userData.stairConnector=true;ramp.userData.supportPriority=3;support.add(ramp);
    const visuals=new Group();visuals.name=`stair-visuals-${stair.id}`;visuals.userData.stairConnector=true;visuals.userData.interiorSurface=true;support.add(visuals);
    const stairMaterial=visibleWallMaterial.clone();stairMaterial.userData.rdo_draw_bucket=2;
    // Decorative treads sit above the collision ramp; the ramp remains the sole walking support.
    const count=Math.max(3,Math.ceil(Math.abs(stair.to.y-stair.from.y)/.22));
    for(let index=0;index<count;index++){
      const t=(index+.5)/count;box(visuals,'stair-tread',stair.from.x+dx*t,stair.from.y+(stair.to.y-stair.from.y)*(index+1)/count,stair.from.z+dz*t,stair.width,.06,length/count+.03,stairMaterial);
      visuals.children.at(-1)!.rotation.y=Math.atan2(dx,dz);
    }
    for(const side of [-1,1]){
      const ax=stair.from.x+side*sx,az=stair.from.z+side*sz,bx=stair.to.x+side*sx,bz=stair.to.z+side*sz;
      const panel=new BufferGeometry();panel.setAttribute('position',new Float32BufferAttribute([ax,stair.from.y+.05,az,bx,stair.to.y+.05,bz,bx,stair.to.y+1.25,bz,ax,stair.from.y+1.25,az],3));panel.setIndex([0,1,2,0,2,3]);panel.computeVertexNormals();
      const guard=new Mesh(panel,wallMaterial);guard.name=`stair-side-${side}`;walls.add(guard);
      for(let index=0;index<=count;index+=2){const t=index/count;box(visuals,'stair-baluster',ax+(bx-ax)*t,stair.from.y+(stair.to.y-stair.from.y)*t+.6,az+(bz-az)*t,.075,1.2,.075,stairMaterial);}
      for(let index=0;index<count;index++){const t=(index+.5)/count;box(visuals,'stair-handrail',ax+(bx-ax)*t,stair.from.y+(stair.to.y-stair.from.y)*t+1.22,az+(bz-az)*t,.11,.11,length/count+.04,stairMaterial);visuals.children.at(-1)!.rotation.y=Math.atan2(dx,dz);}
    }
  }
  const west = c.x - c.width / 2, east = c.x + c.width / 2;
  const wall = (name: string, x: number, z: number, w: number, d: number): void => {
    if(w<.001 || d<.001)return;
    const height=c.wallHeight??3;
    box(walls,name,x,c.floorY+height/2,z,w,height,d,wallMaterial);
    box(interior,`${name}-cutaway`,x,c.floorY+.43,z,w,.86,d,visibleWallMaterial);
    interior.children.at(-1)!.userData.interiorOnly=true;
    const upperMaterial=new MeshStandardMaterial({color:'#e2d8c3',roughness:1,transparent:true,opacity:.55,depthWrite:false});
    upperMaterial.userData.interiorRole='wallpaper';
    box(interior,`${name}-upper`,x,c.floorY+1.85,z,w,2,d,upperMaterial);
    const upper=interior.children.at(-1)!;upper.userData.interiorOnly=true;upper.userData.wallNormal={x:name==='east-wall'?1:name==='west-wall'?-1:0,z:name==='east-wall' || name==='west-wall'?0:name==='rear-wall'?-c.frontDirection:c.frontDirection};
  };
  if(c.footprint && !c.openPerimeter){
    c.footprint.forEach((a,index)=>{
      const b=c.footprint![(index+1)%c.footprint!.length];
      if(Math.abs(a.z-b.z)<.01){
        const lo=Math.min(a.x,b.x),hi=Math.max(a.x,b.x),front=Math.abs(a.z-c.front)<.02;
        if(front && c.exteriorEntrance!==false && c.doorX>=lo && c.doorX<=hi){
          const dl=c.doorX-c.doorWidth/2,dr=c.doorX+c.doorWidth/2;
          wall(`outline-${index}-left`,(lo+dl)/2,a.z,Math.max(0,dl-lo),.2);wall(`outline-${index}-right`,(dr+hi)/2,a.z,Math.max(0,hi-dr),.2);
        }else wall(`outline-${index}`, (a.x+b.x)/2,a.z,hi-lo,.2);
      }else wall(`outline-${index}`,a.x,(a.z+b.z)/2,.2,Math.abs(a.z-b.z));
    });
  }else if(!c.openPerimeter){
  wall('west-wall', west, c.z, 0.2, c.depth); wall('east-wall', east, c.z, 0.2, c.depth);
  wall('rear-wall', c.x, c.z - c.frontDirection*c.depth / 2, c.width, 0.2);
  const doorLeft = c.exteriorEntrance===false?c.x:c.doorX-c.doorWidth/2, doorRight = c.exteriorEntrance===false?c.x:c.doorX+c.doorWidth/2;
  wall('front-left', (west+doorLeft)/2, c.front, doorLeft-west, 0.2);
  wall('front-right', (east+doorRight)/2, c.front, east-doorRight, 0.2);
  }
  const furnishingMaterials:MeshStandardMaterial[]=[];
  for(const fixture of c.fixtures??[]){
    const material=new MeshStandardMaterial({color:fixture.color,roughness:1});material.userData.interiorRole='wood';furnishingMaterials.push(material);
    const p=fixture.position,size=fixture.size;
    if(fixture.kind){const furniture=createSaloonFurniture(fixture.kind,size.x,size.z,size.y);furniture.name=fixture.id;furniture.position.set(p.x,p.y,p.z);furniture.rotation.y=fixture.yaw??0;interior.add(furniture);}
    else box(interior,fixture.id,p.x,p.y,p.z,size.x,size.y,size.z,material);
    if(fixture.collision){const yaw=fixture.yaw??0;box(walls,fixture.id,p.x,p.y+(fixture.kind?size.y/2:0),p.z,Math.abs(size.x*Math.cos(yaw))+Math.abs(size.z*Math.sin(yaw)),size.y,Math.abs(size.x*Math.sin(yaw))+Math.abs(size.z*Math.cos(yaw)),wallMaterial);}
  }
  for(const target of c.wallTargets??[]){
    interior.add(createDartboardCabinet(target));
  }
  for(const group of [support,walls,interior]){
    group.position.set(c.x,0,c.z);group.rotation.y=c.yaw??0;
    for(const child of group.children){if(child instanceof Mesh && child.geometry instanceof ShapeGeometry){child.geometry.translate(-c.x,c.z,0);}else{child.position.x-=c.x;child.position.z-=c.z;}}
    group.updateWorldMatrix(true,true);
  }
  const accessBatch=batchAuthoredFurniture(support);
  return {support,walls,interior,dispose():void {
    accessBatch.dispose();
    for (const group of [support,walls,interior]) group.traverse(object=> {if(object instanceof Mesh)object.geometry.dispose();});
    const materials=new Set<MeshStandardMaterial>([floorMaterial,seamMaterial,markerMaterial,wallMaterial,visibleWallMaterial,...furnishingMaterials]);
    for(const group of [support,interior])group.traverse(object=>{if(object instanceof Mesh){const items=Array.isArray(object.material)?object.material:[object.material];for(const m of items)if(m instanceof MeshStandardMaterial)materials.add(m);}});
    materials.forEach(m=>m.dispose());floorTexture?.dispose();
  }};
}

export function createAuthoredBank(): ReturnType<typeof createAuthoredRoom> {return createAuthoredRoom(BANK_GAMEPLAY);}
