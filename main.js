import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {attachSaudiHero} from './saudi-hero.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// LEGEND OF THE OASIS — original browser adventure, built for touch and desktop.
const $ = id => document.getElementById(id);
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 750;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb6c7b2, .0105);
const camera = new THREE.PerspectiveCamera(isMobile ? 64 : 63, 1, .12, 200);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.10;
renderer.setClearColor(0x9ed4d2);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').append(renderer.domElement);
let quality=localStorage.getItem('oasis_quality') || 'medium';
if(!['low','medium','high'].includes(quality))quality='medium';
$('quality').value=quality;
let sensitivity=Number(localStorage.getItem('oasis_sensitivity')||1);
$('sensitivity').value=sensitivity;
let soundOn=true, active=false, inDialog=false, isRunning=false, night=false, finished=false, t=0, toastEnd=0;
let collected = new Set();
try{const p=JSON.parse(localStorage.getItem('oasis_progress')||'{}');collected=new Set(p.crystals||[]);finished=!!p.finished;}catch{}
const AR=n=>String(n).replace(/\d/g,x=>'٠١٢٣٤٥٦٧٨٩'[Number(x)]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=(a,b,delta)=>a+(b-a)*clamp(delta,0,1);
const rand=(a,b)=>a+Math.random()*(b-a);
let seed=764831;function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const R=(a,b)=>a+rnd()*(b-a);
const MAT={};
function mat(c,rough=.9,metal=0){const key=c+'/'+rough+'/'+metal;return MAT[key]||(MAT[key]=new THREE.MeshStandardMaterial({color:c,roughness:rough,metalness:metal}));}
const sand=mat(0xc9ac78), stone=mat(0xe3c69a), pale=mat(0xeed7b0), brick=mat(0xc58f64), dark=mat(0x4b5242), wood=mat(0x734934), bronze=mat(0xb99b60,.5,.45), deepgreen=mat(0x255b4e), turquoise=mat(0x297f81,.45,.25), leafDark=mat(0x315b35), leafLight=mat(0x66834a), gold=mat(0xf4c76b,.35,.35), black=mat(0x222c2c);
function mesh(geo,m,x=0,y=0,z=0,parent=scene,cast=true){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=true;parent.add(o);return o;}
function B(w,h,d,m,x,y,z,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
function S(r,m,x,y,z,parent=scene,ws=12,hs=8){return mesh(new THREE.SphereGeometry(r,ws,hs),m,x,y,z,parent);}
function C(rt,rb,h,m,x,y,z,parent=scene,seg=10){return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m,x,y,z,parent);}
function torus(r,t,m,x,y,z,parent=scene){const o=mesh(new THREE.TorusGeometry(r,t,6,26),m,x,y,z,parent);o.rotation.x=Math.PI/2;return o;}
function plane(w,h,m,x,y,z,parent=scene){const o=mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,parent,false);o.rotation.x=-Math.PI/2;return o;}
function line(points,r,m,parent=scene){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*4),r,5,false),m,0,0,0,parent);}
function materialTexture(base,variation,lines=false){const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.fillStyle=base;c.fillRect(0,0,256,256);for(let i=0;i<3000;i++){let g=Math.round(R(0,255)),sz=R(.4,2.8);c.fillStyle='rgba('+g+','+g+','+g+','+R(.009,.036)+')';c.fillRect(R(0,256),R(0,256),sz,sz);}if(lines){for(let y=0;y<256;y+=47){c.fillStyle=variation;c.fillRect(0,y,256,2);for(let x=(y%94?35:0);x<256;x+=70)c.fillRect(x,y,2,45);}}const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);return tex;}
const wallMat=new THREE.MeshStandardMaterial({map:materialTexture('#d2b18a','#ad8c6a',true),color:0xffffff,roughness:1});
const wallLight=new THREE.MeshStandardMaterial({map:materialTexture('#ddc39d','#baa184',false),color:0xffffff,roughness:1});
const pavement=new THREE.MeshStandardMaterial({map:materialTexture('#dfbd90','#bb9164',true),roughness:1});pavement.map.repeat.set(7,45);
const sandTex=new THREE.MeshStandardMaterial({map:materialTexture('#c8a46b','#c8a46b',false),roughness:1});sandTex.map.repeat.set(24,24);

const hemi=new THREE.HemisphereLight(0xd7f2ff,0x8b6341,1.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffddad,2.8);sun.position.set(-36,57,-26);sun.castShadow=true;sun.shadow.camera.left=-58;sun.shadow.camera.right=58;sun.shadow.camera.top=58;sun.shadow.camera.bottom=-58;sun.shadow.camera.near=.2;sun.shadow.camera.far=130;sun.shadow.bias=-.00022;sun.shadow.normalBias=.018;scene.add(sun);scene.add(sun.target);
const skyG=new THREE.SphereGeometry(175,30,15);
const skyM=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x4b9ebd)},middle:{value:new THREE.Color(0x99d3d6)},bottom:{value:new THREE.Color(0xf4d8a1)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform vec3 top,middle,bottom;void main(){float h=normalize(vP).y;vec3 col=mix(bottom,middle,smoothstep(-.2,.26,h));col=mix(col,top,smoothstep(.16,.96,h));gl_FragColor=vec4(col,1.);}'});
const sky=mesh(skyG,skyM,0,0,0,scene,false);
const sunDisc=S(7,new THREE.MeshBasicMaterial({color:0xfff2cb,fog:false}),-80,58,-100,scene,14,10);
function applyQuality(){
 const low=quality==='low',high=quality==='high';
 renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:high?1.8:isMobile?1.25:1.55));
 renderer.shadowMap.enabled=!low;
 sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);
 sun.shadow.map?.dispose();sun.shadow.map=null;
 if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
 resize();
}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.fov=isMobile?Math.max(61,Math.min(75,62+Math.max(0,640-innerHeight)*.01)):63;camera.updateProjectionMatrix();}
addEventListener('resize',resize);
applyQuality();

// Wispy high-altitude cloud layers soften the empty horizon.
const cloudCanvas=document.createElement('canvas');cloudCanvas.width=cloudCanvas.height=128;
const cloudCtx=cloudCanvas.getContext('2d'),cloudFade=cloudCtx.createRadialGradient(64,64,4,64,64,64);
cloudFade.addColorStop(0,'rgba(255,251,233,.88)');cloudFade.addColorStop(.43,'rgba(255,250,230,.44)');cloudFade.addColorStop(1,'rgba(255,250,230,0)');
cloudCtx.fillStyle=cloudFade;cloudCtx.fillRect(0,0,128,128);
const cloudTexture=new THREE.CanvasTexture(cloudCanvas);
const clouds=[];for(let i=0;i<11;i++){const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTexture,transparent:true,depthWrite:false,opacity:R(.22,.42)}));sprite.position.set(R(-85,85),R(28,46),R(-103,-55));sprite.scale.set(R(19,35),R(5,10),1);scene.add(sprite);clouds.push(sprite);}
// Ground, layered paths, tiling and distant mountains
plane(230,230,sandTex,0,-.12,0);
const road=mat(0xd5b78d);
// Physically based sandstone plaster and courtyard paving (ambientCG, CC0).
const textureLoader=new THREE.TextureLoader();
function pbrTexture(name,kind,rx=3,ry=3){
 const t=textureLoader.load(import.meta.env.BASE_URL+'textures/'+name+'_'+kind+'.webp');
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;
 if(kind==='albedo')t.colorSpace=THREE.SRGBColorSpace;
 return t;
}
function installPBR(mat,name,rx,ry,tint){
 mat.map=pbrTexture(name,'albedo',rx,ry);
 mat.normalMap=pbrTexture(name,'normal',rx,ry);
 mat.normalScale.set(.24,.24);
 mat.roughnessMap=pbrTexture(name,'rough',rx,ry);
 mat.roughness=.94;mat.color.setHex(tint);mat.needsUpdate=true;
}
installPBR(wallMat,'Plaster001',3,2,0xdfb98d);
installPBR(wallLight,'Plaster001',3,2,0xe6cba2);
pavement.map=pbrTexture('OasisCourtyard','albedo',5,23);
pavement.normalMap=pbrTexture('OasisCourtyard','normal',5,23);
pavement.normalScale.set(.18,.18);pavement.roughness=.98;pavement.color.setHex(0xfff5e5);pavement.needsUpdate=true;

