(function(root){
 'use strict';
 const inline=root.InlineStickers||(typeof require==='function'?require('./inline-stickers.js'):null);
 function sections(entries){
  if(!Array.isArray(entries))throw Error('Saved journal entries could not be read.');
  const months=new Map();
  for(const x of entries.slice().sort((a,b)=>a.d.localeCompare(b.d))){
   const month=x.d.slice(0,7);if(!months.has(month))months.set(month,[]);
   months.get(month).push({title:x.title,meta:x.d+' · '+x.source,text:x.text,stickers:x.stickers,fields:inline.parts(x.text).map(p=>p.sticker?{sticker:p.sticker}:{label:'',text:p.text})});
  }
  return Array.from(months,([month,items])=>({title:new Date(month+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}),entries:items}));
 }
 async function create(entries,env){return root.ShadowsPDF.create(entries,env,{sections,drawInlineSticker:async(sticker,ctx,x,y)=>{const image=await env.image(root.StickerJournal.uri(sticker.id));ctx.drawImage(image,x,y,sticker.size,sticker.size)},decorationHeight:width=>width/3,drawDecorations:async(entry,ctx,x,y,width)=>{for(const s of root.StickerJournal.normalize(entry.stickers)){const image=await env.image(root.StickerJournal.uri(s.id));const scale=width/600;ctx.drawImage(image,x+s.x*scale,y+s.y*scale,s.size*scale,s.size*scale)}},cover:'assets/celestial-journal-star-chart-cover-v2.webp',frame:'assets/celestial-journal-chapter-frame-v2.webp'})}
 root.JournalPDF={create,sections};if(typeof module!=='undefined')module.exports=root.JournalPDF;
})(typeof globalThis!=='undefined'?globalThis:this);
