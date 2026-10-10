const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const stickers=require('../journal-stickers.js'),inline=require('../inline-stickers.js');require('../book-of-shadows-pdf.js');const journal=require('../journal-pdf.js');
test('pasted sample image addresses become inline artwork without dropping surrounding writing',()=>{
 const text='Before\n'+stickers.uri('moon')+'\nAfter';const clean=inline.clean(text);
 assert.equal(clean,'Before\n[[cw-sticker:moon:56]]\nAfter');const p=inline.parts(text);assert.equal(p[0].text,'Before\n');assert.deepEqual(p[1].sticker,{id:'moon',size:56});assert.equal(p[2].text,'\nAfter');
 const html=inline.markup(text);assert.ok(html.includes('<img class="inline-journal-sticker"'));assert.ok(html.includes('Before<br>'));assert.ok(html.includes('<br>After'));assert.ok(!html.includes('[[cw-sticker:'));
});
test('plain writing is escaped; resizing and multiple inline stickers survive chapter conversion',()=>{
 assert.equal(inline.markup('<script>alert(1)</script>'),'&lt;script&gt;alert(1)&lt;/script&gt;');
 const text='One '+inline.token('star',80)+'\nTwo '+inline.token('crystal',48);const entry=journal.sections([{d:'2026-10-10',source:'Daily',title:'Reflection',text}])[0].entries[0];assert.equal(entry.text,text);assert.deepEqual(entry.fields.filter(x=>x.sticker).map(x=>x.sticker.size),[80,48]);
});
test('PDF displays inline artwork between the surrounding reflection text',async()=>{
 const {createCanvas,loadImage}=require('@napi-rs/canvas'),{PDFDocument}=require('pdf-lib');const operations=[];
 const result=await journal.create([{d:'2026-10-10',source:'Daily',title:'Visible stickers',text:'Before the moon.\n'+inline.token('moon',80)+'\nAfter the moon.'}],{
 canvas:(w,h)=>{const c=createCanvas(w,h),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx),fill=ctx.fillText.bind(ctx);ctx.drawImage=(img,x,y,w,h)=>{if(img.width===100)operations.push({sticker:true,y,w,h});return draw(img,x,y,w,h)};ctx.fillText=(t,x,y,...rest)=>{operations.push({text:t,y});return fill(t,x,y,...rest)};return c},
 image:src=>loadImage(src.startsWith('data:')?Buffer.from(decodeURIComponent(src.split(',')[1])):path.join(__dirname,'../',src)),jpeg:c=>new Uint8Array(c.toBuffer('image/jpeg'))
 });const before=operations.find(x=>x.text==='Before the moon.'),image=operations.find(x=>x.sticker),after=operations.find(x=>x.text==='After the moon.');assert.ok(before.y<image.y&&image.y+image.h<after.y);assert.equal(image.w,80);const pdf=await PDFDocument.load(result.bytes);assert.equal(pdf.getPageCount(),3);if(process.env.INLINE_QA_PATH)fs.writeFileSync(process.env.INLINE_QA_PATH,result.bytes);
});