plane(9,95,pavement,0,-.074,-4);plane(77,9,pavement,0,-.073,-9);
plane(57,6,pavement,0,-.069,17);plane(7,38,pavement,20,-.068,9);
plane(7,34,pavement,-20,-.068,8);
for(let i=0;i<320;i++){let x=R(-59,59),z=R(-57,58);if(Math.abs(x)<5||Math.abs(z+9)<6||Math.abs(z-17)<5)continue;
 let rock=B(R(.2,.6),R(.04,.14),R(.3,.6),mat(i%2?0xdab88a:0xbe9d70),x,.04,z);rock.rotation.y=R(0,6);rock.castShadow=false;}
// Broad multi-layer dune ridges instead of triangular cone-shaped mountains.
function duneRidge(radius,frequency,baseColor){
 const count=116,rows=4,positions=[],colors=[],indices=[];
 const colorA=new THREE.Color(baseColor),colorB=colorA.clone().multiplyScalar(.84);
 for(let i=0;i<=count;i++){
  const a=i/count*Math.PI*2;
  const waves=Math.sin(a*3.7+frequency)*.45+Math.sin(a*8.1+frequency*2)*.22+Math.sin(a*15.6+frequency*3)*.08;
  const peak=13+waves*15;
  const heights=[-.6,peak*.22,peak,1.3],radial=[radius-9,radius-1,radius+6,radius+13];
  for(let j=0;j<rows;j++){positions.push(Math.sin(a)*radial[j],heights[j],Math.cos(a)*radial[j]);const c=colorA.clone().lerp(colorB,j/3);colors.push(c.r,c.g,c.b);}
 }
 for(let i=0;i<count;i++)for(let j=0;j<rows-1;j++){let a=i*rows+j,b=a+rows;indices.push(a,b,a+1,b,b+1,a+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const ridge=mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide,flatShading:false}),0,-2,0);ridge.castShadow=false;
}
duneRidge(132,1.3,0xa19b86);
duneRidge(165,2.7,0x778f91);
const plaza=plane(29,29,mat(0xd2b38a),0,-.047,-7);plaza.material.side=THREE.DoubleSide;
for(let i=0;i<80;i++){let a=R(0,Math.PI*2),r=R(5,15),x=Math.sin(a)*r,z=-7+Math.cos(a)*r;
 if(r<5)continue;let tile=B(R(.65,2.1),.08,R(.5,1.5),mat(i%3===0?0xe5c79e:0xc5a783),x,.012,z);tile.rotation.y=a;tile.castShadow=false;}

// City bounds and colliders
const blockers=[];
function blockAt(x,z,w,d,pad=.35){blockers.push({x,z,hw:w/2+pad,hd:d/2+pad});}
function collide(x,z){for(const b of blockers){if(Math.abs(x-b.x)<b.hw+.43&&Math.abs(z-b.z)<b.hd+.43)return true;}return x<-55||x>55||z<-59||z>54;}

// Ornamented mudbrick houses and arcades
const houseColors=[0xe6c99d,0xcda681,0xd6ad86,0xdac096,0xc9a17e];
function windowOn(g,x,y,z,front=true){
 const p=B(1.03,1.35,.13,dark,x,y,z,g);p.castShadow=false;
 B(.78,1.1,.16,wood,x,y,z+(front?.1:-.1),g);
 B(.075,1.22,.21,bronze,x,y,z+(front?.2:-.2),g);
 B(.8,.09,.22,bronze,x,y+.02,z+(front?.22:-.22),g);
 let arch=C(.55,.55,.12,brick,x,y+.74,z,g,12);arch.rotation.x=Math.PI/2;arch.castShadow=false;
}
function house(x,z,w,d,h,style=0,rotation=0){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);
 const m=style%3===0?wallMat:style%3===1?wallLight:mat(houseColors[style%houseColors.length]);
 B(w,h,d,m,0,h/2,0,g);
 B(w+.6,.32,d+.65,mat(style%2?0xb17c58:0xaf886a),0,h+.08,0,g);
 B(w+.42,.37,.29,brick,0,h*.23,d/2+.09,g);
 const dw=1.55;B(dw,2.6,.18,wood,0,1.32,d/2+.18,g);
 B(dw+.35,.25,.32,mat(0xd4bb91),0,2.72,d/2+.15,g);
 B(.15,2.5,.4,mat(0x6c4536),-.78,1.32,d/2+.21,g);
 S(.085,bronze,.42,1.25,d/2+.29,g,8,6);
 for(let i=-1;i<=1;i+=2){windowOn(g,i*(w*.29),h*.64,d/2+.11);}
 for(let i=-1;i<=1;i+=2){B(.2,.8,.36,bronze,i*(w*.41),h+.3,0,g);}
 for(let i=0;i<Math.floor(w/1.2);i++){let px=-w/2+.7+i*1.2;
  B(.6,.24,.16,mat(0xe5c28e),px,h-.23,d/2+.12,g);}
 for(let i=0;i<3;i++){let dx=(i-1)*w*.29;
  B(.13,.55,.13,wood,dx,h+.45,-d*.24,g);}
 blockAt(x,z,w,d);
 return g;
}
// Main lanes and village skyline
[
[-30,-27,12,13,7,0],[-33,-7,13,12,6,1],[-32,13,11,12,9,2],
[-34,34,15,12,6,0],[-13,32,13,11,8,2],[8,32,14,11,7,1],
[33,33,13,13,9,0],[35,6,13,14,7,2],[34,-23,13,14,8,1],
[-17,-39,13,12,7,1],[16,-39,13,12,7,2],
[-45,23,8,13,5,0],[45,-6,8,13,6,1]
].forEach(o=>house(...o));
function arch(x,z,width,height,depth,scale=1){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 B(.88*scale,height,depth,wallLight,-width/2,height/2,0,g);
 B(.88*scale,height,depth,wallLight,width/2,height/2,0,g);
 B(width+1,1.05,depth+.5,wallMat,0,height+.25,0,g);
 B(width+1,.18,depth+.7,bronze,0,height+.76,0,g);
 for(let i=0;i<5;i++)B(.45,.4,depth+.4,brick,(-2+i)*width/4,height+.89,0,g);
 return g;
}
arch(-11,8,7.3,4.6,1.8);
arch(0,-42,8.6,7,2.7);
const doorLeft=B(4.3,5.4,.32,wood,-2.16,3,-42);
const doorRight=B(4.3,5.4,.32,wood,2.16,3,-42);
for(let i=0;i<5;i++){B(.2,4.6,.39,bronze,-3.8+i*1.5,3,-41.8);B(.2,4.6,.39,bronze,3.8-i*1.5,3,-41.8);}
const gateLight=new THREE.PointLight(0xffd17b,2.0,18);gateLight.position.set(0,6.6,-42);scene.add(gateLight);
B(1.8,5,.8,mat(0xa4825e),-5,2.5,-42);B(1.8,5,.8,mat(0xa4825e),5,2.5,-42);
const finishStand=C(1.6,2.2,.6,stone,0,.3,-50);
const finishFlare=mesh(new THREE.OctahedronGeometry(.85),new THREE.MeshStandardMaterial({color:0xffd272,emissive:0xdd9c41,emissiveIntensity:1,metalness:.55,roughness:.3}),0,2,-50);

// Rooftop crenellation and village detail
function stair(x,z,n){for(let i=0;i<n;i++)B(2.7,.18,(i+1)*.38,stone,x,.06+i*.14,z+i*.23);}
stair(-12,25,5);stair(29,-16,4);

