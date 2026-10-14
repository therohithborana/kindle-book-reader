import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const target=process.env.TARGET||'http://localhost:4174';
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1330,height:864}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const out=process.env.OUTPUT||'/downloads/local';
async function ink(){return await page.frames()[1].evaluate(()=>({color:getComputedStyle(document.querySelector('p')).color,bg:getComputedStyle(document.body).backgroundColor,column:parseFloat(getComputedStyle(document.body).columnWidth),width:document.body.clientWidth,htmlbg:getComputedStyle(document.documentElement).backgroundColor}));}
async function split(){
 const results=await page.frames()[1].evaluate(()=>{const w=document.body.clientWidth;const range=document.createRange();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const boxes=[];while(walker.nextNode()){if(!walker.currentNode.textContent.trim()||['STYLE','SCRIPT','TITLE'].includes(walker.currentNode.parentElement.tagName))continue;range.selectNodeContents(walker.currentNode);for(const r of range.getClientRects()){if(r.width>0&&r.left>=0&&r.right<=w+1&&r.top>=0&&r.bottom<=innerHeight+1)boxes.push({l:r.left,r:r.right});}}return{w,left:boxes.filter(r=>r.r<w/2).length,right:boxes.filter(r=>r.l>w/2).length,cross:boxes.filter(r=>r.l<w/2-4&&r.r>w/2+4).length};});
 console.log('split',results);assert(results.left>10);assert(results.right>10);assert.equal(results.cross,0);assert(await page.locator('#stage').evaluate(e=>e.classList.contains('spread')));
}
try{
 await page.goto(target);await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
 await page.locator('#file').setInputFiles(process.env.EPUB_FIXTURE || '/downloads/crime.epub');await page.locator('.card').first().click();await page.locator('#view iframe').waitFor();
 for(let i=0;i<8;i++){await page.locator('#next').click();await page.waitForTimeout(120);}
 for(const theme of ['light','dark']){
  if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme)await page.locator('#themeReader').click();
  await split();const st=await ink();console.log(theme,st);assert.equal(st.color,theme==='dark'?'rgb(217, 212, 200)':'rgb(43, 38, 32)');assert.equal(st.bg,'rgba(0, 0, 0, 0)');assert.equal(st.htmlbg,'rgba(0, 0, 0, 0)');
  await page.screenshot({path:`${out}-epub-${theme}.png`});
 }
 await page.locator('#sizeUp').click();await page.locator('#sizeUp').click();await page.waitForTimeout(700);await split();
 const readProgress=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kbr-progress-'+localStorage.getItem('kbr-last-open'))));
 await page.locator('#next').click();await page.waitForTimeout(300);await split();
 const saved=await readProgress();assert(saved.location.startsWith('epubcfi('));await page.reload();await page.locator('#view iframe').waitFor();await page.waitForTimeout(600);assert.equal((await readProgress()).location,saved.location);console.log('resumed',await ink());await split();
 assert.equal(await page.locator('#sizeVal').innerText(),'120%');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert(!(await page.locator('#stage').evaluate(e=>e.classList.contains('spread'))));const mobile=await ink();assert(mobile.column>=mobile.width-1);await page.screenshot({path:`${out}-epub-mobile.png`});
 await page.setViewportSize({width:1330,height:864});await page.waitForTimeout(500);await split();
 await page.locator('#sizeDown').click();await page.locator('#sizeDown').click();await page.locator('#back').click();await page.locator('#file').setInputFiles(process.env.PDF_FIXTURE || '/downloads/paper.pdf');await page.locator('.card:has(.cover.pdf)').click();await page.locator('.textLayer span').first().waitFor();
 for(const theme of ['light','dark']){if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme)await page.locator('#themeReader').click();assert.equal(await page.locator('.pdfwrap').count(),2);console.log('pdf',theme,await page.locator('.pdfwrap canvas').first().evaluate(e=>getComputedStyle(e).filter));await page.screenshot({path:`${out}-pdf-${theme}.png`});}
 await page.locator('#next').click();await page.waitForTimeout(500);assert.equal(await page.locator('#pos').innerText(),'3–4 / 14');await page.reload();await page.locator('.textLayer span').first().waitFor();assert.equal(await page.locator('#pos').innerText(),'3–4 / 14');
 assert.deepEqual(errors,[]);console.log('PASS real EPUB/PDF, actual text columns, themes, resizing, sizing, resume');
}finally{await browser.close();}
