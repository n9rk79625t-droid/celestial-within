const test=require('node:test'),assert=require('node:assert/strict');
const exporter=require('../book-of-shadows-pdf.js');
test('all grimoire sources retain fields and recipe steps in the export plan',()=>{
 const data={celebrations:[{wheel:'Samhain',memory:'Family\nMemories'}],recipes:[{type:'spell',labels:['Name','Outcome'],values:['Light','Peace'],steps:['Prepare','Finish']},{type:'ritual',labels:['Name'],values:['Rest']}],traditions:[{source:'moon',name:'Moon tradition',text:'Reflection'}]};
 const a=exporter.sections(data);assert.equal(a.length,4);assert.equal(a[0].entries[0].fields.at(-1).text,'Family\nMemories');assert.equal(a[1].entries[0].fields.at(-1).text,'1. Prepare\n\n2. Finish');assert.equal(a[3].entries[0].title,'Moon tradition');
});
test('wrap preserves newlines and breaks long words without losing characters',()=>{
 const ctx={measureText:s=>({width:s.length})};assert.deepEqual(exporter.wrap(ctx,'One\n\nTwo',5),['One','','Two']);const word='abcdefghijklmnopqrstuvwxyz';assert.equal(exporter.wrap(ctx,word,5).join(''),word);assert.ok(exporter.wrap(ctx,word,5).every(s=>s.length<=5));
});
let canvas,pdf;try{canvas=require('@napi-rs/canvas');pdf=require('pdf-lib')}catch{}
test('PDF renders Letter cover and chapter pages; long entries paginate within margins',{skip:!canvas||!pdf},async()=>{
 const data={celebrations:[{wheel:'Samhain',date:'Oct 31, 2026',theme:'Remembrance',memory:'A meaningful celebration.\n'+('Long reflection with symbols ☾ and accents café. '.repeat(500))}],recipes:[{type:'spell',labels:['Name','Outcome'],values:['A Candle for Gratitude','A quiet moment.'],steps:['Prepare a safe space.','Reflect with gratitude.']},{type:'ritual',labels:['Name','Purpose'],values:['Evening Ritual','Release and rest']}],traditions:[{source:'moon',name:'Moon tradition',text:'Look at the sky.\nWrite a reflection.'}]};
 const before=JSON.stringify(data),bounds=[];
 const result=await exporter.create(data,{canvas:(w,h)=>{let c=canvas.createCanvas(w,h),ctx=c.getContext('2d'),fill=ctx.fillText.bind(ctx);ctx.fillText=(s,x,y,...rest)=>{bounds.push({s,x,y});return fill(s,x,y,...rest)};return c},image:path=>canvas.loadImage(require('node:path').join(__dirname,'../',path)),jpeg:c=>new Uint8Array(c.toBuffer('image/jpeg'))});
 assert.equal(JSON.stringify(data),before);assert.equal(result.pageKinds[0],'cover');assert.equal(result.pageKinds.filter(x=>x==='chapter').length,4);assert.ok(result.pageKinds.length>9);assert.ok(bounds.every(x=>x.y<=749&&x.y>=43));
 const doc=await pdf.PDFDocument.load(result.bytes);assert.equal(doc.getPageCount(),result.pageKinds.length);for(const page of doc.getPages())assert.deepEqual(page.getSize(),{width:612,height:792});
 if(process.env.CW_PDF_QA_PATH)require('node:fs').writeFileSync(process.env.CW_PDF_QA_PATH,result.bytes);
});