// Fountain courtyard and animated water rings
const fountain=new THREE.Group();fountain.position.set(0,0,-7);scene.add(fountain);
C(4.65,4.75,.55,wallMat,0,.26,0,fountain,32);
C(4.32,4.32,.18,bronze,0,.62,0,fountain,32);
C(3.95,3.95,.12,new THREE.MeshPhysicalMaterial({color:0x2e94ad,metalness:.18,roughness:.12,transparent:true,opacity:.83,clearcoat:1}),0,.72,0,fountain,32);
C(1,1.4,2.5,wallLight,0,1.8,0,fountain,16);
C(1.6,1.15,.37,bronze,0,3.1,0,fountain,24);
C(.38,.55,1.2,stone,0,3.65,0,fountain,12);
S(.37,new THREE.MeshStandardMaterial({color:0x83f0f8,emissive:0x1d7580,emissiveIntensity:.6,metalness:.1,roughness:.12,transparent:true,opacity:.85}),0,4.4,0,fountain);
const rings=[];for(let i=0;i<4;i++){const ring=torus(1,.028,new THREE.MeshBasicMaterial({color:0xb3eced,transparent:true,opacity:.6}),0,.81,0,fountain);ring.scale.setScalar(.3);rings.push(ring);}
for(let i=0;i<10;i++){let a=i/10*Math.PI*2;line([new THREE.Vector3(Math.cos(a)*1.15,3.1,Math.sin(a)*1.15),new THREE.Vector3(Math.cos(a)*2.2,3.45,Math.sin(a)*2.2),new THREE.Vector3(Math.cos(a)*3,2.45,Math.sin(a)*3)],.028,new THREE.MeshBasicMaterial({color:0xb0f0fa,transparent:true,opacity:.63}),fountain);}
blockAt(0,-7,3.2,3.2,-.8);

// Palm trees with geometric curved fronds and leaflets, not cardboard cutouts
const palms=[];
function palm(x,z,size=1){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);scene.add(g);
 const H=R(5.2,8.9),bend=R(-.7,.7);
 const path=[];for(let i=0;i<6;i++)path.push(new THREE.Vector3(bend*i/6,H*i/6,Math.sin(i*.35)*.14));
 const trunk=line(path,.32,mat(0x8e6c42),g);
 for(let i=1;i<13;i++){let h=i*H/13;C(.34,.34,.16,mat(i%2?0x98794a:0x785737),bend*h/H,h,Math.sin(i*.4)*.14,g,8);}
 const head=new THREE.Group();head.position.set(bend,H,0);g.add(head);
 const leafVerts=[],leafColors=[];
 for(let k=0;k<11;k++){let a=(k/11)*Math.PI*2+R(-.13,.13),len=R(2.6,4.6);
  let v1=new THREE.Vector3(0,.22,0),v2=new THREE.Vector3(Math.cos(a)*len*.55,.5,Math.sin(a)*len*.55),v3=new THREE.Vector3(Math.cos(a)*len,-R(.9,1.85),Math.sin(a)*len);
  line([v1,v2,v3],.048,leafDark,head);
  for(let i=1;i<=9;i++){let q=i/10;const cx=Math.cos(a)*len*q,cz=Math.sin(a)*len*q,cy=.3+Math.sin(q*Math.PI)*.5-q*q*1.55;
   const L=(.75-q*.42)*len/4;
   for(let side of [-1,1]){
    leafVerts.push(cx,cy,cz,cx+Math.cos(a+.43*side)*L,cy+.08,cz+Math.sin(a+.43*side)*L,cx+Math.cos(a)*.25,cy-.17,cz+Math.sin(a)*.25);
    const color=new THREE.Color((i+k)%3?0x416d39:0x658d46);for(let n=0;n<3;n++)leafColors.push(color.r,color.g,color.b);
   }
  }
 }
 const leafGeo=new THREE.BufferGeometry();
 leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafVerts,3));
 leafGeo.setAttribute('color',new THREE.Float32BufferAttribute(leafColors,3));leafGeo.computeVertexNormals();
 const fronds=mesh(leafGeo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.9}),0,0,0,head);fronds.castShadow=false;
 for(let i=0;i<5;i++){let a=i/5*Math.PI*2;S(.17,mat(0x815f32),bend+Math.sin(a)*.35,H-.25,Math.cos(a)*.35,g,8,6);}
 palms.push({g,head,x,z});
}
[[-24,18,1.1],[-18,21,.8],[-25,30,1.2],[-15,13,1.1],[22,20,1.16],[27,22,.9],[19,28,.95],[29,11,.83],[-9,7,.8],[9,7,.92],[-11,-20,.8],[13,-23,.92],[-8,-30,.7],[10,-30,.7],[-2,24,.9],[-38,5,.7],[38,-7,.85],[-41,35,.8],[40,35,1.05],[-26,-36,.8],[26,-35,.9]].forEach(p=>palm(...p));

// Well-defined market stalls and pottery
function rug(x,z,w,d,color1=0x9c4d42){
 plane(w,d,mat(color1),x,.018,z);
 for(let i=0;i<8;i++){B(w*.87,.012,.04,mat(i%2?0xefc784:0x355954),x,.03,z-d/2+.15+i*(d-.3)/7).castShadow=false;}
}
function pottery(x,z,s=1,color=0xab7951){
 const pts=[new THREE.Vector2(0,0),new THREE.Vector2(.35,.05),new THREE.Vector2(.43,.26),new THREE.Vector2(.35,.5),new THREE.Vector2(.21,.73),new THREE.Vector2(.24,.85),new THREE.Vector2(.28,.88)];
 const o=mesh(new THREE.LatheGeometry(pts,14),mat(color),x,0,z);o.scale.setScalar(s);return o;
}
function stall(x,z,awningColor=0x8d5043){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 B(4,.35,2.1,wood,0,1.05,0,g);
 for(let sx of [-1,1])for(let sz of [-1,1])C(.085,.1,3.4,wood,sx*1.95,1.7,sz*.95,g,7);
 const canopy=mesh(new THREE.PlaneGeometry(5.3,3.7,12,4),new THREE.MeshStandardMaterial({color:awningColor,side:THREE.DoubleSide,roughness:.98}),0,3.45,0,g);
 canopy.rotation.x=-Math.PI/2;const pos=canopy.geometry.attributes.position;for(let i=0;i<pos.count;i++){let xi=i%13;pos.setZ(i,Math.sin(xi/12*Math.PI*5)*.15);}pos.needsUpdate=true;canopy.geometry.computeVertexNormals();
 for(let i=0;i<6;i++){const p=pottery(x+R(-1.5,1.5),z+R(-.7,.7),R(.35,.62),i%2?0x886751:0xb78a66);p.position.y=1.28;}
 for(let i=0;i<7;i++)S(.13,mat(i%3===0?0xe9a948:0xa6a056),R(-1.3,1.3),1.3,z+R(-.6,.6),g,8,6);
 rug(x,z+2.5,4.3,2.8,awningColor);
}
stall(-18,-13,0x8c5542);stall(-23,-9,0x365951);stall(-15,-19,0xa47c45);stall(18,-13,0x476f6d);stall(24,-8,0x99613b);
for(let i=0;i<22;i++)pottery(R(-26,-12),R(-22,-6),R(.4,1.5),i%2?0xb88d65:0x7f644d);
function lantern(x,z,h=3){
 C(.075,.1,h,wood,x,h/2,z);
 C(.43,.3,.12,bronze,x,h+.02,z,scene,8);
 const l=mesh(new THREE.CylinderGeometry(.27,.29,.65,6),new THREE.MeshBasicMaterial({color:0xffd28a}),x,h-.38,z);l.castShadow=false;
 C(.3,.3,.1,bronze,x,h-.79,z,scene,7);
 const light=new THREE.PointLight(0xffbd62,.38,6);light.position.set(x,h-.3,z);scene.add(light);
 return {l,light};
}
const lamps=[lantern(-5,-6,4),lantern(5,-6,4),lantern(-9,-23,3.2),lantern(10,-25,3.2),lantern(-26,9,3),lantern(25,7,3),lantern(-4,-38,3),lantern(4,-38,3)];
// Oasis water pond
plane(15,10,mat(0xafad84),24,.01,21);
const pool=mesh(new THREE.CircleGeometry(6.3,42),new THREE.MeshPhysicalMaterial({color:0x238a8a,metalness:.2,roughness:.17,transparent:true,opacity:.76,clearcoat:.9}),24,.035,21);pool.rotation.x=-Math.PI/2;
for(let i=0;i<18;i++){let a=i/18*Math.PI*2;B(R(.6,1.5),R(.3,.5),R(.45,.8),mat(i%2?0xb7ae8a:0x999878),24+Math.cos(a)*6.5,.12,21+Math.sin(a)*6.4).rotation.y=a;}
const waterRings=[];for(let i=0;i<4;i++){const o=torus(.8,.018,new THREE.MeshBasicMaterial({color:0xacf5dc,transparent:true,opacity:.55}),24,.045,21);waterRings.push(o);}
for(let i=0;i<55;i++){let a=R(0,7),x=R(-44,44),z=R(-40,45);if(Math.abs(x)<8&&Math.abs(z)<29)continue;
 if(rnd()<.7){const grass=C(.02,.07,R(.32,.7),mat(i%2?0x8b9853:0xb4a369),x,.26,z);grass.rotation.x=R(-.24,.24);grass.castShadow=false;}
 else S(R(.13,.37),mat(0xb6ab86),x,.1,z).castShadow=false;}

