import {afterEach,expect,it,vi} from 'vitest';
import {loadValentineManifest} from './ManifestLoader';
afterEach(()=>{vi.unstubAllGlobals();});
const placement={id:'same-house',asset:'models/house.glb',layer:'buildings',lod:0,chunkId:'0:0',position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}};
it('rejects duplicate placement identities even at different source positions',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({version:1,world:'valentine',placements:[placement,{...placement,position:{x:3,y:0,z:0}}]})})));
 await expect(loadValentineManifest()).rejects.toThrow(/duplicate/i);
});
