import {expect,it} from 'vitest';
import {BoxGeometry,Color,Group,Mesh,MeshStandardMaterial} from 'three';
import {tintRivalHorse} from './RivalAppearance';

it('keeps a group-less glTF primitive renderable without tinting shared source materials',()=>{
 const geometry=new BoxGeometry();geometry.clearGroups();const material=new MeshStandardMaterial({color:'#ffffff'}),horse=new Mesh(geometry,material),sibling=new Mesh(geometry,material),root=new Group();root.add(horse);
 tintRivalHorse(root,new Color('#808080'));
 expect(Array.isArray(horse.material)).toBe(false);expect(horse.material).not.toBe(material);expect((horse.material as MeshStandardMaterial).color.getHexString()).toBe('808080');expect(sibling.material.color.getHexString()).toBe('ffffff');expect(geometry.groups).toHaveLength(0);
});
it('retains multi-material slots and their geometry group indices',()=>{
 const geometry=new BoxGeometry(),materials=[new MeshStandardMaterial(),new MeshStandardMaterial()],horse=new Mesh(geometry,materials),groups=geometry.groups.map(g=>({...g}));tintRivalHorse(horse,new Color('#b5a286'));
 expect(Array.isArray(horse.material)).toBe(true);expect(horse.material).toHaveLength(2);expect(horse.material[0]).not.toBe(materials[0]);expect(geometry.groups).toEqual(groups);
});