// CC0 authored rock and shrub meshes for visual variety, loaded asynchronously.
async function loadNature(){
 try{
  const [rock,bush]=await Promise.all(['nature_rock','nature_bush'].map(loadCharacterModel));
  for(let i=0;i<28;i++){
   const isBush=i%3===0,asset=isBush?bush:rock;
   const g=asset.scene.clone(true),bb=new THREE.Box3().setFromObject(g),h=Math.max(.1,bb.getSize(new THREE.Vector3()).y);
   const targetH=isBush?R(.75,1.55):R(.36,1.05);
   g.scale.setScalar(targetH/h);
   g.rotation.y=R(-Math.PI,Math.PI);
   let x,z;
   if(i<15){const a=R(0,Math.PI*2),r=R(7.2,11.8);x=24+Math.cos(a)*r;z=21+Math.sin(a)*r;}
   else{const a=R(0,Math.PI*2),r=R(30,47);x=Math.sin(a)*r;z=Math.cos(a)*r;}
   g.position.set(x,-bb.min.y*targetH/h,z);
   g.traverse(o=>{if(o.isMesh){o.castShadow=quality==='high';o.receiveShadow=true;}});
   scene.add(g);
  }
 }catch(err){console.warn('Optional nature props unavailable',err);}
}
// Detailed CC0 date palms: 65-authored mesh parts combined into one draw call.
async function installPremiumPalmGroves(){
 try{
  const source=await loadCharacterModel('highres/palm_detailed');
  source.scene.updateWorldMatrix(true,true);
  const geoParts=[];
  source.scene.traverse(o=>{
   if(!o.isMesh)return;
   const m=o.geometry.clone();m.applyMatrix4(o.matrixWorld);
   const raw=m.index?m.toNonIndexed():m,geom=new THREE.BufferGeometry();
   geom.setAttribute('position',raw.getAttribute('position').clone());
   if(raw.getAttribute('normal'))geom.setAttribute('normal',raw.getAttribute('normal').clone());
   else{geom.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(raw.getAttribute('position').count*3),3));geom.computeVertexNormals();}
   const count=raw.getAttribute('position').count,v=new Float32Array(count*3);
   const color=o.material?.color||new THREE.Color(0x64824a);
   for(let i=0;i<count;i++){v[i*3]=color.r;v[i*3+1]=color.g;v[i*3+2]=color.b;}
   geom.setAttribute('color',new THREE.BufferAttribute(v,3));geoParts.push(geom);
  });
  const geo=mergeGeometries(geoParts,false);
  if(!geo)throw new Error('Palm mesh merge failed');
  geo.computeBoundingBox();
  const origin=geo.boundingBox.min.clone(),height=geo.boundingBox.max.y-origin.y;
  const foliage=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide});
  for(const p of palms)if(Math.hypot(p.x,p.z+4)<40)p.g.visible=false;
  const allPlaces=[[-11,14,1.07],[-19,21,.92],[19,14,1.1],[25,23,.94],[-11,-23,1.13],[13,-25,1.05],[-24,5,.95],[28,-4,.99]];
  const places=isMobile?allPlaces.slice(0,3):allPlaces.slice(0,5);
  for(const [x,z,s] of places){
   const tree=new THREE.Mesh(geo,foliage);const scale=(8.5/height)*s;
   tree.position.set(x,-origin.y*scale,z);tree.scale.setScalar(scale);
   tree.rotation.y=R(-Math.PI,Math.PI);tree.castShadow=quality==='high';tree.receiveShadow=true;
   scene.add(tree);
  }
  avatarLoad.premiumPalms=places.length;
 }catch(err){avatarLoad.premiumPalmError=String(err);console.warn('Premium palm fallback',err);}
}
// A watchtower beside the old gate
const tower=new THREE.Group();tower.position.set(14,0,-48);scene.add(tower);
C(3.6,4.2,14,wallMat,0,7,0,tower,16);
C(4.7,4.1,1.2,brick,0,14.1,0,tower,16);
C(3.9,4.7,2.8,mat(0x927052),0,16,0,tower,12);
for(let i=0;i<8;i++){let a=i*Math.PI/4;B(.6,1.1,.7,pale,Math.cos(a)*4.1,15,Math.sin(a)*4.1,tower).rotation.y=-a;}
for(let i=0;i<3;i++){let o=B(.25,1.2,.3,dark,0,4+i*3,3.7,tower);o.castShadow=false;}
blockAt(14,-48,6.3,6.3);

// Desert fauna, butterflies and atmospheric particles
function camel(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=R(-.5,.5);g.scale.setScalar(s);scene.add(g);
 const f=mat(0xa88250);S(1.1,f,0,1.75,0,g).scale.set(1.5,.65,.65);S(.55,f,-.28,2.52,0,g).scale.set(1,1.2,.75);
 for(let dz of [-.53,.53])for(let dx of [-1,1]){C(.16,.22,1.65,f,dx,1.03,dz,g,8);}
 line([new THREE.Vector3(1.1,1.6,0),new THREE.Vector3(1.65,2.4,0),new THREE.Vector3(1.95,2.9,0)],.25,f,g);
 S(.4,f,2.0,2.93,0,g).scale.set(1.2,.65,.75);
 S(.047,black,2.26,3.03,.23,g);S(.047,black,2.26,3.03,-.23,g);return g;}
camel(33,19,.9);camel(-39,-23,.8);
const motes=[];for(let i=0;i<65;i++){const m=S(R(.035,.11),new THREE.MeshBasicMaterial({color:i%3?0xffe7a0:0xd4f5a6,transparent:true,opacity:.3}),R(-38,38),R(.8,6),R(-36,38),scene,5,3);m.castShadow=false;motes.push({m,base:m.position.y,phase:R(0,6.3)});}
const birds=[];for(let j=0;j<8;j++){const g=new THREE.Group();scene.add(g);
 for(let s of [-1,1]){const wing=B(.55,.02,.15,mat(0x4c5650),s*.4,0,0,g);wing.rotation.z=s*.2;}
 birds.push({g,a:R(0,6.3),r:R(30,65),speed:R(.08,.16),h:R(16,25)});}

// Hanging fabric banners, market decorations, potted flowers
function banner(x,z,ang=0){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ang;scene.add(g);
 B(4.6,.07,.08,wood,0,4.4,0,g);
 for(let i=0;i<8;i++){const j=-1.95+i*.55;const fabric=mesh(new THREE.PlaneGeometry(.51,R(.65,1.25)),new THREE.MeshStandardMaterial({color:i%3===0?0xb45d4a:i%3===1?0xe5c17d:0x386b65,side:THREE.DoubleSide,roughness:1}),j,3.96,0,g,false);fabric.rotation.y=R(-.2,.2);}
}
banner(-18,-4,.24);banner(18,-4,-.15);banner(-10,-27,.12);
function flowerPot(x,z){
 pottery(x,z,.8,0xa97d5c);
 for(let j=0;j<5;j++){const a=j*Math.PI*2/5,v=R(.4,.8);line([new THREE.Vector3(x,.57,z),new THREE.Vector3(x+Math.sin(a)*.4,v+.65,z+Math.cos(a)*.4)],.027,leafDark);S(.10,mat(j%2?0xeaa479:0xf2d76f),x+Math.sin(a)*.4,v+.7,z+Math.cos(a)*.4);}
}
[[6,4],[-6,4],[6,-21],[-7,-21],[-19,-1],[19,-3]].forEach(a=>flowerPot(...a));

