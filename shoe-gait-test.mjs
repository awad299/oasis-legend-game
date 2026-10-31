import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();await page.setViewport({width:412,height:915,isMobile:true,deviceScaleFactor:1,hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5179/oasis-legend-game/',{waitUntil:'domcontentloaded',timeout:22000});
await page.waitForFunction(()=>window.__oasisDebug?.getState().animated?.premium,{timeout:35000});await page.click('#start');
await page.evaluate(()=>window.__oasisDebug.setAnalog(0,1));
const samples=[];
for(let i=0;i<9;i++){
 await new Promise(r=>setTimeout(r,700));
 const x=await page.evaluate(()=>window.__oasisDebug.getLocomotion());
 samples.push({i,gait:x.character.gait,speed:x.speed,distance:x.distance});
 if(i===3||i===6)await page.screenshot({path:'/home/ubuntu/oasis-legend-game/v7-step-'+i+'.png'});
}
await page.evaluate(()=>window.__oasisDebug.setAnalog(0,0));
await new Promise(r=>setTimeout(r,2000));
const stop=await page.evaluate(()=>window.__oasisDebug.getLocomotion());
console.log(JSON.stringify({samples,stop,errors}));
assert.equal(errors.length,0,'no JS errors');
assert.ok(samples.some(x=>x.gait.feet[0].lift>.015),'left foot must lift during stride');
assert.ok(samples.some(x=>x.gait.feet[1].lift>.015),'right foot must lift during stride');
assert.ok(samples.some(x=>x.gait.feet[0].stance&&!x.gait.feet[1].stance),'opposite feet must alternate stance');
assert.ok(stop.speed<samples[samples.length-1].speed*.3,'released joystick must reduce speed substantially');
assert.equal(stop.targetSpeed,0,'released joystick should request a full stop');
console.log('PASS foot-planting and stop');await browser.close();
