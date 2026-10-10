(function(root){
 'use strict';
 function list(storage,key){
  const a=JSON.parse(storage.getItem(key)||'[]');
  if(!Array.isArray(a)||a.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error('Unreadable saved entries: '+key);
  return a;
 }
 const stickers=root.StickerJournal||(typeof require==='function'?require('./journal-stickers.js'):null);
 const str=x=>x==null?'':String(x);
 function dateValid(d){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;
  const v=new Date(d+'T12:00:00');return Number.isFinite(v.getTime())&&localDate(v)===d;
 }
 function localDate(v=new Date()){return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0')}
 function journal(storage){
  const daily=list(storage,'cw-calendar').map((x,i)=>({source:'Daily',index:i,d:str(x.d),title:str(x.title)||'Daily Entry',text:str(x.text),...(x.stickers?{stickers:stickers.normalize(x.stickers)}:{})}));
  const moon=list(storage,'cw-moon-entries').map((x,i)=>({source:'Moon',index:i,d:str(x.d),title:'Moon Reflection',text:[x.phase&&'Moon phase: '+x.phase+(x.approximate?' (estimated)':''),x.phaseNote,x.journal,x.practice&&'Practice / ritual:\n'+x.practice].filter(Boolean).join('\n\n')}));
  const tarot=list(storage,'cw-tarot-entries').map((x,i)=>({source:'Tarot',index:i,id:x.id,d:str(x.d),title:x.card?'Tarot · '+str(x.card):'Tarot Reflection',text:[x.first&&'First impression:\n'+x.first,x.journal&&'How this showed up today:\n'+x.journal,x.meaning&&'My interpretation:\n'+x.meaning].filter(Boolean).join('\n\n')}));
  const a=daily.concat(moon,tarot);if(a.some(x=>!dateValid(x.d)))throw Error('An entry date could not be read.');
  return a.sort((a,b)=>a.d.localeCompare(b.d));
 }
 function grimoire(storage){
  return {celebrations:list(storage,'cw-observances'),recipes:list(storage,'cw-recipes'),traditions:['moon','wheel'].flatMap(source=>list(storage,'cw-archive-'+source).map(x=>({...x,source})))};
 }
 function readTarot(storage){const a=list(storage,'cw-tarot-entries');if(a.some(x=>typeof x.id!=='string'||!dateValid(x.d)))throw Error('Unreadable Tarot entries');return a}
 function saveTarot(storage,entry,id){
  if(!dateValid(entry.d))throw Error('Choose a valid entry date.');
  if(!['card','first','journal','meaning'].some(k=>str(entry[k]).trim()))throw Error('Write a card or reflection before saving.');
  const a=readTarot(storage),i=a.findIndex(x=>x.id===id);
  const saved={...entry,id:i>=0?id:Date.now().toString(36)+Math.random().toString(36).slice(2)};
  if(i>=0)a[i]=saved;else a.unshift(saved);
  storage.setItem('cw-tarot-entries',JSON.stringify(a));return saved;
 }
 root.KeepsakeBooks={list,journal,grimoire,readTarot,saveTarot,localDate,dateValid};
 if(typeof module!=='undefined')module.exports=root.KeepsakeBooks;
})(typeof globalThis!=='undefined'?globalThis:this);
