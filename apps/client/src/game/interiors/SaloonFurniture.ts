import {BoxGeometry,CanvasTexture,CylinderGeometry,DoubleSide,Group,Mesh,MeshStandardMaterial,PlaneGeometry,SphereGeometry,SRGBColorSpace} from 'three';
export function makeWoodTexture():CanvasTexture|undefined {
 if(typeof document==='undefined')return;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext?.('2d');if(!ctx)return;
 ctx.fillStyle='#a49a86';ctx.fillRect(0,0,128,256);
 for(let i=0;i<64;i++){ctx.strokeStyle=`rgba(50,40,30,${.03+(i%5)*.018})`;ctx.beginPath();ctx.moveTo(i*2,0);for(let y=0;y<=256;y+=16)ctx.lineTo(i*2+Math.sin(i*13+y*.09)*1.7,y);ctx.stroke();}
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
/** Own simplified furniture silhouettes based on supplied P5-17/18 photos; no original asset claim. */
export function createSaloonFurniture(kind:string,width:number,depth:number):Group {
 const group=new Group();
 const wood=new MeshStandardMaterial({color:'#50372e',roughness:.76}),trim=new MeshStandardMaterial({color:'#916844',roughness:.6}),dark=new MeshStandardMaterial({color:'#28221e',roughness:.9}),brass=new MeshStandardMaterial({color:'#b79752',metalness:.55,roughness:.4}),ivory=new MeshStandardMaterial({color:'#eee5d2'}),fabric=new MeshStandardMaterial({color:'#385e50',roughness:1});
 for(const material of [wood,trim])material.userData.interiorRole='wood';
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat=wood)=>{const mesh=new Mesh(new BoxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const cylinder=(x:number,y:number,z:number,r:number,h:number,mat=wood)=>{const mesh=new Mesh(new CylinderGeometry(r*.8,r,h,10),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 function chair(x:number,z:number,yaw:number){const chair=new Group();
  const add=(name:string,px:number,py:number,pz:number,w:number,h:number,d:number,mat=wood)=>{const mesh=new Mesh(new BoxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(px,py,pz);chair.add(mesh);};
  add('chair-seat',0,.49,0,.55,.09,.55);
  for(const px of [-.21,.21])for(const pz of [-.21,.21])add('chair-leg',px,.24,pz,.055,.49,.055);
  for(const px of [-.23,.23])add('chair-back',px,.85,.23,.06,.8,.065);
  add('chair-back-crest',0,1.23,.23,.58,.12,.07,trim);
  for(const px of [-.12,0,.12])add('chair-back-spindle',px,.94,.23,.025,.45,.025);
  chair.position.set(x,0,z);chair.rotation.y=yaw;group.add(chair);
 }
 if(kind==='table' || kind==='table-round'){
  if(kind==='table-round'){
   cylinder(0,.82,0,width/2,.11,trim);cylinder(0,.885,0,width/2-.09,.015,fabric);
   // Decorative cards at two seats, not private/session game state.
   const ink=new MeshStandardMaterial({color:'#8a242b',roughness:1});
   for(const side of [-1,1])for(let i=0;i<2;i++){
    const x=side*.4+(i-.5)*.19,z=side*.27;
    box('poker-decorative-card',x,.904,z,.16,.008,.23,ivory);
    for(const offset of [-.065,0,.065])cylinder(x,.91,z+offset,.014,.003,ink);
   }
   for(let i=0;i<4;i++)cylinder(-.05+i*.025,.92+i*.018,-.3,.055,.017,brass);
  }
  else box('table-top',0,.82,0,width,.11,depth,trim);
  for(const x of [-width/2+.2,width/2-.2])for(const z of [-depth/2+.2,depth/2-.2])cylinder(x,.39,z,.075,.78);
  box('table-apron',0,.68,0,width-.15,.2,depth-.15);
  chair(0,depth/2+.43,0);chair(0,-depth/2-.43,Math.PI);chair(width/2+.43,0,Math.PI/2);chair(-width/2-.43,0,-Math.PI/2);
  cylinder(.1,.97,.1,.10,.18,brass);
 }else if(kind==='bank-counter'){
  box('bank-counter-cabinet',0,.55,0,width,1.1,depth);box('bank-counter-top',0,1.18,0,width+.16,.15,depth+.14,trim);
  for(let x=-width/2+.6;x<width/2;x+=1.2){box('bank-raised-panel',x,.58,-depth/2-.02,1.03,.8,.05,trim);box('bank-panel-inset',x,.58,-depth/2-.05,.83,.6,.03);}
  for(const x of [-width/2+.15,width/2-.15])box('bank-divider-post',x,1.5,0,.13,1.5,.13,trim);
  box('bank-service-ledger',-.65,1.29,-.08,.46,.05,.33,dark);cylinder(.7,1.32,-.1,.1,.12,brass);
 }else if(kind==='npc-bartender' || kind==='npc-clerk'){
  const shirt=new MeshStandardMaterial({color:'#d6cfb9',roughness:1}),coat=new MeshStandardMaterial({color:kind==='npc-clerk'?'#34434b':'#4b3932',roughness:.9}),skin=new MeshStandardMaterial({color:'#bb9876',roughness:.85});
  for(const x of [-.13,.13]){box('npc-boot',x,.08,.08,.18,.16,.32,dark);box('npc-trouser',x,.48,0,.19,.7,.22,coat);}
  box('npc-shirt',0,1.12,0,.48,.62,.29,shirt);box('npc-waistcoat',0,1.05,.16,.38,.43,.045,coat);
  for(const x of [-.32,.32]){box('npc-sleeve',x,1.1,0,.16,.52,.2,shirt);box('npc-hand',x,.79,.03,.13,.17,.15,skin);}
  cylinder(0,1.49,0,.085,.14,skin);const head=new Mesh(new SphereGeometry(.17,12,10),skin);head.scale.set(.85,1.15,.85);head.position.set(0,1.68,0);group.add(head);
  box('npc-hair',0,1.83,-.015,.25,.08,.23,dark);box('npc-nose',0,1.68,.15,.065,.065,.07,skin);
  for(const x of [-.055,.055])box('npc-eye',x,1.72,.143,.022,.024,.015,dark);
  box('npc-bowtie',0,1.37,.16,.14,.06,.04,dark);
  if(kind==='npc-bartender')box('npc-apron',0,.9,.19,.41,.55,.04,ivory);
  else box('npc-watchchain',.10,1.06,.19,.02,.21,.015,brass);
 }else if(kind==='bar'){
  box('bar-body',0,.56,0,width,1.12,depth);box('bar-top',0,1.18,0,width+.2,.14,depth+.22,trim);
  for(let z=-depth/2+.45;z<depth/2;z+=.95){box('bar-raised-panel',width/2+.035,.58,z,.05,.7,.76,trim);box('bar-inset-panel',width/2+.066,.58,z,.022,.56,.62);}
  for(const y of [.12,1.02])box('bar-moulding',width/2+.06,y,0,.1,.06,depth,trim);
  const rail=new Mesh(new CylinderGeometry(.035,.035,depth,12),brass);rail.rotation.x=Math.PI/2;rail.position.set(width/2+.3,.18,0);group.add(rail);
 }else if(kind==='backbar'){
  box('backbar-cabinet',0,.48,0,width,.96,depth);box('backbar-back',-width/2+.06,1.65,0,.1,2.3,depth);
  for(const y of [1.08,1.7,2.4])box('backbar-shelf',0,y,0,width+.1,.08,depth,trim);
  for(const z of [-depth/2+.08,0,depth/2-.08])box('backbar-upright',0,1.7,z,width,.08, .08,trim).scale.y=22;
  for(let z=-depth/2+.35;z<depth/2-.2;z+=.6){cylinder(.1,1.23,z,.065,.22,fabric);cylinder(.1,1.39,z,.026,.13,fabric);}
 }else if(kind==='piano'){
  box('piano-case',0,.88,0,width,1.65,depth);box('piano-keys',0,.87,depth/2+.12,width-.15,.07,.4,ivory);
  const count=24;for(let i=0;i<count;i++){const x=-width/2+.1+i*(width-.2)/count;box('piano-key-seam',x,.91,depth/2+.15,.009,.01,.32,dark);if(i%7!==2 && i%7!==6)box('piano-black-key',x,.94,depth/2-.005,.035,.05,.19,dark);}
  box('piano-top-moulding',0,1.73,0,width+.12,.12,depth+.1,trim);box('piano-front-panel',0,1.29,depth/2+.015,width-.2,.53,.04,trim);
  box('piano-music-rest',0,1.13,depth/2+.06,.65,.36,.035);box('piano-bench',0,.46,depth/2+.72,1,.09,.42,trim);for(const x of [-.4,.4])box('piano-bench-leg',x,.23,depth/2+.72,.09,.46,.32);
 }else if(kind==='picture'){
  box('picture-frame',0,0,0,width,depth,.09,brass);box('picture-mount',0,0,.052,width-.1,depth-.1,.02,ivory);
  const artMaterial=new MeshStandardMaterial({color:'#7697a2',side:DoubleSide});artMaterial.userData.interiorRole='art';
  const art=new Group();const sky=box('picture-landscape',0,0,.066,width-.17,depth-.17,.012,artMaterial);
  box('picture-hills',0,-depth*.18,.076,width-.2,depth*.3,.013,new MeshStandardMaterial({color:'#4e644c'}));group.add(art);sky.userData.ownArtwork=true;
 }else if(kind==='rug'){const material=new MeshStandardMaterial({color:'#752e38',roughness:1});material.userData.interiorRole='rug';box('woven-rug',0,.012,0,width,.015,depth,material);}
 return group;
}
