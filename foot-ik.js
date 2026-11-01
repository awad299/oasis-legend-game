import * as THREE from 'three';

// Ground-contact correction on the actual thigh/knee/ankle joints.
// This is a post-animation two-bone IK pass, not moving a shoe proxy on its own.
export function createFootIK(model) {
 const skinned=model.getObjectByProperty('type','SkinnedMesh');
 if(!skinned?.skeleton)throw new Error('Foot IK requires skinned humanoid');
 const find=name=>skinned.skeleton.bones.find(b=>b.name===name);
 const legs=[
  {upper:find('LeftUpLeg'),knee:find('LeftLeg'),foot:find('LeftFoot'),phase:0},
  {upper:find('RightUpLeg'),knee:find('RightLeg'),foot:find('RightFoot'),phase:Math.PI}
 ];
 if(legs.some(l=>!l.upper||!l.knee||!l.foot))throw new Error('Foot IK bones missing');
 const vec=()=>new THREE.Vector3(),quat=()=>new THREE.Quaternion();
 for(const leg of legs){
  leg.anchored=false;leg.contact=vec();leg.lastStance=false;leg.error=0;leg.applied=0;
 }
 const pJoint=vec(),pFoot=vec(),a=vec(),b=vec(),dq=quat(),qWorld=quat(),qParent=quat(),baseFootQ=quat(),identity=quat();
 let debug={active:false,feet:[]};
 function solveJoint(joint,end,target,weight){
  joint.updateWorldMatrix(true,true);
  end.getWorldPosition(pFoot);joint.getWorldPosition(pJoint);
  a.subVectors(pFoot,pJoint);b.subVectors(target,pJoint);
  if(a.lengthSq()<1e-9||b.lengthSq()<1e-9)return;
  a.normalize();b.normalize();
  dq.setFromUnitVectors(a,b);
  dq.slerp(identity,1-Math.min(1,Math.max(0,weight)));
  joint.getWorldQuaternion(qWorld);
  qWorld.premultiply(dq);
  joint.parent.getWorldQuaternion(qParent);
  joint.quaternion.copy(qParent.invert().multiply(qWorld)).normalize();
  joint.updateWorldMatrix(false,true);
 }
 function update({phase,weight=0,dt=1/60,groundY=0}) {
  const amount=Math.max(0,Math.min(1,weight));
  model.updateWorldMatrix(true,true);
  for(const leg of legs){
   const aPhase=((phase+leg.phase)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
   const stance=aPhase<=Math.PI*.84;
   leg.foot.getWorldPosition(pFoot);
   const ankleHeight=groundY+.145;
   if(stance&&!leg.lastStance){
    leg.contact.set(pFoot.x,ankleHeight,pFoot.z);
    leg.anchored=true;
   }
   if(!stance||amount<=.05){leg.anchored=false;if(amount<=.05)leg.lastStance=false;}
   leg.lastStance=stance;
   leg.error=0;leg.applied=0;
   if(amount>.05 && leg.anchored) {
    // A planted foot has a fixed WORLD-space position while the root advances.
    const desired=leg.contact;
    leg.foot.getWorldQuaternion(baseFootQ);
    for(let i=0;i<12;i++){
      solveJoint(leg.knee,leg.foot,desired,amount);
      solveJoint(leg.upper,leg.foot,desired,amount);
    }
    leg.foot.getWorldPosition(pFoot);
    leg.error=pFoot.distanceTo(desired);
    leg.applied=amount;
    // Preserve the ankle's natural horizontal orientation after knee/hip correction.
    leg.foot.parent.getWorldQuaternion(qParent);
    leg.foot.quaternion.copy(qParent.invert().multiply(baseFootQ)).normalize();
   }
  }
  debug={active:amount>.05,feet:legs.map(l=>({stance:l.lastStance,anchored:l.anchored,contact:l.contact.toArray(),error:l.error,applied:l.applied,ankle:(()=>{const pos=vec();l.foot.getWorldPosition(pos);return pos.toArray();})()}))};
  return debug;
 }
 return {update,getState:()=>debug,legs};
}