// An original 3D humanoid with actual geometry and animated joints
function person(tunicColor=0x24766a,scarfColor=0xf5f0e5,size=1){
 const root=new THREE.Group();root.scale.setScalar(size);
 const rig=new THREE.Group();root.add(rig);
 const robe=mat(tunicColor),fabric=mat(scarfColor),skin=mat(0xc89169),skin2=mat(0xd8a27a),trim=mat(0xc49b59),shoe=mat(0x46352f);
 const hem=C(.39,.59,1.5,robe,0,.88,0,rig,16);hem.castShadow=true;
 C(.4,.47,.8,robe,0,1.82,0,rig,12);
 B(.095,.84,.08,trim,0,1.53,-.43,rig);
 for(let i=0;i<4;i++)S(.023,bronze,0,1.3+i*.18,-.494,rig,6,5);
 B(.75,.1,.16,trim,0,1.05,-.23,rig);for(let p of [-.41,-.28,.28,.41]){const seam=B(.028,1.32,.04,mat(tunicColor),p,.83,-.29,rig);seam.rotation.z=p*.06;seam.castShadow=false;}
 const head=S(.30,skin,0,2.62,-.03,rig,16,12);head.scale.set(1,1.1,.98);
 S(.29,fabric,0,2.84,.02,rig,14,8).scale.set(1.15,.45,1.05);
 const scarfShape=new THREE.Shape();scarfShape.moveTo(-.26,2.86);scarfShape.lineTo(.26,2.86);scarfShape.quadraticCurveTo(.4,2.5,.43,2.22);scarfShape.lineTo(.18,2.04);scarfShape.lineTo(0,2.26);scarfShape.lineTo(-.18,2.04);scarfShape.lineTo(-.43,2.22);scarfShape.quadraticCurveTo(-.4,2.5,-.26,2.86);mesh(new THREE.ShapeGeometry(scarfShape),new THREE.MeshStandardMaterial({color:scarfColor,roughness:.98,side:THREE.DoubleSide}),0,0,.31,rig,false);
 torus(.32,.051,mat(0x2a2925),0,2.89,-.02,rig).rotation.x=0;
 for(let sx of [-1,1]){const eye=S(.032,black,sx*.115,2.63,-.30,rig,7,5);eye.castShadow=false;S(.055,skin2,sx*.31,2.61,-.01,rig,7,5);}
 S(.06,skin2,0,2.53,-.315,rig,7,5);
 const arms=[],legs=[];
 for(let sx of [-1,1]){
  const ap=new THREE.Group();ap.position.set(sx*.49,2.05,0);rig.add(ap);ap.rotation.z=sx*.08;
  C(.15,.11,.84,robe,0,-.42,.0,ap,10);
  S(.12,skin,0,-.91,-.025,ap,8,6);arms.push(ap);
  const lp=new THREE.Group();lp.position.set(sx*.22,.56,.015);rig.add(lp);
  C(.19,.15,.65,robe,0,-.27,0,lp,10);B(.29,.17,.46,shoe,0,-.61,-.15,lp);legs.push(lp);
 }
 root.userData={rig,arms,legs,head,hem};
 return root;
}
const player=person(0x387c70,0xf8efe0,1);
scene.add(player);player.position.set(0,0,13);
const npcs=[];
function npc(x,z,name,title,dialogue,color,icon){
 const p=person(color,0xf2e7cd,R(.93,1.06));p.position.set(x,0,z);p.rotation.y=R(-3,3);scene.add(p);
 const label=document.createElement('canvas');label.width=512;label.height=128;const ctx=label.getContext('2d');ctx.fillStyle='rgba(14,47,44,.91)';ctx.beginPath();ctx.roundRect(8,14,496,98,28);ctx.fill();ctx.strokeStyle='#e6c47d';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#fff3d8';ctx.font='bold 53px Tajawal, sans-serif';ctx.textAlign='center';ctx.fillText(name,256,86);
 const tex=new THREE.CanvasTexture(label);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));sp.position.set(0,3.52,0);sp.scale.set(3.4,.85,1);p.add(sp);
 npcs.push({x,z,name,title,dialogue,icon,p,sp});
}
npc(-8,1,'سالم','دليل الواحة','كان البرج يضيء القرية كل مساء. ابحث عن خمس شظايا متوهجة متناثرة قرب السوق والواحة والممرات. إذا جمعتها، ستستجيب البوابة القديمة لك.',0x376d67,'✦');
npc(-17,-8,'العم ناصر','تاجر السوق','أهلًا بك في السوق! الشظايا تتلألأ قرب السلع القديمة، وعند النخيل أيضًا. الأهم أن تتأنى وتستمتع بالتجول.',0x92774e,'🏺');
npc(9,-32,'راشد','حارس البوابة','البوابة لا تُفتح بالقوة. اجمع النور المفقود أولًا، ثم قف أمام البوابة وانظر إلى البرج.',0x515c78,'♜');
npc(19,13,'مها','مرشدة الواحة','الماء حياة الواحة. انظر إلى البركة، ثم ابحث عن البريق بين النخيل. تذكر أن كل رحلة تبدأ بخطوة.',0x8b5260,'☀');
npc(15,-9,'المعلّم','حكيم الأرقام','هناك لغز صغير اختياري للزائر الذكي. إذا قسمت أربع قطع إلى مجموعتين متساويتين، فما الكسر الذي يمثل مجموعة واحدة؟',0x375e77,'◈');

