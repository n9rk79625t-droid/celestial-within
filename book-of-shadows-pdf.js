(function(root){
 'use strict';
 const W=612,H=792,M=43,SCALE=2;
 function sections(data){
  const fields=(pairs)=>pairs.map(([label,value])=>({label,text:String(value??'')}));
  const rank=x=>['Samhain','Yule','Imbolc','Ostara','Beltane','Litha','Lughnasadh','Mabon'].indexOf(x.wheel);
  const ordered=a=>a.slice().sort((a,b)=>(rank(a)<0?99:rank(a))-(rank(b)<0?99:rank(b)));
  const out=[{title:'Celebrations',subtitle:'Seasonal, lunar and personal observances',entries:ordered(data.celebrations).map(x=>({title:x.wheel||'Celebration',meta:[x.kind,x.date].filter(Boolean).join(' · '),fields:fields([['Theme',x.theme],['Deities honored',x.deities],['Offerings',x.offerings],['Food / meals',x.food],['Incantations / prayers',x.prayer],['Spells / rituals',x.working],['What I want to remember',x.memory]])}))}];
  for(const type of ['spell','ritual'])out.push({title:type==='spell'?'Spells':'Rituals',subtitle:'Saved '+type+' recipes',entries:ordered(data.recipes.filter(x=>x.type===type)).map(x=>{
   if(!Array.isArray(x.labels)||!Array.isArray(x.values)||x.steps&&!Array.isArray(x.steps))throw Error('A saved recipe could not be read.');
   return {title:x.values[0]||type,meta:[x.wheel,x.date].filter(Boolean).join(' · '),fields:fields(x.labels.slice(1).map((label,i)=>[label,x.values[i+1]])).concat(x.steps?.length?fields([['Steps',x.steps.map((s,i)=>(i+1)+'. '+s).join('\n\n')]]):[])};
  })});
  out.push({title:'Traditions',subtitle:'Saved moon and seasonal traditions',entries:data.traditions.map(x=>({title:x.name||'Tradition',meta:[x.source==='moon'?'Moon tradition':'Seasonal tradition',x.date].filter(Boolean).join(' · '),fields:fields([['Tradition',x.text]])}))});
  return out;
 }
 function wrap(ctx,text,width){
  const lines=[];
  for(const paragraph of String(text??'').replace(/\r\n?/g,'\n').split('\n')){
   let line='';
   for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(ctx.measureText(word).width>width){
     if(line){lines.push(line);line=''}
     let part='';for(const c of word){if(part&&ctx.measureText(part+c).width>width){lines.push(part);part=c}else part+=c}line=part;
    }else if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word}else line+=(line?' ':'')+word;
   }
   lines.push(line);
  }
  return lines;
 }
 function imagePDF(pages){
  const encoder=new TextEncoder(),chunks=[],offsets=[0];let size=0;
  const put=x=>{const bytes=typeof x==='string'?encoder.encode(x):x;chunks.push(bytes);size+=bytes.length};
  const obj=(id,body)=>{offsets[id]=size;put(id+' 0 obj\n');put(body);put('\nendobj\n')};
  put('%PDF-1.4\n%CW-PDF\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
  pages.forEach((page,i)=>{
   const id=3+i*3;
   obj(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
   offsets[id+1]=size;put((id+1)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+page.width+' /Height '+page.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+page.bytes.length+' >>\nstream\n');put(page.bytes);put('\nendstream\nendobj\n');
   const content='q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n';obj(id+2,'<< /Length '+encoder.encode(content).length+' >>\nstream\n'+content+'endstream');
  });
  const xref=size,count=3+pages.length*3;put('xref\n0 '+count+'\n0000000000 65535 f \n');
  for(let i=1;i<count;i++)put(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+count+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF');
  const result=new Uint8Array(size);let pos=0;for(const chunk of chunks){result.set(chunk,pos);pos+=chunk.length}return result;
 }
 async function create(data,env,options={}){
  const chapters=options.sections?options.sections(data):sections(data),pages=[],pageKinds=[];
  let canvas,ctx,y;
  const make=()=>{canvas=env.canvas(W*SCALE,H*SCALE);ctx=canvas.getContext('2d');ctx.scale(SCALE,SCALE);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.textBaseline='top';ctx.fillStyle='#453044';y=M};
  const finish=async(kind)=>{const bytes=await env.jpeg(canvas);pages.push({width:W*SCALE,height:H*SCALE,bytes});pageKinds.push(kind);await env.yield?.()};
  const font=(size,bold=false)=>{ctx.font=(bold?'bold ':'')+size+'px Georgia, serif';ctx.fillStyle='#453044'};
  const line=(text,size=11,bold=false)=>{font(size,bold);ctx.fillText(text,M,y);y+=size*1.45};
  async function lines(text,size=11,bold=false){font(size,bold);const a=wrap(ctx,text,W-2*M);for(const text of a){if(y+size*1.45>H-M){await finish('entry');make();line('Continued',9);y+=8;font(size,bold)}ctx.fillText(text,M,y);y+=size*1.45}}
  make();const image=await env.image(options.cover||'assets/book-of-shadows-print-cover-v1.webp');const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const ratio=Math.min((W-2*29)/iw,(H-2*29)/ih);ctx.drawImage(image,(W-iw*ratio)/2,(H-ih*ratio)/2,iw*ratio,ih*ratio);await finish('cover');
  const frame=await env.image(options.frame||'assets/shadows-chapter-frame-v1.webp');
  for(const chapter of chapters){
   make();const fw=frame.naturalWidth||frame.width,fh=frame.naturalHeight||frame.height,fr=Math.min((W-2*29)/fw,(H-2*29)/fh);ctx.drawImage(frame,(W-fw*fr)/2,(H-fh*fr)/2,fw*fr,fh*fr);
   ctx.textAlign='center';ctx.font='42px "Snell Roundhand", "Brush Script MT", "Segoe Script", "Z003", cursive';ctx.fillStyle='#603650';ctx.fillText(chapter.title,W/2,365);ctx.textAlign='left';await finish('chapter');
   if(!chapter.entries.length)continue;
   make();
   for(const entry of chapter.entries){
    if(y>H-M-100){await finish('entry');make()}
    await lines(entry.title,18,true);await lines(entry.meta,9);y+=10;
    for(const field of entry.fields){if(!field.text.trim())continue;if(y>H-M-45){await finish('entry');make()}await lines(field.label,11,true);await lines(field.text);y+=10}
    y+=14;
   }
   await finish('entry');
  }
  return {bytes:imagePDF(pages),pageKinds};
 }
 root.ShadowsPDF={create,sections,wrap,imagePDF};if(typeof module!=='undefined')module.exports=root.ShadowsPDF;
})(typeof globalThis!=='undefined'?globalThis:this);

