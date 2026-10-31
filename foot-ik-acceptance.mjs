import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const b=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage();await p.setViewport({width:412,height:915,isMobile:true,deviceScaleFactor:1,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.stack||String(e)));
await p.goto('http://127.0.0.1:5179/oasis-legend-game/',{waitUntil:'domcontentloaded',timeout:25000});
await p.waitForFunction(()=>window.__oasisDebug?.getActor(),{timeout:45000});
const structure=await p.evaluate(()=>{const a=window.__oasisDebug.getActor();return{mesh:a.costume.robe.isSkinnedMesh,sharedSkeleton:a.costume.robe.skeleton===a.model.getObjectByProperty('type','SkinnedMesh').skeleton,indices:a.costume.robe.geometry.index.count,ikLegs:a.ik.legs.length}});
assert.equal(structure.mesh,true);assert.equal(structure.sharedSkeleton,true);assert.equal(structure.indices,3024);assert.equal(structure.ikLegs,2);
await p.click('#start');await p.evaluate(()=>window.__oasisDebug.setAnalog(0,1));const samples=[];
for(let i=0;i<15;i++){
 await new Promise(r=>setTimeout(r,600));
 const s=await p.evaluate(()=>({ik:window.__oasisDebug.getFootIK(),move:window.__oasisDebug.getLocomotion()}));
 samples.push({i,feet:s.ik.feet.map(f=>({stance:f.stance,error:+f.error.toFixed(4),ankle:f.ankle.map(v=>+v.toFixed(3)),contact:f.contact.map(v=>+v.toFixed(3))})),speed:+s.move.speed.toFixed(2)});
 if(i===6||i===12)await p.screenshot({path:'/home/ubuntu/oasis-legend-game/ik-step-'+i+'.png'});
}
await p.evaluate(()=>window.__oasisDebug.setAnalog(0,0));await new Promise(r=>setTimeout(r,1400));
const errorSamples=samples.flatMap(x=>x.feet.filter(f=>f.stance&&f.error>0).map(f=>f.error));
const maxErr=Math.max(...errorSamples,0),mean=errorSamples.reduce((a,v)=>a+v,0)/Math.max(1,errorSamples.length);
console.log(JSON.stringify({structure,maxErr,mean,samples,errors:errs},null,2));
assert.equal(errs.length,0);
assert.ok(samples.some(x=>x.feet[0].stance!==x.feet[1].stance));
assert.ok(mean<.14,'Foot IK mean contact error must be under 14cm');
assert.ok(maxErr<.26,'Foot IK worst contact error must be under 26cm');
await b.close();console.log('IK ACCEPTANCE PASS');
