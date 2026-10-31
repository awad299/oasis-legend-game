import * as THREE from 'three';
// Premium tailored costume for an animated, rigged humanoid.
// Uses a high-detail CC0 humanoid base. Cloth panels and trims are original geometry.
const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
const cloth=(hex,rough=.94)=>new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:0,side:THREE.DoubleSide});
function sleeveBetween(start,end,sleeve,r=.145) {
 const m=start.clone().add(end).multiplyScalar(.5);
 sleeve.position.copy(m);
 const d=end.clone().sub(start);
 sleeve.quaternion.setFromUnitVectors(v3(0,1,0),d.clone().normalize());
 sleeve.scale.set(1,d.length(),1);
}
function robeGeometry() {
 const heights=[.18,.28,.47,.66,.94,1.22,1.55,1.8,2.07,2.22];
 const radii=[.49,.5,.47,.43,.40,.385,.36,.38,.44,.21];
 const N=56;const xyz=[],uv=[],idx=[];
 for(let j=0;j<heights.length;j++) {
  for(let i=0;i<=N;i++){
   const a=i/N*Math.PI*2;
   const folds=1+.024*Math.sin(a*17+j*.16)+.014*Math.sin(a*28+j*.11);
   const r=radii[j]*folds;
   xyz.push(Math.sin(a)*r,heights[j],Math.cos(a)*r);
   uv.push(i/N,j/(heights.length-1));
  }
 }
 for(let j=0;j<heights.length-1;j++)for(let i=0;i<N;i++){
  const k=j*(N+1)+i;idx.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function scarfPattern() {
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 g.fillStyle='#f5f0e5';g.fillRect(0,0,512,512);
 for(let i=0;i<512;i+=28) {
  g.fillStyle=i%56===0?'rgba(163,48,45,.77)':'rgba(158,65,57,.45)';
  g.fillRect(i,0,3,512);g.fillRect(0,i,512,3);
  g.strokeStyle='rgba(143,55,43,.55)';g.lineWidth=2;
  for(let j=0;j<512;j+=56){g.beginPath();g.moveTo(i-7,j+25);g.lineTo(i+20,j+5);g.stroke();}
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
function headDrapeGeometry(side) {
 const verts=[],idx=[],uv=[],segments=18,rows=12;
 // A lightweight cloth drape with two distinct hanging side panels.
 for(let j=0;j<=rows;j++) {
  const p=j/rows;const y=2.67-p*.73;const w=.16+.26*p;
  for(let i=0;i<=segments;i++) {
   const q=i/segments;
   const x=side*(.115+q*w);
   const z=.18-p*.12-.09*Math.sin(q*Math.PI)+.035*Math.cos(q*11+p*4);
   verts.push(x,y+.024*Math.sin(q*7+p*8),z);
   uv.push(q*1.5,p*1.5);
  }
 }
 for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){
  const k=j*(segments+1)+i;idx.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const textureScarf=scarfPattern();
const robeMat=cloth(0xece4d5),shadowMat=cloth(0xe4d9c6);
const cuffMat=cloth(0xd6c3a5),black=cloth(0x24221d,.5);
function addMesh(parent,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function makeGroundShadow(scene,player){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const grad=g.createRadialGradient(64,64,3,64,64,62);
 grad.addColorStop(0,'rgba(35,27,18,.47)');grad.addColorStop(.5,'rgba(35,27,18,.24)');grad.addColorStop(1,'rgba(35,27,18,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);
 const t=new THREE.CanvasTexture(c);const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 const o=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.25),m);o.rotation.x=-Math.PI/2;o.position.y=.031;scene.add(o);
 return dt=>{o.position.x=player.position.x;o.position.z=player.position.z;o.material.opacity=Math.max(.15,.95-player.position.y*.16);o.scale.setScalar(1+player.position.y*.11)};
}
export function attachSaudiHero({target,model,scene,clipName='walk',quality='medium',variant='man',color=0xece4d5}){
 const robeRoot=new THREE.Group();robeRoot.name='Saudi_thobe';target.add(robeRoot);
 const costume={root:robeRoot,mode:'full',model,source:'CC0 high-detail humanoid with procedural Saudi thobe and shemagh'};
 const outfitMat=variant==='woman'?cloth(0x1f2526):cloth(color);
 const robe=addMesh(robeRoot,robeGeometry(),outfitMat);
 const baseHem=robe.geometry.attributes.position.array.slice();
 const hemPos=robe.geometry.attributes.position;
 // Cloth is driven each frame by the animated hip/ankle skeleton, not a static rigid cylinder.
 const hemTrim=addMesh(robeRoot,new THREE.TorusGeometry(.49,.012,5,56),variant==='woman'?cloth(0x404b4c):cuffMat,0,.20,0);hemTrim.rotation.x=Math.PI/2;
 // Under-layer fills the garment opening so hidden thighs never flash through at a long stride.
 const liner=addMesh(robeRoot,new THREE.CylinderGeometry(.43,.455,.34,40,1,true),outfitMat,0,.24,0);
 liner.castShadow=false;

 const collar=addMesh(robeRoot,new THREE.TorusGeometry(.17,.026,8,28),cuffMat,0,2.175,-.05);collar.rotation.x=Math.PI/2;
 // Tailored placket and pearl buttons (front is -Z in this runtime).
 const placket=addMesh(robeRoot,new THREE.BoxGeometry(.043,.5,.018),cuffMat,0,1.94,-.37);
 for(let i=0;i<4;i++)addMesh(robeRoot,new THREE.SphereGeometry(.019,10,8),cloth(0xf5ecda,.5),0,1.78+i*.12,-.392);
 const sleeveGeo=new THREE.CylinderGeometry(.155,.125,1,18,5);
 const sleeves=[addMesh(robeRoot,sleeveGeo,outfitMat),addMesh(robeRoot,sleeveGeo,outfitMat)];
 const cuffs=[addMesh(robeRoot,new THREE.TorusGeometry(.135,.024,8,18),cuffMat),addMesh(robeRoot,new THREE.TorusGeometry(.135,.024,8,18),cuffMat)];
 const headBand=addMesh(robeRoot,new THREE.TorusGeometry(.285,.047,9,40),black,0,2.79,0);headBand.visible=variant!=='woman';
 headBand.rotation.x=Math.PI/2;
 const headCloth=variant==='woman'?new THREE.MeshStandardMaterial({color:0x222b32,roughness:.92,side:THREE.DoubleSide}):new THREE.MeshStandardMaterial({map:textureScarf,color:0xffffff,side:THREE.DoubleSide,roughness:.95});
 const cap=addMesh(robeRoot,new THREE.SphereGeometry(.295,26,12,0,Math.PI*2,0,Math.PI*.57),headCloth,0,2.7,0);
 const drapeMat=variant==='woman'?headCloth:new THREE.MeshStandardMaterial({map:textureScarf,color:0xffffff,roughness:1,side:THREE.DoubleSide});
 const drapes=[addMesh(robeRoot,headDrapeGeometry(-1),drapeMat),addMesh(robeRoot,headDrapeGeometry(1),drapeMat)];
 const bones={};
 model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
 const temp=new THREE.Vector3(),temp2=new THREE.Vector3();
 // Real leg mesh is inside the thobe. Remove occluded lower-leg triangles
 // from a *clone* of the skinned geometry; keep face, hands, forearms visible.
 // This prevents the leg from protruding through the moving robe.
 const removedParts=[];
 model.traverse(o=>{
  if(!o.isSkinnedMesh||!o.geometry?.getAttribute('position'))return;
  const geometry=o.geometry.clone(),position=geometry.getAttribute('position');
  const idx=geometry.index,indices=idx?Array.from(idx.array):Array.from({length:position.count},(_,i)=>i);
  const kept=[];
  for(let i=0;i<indices.length;i+=3){
   let lower=0,inner=0;
   for(let j=0;j<3;j++){
    const vi=indices[i+j],x=position.getX(vi),y=position.getY(vi);
    if(y<.97)lower++;
    if(Math.abs(x)<.38)inner++;
   }
   if(lower>=2&&inner>=2)continue;
   kept.push(indices[i],indices[i+1],indices[i+2]);
  }
  if(kept.length>0&&kept.length<indices.length){
   geometry.setIndex(kept);geometry.computeBoundingSphere();
   o.geometry=geometry;removedParts.push({before:indices.length/3,after:kept.length/3});
  }
 });
 const sandals=[];
 // Small contact shadows let the player perceive alternating weight on sand.
 const footShadows=[];
 const shadowTextureCanvas=document.createElement('canvas');
 shadowTextureCanvas.width=shadowTextureCanvas.height=64;
 const shadowCtx=shadowTextureCanvas.getContext('2d');
 const shadowGrad=shadowCtx.createRadialGradient(32,32,3,32,32,31);
 shadowGrad.addColorStop(0,'rgba(45,31,18,.36)');
 shadowGrad.addColorStop(.65,'rgba(45,31,18,.16)');
 shadowGrad.addColorStop(1,'rgba(45,31,18,0)');
 shadowCtx.fillStyle=shadowGrad;shadowCtx.fillRect(0,0,64,64);
 const soleShadowTex=new THREE.CanvasTexture(shadowTextureCanvas);
 for(let i=0;i<2;i++){
   const shoeShadow=new THREE.Mesh(
     new THREE.PlaneGeometry(.34,.50),
     new THREE.MeshBasicMaterial({map:soleShadowTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3})
   );
   shoeShadow.rotation.x=-Math.PI/2;shoeShadow.position.y=.045;
   scene.add(shoeShadow);footShadows.push(shoeShadow);
 }
 const baseModelPosition=model.position.clone();
 const baseModelRotationZ=model.rotation.z;
 const footState=[{z:0,lift:0,stance:true},{z:0,lift:0,stance:true}];
 let currentGait=0, currentWeight=0;
 function contactFoot(phase,offset,stepSize,stepLift) {
  const angle=((phase+offset)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  if(angle<=Math.PI){
   // During stance, the ground-contact point travels BACKWARD relative to
   // the advancing root at the same linear speed, creating a planted foot.
   return {z:-stepSize*.5+stepSize*(angle/Math.PI),lift:0,stance:true};
  }
  const q=(angle-Math.PI)/Math.PI;
  const ease=q*q*(3-2*q);
  return {z:stepSize*.5-stepSize*ease,lift:stepLift*Math.pow(Math.sin(q*Math.PI),1.2),stance:false};
 }

 for(const side of [-1,1]){
  const shoe=addMesh(robeRoot,new THREE.CapsuleGeometry(.103,.12,4,8),cloth(0x65432f,.7),side*.24,.09,-.13);
  shoe.scale.set(1,.36,1.75);sandals.push(shoe);
 }

 function getPosition(bone,fall) {
  if(!bone)return fall.clone();
  bone.getWorldPosition(temp);
  return robeRoot.worldToLocal(temp.clone());
 }
 function tick(dt,elapsed,activity=0,gaitPhase=0,runMix=0){
  const footL=getPosition(bones.LeftFoot,v3(-.22,.1,0));
  const footR=getPosition(bones.RightFoot,v3(.22,.1,0));
  const hip=getPosition(bones.Hips,v3(0,1.28,0));
  const amount=Math.max(0,Math.min(1,activity));
  currentGait=gaitPhase;currentWeight=amount;
  const runAmount=Math.max(0,Math.min(1,runMix));
  const footDistance=.86+runAmount*.23;
  for(let j=0;j<2;j++){
    const target=contactFoot(gaitPhase,j*Math.PI,footDistance,.135+runAmount*.075);
    const blend=.2+amount*.8;
    footState[j]={z:target.z*blend,lift:target.lift*blend,stance:target.stance};
  }
  // Hips/cloth shift from one supporting leg to the other, instead of rigidly
  // sliding the entire silhouette over the ground.
  const sway=(Math.sin(gaitPhase)*.033+Math.sin(gaitPhase+Math.PI*.5)*.009)*amount;
  // Short double-support bounce: torso moves while each sole remains grounded.
  const bob=(.018+.029*(.5+.5*Math.cos(2*gaitPhase)))*amount;
  const lateral=.018*Math.sin(gaitPhase)*amount;
  robeRoot.position.y=bob;
  robeRoot.position.x=lateral;
  model.position.y=baseModelPosition.y+bob;
  model.position.x=baseModelPosition.x+lateral;
  model.rotation.z=baseModelRotationZ+sway*.20;
  robeRoot.rotation.z=sway*.42;
  robe.rotation.z=sway*.5;
  robe.rotation.x=.014*Math.sin(gaitPhase*2)*amount;
  const positions=hemPos.array;
  for(let i=0;i<positions.length;i+=3){
   const x=baseHem[i],y=baseHem[i+1],z=baseHem[i+2];
   const heightEffect=Math.pow(Math.max(0,(1.25-y)/1.12),1.4);
   const side=x<0?0:1;
   const foot=side===0?footL:footR;
   const theta=Math.atan2(x,z);
   const flutter=(.009*Math.sin(theta*9+gaitPhase*1.4)+.014*Math.sin(theta*4-gaitPhase))*heightEffect*amount;
   const legF=(footState[side].z*.43+Math.max(-.07,Math.min(.07,foot.z*.025)))*heightEffect*amount;
   positions[i]=x+Math.min(.04,Math.max(-.04,foot.x*.05))*heightEffect*amount;
   positions[i+1]=y+(Math.sin(theta*7+gaitPhase)*.012+footState[side].lift*.22)*heightEffect*amount;
   positions[i+2]=z+(legF+flutter)*heightEffect;
  }
  hemPos.needsUpdate=true;robe.geometry.computeVertexNormals();
  hemTrim.position.z=(footL.z+footR.z)*.035;
  const shadowPoint=new THREE.Vector3();
  for(let i=0;i<2;i++){
   const f=i===0?footL:footR;
   const contact=footState[i];
   // The shoe sole can now peek from the front/back of the thobe at each stride.
   // Shoes are counter-offset against torso bob so they do not hover with the chest.
   sandals[i].position.set(
    (i===0?-.265:.265)+Math.min(.02,Math.max(-.02,f.x*.025))*amount-lateral,
    .073+contact.lift-bob,
    -.10+contact.z*1.32
   );
   sandals[i].rotation.x=contact.stance?0:-Math.sin((gaitPhase+i*Math.PI)%(Math.PI*2))*.17*amount;
   sandals[i].updateWorldMatrix(true,false);
   sandals[i].getWorldPosition(shadowPoint);
   footShadows[i].position.set(shadowPoint.x,.043,shadowPoint.z);
   footShadows[i].rotation.z=target.rotation.y;
   footShadows[i].material.opacity=amount*(contact.stance?.86:.16);
  }
  if(bones.LeftArm&&bones.LeftHand&&bones.RightArm&&bones.RightHand){
   for(const [k,side] of ['Left','Right'].entries()){
    const shoulder=getPosition(bones[side+'Arm'],v3(side==='Left'?.55:-.55,2.05,0));
    const wrist=getPosition(bones[side+'Hand'],v3(side==='Left'?.73:-.73,1.2,0));
    let start=shoulder.clone().lerp(wrist,-.09),end=shoulder.clone().lerp(wrist,.93);
    sleeveBetween(start,end,sleeves[k]);
    cuffs[k].position.copy(end);
    cuffs[k].quaternion.copy(sleeves[k].quaternion); // normal of torus is Z; align after.
    cuffs[k].rotateX(Math.PI/2);
   }
  }else{
   sleeveBetween(v3(-.45,2.1,0),v3(-.85,1.42,0),sleeves[0]);sleeveBetween(v3(.45,2.1,0),v3(.85,1.42,0),sleeves[1]);
  }
  // Keep scarf aligned to the animated head rather than world.
  const head=getPosition(bones.Head,v3(0,2.57,0));
  const off=head.clone().sub(v3(0,2.55,0));
  cap.position.set(off.x,2.7+off.y,off.z);
  headBand.position.set(off.x,2.79+off.y,off.z);
  for(const o of drapes)o.position.copy(off);
 }
 const shadow=makeGroundShadow(scene,target);
 return {...costume,removedParts,variant,getGait:()=>({phase:currentGait,weight:currentWeight,feet:footState.map((f,i)=>({...f,shoe:sandals[i].position.toArray()}))}),tick:(dt,t,activity=0,phase=0,runMix=0)=>{tick(dt,t,activity,phase,runMix);shadow(dt);}};
}

