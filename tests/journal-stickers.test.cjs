const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stickers=require('../journal-stickers.js'),books=require('../keepsake-books.js');
require('../book-of-shadows-pdf.js');const journal=require('../journal-pdf.js');
const storage=value=>({getItem:k=>k==='cw-calendar'?value:null});
test('old entries remain unchanged; saved sticker positions survive journal and chapter transforms',()=>{
 const plain={d:'2026-10-09',title:'Quiet',text:'Morning'};
 const old=books.journal(storage(JSON.stringify([plain])));assert.equal(old[0].stickers,undefined);
 const placed={id:'moon',x:84,y:40,size:76};const data=JSON.stringify([{...plain,stickers:[placed]}]);
 const entries=books.journal(storage(data));assert.deepEqual(entries[0].stickers,[placed]);assert.deepEqual(journal.sections(entries)[0].entries[0].stickers,[placed]);assert.equal(storage(data).getItem('cw-calendar'),data);
});
test('sticker bounds are safe and invalid artwork cannot become HTML or external URLs',()=>{
 assert.deepEqual(stickers.normalize([{id:'star',x:999,y:-20,size:100}]),[{id:'star',x:500,y:0,size:100}]);
 for(const entry of [{id:'<script>',x:0,y:0,size:56},{id:'moon',x:NaN,y:0,size:56}])assert.throws(()=>stickers.markup([entry]));
 assert.throws(()=>stickers.normalize(Array(25).fill({id:'moon',x:0,y:0,size:56})));
 assert.ok(stickers.markup([{id:'crystal',x:30,y:40,size:60}]).includes('data:image/svg+xml'));
});
test('tray selection, pointer movement, size control, removal and keyboard movement update the draft',()=>{
 class Element{
  constructor(){this.children=[];this.style={};this.events={};this.classList={toggle:()=>{}};this.value='56'}
  append(...nodes){this.children.push(...nodes)}
  set innerHTML(v){this.children=[]}get innerHTML(){return ''}
  addEventListener(n,f){(this.events[n]??=[]).push(f)}removeEventListener(n,f){this.events[n]=(this.events[n]||[]).filter(x=>x!==f)}
  dispatch(n,e={}){for(const f of [...(this.events[n]||[])])f(e)}
  setAttribute(){}focus(){}setPointerCapture(){}querySelectorAll(){return this.children}
  getBoundingClientRect(){return {width:300,height:100}}
 }
 const ids=Object.fromEntries(['stickerBoard','stickerStatus','stickerControls','stickerSize','stickerTray','removeSticker'].map(k=>[k,new Element()]));
 const ctx={document:{getElementById:k=>ids[k],createElement:()=>new Element(),createTextNode:s=>s}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../journal-stickers.js'),'utf8'),ctx);ctx.StickerJournal.mount();
 ids.stickerTray.children[0].dispatch('click');assert.equal(ctx.StickerJournal.get().length,1);
 const b=ids.stickerBoard.children[0];b.dispatch('pointerdown',{clientX:0,clientY:0,pointerId:1,preventDefault(){}});b.dispatch('pointermove',{clientX:30,clientY:20});b.dispatch('pointerup');assert.equal(ctx.StickerJournal.get()[0].x,95);assert.equal(ctx.StickerJournal.get()[0].y,110);
 ids.stickerSize.value='100';ids.stickerSize.dispatch('input');assert.equal(ctx.StickerJournal.get()[0].size,100);assert.equal(ctx.StickerJournal.get()[0].y,100);
 ids.stickerBoard.children[0].dispatch('keydown',{key:'ArrowLeft',preventDefault(){}});assert.equal(ctx.StickerJournal.get()[0].x,90);
 ids.removeSticker.dispatch('click');assert.equal(ctx.StickerJournal.get().length,0);assert.equal(ids.stickerControls.hidden,true);
});
test('saving, reopening, and a failed save retain decorations and existing data',()=>{
 const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');const code=html.slice(html.indexOf('let editDailyIndex=null;'),html.indexOf('\nfunction deleteDaily('));
 const fields={calendarDate:{value:'2026-10-10'},calendarTitle:{value:'Morning'},calendarText:{value:'Reflection'}};
 let raw='[]',draft=[{id:'star',x:80,y:60,size:56}],fail=false;let context={document:{getElementById:id=>fields[id]},localStorage:{getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('Full');raw=v}},KeepsakeBooks:books,StickerJournal:{get:()=>structuredClone(draft),set:a=>{draft=a||[]},report:()=>{}},renderCalendar:()=>{},buildDailyJournalBook:()=>{},window:{scrollTo:()=>{}}};vm.createContext(context);vm.runInContext(code,context);
 context.saveDailyEntry();assert.equal(JSON.parse(raw)[0].stickers[0].id,'star');assert.equal(draft.length,0);
 context.editDaily(0);assert.equal(draft[0].x,80);draft[0].size=92;context.saveDailyEntry();assert.equal(JSON.parse(raw).length,1);assert.equal(JSON.parse(raw)[0].stickers[0].size,92);
 fields.calendarText.value='Unsaved';draft=[{id:'moon',x:20,y:20,size:56}];fail=true;const before=raw;context.saveDailyEntry();assert.equal(raw,before);assert.equal(draft[0].id,'moon');assert.equal(fields.calendarText.value,'Unsaved');
});
test('PDF includes stickers at matching positions and paginates long reflections',{skip:!require.resolve('@napi-rs/canvas')},async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),{PDFDocument}=require('pdf-lib'),path=require('node:path');let stickerDraws=[];
 const entries=[{d:'2026-10-10',title:'Morning',source:'Daily',text:'A peaceful reflection. '.repeat(1200),stickers:[{id:'moon',x:80,y:40,size:76},{id:'star',x:410,y:100,size:64}]}];
 const result=await journal.create(entries,{canvas:(w,h)=>{const c=createCanvas(w,h),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(image,x,y,w,h)=>{if(image.width===100)stickerDraws.push({x,y,w,h});return draw(image,x,y,w,h)};return c},image:src=>loadImage(src.startsWith('data:')?Buffer.from(decodeURIComponent(src.split(',')[1])):path.join(__dirname,'../',src)),jpeg:c=>new Uint8Array(c.toBuffer('image/jpeg'))});
 const pdf=await PDFDocument.load(result.bytes);assert.ok(pdf.getPageCount()>4);assert.equal(stickerDraws.length,2);assert.ok(stickerDraws.every(s=>s.y>=43&&s.y+s.h<=749&&s.x>=43&&s.x+s.w<=569));assert.ok(Math.abs(stickerDraws[0].w-76*526/600)<.001);for(const page of pdf.getPages())assert.deepEqual(page.getSize(),{width:612,height:792});
 if(process.env.STICKER_QA_PATH)fs.writeFileSync(process.env.STICKER_QA_PATH,result.bytes);
});