// Rigged, skinned and animated CC0 character assets. Old geometry remains a fallback.
const animatedActors=[];
const avatarLoad={ready:false,actors:0,error:null};
const assetLoader=new GLTFLoader();
async function loadCharacterModel(file){
 return new Promise((resolve,reject)=>assetLoader.load(import.meta.env.BASE_URL+'models/'+file+'.glb',resolve,undefined,reject));
}
async function loadAnimatedCast(){
 try{
  // Reuse three source assets to avoid duplicate downloads.
  const byFile={};
  for(const f of ['player_priest','player_swordsman','player_archer'])byFile[f]=await loadCharacterModel(f);
  function attach(target,file,role){
   const src=byFile[file],model=cloneSkinned(src.scene);
   model.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
   const scale=(role==='hero'?2.85:2.65)/(size.y||1);
   model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale-.32;model.rotation.y=Math.PI;
   model.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if((o.isMesh||o.isGroup)&&/Spellbook|Longbow|Sword|Shield|2H_Staff|Bow|Quiver/i.test(o.name))o.visible=false;});
   target.userData.rig.visible=false;target.add(model);
   const mixer=new THREE.AnimationMixer(model),idleClip=src.animations.find(c=>c.name==='Idle'),walkClip=src.animations.find(c=>c.name==='Walking_A');
   const idle=idleClip?mixer.clipAction(idleClip):null,walk=walkClip?mixer.clipAction(walkClip):null;
   if(idle){idle.play();idle.setEffectiveWeight(1);}
   if(walk){walk.play();walk.setEffectiveWeight(0);}
   const greetClip=src.animations.find(c=>c.name==='Spellcast_Shoot');const greet=greetClip?mixer.clipAction(greetClip):null;if(greet){greet.loop=THREE.LoopOnce;greet.clampWhenFinished=false;greet.setEffectiveWeight(.65);}const actor={target,model,mixer,idle,walk,greet,weight:0,role,file};
   animatedActors.push(actor);avatarLoad.actors++;
   return actor;
  }
  attach(player,'player_priest','hero');
  const variants=['player_swordsman','player_priest','player_archer','player_priest','player_archer'];
  npcs.forEach((n,i)=>{n.actor=attach(n.p,variants[i],'npc');});
  avatarLoad.ready=true;
 }catch(err){avatarLoad.error=String(err);console.error('Animated character load failed, using fallback',err);}
}
async function upgradeHero(){
 try{
  const src=await loadCharacterModel('highres/man_rigged');
  const model=cloneSkinned(src.scene);
  const box=new THREE.Box3().setFromObject(model),height=box.getSize(new THREE.Vector3()).y;
  if(!height)throw new Error('high-detail mesh missing bounds');
  const k=1.47;model.scale.setScalar(k);model.position.y=-.01;model.rotation.y=Math.PI;
  model.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
  const old=animatedActors.find(a=>a.role==='hero');
  if(old){old.model.visible=false;old.mixer.stopAllAction();animatedActors.splice(animatedActors.indexOf(old),1);avatarLoad.actors--;}
  player.add(model);
  const mixer=new THREE.AnimationMixer(model);
  const walkClip=src.animations.find(a=>a.name.toLowerCase()==='walk');
  const runClip=src.animations.find(a=>a.name.toLowerCase()==='run');
  const walk=walkClip?mixer.clipAction(walkClip):null,run=runClip?mixer.clipAction(runClip):null;
  if(walk){walk.play();walk.setEffectiveWeight(.08);}
  if(run){run.play();run.setEffectiveWeight(0);}
  const costume=attachSaudiHero({target:player,model,scene});
  animatedActors.push({target:player,model,mixer,idle:null,walk,run,weight:0,role:'hero',costume,premium:true});
  avatarLoad.premium=true;avatarLoad.actors++;
 }catch(error){avatarLoad.premium=false;avatarLoad.premiumError=String(error);console.warn('Premium character unavailable, retained original avatar',error);}
}
loadAnimatedCast().then(()=>upgradeHero());
loadNature();installPremiumPalmGroves();
// Quest shards — pickup is automatic near a 3D object
const shardPositions=[[-3,5], [-17,-13],[-21,19],[26,24],[-3,-32]];
const shards=[];
for(let i=0;i<5;i++){const [x,z]=shardPositions[i],g=new THREE.Group();g.position.set(x,1.75,z);scene.add(g);
 const crystal=mesh(new THREE.OctahedronGeometry(.58),new THREE.MeshPhysicalMaterial({color:0xffe4a0,emissive:0xdba958,emissiveIntensity:1.6,metalness:.45,roughness:.16,clearcoat:.8}),0,0,0,g);
 const ring=torus(.85,.04,new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:.82}),0,0,0,g);
 ring.rotation.x=.4;
 const halo=S(.85,new THREE.MeshBasicMaterial({color:0xffe0a1,transparent:true,opacity:.055,depthWrite:false}),0,0,0,g,14,8);halo.scale.setScalar(1.25);
 const light=new THREE.PointLight(0xffc272,2.1,7);light.position.set(x,2,z);scene.add(light);
 if(collected.has(i)){g.visible=false;light.visible=false;}
 shards.push({g,crystal,ring,light,x,z,i});
}
// Persistent in-world objective beacon: bright enough to see from spawn.
const beaconCV=document.createElement('canvas');beaconCV.width=beaconCV.height=128;
const bctx=beaconCV.getContext('2d'),grad=bctx.createRadialGradient(64,64,3,64,64,63);
grad.addColorStop(0,'rgba(255,226,159,0.55)');grad.addColorStop(.25,'rgba(253,198,78,.20)');grad.addColorStop(1,'rgba(253,185,69,0)');
bctx.fillStyle=grad;bctx.fillRect(0,0,128,128);
const beaconTexture=new THREE.CanvasTexture(beaconCV);
const beacon=new THREE.Sprite(new THREE.SpriteMaterial({map:beaconTexture,depthTest:false,transparent:true,blending:THREE.AdditiveBlending,opacity:.8}));
beacon.scale.set(3.0,6.2,1);scene.add(beacon);
const beaconRing=torus(1.45,.07,new THREE.MeshBasicMaterial({color:0xffdfa2,transparent:true,opacity:.73}),0,.4,0);
const goalHint=document.createElement('div');goalHint.id='goalHint';$('questbox').append(goalHint);
function nearestGoal(){
 if(finished)return null;
 if(collected.size>=5)return {x:0,z:-42,gate:true};
 const left=shards.filter(sh=>!collected.has(sh.i));
 left.sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
 return left[0]||null;
}
function updateGoal(){
 const goal=nearestGoal();
 beacon.visible=!!goal;beaconRing.visible=!!goal;
 if(!goal){goalHint.textContent='✦ عادت الحياة إلى الواحة';return;}
 const dx=goal.x-player.position.x,dz=goal.z-player.position.z;
 const dist=Math.round(Math.hypot(dx,dz));
 const bearing=Math.atan2(dx,-dz),diff=((bearing-yaw+3*Math.PI)%(2*Math.PI))-Math.PI;
 const arrows=['↑','↗','→','↘','↓','↙','←','↖'];
 const arrow=arrows[(Math.round(diff/(Math.PI/4))+8)%8];
 goalHint.textContent=arrow+' '+(goal.gate?'بوابة البرج':'الشظية التالية')+' · '+AR(dist)+' م';
 beacon.position.set(goal.x,4.2+Math.sin(t*2)*.45,goal.z);
 beacon.material.opacity=.26+Math.sin(t*2)*.08;
 beaconRing.position.set(goal.x,.45+Math.sin(t*2)*.1,goal.z);
 beaconRing.rotation.z=t*.55;
}
function save(){try{localStorage.setItem('oasis_progress',JSON.stringify({crystals:[...collected],finished}));}catch{}}
function updateQuest(){
 $('progressTxt').textContent=AR(collected.size)+' / ٥';
 $('qfill').style.width=(collected.size/5*100)+'%';
 $('questText').textContent=finished?'اكتملت أسطورة الواحة':collected.size<5?'اجمع شظايا النور':'افتح بوابة البرج';
 $('questSub').textContent=finished?'لقد أعدت النور إلى القرية، استكشف بحرية':collected.size<5?'ابحث عن الشظايا المضيئة في القرية':'اتجه شمالًا نحو البوابة القديمة';
 gateLight.intensity=collected.size===5?5.2:2;
}
updateQuest();if(finished){doorLeft.position.x=-5.6;doorRight.position.x=5.6;}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');toastEnd=performance.now()+2900;}
function playTone(f=700,d=.17){if(!soundOn)return;try{const ac=window.__audio||(window.__audio=new (window.AudioContext||window.webkitAudioContext)());if(ac.state==='suspended')ac.resume();const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(f,ac.currentTime);osc.frequency.exponentialRampToValueAtTime(f*1.36,ac.currentTime+d);gain.gain.setValueAtTime(.0001,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.075,ac.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);osc.connect(gain).connect(ac.destination);osc.start();osc.stop(ac.currentTime+d+.02);}catch{}}
function acquire(sh){if(collected.has(sh.i))return;collected.add(sh.i);sh.g.visible=false;sh.light.visible=false;save();updateQuest();playTone(500+sh.i*110,.34);toast('✦ حصلت على شظية نور! '+AR(collected.size)+' من ٥');if(collected.size===5)setTimeout(()=>toast('✨ اكتمل النور! افتح بوابة البرج القديمة'),3100);}
function showDialog({icon='✦',who='أهل الواحة',title='رسالة',text='',answers=[]}){
 inDialog=true;$('dialogue').classList.add('active');$('dialogIcon').textContent=icon;$('dialogWho').textContent=who;$('dialogTitle').textContent=title;$('dialogText').textContent=text;
 $('answers').replaceChildren();for(let a of answers){const b=document.createElement('button');b.textContent=a.text;b.onclick=()=>{if(a.ok){playTone(780,.2);$('dialogText').textContent='إجابة صحيحة! نصف المجموعة يساوي ١⁄٢. أحسنت!';toast('🌟 اكتشفت سرّ الكسور');}else $('dialogText').textContent='حاول مجددًا. قسم الأربع قطع إلى مجموعتين متساويتين.';};$('answers').appendChild(b);}
}
const closeDialog=()=>{inDialog=false;$('dialogue').classList.remove('active');};
$('dialogClose').onclick=closeDialog;
function win(){if(collected.size!==5){toast('اجمع الشظايا أولًا ثم عد إلى البوابة');return;}
 finished=true;doorLeft.position.x=-5.6;doorRight.position.x=5.6;save();updateQuest();playTone(860,.42);showDialog({icon:'✺',who:'نهاية الفصل الأول',title:'عاد النور إلى الواحة!',text:'توهّج البرج مجددًا بعد أن جمعت الشظايا الخمس. أنت الآن حارس نور الواحة. استمتع باستكشاف القرية، فقد أنجزت أول مهمة كاملة.'});}
