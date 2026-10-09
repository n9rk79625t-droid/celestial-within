(function(root){
 'use strict';
 function sections(entries){
  if(!Array.isArray(entries))throw Error('Saved journal entries could not be read.');
  const months=new Map();
  for(const x of entries.slice().sort((a,b)=>a.d.localeCompare(b.d))){
   const month=x.d.slice(0,7);if(!months.has(month))months.set(month,[]);
   months.get(month).push({title:x.title,meta:x.d+' · '+x.source,fields:[{label:'Reflection',text:x.text}]});
  }
  return Array.from(months,([month,items])=>({title:new Date(month+'-15T12:00:00').toLocaleDateString('en-US',{month:'long',year:'numeric'}),entries:items}));
 }
 async function create(entries,env){return root.ShadowsPDF.create(entries,env,{sections,cover:'assets/celestial-journal-star-chart-cover-v2.webp',frame:'assets/journal-blush-chapter-v1.svg'})}
 root.JournalPDF={create,sections};if(typeof module!=='undefined')module.exports=root.JournalPDF;
})(typeof globalThis!=='undefined'?globalThis:this);
