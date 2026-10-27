import {test} from 'node:test';import assert from 'node:assert/strict';
import {clipToCell,makeHeightSampler,makeGapSurface,makeGroundRibbon,loadNativeTerrainSurface} from './prepare-authored-landscape.mjs';

test('native render coverage includes slopes excluded from walking support',async()=>{
 const primitive={getAttribute:()=>({getArray:()=>[0,0,0,0,4,1,1,0,0]}),getIndices:()=>({getArray:()=>[0,1,2]})};
 const node={getMesh:()=>({listPrimitives:()=>[primitive]}),getName:()=> 'native-slope',getWorldMatrix:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};
 const io={readBinary:async()=>({getRoot:()=>({listNodes:()=>[node]})})};
 const manifest={placements:[{asset:'package.json',layer:'terrain',position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}}]};
 const coverage=await loadNativeTerrainSurface(io,manifest,'.'),walking=await loadNativeTerrainSurface(io,manifest,'.',{minNormalY:.65});
 assert.ok(Math.abs(coverage.source(.2,.2)-.8)<1e-6);assert.equal(walking.source(.2,.2),undefined);
});

test('gap boundary triangles do not bridge high over curved native terrain',()=>{
 const source=(x,z)=>x<1?20+24*x*x:undefined;
 const data=makeGapSurface([{x:0,z:0},{x:2,z:0},{x:2,z:2},{x:0,z:2}],source,(x,z)=>20+24*x*x,2);
 for(let i=0;i<data.positions.length;i+=9){const p=data.positions.slice(i,i+9),x=(p[0]+p[3]+p[6])/3,z=(p[2]+p[5]+p[8])/3,native=source(x,z);
  assert.equal(native,undefined,'gap mesh must be clipped to the uncovered side of a native edge');}
 assert.ok(data.positions.length>0);
});
test('gap geometry clips to project boundary and retains original terrain coverage',()=>{
 const polygon=[{x:0,z:0},{x:6,z:0},{x:6,z:6},{x:0,z:6}];
 const source=(x,z)=>x<=2?10+z*.1:undefined;
 const sample=makeHeightSampler([{x:0,z:0,y:10},{x:2,z:0,y:10},{x:0,z:6,y:10.6},{x:2,z:6,y:10.6}],source);
 assert.equal(sample(1,3),10.3);assert.ok(sample(4,3)>10&&sample(4,3)<10.6);
 const surface=makeGapSurface(polygon,source,sample,2);
 assert.ok(surface.positions.length>0);
 for(let i=0;i<surface.positions.length;i+=3){assert.ok(surface.positions[i]>=2&&surface.positions[i]<=6);assert.ok(surface.positions[i+2]>=0&&surface.positions[i+2]<=6);}
 const fullyCovered=makeGapSurface(polygon,()=>11,()=>11,2);assert.equal(fullyCovered.positions.length,0);
});
test('cell clipping retains sloped boundary intersections without outside corners',()=>{
 const result=clipToCell([{x:0,z:0},{x:5,z:0},{x:0,z:5}],2,2,4,4);
 assert.ok(result.length>=3);for(const p of result){assert.ok(p.x>=2&&p.x<=4&&p.z>=2&&p.z<=4);assert.ok(p.x+p.z<=5+1e-8);}
});
test('missing source support cannot become an invented sea-level floor',()=>{
 assert.throws(()=>makeHeightSampler([],()=>undefined),/height samples/);
});

test('gap heights approach nearby native edges instead of a distant raster average',()=>{
 const source=(x,z)=>x<0?(x>-.5?10:14):undefined;
 const sample=makeHeightSampler([{x:-2,z:-1,y:14},{x:-2,z:1,y:14}],source);
 assert.ok(sample(.02,0)<10.5,'narrow native gutter must not be buried by a coarse height raster');
});
test('wide roads sample the curved ground across their width, not only at their edges',()=>{
 const data=makeGroundRibbon([{x:0,z:0},{x:3,z:0}],5.5,(x,z)=>10+z*z*.1);
 const vertices=[];for(let i=0;i<data.positions.length;i+=3)vertices.push(data.positions.slice(i,i+3));
 assert.ok(vertices.some(([x,y,z])=>Math.abs(z)<.5&&y<10.15),'central road surface follows ground instead of bridging between raised edges');
});

test('road UVs remain continuous between adjacent cross-width subdivisions',()=>{
 const data=makeGroundRibbon([{x:0,z:0},{x:3,z:0}],5.5,()=>10);
 const byPosition=new Map();
 for(let i=0;i<data.positions.length/3;i++){
  const key=data.positions.slice(i*3,i*3+3).map(v=>v.toFixed(6)).join(','),uv=data.uv.slice(i*2,i*2+2);
  if(byPosition.has(key))assert.deepEqual(uv,byPosition.get(key),'shared vertex must use the same source texel');
  else byPosition.set(key,uv);
 }
});

test('feathered road borders fade onto existing terrain without punching holes in the centre',()=>{
 const data=makeGroundRibbon([{x:0,z:0},{x:3,z:0}],5.5,()=>10,0,.035,.8);
 assert.equal(data.colors?.length,data.positions.length/3*4);
 for(let i=0;i<data.positions.length/3;i++){
  const z=data.positions[i*3+2],alpha=data.colors[i*4+3];
  if(Math.abs(z)>2.74)assert.equal(alpha,0);
  if(Math.abs(z)<1.8)assert.equal(alpha,1);
  assert.ok(alpha>=0&&alpha<=1);
 }
 const rail=makeGroundRibbon([{x:0,z:0},{x:3,z:0}],.085,()=>10);
 assert.equal(rail.colors,undefined,'rail heads do not inherit transparent road borders');
});