let nearby=null;
function findNearby(){
 let found=null,dist=3.2;
 for(let n of npcs){const d=Math.hypot(n.x-player.position.x,n.z-player.position.z);if(d<dist){found={type:'npc',o:n};dist=d;}}
 const gateD=Math.hypot(player.position.x,player.position.z+42);
 if(gateD<5.4&&gateD<dist+3){found={type:'gate'};}
 const wellD=Math.hypot(player.position.x,player.position.z+7);
 if(wellD<5.7&&wellD<dist){found={type:'fountain'};}
 return found;
}
function interact(){if(!active||inDialog||$('settings').classList.contains('active'))return;
 if(!nearby){toast('اقترب من أحد أهل القرية أو من البوابة');return;}
 if(nearby.type==='gate'){win();return;}
 if(nearby.type==='fountain'){showDialog({icon:'◉',who:'ساحة القرية',title:'نافورة الحياة',text:'جُلب الماء إلى هذه الواحة من عيون قديمة. استرح قليلًا، ثم اذهب للبحث عن الشظايا الذهبية.'});return;}
 const n=nearby.o;if(n.actor?.greet){n.actor.greet.reset().play();}showDialog({icon:n.icon,who:n.name,title:n.title,text:n.dialogue,answers:n.name==='المعلّم'?[{text:'١⁄٢',ok:true},{text:'١⁄٤',ok:false},{text:'٣⁄٤',ok:false}]:[]});
}

// Controls: camera-relative velocity; stick up = forward, right = right
const input={x:0,f:0,keys:new Set(),joyID:null,sprint:false};
let yaw=0,pitch=.19,camDist=isMobile?8.8:10,jumpVelocity=0,vertical=0,velocity=new THREE.Vector3();
function joystickMove(e){const rect=$('joystick').getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,rad=rect.width*.34;
 const dx=clamp((e.clientX-cx)/rad,-1,1),dy=clamp((e.clientY-cy)/rad,-1,1),size=Math.hypot(dx,dy),scale=size>1?1/size:1;
 input.x=dx*scale;input.f=-dy*scale;
 $('stick').style.transform='translate('+input.x*rad+'px,'+(-input.f)*rad+'px)';
}
$('joystick').addEventListener('pointerdown',e=>{e.preventDefault();input.joyID=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joystickMove(e);});
$('joystick').addEventListener('pointermove',e=>{if(e.pointerId===input.joyID)joystickMove(e);});
function releaseJoy(e){if(e.pointerId!==input.joyID)return;input.joyID=null;input.x=0;input.f=0;$('stick').style.transform='translate(0px,0px)';}
$('joystick').addEventListener('pointerup',releaseJoy);$('joystick').addEventListener('pointercancel',releaseJoy);
let lookID=null,lastX=0,lastY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(!active||inDialog)return;lookID=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookID)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
 yaw+=dx*.004*sensitivity;pitch=clamp(pitch+dy*.003*sensitivity,-.25,.72);});
renderer.domElement.addEventListener('pointerup',e=>{if(e.pointerId===lookID)lookID=null;});
renderer.domElement.addEventListener('pointercancel',e=>{if(e.pointerId===lookID)lookID=null;});
let pinchDist=0;
renderer.domElement.addEventListener('touchmove',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinchDist)camDist=clamp(camDist+(pinchDist-d)*.014,4.5,13);pinchDist=d;}},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{pinchDist=0;},{passive:true});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();input.keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='e')interact();if(k===' '&&!e.repeat)jump();if(k==='escape')toggleSettings();if(k==='shift')input.sprint=true;});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();input.keys.delete(k);if(k==='shift')input.sprint=false;});
addEventListener('blur',()=>{input.keys.clear();input.f=0;input.x=0;input.joyID=null;input.sprint=false;$('stick').style.transform='';});
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
$('interact').addEventListener('click',interact);
$('run').addEventListener('pointerdown',e=>{e.preventDefault();input.sprint=!input.sprint;$('run').classList.toggle('active',input.sprint);});
function jump(){if(!active||inDialog)return;if(vertical<=.02){jumpVelocity=7.5;playTone(370,.09);}}
function toggleSettings(force){if(!active)return;const o=$('settings');const yes=force===undefined?!o.classList.contains('active'):force;o.classList.toggle('active',yes);inDialog=yes;if(yes){input.x=0;input.f=0;}}
$('settingsBtn').onclick=()=>toggleSettings();
$('settingsClose').onclick=()=>toggleSettings(false);
$('quality').addEventListener('change',e=>{quality=e.target.value;localStorage.setItem('oasis_quality',quality);applyQuality();});
$('sensitivity').addEventListener('input',e=>{sensitivity=Number(e.target.value);localStorage.setItem('oasis_sensitivity',sensitivity);});
$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent='الصوت: '+(soundOn?'تشغيل':'إيقاف');};
$('resetBtn').onclick=()=>{collected.clear();finished=false;doorLeft.position.x=-2.16;doorRight.position.x=2.16;save();for(let sh of shards){sh.g.visible=true;sh.light.visible=true;}updateQuest();toast('تمت إعادة تقدم المهمة');toggleSettings(false);};
$('start').onclick=()=>{active=true;$('intro').classList.remove('active');toast('✦ اتبع السهم الذهبي لجمع الشظية الأولى');playTone(510,.3);};
let minOpen=!isMobile;$('minimap').style.display=minOpen?'block':'none';$('mapBtn').onclick=()=>{minOpen=!minOpen;$('minimap').style.display=minOpen?'block':'none';};
$('sunBtn').onclick=()=>{night=!night;sun.intensity=night?1.1:2.8;hemi.intensity=night?.85:1.5;renderer.toneMappingExposure=night?.9:1.10;
 scene.fog.color.setHex(night?0x425f73:0xb6c7b2);skyM.uniforms.top.value.setHex(night?0x0a1632:0x4b9ebd);skyM.uniforms.middle.value.setHex(night?0x31506d:0x99d3d6);skyM.uniforms.bottom.value.setHex(night?0x7d8c88:0xf4d8a1);sunDisc.visible=!night;
 $('sunBtn').textContent=night?'☾':'☀';for(let l of lamps){l.light.intensity=night?1.4:.38;}gateLight.intensity=night?5:collected.size===5?5.2:2;};
function readControls(){let x=input.x,f=input.f;
 if(input.keys.has('a')||input.keys.has('arrowleft'))x-=1;
 if(input.keys.has('d')||input.keys.has('arrowright'))x+=1;
 if(input.keys.has('w')||input.keys.has('arrowup'))f+=1;
 if(input.keys.has('s')||input.keys.has('arrowdown'))f-=1;
 const L=Math.hypot(x,f);return {x:L>1?x/L:x,f:L>1?f/L:f,sprint:input.sprint};}

