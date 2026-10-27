import {BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial,SphereGeometry} from 'three';

/** Own, UV-mapped gameplay models interpreted from the user's 24.10.26 photos.
 * Source wood/fabric maps are installed by RoomAppearance; no original model claim. */
export const REFERENCE_FURNITURE_KINDS=['chair','desk','dresser','wardrobe','armchair','sofa','washstand','stove','rifle-rack','medicine-cabinet','goods-shelf','ticket-booth','cell-bars','crate-stack','exam-cot','folding-chair','cash-register','plain-table','stall-divider','trough','forge','anvil','workbench','cinema-screen'] as const;
export function createReferenceFurniture(kind:string,width:number,depth:number,height=1):Group|undefined {
 if(!(REFERENCE_FURNITURE_KINDS as readonly string[]).includes(kind))return;
 const root=new Group();root.name=`reference-${kind}`;root.scale.set(width,height,depth);
 root.userData.provenance='authored-gameplay';root.userData.referenceSet='user-interiors-2026-10-24';
 const wood=new MeshStandardMaterial({color:'#c2b59d',roughness:.8}),trim=new MeshStandardMaterial({color:'#a79474',roughness:.72});
 wood.userData.interiorRole='furnitureWood';trim.userData.interiorRole='furnitureWood';
 const iron=new MeshStandardMaterial({color:'#343431',metalness:.72,roughness:.55});
 const brass=new MeshStandardMaterial({color:'#9b7c43',metalness:.7,roughness:.4});
 const fabric=new MeshStandardMaterial({color:'#86594c',roughness:1});fabric.userData.interiorRole='rug';
 const porcelain=new MeshStandardMaterial({color:'#d4cfb8',roughness:.35});
 const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material=wood)=>{
  const mesh=new Mesh(new BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);root.add(mesh);return mesh;
 };
 const cylinder=(name:string,x:number,y:number,z:number,r:number,h:number,material=iron)=>{
  const mesh=new Mesh(new CylinderGeometry(r,r,h,8),material);mesh.name=name;mesh.position.set(x,y,z);root.add(mesh);return mesh;
 };
 const feet=()=>{for(const x of [-.39,.39])for(const z of [-.36,.36])box('turned-foot',x,.12,z,.07,.24,.09,trim);};
 const crown=()=>{box('cornice',0,.97,0,1.04,.06,1.04,trim);box('plinth',0,.16,0,1.02,.07,1.02,trim);};
 const drawers=(count:number,start=.25,end=.87)=>{for(let i=0;i<count;i++){
  const h=(end-start)/count,y=start+h*(i+.5);
  box('drawer-front',0,y,.485,.88,h-.025,.04,trim);
  for(const x of [-.23,.23])box('drawer-handle',x,y,.525,.1,.025,.04,brass);
 }};
 const shelf=(stock:'medicine'|'goods'|'empty')=>{
  box('cabinet-back',0,.53,-.46,1,.9,.08);
  for(const x of [-.46,.46])box('shelf-upright',x,.53,0,.08,.9,1,trim);
  box('lower-cupboard',0,.18,0,.92,.25,.92);drawers(1,.1,.27);
  for(const y of [.32,.54,.76,.95])box('shelf-board',0,y,0,.95,.035,1,trim);
  if(stock!=='empty')for(let row=0;row<3;row++)for(let col=0;col<5;col++){
   const x=(col-2)*.17,y=.35+row*.22;
   if(stock==='medicine'){
    const jar=cylinder('medicine-bottle',x,y+.055,.05,.045,.11,col%2?porcelain:brass);
    box('bottle-label',x,y+.06,.098,.06,.045,.005,porcelain);
    cylinder('bottle-neck',x,y+.13,.05,.024,.04,iron);jar.userData.decorative=true;
   }else{box('stock-package',x,y+.06,col%2?.12:0,.12,.12,.25,col%3?trim:porcelain);}
  }
  crown();
 };
 if(kind==='stall-divider'){
  for(const x of [-.47,.47])box('stall-post',x,.5,0,.06,1,.9,trim);
  for(const y of [.2,.45,.7,.95])box('stall-rail',0,y,0,.98,.1,.8,wood);
 }else if(kind==='trough'){
  box('trough-bottom',0,.3,0,.9,.12,.9);
  for(const x of [-.45,.45])box('trough-side',x,.6,0,.1,.55,1,trim);
  for(const z of [-.45,.45])box('trough-end',0,.6,z,.9,.55,.1,trim);
  box('dark-feed',0,.45,0,.78,.04,.8,iron);
  for(const x of [-.35,.35])box('trough-foot',x,.13,0,.12,.26,.8);
 }else if(kind==='dresser'||kind==='wardrobe'){
  feet();box('cabinet-body',0,.56,0,.96,.76,.94);crown();
  if(kind==='dresser')drawers(4);
  else{
   for(const x of [-.23,.23]){box('wardrobe-door',x,.59,.49,.43,.69,.035,trim);box('raised-door-panel',x,.61,.515,.33,.5,.025);box('door-pull',x<0?-.045:.045,.55,.54,.02,.1,.025,brass);}
  }
 }else if(kind==='desk'||kind==='plain-table'){
  for(const x of [-.43,.43])for(const z of [-.4,.4])box('table-leg',x,.46,z,.065,.88,.08,trim);
  box('tabletop',0,.94,0,1,.09,1,trim);box('table-apron',0,.8,0,.92,.16,.89);
  if(kind==='desk'){for(const x of [-.31,.31]){box('pedestal',x,.47,-.03,.28,.73,.83);for(const y of [.28,.49,.7]){box('desk-drawer',x,y,.4,.25,.17,.035,trim);box('drawer-pull',x,y,.43,.08,.025,.025,brass);}}
   box('desk-blotter',0,.99,0,.36,.012,.52,fabric);box('papers',.31,.995,-.14,.2,.008,.29,porcelain);}
 }else if(kind==='chair'||kind==='folding-chair'){
  box('seat',0,.44,0,.9,.09,.88,trim);
  for(const x of [-.37,.37])for(const z of [-.34,.34]){const leg=box('chair-leg',x,.22,z,.07,.44,.07,kind==='folding-chair'?iron:wood);if(kind==='folding-chair')leg.rotation.x=z>0?.22:-.22;}
  for(const x of [-.39,.39])box('back-post',x,.73,-.36,.07,.53,.07,trim);
  box('back-crest',0,.97,-.36,.88,.06,.09,trim);
  if(kind==='folding-chair')box('canvas-back',0,.78,-.36,.7,.22,.035,fabric);
  else for(const x of [-.23,0,.23])box('chair-spindle',x,.76,-.36,.035,.35,.04);
 }else if(kind==='armchair'||kind==='sofa'){
  feet();box('upholstered-seat',0,.4,.03,.84,.2,.84,fabric);
  const back=new Mesh(new SphereGeometry(.5,10,6),fabric);back.name='rounded-upholstered-back';back.scale.set(.9,.7,.3);back.position.set(0,.65,-.32);root.add(back);
  for(const x of [-.44,.44]){box('wood-arm-frame',x,.5,0,.09,.42,.9,trim);box('padded-armrest',x,.65,0,.13,.14,.86,fabric);}
  box('seat-front-rail',0,.26,.43,.91,.09,.08,trim);
  if(kind==='sofa')for(const x of [-.22,.22])box('sofa-seat-cushion',x,.53,.04,.41,.08,.75,fabric);
 }else if(kind==='washstand'){
  feet();box('washstand-cupboard',0,.43,0,.92,.55,.9);drawers(2,.2,.61);box('marble-top',0,.74,0,1,.07,1,porcelain);
  const bowl=cylinder('wash-basin',-.16,.83,.04,.25,.12,porcelain);bowl.scale.y=.65;
  cylinder('basin-water',-.16,.873,.04,.18,.01,iron);cylinder('water-pitcher',.3,.86,-.1,.11,.22,porcelain);
  box('back-splash',0,.88,-.45,.96,.22,.06,trim);
 }else if(kind==='stove'){
  feet();const body=cylinder('cast-iron-stove',0,.39,0,.38,.49);box('stove-door',0,.4,.36,.39,.31,.04,iron);
  box('stove-latch',.12,.4,.4,.06,.025,.04,brass);cylinder('chimney-pipe',0,.79,-.23,.09,.42);
  box('stove-hearth',0,.035,0,1,.07,1,trim);
  body.userData.decorative=true;
 }else if(kind==='rifle-rack'){
  box('rack-back',0,.54,-.44,1,.88,.1);
  for(const x of [-.46,.46])box('rack-post',x,.55,0,.08,.9,.9,trim);
  box('rack-base-cupboard',0,.16,0,.94,.28,.92);drawers(1,.06,.25);
  // Mounting rails sit behind the weapons; full-depth shelf boards would
  // incorrectly cut through the stocks and barrels visible in the references.
  for(const y of [.42,.8])box('rifle-mounting-rail',0,y,-.21,.9,.05,.08,trim);
  crown();
  for(let i=0;i<5;i++){
   const x=(i-2)*.17;box('rifle-stock',x,.32,.12,.07,.29,.13,trim);
   cylinder('rifle-barrel',x,.64,.11,.014,.4);box('rifle-receiver',x,.46,.11,.045,.11,.06,iron);
  }
 }else if(kind==='medicine-cabinet'||kind==='goods-shelf')shelf(kind==='medicine-cabinet'?'medicine':'goods');
 else if(kind==='ticket-booth'){
  box('paneled-counter',0,.25,0,1,.5,1);box('counter-lip',0,.52,0,1.05,.06,1.05,trim);
  for(const x of [-.45,0,.45])for(const z of [-.44,.44])box('booth-post',x,.76,z,.055,.46,.065,trim);
  for(const x of [-.23,.23])for(const z of [-.48,.48])box('counter-panel',x,.27,z,.36,.3,.045,trim);
  for(const z of [-.44,.44]){box('window-lintel',0,.93,z,1,.1,.08,trim);
   for(let i=0;i<6;i++)cylinder('ticket-window-bar',-.18+i*.07,.76,z,.008,.32,brass);}
  box('booth-cornice',0,.99,0,1.06,.05,1.06,trim);
 }else if(kind==='cell-bars'){
  for(const y of [.05,.95])box('cell-rail',0,y,0,1,.06,.7,iron);
  for(let i=0;i<10;i++)box('vertical-cell-bar',-.46+i*.102,.5,0,.02,.9,.2,iron);
  for(const x of [-.48,.48])box('cell-frame-post',x,.5,0,.04,1,.5,iron);
  box('cell-door-lock',.32,.5,.16,.1,.08,.2,brass);box('cell-sill',0,.02,0,1,.04,1,wood);
 }else if(kind==='crate-stack'){
  for(const [x,y,z,w,h,d]of [[-.23,.25,0,.49,.5,.94],[.25,.2,.1,.46,.4,.74],[-.2,.72,-.05,.48,.43,.8]]){
   box('crate-body',x,y,z,w,h,d);for(const sy of [-1,1])box('crate-banding',x,y+sy*h*.35,z,w+.025,.035,d+.025,trim);
   for(const sx of [-1,1])box('crate-corner',x+sx*w*.42,y,z+d/2,.03,h,.03,trim);
  }
 }else if(kind==='exam-cot'){
  for(const x of [-.42,.42])for(const z of [-.4,.4])box('cot-leg',x,.3,z,.055,.6,.065,iron);
  box('cot-frame',0,.6,0,1,.12,1,trim);box('cot-mattress',0,.73,0,.92,.16,.95,porcelain);
  box('cot-pillow',0,.86,-.32,.72,.1,.23,porcelain);box('cot-linen',0,.83,.12,.93,.035,.65,fabric);
  box('cot-headboard',0,.86,-.46,.96,.25,.05,iron);
 }else if(kind==='cinema-screen'){
  const cloth=new MeshStandardMaterial({color:'#e4ddc9',roughness:1});cloth.userData.interiorRole='screen';
  for(const x of[-.48,.48])box('screen-timber-post',x,.5,0,.035,1,.8,wood);
  for(const y of[.17,.98])box('screen-timber-frame',0,y,0,1,.035,.8,wood);
  box('woven-projection-cloth',0,.58,.18,.92,.76,.06,cloth);for(const x of[-.4,.4])box('screen-foot',x,.035,0,.18,.07,1,trim);
 }else if(kind==='forge'){
  const stone=new MeshStandardMaterial({color:'#9c8d77',roughness:1});stone.userData.interiorRole='stone';
  box('masonry-base',0,.12,0,1,.24,1,stone);box('hearth-back',0,.48,-.4,1,.62,.16,stone);
  for(const x of[-.42,.42])box('brick-hearth-pier',x,.45,0,.16,.55,.9,stone);
  box('hearth-lintel',0,.72,0,1.04,.12,1,stone);box('chimney',0,.87,-.15,.46,.26,.55,stone);
  box('coal-bed',0,.26,.05,.7,.05,.6,iron);const coal=new MeshStandardMaterial({color:'#9e4319',emissive:'#bc4f15',emissiveIntensity:1.4,roughness:1});
  for(let i=0;i<9;i++){const ember=new Mesh(new SphereGeometry(.045,6,4),coal);ember.position.set((i%3-1)*.17,.31,Math.floor(i/3)*.15-.1);root.add(ember);}
  for(const x of[-.22,.22])box('firewood',x,.09,.46,.34,.1,.08,wood);
 }else if(kind==='anvil'){
  cylinder('wooden-anvil-block',0,.25,0,.3,.5,wood);box('anvil-foot',0,.53,0,.57,.1,.58,iron);box('anvil-waist',0,.68,0,.25,.24,.29,iron);box('anvil-face',-.1,.86,0,.7,.12,.4,iron);
  const horn=new Mesh(new CylinderGeometry(0,.12,.34,8),iron);horn.rotation.z=-Math.PI/2;horn.position.set(.37,.86,0);horn.name='tapered-anvil-horn';root.add(horn);box('hammer-handle',-.15,.96,0,.45,.035,.04,wood);box('hammer-head',-.35,.99,0,.12,.1,.14,iron);
 }else if(kind==='workbench'){
  feet();box('heavy-worktop',0,.55,0,1.04,.12,1,wood);box('tool-board',0,.8,-.43,.94,.4,.07,trim);box('lower-tool-shelf',0,.23,0,.9,.06,.85,wood);
  for(let i=0;i<5;i++){const x=(i-2)*.17;box('hanging-hammer-handle',x,.79,-.36,.025,.23,.035,wood);box('hanging-hammer-head',x,.92,-.36,.1,.05,.07,iron);}
  box('bench-vice',.32,.66,.28,.18,.17,.23,iron);cylinder('vice-screw',.32,.65,.43,.02,.16,iron);
 }else if(kind==='cash-register'){
  box('register-base',0,.13,0,1,.25,1,wood);box('register-body',0,.52,-.05,.88,.62,.8,brass);
  box('register-header',0,.9,-.14,.92,.18,.4,brass);box('amount-window',0,.9,.07,.69,.1,.015,iron);
  for(let row=0;row<3;row++)for(let col=0;col<6;col++)cylinder('register-key',-.33+col*.13,.4+row*.045,.38-row*.12,.025,.04,porcelain);
  box('cash-drawer-pull',0,.13,.51,.3,.045,.035,brass);
 }
 return root;
}
