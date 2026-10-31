import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
for(const mode of ['mobile','desktop']){
 const page=await browser.newPage();
 if(mode==='mobile') await page.setViewport({width:412,height:915,isMobile:true,deviceScaleFactor:1,hasTouch:true});
 else await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
 const errs=[];page.on('pageerror',e=>errs.push(e.stack||String(e)));page.on('console',msg=>{if(msg.type()==='error')errs.push('console:'+msg.text());});
 await page.goto('http://127.0.0.1:5179/oasis-legend-game/',{waitUntil:'domcontentloaded',timeout:25000});
 await new Promise(r=>setTimeout(r,2500));
 const ready=await page.evaluate(()=>({debug:!!window.__oasisDebug,gl:!!document.querySelector('canvas'),intro:!!document.querySelector('#intro.active'),fatal:document.querySelector('#fatal')?.textContent}));
 await page.screenshot({path:'/home/ubuntu/oasis-legend-game/'+mode+'-before.png'});
 await page.click('#start');
 await new Promise(r=>setTimeout(r,1200));
 let before=await page.evaluate(()=>window.__oasisDebug?.getState());
 if(mode==='desktop'){await page.keyboard.down('w');await new Promise(r=>setTimeout(r,1200));await page.keyboard.up('w');}
 else {
 const r=await page.$eval('#joystick',el=>{const q=el.getBoundingClientRect();return {x:q.left+q.width/2,y:q.top+q.height/2};});
 await page.touchscreen.touchStart(r.x,r.y);
 await page.touchscreen.touchMove(r.x,r.y-40);
 await new Promise(res=>setTimeout(res,1200));
 await page.touchscreen.touchEnd();
 }
 let after=await page.evaluate(()=>window.__oasisDebug?.getState());
 await page.screenshot({path:'/home/ubuntu/oasis-legend-game/'+mode+'-playing.png'});
 console.log(JSON.stringify({mode,ready,before,after,errors:errs.slice(0,8)}));
 await page.close();
}
await browser.close();