const minimap=$('mini').getContext('2d');
function drawMap(){
 const c=minimap,w=160,h=160;c.clearRect(0,0,w,h);c.fillStyle='#456a50';c.fillRect(0,0,w,h);
 const toX=x=>80+x*1.42,toZ=z=>80+z*1.42;
 c.strokeStyle='#d4b98c';c.lineWidth=9;c.beginPath();c.moveTo(toX(0),0);c.lineTo(toX(0),160);c.moveTo(0,toZ(-9));c.lineTo(160,toZ(-9));c.moveTo(0,toZ(17));c.lineTo(160,toZ(17));c.stroke();
 c.fillStyle='#d9ac7c';for(let b of blockers){c.fillRect(toX(b.x)-b.hw*1.4,toZ(b.z)-b.hd*1.4,b.hw*2.8,b.hd*2.8);}
 c.fillStyle='#7fd7c8';c.beginPath();c.arc(toX(24),toZ(21),7,0,7);c.fill();c.beginPath();c.arc(toX(0),toZ(-7),5,0,7);c.fill();
 for(let sh of shards)if(!collected.has(sh.i)){c.fillStyle='#ffe6a0';c.beginPath();c.arc(toX(sh.x),toZ(sh.z),3.6,0,7);c.fill();}
 c.save();c.translate(toX(player.position.x),toZ(player.position.z));c.rotate(player.rotation.y);c.fillStyle='#fff';c.strokeStyle='#173d3a';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-8);c.lineTo(5,6);c.lineTo(0,3);c.lineTo(-5,6);c.closePath();c.fill();c.stroke();c.restore();
}
let lastMap=0,lastNear=0;
const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,clock.getDelta());t+=dt;
 if(active&&!inDialog){
  let c=readControls();const moving=Math.hypot(c.x,c.f)>.025,spd=c.sprint?8.6:5.3;
  const dx=Math.sin(yaw)*c.f+Math.cos(yaw)*c.x;
  const dz=-Math.cos(yaw)*c.f+Math.sin(yaw)*c.x;
  const tx=moving?dx*spd:0,tz=moving?dz*spd:0;
  velocity.x=ease(velocity.x,tx,dt*(moving?9:12));velocity.z=ease(velocity.z,tz,dt*(moving?9:12));
  const oldX=player.position.x,oldZ=player.position.z;
  if(!collide(oldX+velocity.x*dt,oldZ))player.position.x+=velocity.x*dt;
  else velocity.x=0;
  if(!collide(player.position.x,oldZ+velocity.z*dt))player.position.z+=velocity.z*dt;
  else velocity.z=0;
  const speed=Math.hypot(velocity.x,velocity.z);
  if(speed>.3){let a=Math.atan2(velocity.x,-velocity.z);let delta=((a-player.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;player.rotation.y+=delta*Math.min(1,dt*12);}
  jumpVelocity-=19*dt;vertical=Math.max(0,vertical+jumpVelocity*dt);if(vertical===0)jumpVelocity=0;player.position.y=vertical;
  const rig=player.userData,sw=Math.sin(t*(c.sprint?12:8)),walk=Math.min(speed/5,1);
  rig.legs[0].rotation.x=sw*.48*walk;rig.legs[1].rotation.x=-sw*.48*walk;
  rig.arms[0].rotation.x=-sw*.45*walk;rig.arms[1].rotation.x=sw*.45*walk;
  rig.rig.position.y=Math.sin(t*1.5)*.012+Math.abs(sw)*.045*walk;
  for(let sh of shards){if(!collected.has(sh.i)&&Math.hypot(player.position.x-sh.x,player.position.z-sh.z)<1.8)acquire(sh);}
 } else velocity.multiplyScalar(Math.max(0,1-dt*8));
 const lookAt=new THREE.Vector3(player.position.x,player.position.y+1.65,player.position.z);
 const dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
 const shoulder=new THREE.Vector3(Math.cos(yaw),0,Math.sin(yaw));
 const target=lookAt.clone().addScaledVector(dir,-camDist).addScaledVector(shoulder,isMobile?1.45:1.2);target.y=Math.max(1.6,target.y+camDist*.24);
 // Keep camera outside solid house footprints instead of clipping into walls.
 const deltaCam=target.clone().sub(lookAt),lengthCam=deltaCam.length();
 for(let d=1.3;d<lengthCam;d+=.35){const pt=lookAt.clone().addScaledVector(deltaCam,d/lengthCam);if(pt.y>8)continue;const hit=blockers.some(b=>Math.abs(pt.x-b.x)<b.hw&&Math.abs(pt.z-b.z)<b.hd);if(hit){target.copy(lookAt).addScaledVector(deltaCam,Math.max(0.4,(d-.9)/lengthCam));break;}}

 camera.position.lerp(target,Math.min(1,dt*7));camera.lookAt(lookAt.clone().addScaledVector(shoulder,.32));
 for(let sh of shards){if(collected.has(sh.i))continue;
  sh.g.position.y=1.75+Math.sin(t*2.1+sh.i)*.25;
  sh.crystal.rotation.y+=dt*1.15;sh.crystal.rotation.x=Math.sin(t+sh.i)*.2;
  sh.ring.rotation.z+=dt*.9;sh.light.intensity=1.4+Math.sin(t*3+sh.i)*.5;}
 for(let i=0;i<rings.length;i++){let q=((t*.43+i/4)%1);rings[i].scale.setScalar(.4+3.1*q);rings[i].material.opacity=.45*(1-q);}
 for(let i=0;i<waterRings.length;i++){let q=((t*.3+i/4)%1);waterRings[i].scale.setScalar(.6+3.1*q);waterRings[i].material.opacity=.32*(1-q);}
 for(const a of animatedActors){a.mixer.update(dt);const desired=a.role==='hero'?Math.min(1,Math.hypot(velocity.x,velocity.z)/3.1):0;a.weight=ease(a.weight,desired,dt*6);if(a.premium){if(a.walk){a.walk.setEffectiveWeight(input.sprint?.04:Math.max(.1,a.weight));a.walk.timeScale=a.weight<.05?.06:1.08;}if(a.run)a.run.setEffectiveWeight(input.sprint?a.weight:0);a.costume.tick(dt,t);}else{if(a.walk){a.walk.setEffectiveWeight(a.weight);a.walk.timeScale=a.role==='hero'&&input.sprint?1.65:1.05;}if(a.idle)a.idle.setEffectiveWeight(1-a.weight);}}
 for(let n of npcs){const nd=Math.hypot(player.position.x-n.x,player.position.z-n.z);if(nd<5){const a=Math.atan2(player.position.x-n.x,-(player.position.z-n.z));const dd=((a-n.p.rotation.y+3*Math.PI)%(2*Math.PI))-Math.PI;n.p.rotation.y+=dd*Math.min(1,dt*3);}
 n.p.userData.rig.position.y=Math.sin(t*1.7+n.x)*.02;n.sp.material.opacity=clamp((10-Math.hypot(player.position.x-n.x,player.position.z-n.z))/5,0,1);}
 for(let p of palms)p.head.rotation.z=Math.sin(t*.7+p.x)*.032;for(let i=0;i<clouds.length;i++)clouds[i].position.x+=Math.sin(t*.08+i)*dt*.022;
 for(let m of motes){m.m.position.y=m.base+Math.sin(t*.8+m.phase)*.28;m.m.material.opacity=night?.5:.19;}
 for(let b of birds){let a=t*b.speed+b.a;b.g.position.set(Math.sin(a)*b.r,b.h+Math.sin(t*.8+b.a)*2,Math.cos(a)*b.r);b.g.rotation.y=a;}
 finishFlare.rotation.y=t*.2;finishFlare.position.y=2.0+Math.sin(t*1.2)*.3;
 if(active&&t-lastNear>.13){nearby=findNearby();const names=nearby?(nearby.type==='npc'?nearby.o.name:nearby.type==='gate'?'بوابة البرج القديمة':'نافورة الحياة'):'';
 $('actionPrompt').classList.toggle('show',!!nearby&&!inDialog);$('promptName').textContent=names;lastNear=t;}
 if(t-lastMap>.12){drawMap();updateGoal();lastMap=t;}
 if(performance.now()>toastEnd)$('toast').classList.remove('show');
 renderer.render(scene,camera);
}
camera.position.set(0,7,25);
animate();
window.addEventListener('error',e=>{const el=$('fatal');el.hidden=false;el.textContent='خطأ في اللعبة: '+(e.message||'غير معروف');});
window.__oasisDebug={getState:()=>({x:player.position.x,z:player.position.z,collected:collected.size,active,inDialog,quality,animated:avatarLoad}),setPosition:(x,z)=>player.position.set(x,0,z),acquireIndex:i=>acquire(shards[i]),renderer};

