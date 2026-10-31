import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();await page.setViewport({width:412,height:915,isMobile:true,deviceScaleFactor:2.6,hasTouch:true});
const errors=[],net404=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)net404.push(r.url())});
await page.goto('http://127.0.0.1:5179/oasis-legend-game/',{waitUntil:'domcontentloaded',timeout:25000});
await page.waitForFunction(()=>window.__oasisDebug?.getState()?.animated?.ready,{timeout:30000});
await page.click('#start');
await page.waitForFunction(()=>document.querySelector('#goalHint')?.textContent?.includes('م'),{timeout:8000});
const first=await page.evaluate(()=>({state:window.__oasisDebug.getState(),goal:document.querySelector('#goalHint').textContent}));
for(const [x,z] of [[-3,5],[-17,-13],[-21,19],[26,24],[-3,-32]]){
 console.log("GOAL",x,z);await page.evaluate((x,z)=>window.__oasisDebug.setPosition(x,z),x,z);
 await page.waitForFunction((v)=>window.__oasisDebug.getState().collected>=v,{timeout:40000},[[ -3,5],[-17,-13],[-21,19],[26,24],[-3,-32]].findIndex(p=>p[0]===x&&p[1]===z)+1);
}
const all=await page.evaluate(()=>window.__oasisDebug.getState());
await page.evaluate(()=>window.__oasisDebug.setPosition(0,-40));
await new Promise(r=>setTimeout(r,450));
await page.click('#interact');
await new Promise(r=>setTimeout(r,550));
const last=await page.evaluate(()=>({state:window.__oasisDebug.getState(),dialog:document.querySelector('#dialogue').className,quest:document.querySelector('#questText').textContent,saved:localStorage.getItem('oasis_progress')}));
console.log(JSON.stringify({first,all,last,errors,net404},null,2));
if(all.collected!==5||!last.state.inDialog||last.quest!=='اكتملت أسطورة الواحة'||errors.length)process.exitCode=1;
await browser.close();
