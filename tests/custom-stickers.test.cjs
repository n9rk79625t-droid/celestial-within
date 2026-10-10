const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas'),stickers=require('../journal-stickers.js'),inline=require('../inline-stickers.js');require('../book-of-shadows-pdf.js');const journal=require('../journal-pdf.js');
const image=src=>loadImage(src.startsWith('data:image/svg')?Buffer.from(decodeURIComponent(src.split(',')[1])):src);
const environment=storage=>({storage,canvas:createCanvas,image,png:c=>c.toDataURL('image/png')});
test('a transparent collage becomes a reusable named sticker and survives a fresh page load',async()=>{
 let saved='[]';const storage={getItem:()=>saved,setItem:(k,v)=>{saved=v}};
 const design=[{id:'moon',x:50,y:40,size:80},{id:'star',x:108,y:80,size:48}];stickers.set(design);const item=await stickers.saveDesign('Moon & Star',environment(storage));
 assert.equal(stickers.uri(item.id),item.src);assert.deepEqual(stickers.get(),design);assert.equal(JSON.parse(saved)[0].name,'Moon & Star');
 const img=await loadImage(item.src),c=createCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.drawImage(img,0,0);assert.equal(ctx.getImageData(0,0,1,1).data[3],0);assert.ok(img.width===img.height);assert.ok(img.width<=1024);
 const reload={localStorage:storage};vm.createContext(reload);vm.runInContext(fs.readFileSync(path.join(__dirname,'../journal-stickers.js'),'utf8'),reload);assert.equal(reload.StickerJournal.uri(item.id),item.src);assert.equal(reload.StickerJournal.catalog.at(-1).name,'Moon & Star');
 const text='My design '+inline.token(item.id,88);assert.equal(inline.parts(text)[1].sticker.id,item.id);assert.ok(inline.markup(text).includes(item.src));assert.equal(journal.sections([{d:'2026-10-10',source:'Daily',title:'Collage',text}])[0].entries[0].fields[1].sticker.id,item.id);
 if(process.env.CUSTOM_QA_PATH)fs.writeFileSync(process.env.CUSTOM_QA_PATH,c.toBuffer('image/png'));
});
test('failed collection writes leave the design and existing collection untouched',async()=>{
 const design=[{id:'crystal',x:40,y:40,size:76}];stickers.set(design);const before=stickers.catalog.length;let data='[]';const storage={getItem:()=>data,setItem:()=>{throw Error('Quota exceeded')}};await assert.rejects(stickers.saveDesign('Crystal',environment(storage)),/storage/);assert.equal(data,'[]');assert.deepEqual(stickers.get(),design);assert.equal(stickers.catalog.length,before);
 stickers.set([]);await assert.rejects(stickers.saveDesign('Empty',environment(storage)),/Add stickers/);
});
test('custom PNG stickers appear in exported journal pages',async()=>{
 const item=stickers.catalog.find(c=>c.src),text='Before\n'+inline.token(item.id,90)+'\nAfter';const {PDFDocument}=require('pdf-lib');let drawn=false;
 const result=await journal.create([{d:'2026-10-10',source:'Daily',title:'My collage',text}],{canvas:(w,h)=>{const c=createCanvas(w,h),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(img,x,y,w,h)=>{if(w===90&&h===90)drawn=true;return draw(img,x,y,w,h)};return c},image:src=>src.startsWith('data:')?image(src):loadImage(path.join(__dirname,'../',src)),jpeg:c=>new Uint8Array(c.toBuffer('image/jpeg'))});assert.ok(drawn);const pdf=await PDFDocument.load(result.bytes);assert.equal(pdf.getPageCount(),3);
});
test('refresh loads new designs and deletion persists without breaking existing entries',()=>{
 const src=stickers.catalog.find(c=>c.src).src,item={id:'custom-refresh-test',name:'Refreshed design',src};let data=JSON.stringify([item]);const storage={getItem:()=>data,setItem:(k,v)=>{data=v}};
 assert.equal(stickers.refreshCollection(storage)[0].id,item.id);assert.equal(stickers.uri(item.id),src);
 const token=inline.token(item.id,72);assert.equal(stickers.deleteDesign(item.id,storage),true);assert.equal(stickers.refreshCollection(storage).length,0);assert.equal(JSON.parse(data)[0].deleted,true);assert.equal(stickers.uri(item.id),src);assert.ok(inline.markup(token).includes(src));
 const reload={localStorage:storage};vm.createContext(reload);vm.runInContext(fs.readFileSync(path.join(__dirname,'../journal-stickers.js'),'utf8'),reload);assert.equal(reload.StickerJournal.uri(item.id),src);assert.equal(reload.StickerJournal.catalog.find(c=>c.id===item.id).deleted,true);assert.equal(reload.StickerJournal.normalize([{id:item.id,x:0,y:0,size:72}])[0].id,item.id);
 assert.equal(stickers.deleteDesign('moon',storage),false);
});
test('failed deletes and invalid refreshes do not hide a saved sticker',()=>{
 const item={id:'custom-failure-test',name:'Keep me',src:stickers.catalog.find(c=>c.src).src};const data=JSON.stringify([item]),storage={getItem:()=>data,setItem:()=>{throw Error('Unavailable')}};stickers.refreshCollection(storage);
 assert.throws(()=>stickers.deleteDesign(item.id,storage),/could not be deleted/);assert.ok(!stickers.catalog.find(c=>c.id===item.id).deleted);
 assert.throws(()=>stickers.refreshCollection({getItem:()=>'{broken'}));assert.ok(!stickers.catalog.find(c=>c.id===item.id).deleted);
});
test('refresh and delete buttons update the visible collection without clearing the draft',()=>{
 class Element{constructor(){this.children=[];this.events={};this.style={};this.classList={toggle(){}}}append(...n){this.children.push(...n)}set innerHTML(v){this.children=[]}addEventListener(n,f){this.events[n]=f}setAttribute(){}click(){this.events.click?.()}}
 const ids=Object.fromEntries(['stickerBoard','stickerStatus','stickerControls','stickerSize','stickerTray','myStickerTray','refreshStickers','removeSticker'].map(k=>[k,new Element()]));let data='[]';const storage={getItem:()=>data,setItem:(k,v)=>{data=v}},ctx={localStorage:storage,document:{getElementById:k=>ids[k],createElement:()=>new Element(),createTextNode:s=>s}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../journal-stickers.js'),'utf8'),ctx);ctx.StickerJournal.mount();ctx.StickerJournal.add('moon');
 data=JSON.stringify([{id:'custom-ui-test',name:'UI design',src:stickers.catalog.find(c=>c.src).src}]);ids.refreshStickers.click();const group=ids.myStickerTray.children[0];assert.equal(group.children[1].textContent,'Delete');assert.equal(ctx.StickerJournal.get().length,1);
 group.children[1].click();assert.equal(ids.myStickerTray.children[0].textContent,'No saved designs yet.');assert.equal(JSON.parse(data)[0].deleted,true);assert.equal(ctx.StickerJournal.get().length,1);
});
