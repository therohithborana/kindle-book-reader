import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server=process.env.TARGET ? null : spawn(process.execPath,['tests/server.mjs'],{stdio:'inherit'});
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({hasTouch:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const external=[];page.on('request',r=>{if(r.url().includes('dictionaryapi'))external.push(r.url())});
try{
 await page.goto(process.env.TARGET||'http://localhost:4174');
 await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
 for(const type of ['epub','pdf']){
  await page.locator('#file').setInputFiles(new URL(`fixtures/test.${type}`,import.meta.url).pathname);
  await page.locator('.card').first().click();
  const text=type==='epub'?page.frameLocator('#view iframe').locator('p'):page.locator('.textLayer span').first();
  await text.waitFor();await text.dblclick({position:{x:15,y:5}});
  await page.locator('#popBody').getByText('Webster dictionary (offline)').waitFor();
  assert.match(await page.locator('#popBody').innerText(),/hello|world/i);
  await page.screenshot({path:`/tmp/${type}-verified.png`});
  await page.locator('#close').click();
  // A fresh, not-yet-looked-up letter must be available offline.
  await context.setOffline(true);
  const target=type==='epub'?page.frames().find(f=>f!==page.mainFrame()):page.mainFrame();
  const point=await target.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#view .textLayer span, body > p')];
   const root=nodes.find(n=>n.textContent.includes('dictionary'));
   const node=root.firstChild;const offset=node.textContent.indexOf('dictionary');
   const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+10);
   const rect=range.getBoundingClientRect();return {x:rect.x+10,y:rect.y+rect.height/2};
  });
  let x=point.x,y=point.y;
  if(type==='epub'){const box=await page.locator('#view iframe').boundingBox();x+=box.x;y+=box.y}
  await page.mouse.dblclick(x,y);

  await page.locator('#popBody').getByText('Webster dictionary (offline)').waitFor();
  assert.match(await page.locator('#popBody').innerText(),/dictionary/i);
  await page.screenshot({path:`/tmp/${type}-offline-verified.png`});
  await page.locator('#close').click();
  await page.touchscreen.tap(x,y);await page.touchscreen.tap(x,y);
  await page.locator('#popBody').getByText('Webster dictionary (offline)').waitFor();
  console.log(type, 'PASS double-touch lookup');
  await context.setOffline(false);await page.locator('#back').click();
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS: actual EPUB/PDF double-click, offline dictionary, no external dictionary calls, no page errors');
}finally{await browser.close();server?.kill()}
