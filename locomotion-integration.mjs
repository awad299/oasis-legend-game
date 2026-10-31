import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();
await page.setViewport({width:412,height:915,isMobile:true,deviceScaleFactor:1,hasTouch:true});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico')) errors.push(r.status()+' '+r.url())});
await page.goto('http://127.0.0.1:5179/oasis-legend-game/',{waitUntil:'domcontentloaded',timeout:27000});
await page.waitForFunction(()=>window.__oasisDebug?.getState().animated?.premium,{timeout:40000});
await page.click('#start');
async function sample(stage,x,f,sprint,ms) {
 await page.evaluate((x,f,sprint)=>{const d=window.__oasisDebug;d.setAnalog(x,f);d.setSprint(sprint);},x,f,sprint);
 const before=await page.evaluate(()=>({state:window.__oasisDebug.getState(),m:window.__oasisDebug.getLocomotion()}));
 await new Promise(r=>setTimeout(r,ms));
 const after=await page.evaluate(()=>({state:window.__oasisDebug.getState(),m:window.__oasisDebug.getLocomotion()}));
 const meters=Math.hypot(after.state.x-before.state.x,after.state.z-before.state.z);
 const result={stage,meters:Number(meters.toFixed(3)),speed:Number(after.m.speed.toFixed(2)),target:Number(after.m.targetSpeed.toFixed(2)),gait:Number(after.m.distance.toFixed(3)),turn:Number(after.m.turnDistance.toFixed(3)),weight:after.m.character?.walkWeight,runWeight:after.m.character?.runWeight,walkTime:after.m.character?.walkTime,runTime:after.m.character?.runTime};
 console.log(JSON.stringify(result));
 return result;
}
const mild=await sample('gentle',0,.45,false,2400);
const full=await sample('full_walk',0,1,false,2400);
const run=await sample('run',0,1,true,2400);
const stop=await sample('stop',0,0,false,1600);
assert.ok(mild.meters>0.001,'gently moving should move');
assert.ok(full.target>mild.target*1.5, 'full analog input must request significantly faster walking');
assert.ok(run.target>full.target*1.7,'run must request significantly faster movement');
assert.equal(stop.target,0,'releasing stick must set target speed to zero');
assert.ok(stop.runWeight<run.runWeight,'running animation should fade on release');
for(const stage of [mild,full,run,stop]){
  const predictedWalk=(((stage.gait+stage.turn)/1.55)%1+1)%1;
  assert.ok(Math.abs(stage.walkTime-predictedWalk)<.002,'Walk clip phase must track distance, not elapsed time: '+stage.stage);
}
assert.ok(errors.length===0,'page should be error free');
console.log('PASS motion integration',JSON.stringify({errors}));
await browser.close();
