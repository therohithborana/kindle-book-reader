import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const target=process.env.TARGET || 'http://localhost:4174';
const server=process.env.TARGET?null:spawn(process.execPath,['tests/server.mjs']);
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const out=process.env.OUTPUT || '/downloads/mobile-local';
const pause=()=>page.waitForTimeout(700);
async function tapCenter(){await page.touchscreen.tap(195,400);await pause();}
async function chrome(show){if(await page.locator('#reader').evaluate(e=>e.classList.contains('chrome-visible'))!==show)await tapCenter();assert.equal(await page.locator('#reader').evaluate(e=>e.classList.contains('chrome-visible')),show);}
const progress=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kbr-progress-'+localStorage.getItem('kbr-last-open'))));
async function wordPoint(type,word){
 for(const f of (type==='epub'?page.frames().slice(1):[page.mainFrame()])){
 const offset=type==='epub'?await f.frameElement().then(el=>el.boundingBox()):{x:0,y:0};
 const p=await f.evaluate(({word,offset})=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(['SCRIPT','STYLE','TITLE'].includes(n.parentElement.tagName))continue;const text=n.textContent.toLowerCase();let i=-1;while((i=text.indexOf(word.toLowerCase(),i+1))>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+word.length);const b=r.getBoundingClientRect();if(b.x+offset.x>=16&&b.right+offset.x<=374&&b.y+offset.y>=20&&b.bottom+offset.y<=820)return{x:b.x+b.width/2+offset.x,y:b.y+b.height/2+offset.y};}}return null;},{word,offset});
 if(p)return p;
 }return null;
}
try{
 await page.goto(target);await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
 for(const type of ['epub','pdf']){
  await page.locator('#file').setInputFiles(process.env[type==='epub'?'EPUB_FIXTURE':'PDF_FIXTURE'] || `/downloads/alice.${type}`);await page.locator(`.card:has(.cover.${type})`).first().click();
  await page.locator(type==='epub'?'#view iframe':'.textLayer span').first().waitFor();await pause();
  if(type==='epub'){
   for(let i=0;i<8 && !(await wordPoint(type,'alice'));i++){await page.touchscreen.tap(384,400);await pause();}
   // Skip title/contents to a prose page.
   for(let i=0;i<7;i++){await page.touchscreen.tap(384,400);await pause();}
  }
  const stage=await page.locator('#stage').boundingBox();assert.equal(stage.width,390);assert.equal(stage.height,844);
  assert.equal(await page.locator('#reader header').evaluate(e=>getComputedStyle(e).visibility),'hidden');
  if(type==='pdf'){for(let i=0;i<5;i++){await page.touchscreen.tap(384,400);await pause();}}
  for(const theme of ['light','dark']){
   await chrome(true);if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme)await page.locator('#themeReader').click();await chrome(false);
   await page.screenshot({path:`${out}-${type}-${theme}.png`});
  }
  await chrome(true);await page.screenshot({path:`${out}-${type}-controls.png`});
  const bounds=await page.locator('#stage').boundingBox();const head=await page.locator('#reader header').boundingBox(),foot=await page.locator('#foot').boundingBox();console.log({type,bounds,head,foot});assert(bounds.y>=head.y+head.height);assert(bounds.y+bounds.height<=foot.y+1);
  await page.locator('#sizeUp').click();assert.equal(await page.locator('#sizeVal').innerText(),'110%');await pause();await page.locator('#sizeDown').click();await pause();await chrome(false);
  let pt=await wordPoint(type,type==='pdf'?'little':'rabbit');if(!pt)pt=await wordPoint(type,'rabbit');if(!pt)pt=await wordPoint(type,'door');if(!pt)pt=await wordPoint(type,'book');if(!pt)pt=await wordPoint(type,'project');
  assert(pt,`No dictionary word visible: ${type}`);
  await context.setOffline(true);
  // Long-press (press and hold) the word for its meaning.
  const lp=await context.newCDPSession(page);
  await lp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:Math.round(pt.x),y:Math.round(pt.y)}]});
  await page.waitForTimeout(650);
  await lp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pause();console.log('lookup',type,pt,await page.locator('#popup').innerText());await page.screenshot({path:`${out}-${type}-lookup-debug.png`});await page.locator('#popup ol').first().waitFor();assert.equal(await page.locator('#reader').evaluate(e=>e.classList.contains('chrome-visible')),false);
  await page.screenshot({path:`${out}-${type}-dictionary.png`});
  // Dismiss by tapping the text: the card itself sits below the word, so a
  // tap lower down would land on the card instead of dismissing it.
  await context.setOffline(false);await page.touchscreen.tap(pt.x,pt.y);await pause();
  // A single tap or a quick double tap on a word must not open the dictionary.
  assert.equal(await page.locator('#popup').evaluate(e=>e.hidden),true);
  await page.touchscreen.tap(pt.x,pt.y);await pause();
  assert.equal(await page.locator('#popup').evaluate(e=>e.hidden),true);
  await page.touchscreen.tap(pt.x,pt.y);await page.touchscreen.tap(pt.x,pt.y);await pause();
  assert.equal(await page.locator('#popup').evaluate(e=>e.hidden),true);
  console.log(type,'PASS taps do not fire dictionary');await chrome(false);
  if(type==='epub'){await page.setViewportSize({width:844,height:390});await pause();await page.setViewportSize({width:390,height:844});await pause();assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('spread')),false);}
  const before=await progress();await page.touchscreen.tap(384,400);await pause();const after=await progress();assert.notEqual(after.location,before.location);
  await page.reload();await page.locator(type==='epub'?'#view iframe':'.textLayer span').first().waitFor();await pause();assert.equal((await progress()).location,after.location);
  // Real touch swipe using CDP.
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:280,y:400}]});for(let x=260;x>=80;x-=20){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:405}]});await page.waitForTimeout(15);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause();assert.notEqual((await progress()).location,after.location);
  await chrome(true);await page.locator('#back').click();
 }
 assert.deepEqual(errors,[]);console.log('PASS phone EPUB/PDF: fullscreen, controls, no overlap, size, dark/light, offline long-press dictionary, tap does not lookup, edge turn, swipe, exact resume');
}finally{await browser.close();server?.kill();}
