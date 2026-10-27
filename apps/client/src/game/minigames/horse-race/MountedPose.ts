import{Quaternion,Vector3,type Object3D}from'three';
/** Authored seated pose on the preserved CC BY rig; no animation-source claim. */
export function poseMountedRider(root:Object3D){
 const a=new Vector3(),b=new Vector3(),direction=new Vector3(),world=new Quaternion(),parent=new Quaternion(),turn=new Quaternion();root.updateWorldMatrix(true,true);
 root.traverse(bone=>{const n=bone.name.toLowerCase();let target:Vector3|undefined;
  if(n.includes('upleg'))target=new Vector3(n.includes('left')?-.35:.35,-.4,.65);
  else if(/(leftleg|rightleg)/.test(n))target=new Vector3(0,-1,-.15);
  else if(/(leftarm|rightarm)/.test(n))target=new Vector3(n.includes('left')?-.12:.12,-.7,.65);
  else if(n.includes('forearm'))target=new Vector3(0,-.15,.85);
  if(!target||!bone.parent)return;const child=bone.children.find(c=>c.type==='Bone');if(!child)return;
  bone.getWorldPosition(a);child.getWorldPosition(b);direction.subVectors(b,a).normalize();if(direction.lengthSq()<.5)return;
  bone.getWorldQuaternion(world);bone.parent.getWorldQuaternion(parent);turn.setFromUnitVectors(direction,target.normalize());bone.quaternion.copy(parent.invert().multiply(turn).multiply(world));bone.updateWorldMatrix(false,true);
 });
}
