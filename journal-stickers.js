(function(root){
 'use strict';
 const catalog=[
  {id:'moon',name:'Lavender Moon',art:'<path d="M64 10a39 39 0 1 0 21 65A42 42 0 0 1 64 10Z" fill="#d7c4e6" stroke="#a886b5" stroke-width="2"/><path d="m75 20 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#c8a260"/>'},
  {id:'star',name:'Golden Star',art:'<path d="m50 7 9 30 30 13-30 10-9 33-10-33L8 50l32-13Z" fill="#e9d19f" stroke="#bf9855" stroke-width="2"/><path d="M50 7v86M8 50h81" stroke="#fffaf0" stroke-width="2"/>'},
  {id:'crystal',name:'Blush Crystal',art:'<path d="m50 6 27 24 9 50-36 14-36-14 9-50Z" fill="#f0cddc" stroke="#bd8caa" stroke-width="2"/><path d="m50 6-12 30 12 58 12-58ZM23 30l15 6-24 44m63-50-15 6 24 44" fill="none" stroke="#fff4f8" stroke-width="3"/>'}
 ];
 for(const herb of ['Lavender','Rosemary','Sage','Mint','Chamomile','Basil'])catalog.push({id:'herb-'+herb.toLowerCase(),name:herb,asset:'assets/sticker-herb-'+herb.toLowerCase()+'-v1.webp'});
 const STORAGE_KEY='cw-custom-stickers';let collectionError='';
 function readCollection(storage){const items=JSON.parse(storage.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(items)||items.filter(c=>c&&!c.deleted).length>20||items.some(c=>!c||typeof c.id!=='string'||!/^custom-[a-z0-9-]+$/.test(c.id)||(c.deleted!==undefined&&typeof c.deleted!=='boolean')||typeof c.name!=='string'||c.name.length>60||typeof c.src!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(c.src)||c.src.length>500000)||new Set(items.map(c=>c.id)).size!==items.length)throw Error('Your saved sticker collection could not be read.');return items}
 try{if(root.localStorage)catalog.push(...readCollection(root.localStorage))}catch(e){collectionError=e.message}
 function refreshCollection(storage=root.localStorage){
  if(!storage)throw Error('Sticker storage is unavailable.');
  const saved=readCollection(storage),ids=new Set(saved.map(c=>c.id));
  catalog.filter(c=>c.src&&!ids.has(c.id)).forEach(c=>{c.deleted=true});
  saved.forEach(c=>{const existing=catalog.find(v=>v.id===c.id);if(existing)Object.assign(existing,{deleted:false},c);else catalog.push(c)});
  collectionError='';renderTray();return saved.filter(c=>!c.deleted);
 }
 function deleteDesign(id,storage=root.localStorage){
  if(!storage)throw Error('Sticker storage is unavailable.');
  const saved=readCollection(storage),item=saved.find(c=>c.id===id);if(!item||item.deleted)return false;
  item.deleted=true;
  try{storage.setItem(STORAGE_KEY,JSON.stringify(saved))}catch(e){throw Error('The sticker could not be deleted because browser storage is unavailable.')}
  refreshCollection(storage);return true;
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function bounds(items){const left=Math.min(...items.map(s=>s.x)),top=Math.min(...items.map(s=>s.y)),right=Math.max(...items.map(s=>s.x+s.size)),bottom=Math.max(...items.map(s=>s.y+s.size));return {left,top,width:right-left,height:bottom-top,side:Math.max(right-left,bottom-top)+12}}
 async function saveDesign(name,env={}){
  const items=get();if(!items.length)throw Error('Add stickers to the decoration area before saving a design.');if(collectionError)throw Error(collectionError);
  const storage=env.storage||root.localStorage;if(!storage)throw Error('Sticker storage is unavailable.');const saved=readCollection(storage);if(saved.filter(c=>!c.deleted).length>=20)throw Error('Your collection has reached 20 saved designs.');
  const b=bounds(items),scale=Math.min(3,1024/b.side),pixels=Math.ceil(b.side*scale),canvas=env.canvas?env.canvas(pixels,pixels):document.createElement('canvas');canvas.width=pixels;canvas.height=pixels;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);
  const image=env.image||((src)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('A sticker image could not load.'));img.src=src}));
  for(const item of items){const img=await image(uri(item.id));ctx.drawImage(img,item.x-b.left+(b.side-b.width)/2,item.y-b.top+(b.side-b.height)/2,item.size,item.size)}
  const src=env.png?await env.png(canvas):canvas.toDataURL('image/png');if(typeof src!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src)||src.length>500000)throw Error('This design is too large to save. Try using fewer stickers.');
  const item={id:'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:String(name||'My Collage').trim().slice(0,60)||'My Collage',src};const data=JSON.stringify([...saved,item]);if(data.length>2000000)throw Error('Your sticker collection is full.');
  try{storage.setItem(STORAGE_KEY,data)}catch(e){throw Error('The sticker could not be saved because browser storage is unavailable or full. Your design is still in the decoration area.')}
  refreshCollection(storage);set([]);return item;
 }
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
 function normalize(list){
  if(list==null)return [];
  if(!Array.isArray(list)||list.length>24)throw Error('Sticker data could not be read.');
  return list.map(s=>{
   if(!s||!catalog.some(c=>c.id===s.id)||!['x','y','size'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k])))throw Error('Sticker data could not be read.');
   const size=clamp(s.size,32,100);return {id:s.id,x:clamp(s.x,0,600-size),y:clamp(s.y,0,200-size),size};
  });
 }
 function uri(id){const c=catalog.find(c=>c.id===id);if(!c)throw Error('Unknown sticker');if(c.src)return c.src;if(c.asset)return c.asset;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">'+c.art+'</svg>')}
 function markup(list){const a=normalize(list);return a.length?'<div class="sticker-art" aria-label="Journal stickers">'+a.map(s=>'<img alt="'+escape(catalog.find(c=>c.id===s.id).name)+'" src="'+uri(s.id)+'" style="left:'+s.x/6+'%;top:'+s.y/2+'%;width:'+s.size/6+'%">').join('')+'</div>':''}
 let draft=[],selected=-1,board,status,controls,sizeInput,forwardButton,backwardButton;
 function report(text){if(status)status.textContent=text}
 function get(){return normalize(draft)}
 function set(list){draft=normalize(list);selected=-1;render()}
 function render(){
  if(!board)return;board.innerHTML='';
  draft.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='sticker-piece'+(i===selected?' selected':'');b.setAttribute('aria-label',catalog.find(c=>c.id===s.id).name+'. Use arrow keys to move.');b.style.left=s.x/6+'%';b.style.top=s.y/2+'%';b.style.width=s.size/6+'%';const img=document.createElement('img');img.src=uri(s.id);img.alt='';img.draggable=false;b.append(img);board.append(b);
   b.addEventListener('pointerdown',e=>{selected=i;updateControls();board.querySelectorAll('.sticker-piece').forEach((n,j)=>n.classList.toggle('selected',j===i));b.focus({preventScroll:true});const rect=board.getBoundingClientRect(),x=e.clientX,y=e.clientY,start={...s};b.setPointerCapture(e.pointerId);e.preventDefault();const move=ev=>{s.x=clamp(start.x+(ev.clientX-x)*600/rect.width,0,600-s.size);s.y=clamp(start.y+(ev.clientY-y)*200/rect.height,0,200-s.size);b.style.left=s.x/6+'%';b.style.top=s.y/2+'%'};const end=()=>{b.removeEventListener('pointermove',move);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',end)};b.addEventListener('pointermove',move);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end)});
   b.addEventListener('click',()=>{selected=i;updateControls();board.querySelectorAll('.sticker-piece').forEach((n,j)=>n.classList.toggle('selected',j===i))});
   b.addEventListener('keydown',e=>{const delta={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]}[e.key];if(!delta)return;e.preventDefault();selected=i;s.x=clamp(s.x+delta[0],0,600-s.size);s.y=clamp(s.y+delta[1],0,200-s.size);b.style.left=s.x/6+'%';b.style.top=s.y/2+'%';updateControls()});
  });updateControls();
 }
 function updateControls(){if(!controls)return;controls.hidden=selected<0;sizeInput.value=selected>=0?draft[selected].size:56;if(forwardButton)forwardButton.disabled=selected<0||selected===draft.length-1;if(backwardButton)backwardButton.disabled=selected<=0}
 function moveLayer(step){
  const next=selected+step;if(selected<0||next<0||next>=draft.length)return false;
  [draft[selected],draft[next]]=[draft[next],draft[selected]];selected=next;render();report(step>0?'Sticker brought forward. Save your entry or design to keep the order.':'Sticker sent backward. Save your entry or design to keep the order.');return true;
 }
 function add(id,x,y,size=56){
  if(!catalog.some(c=>c.id===id))return false;
  if(draft.length>=24){report('You can add up to 24 stickers per entry.');return false}
  size=clamp(Number(size)||56,32,100);draft.push({id,x:clamp(x??(35+(draft.length%7)*72),0,600-size),y:clamp(y??70,0,200-size),size});selected=draft.length-1;render();report('Sticker added to the decoration area. Save your entry to keep the design.');return true;
 }
 function transfer(data){let id=data.getData('application/x-celestial-sticker'),size=Number(data.getData('application/x-celestial-sticker-size'))||56;if(!id){const text=data.getData('text/uri-list')||data.getData('text/plain');id=catalog.find(c=>text.includes(uri(c.id)))?.id;if(!id&&root.InlineStickers){const part=root.InlineStickers.parts(text).find(p=>p.sticker);id=part?.sticker.id;size=part?.sticker.size||size}}return {id,size:clamp(size,32,100)}}
 function renderTray(){
  if(typeof document==='undefined')return;
  const regular=document.getElementById('stickerTray'),custom=document.getElementById('myStickerTray'),herbal=document.getElementById('herbalStickerTray');if(!regular)return;regular.innerHTML='';if(custom)custom.innerHTML='';if(herbal)herbal.innerHTML='';catalog.filter(c=>!c.deleted).forEach(c=>{const b=document.createElement('button');b.type='button';b.className='sticker-choice';b.draggable=true;b.addEventListener('dragstart',e=>{e.dataTransfer.setData('application/x-celestial-sticker',c.id);e.dataTransfer.setData('application/x-celestial-sticker-size','56');e.dataTransfer.setData('text/plain',c.name);e.dataTransfer.effectAllowed='copy'});const img=document.createElement('img');img.src=uri(c.id);img.alt='';b.append(img,document.createTextNode(c.name));b.addEventListener('click',()=>{if(root.InlineStickers?.insert(c.id)){report(c.name+' added to your writing. Save the entry to keep it.');return}report('Place your cursor in your writing to add a sticker, or drag it into the decoration area.')});if(c.src){const group=document.createElement('div');group.className='saved-sticker';group.append(b);const remove=document.createElement('button');remove.type='button';remove.className='delete-saved-sticker';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+c.name+' from My Stickers');remove.addEventListener('click',()=>{try{deleteDesign(c.id);report(c.name+' deleted from My Stickers. Existing journal entries keep their sticker.')}catch(e){report(e.message)}});group.append(remove);(custom||regular).append(group)}else (c.asset?(herbal||regular):regular).append(b)});
  if(custom&&!catalog.some(c=>c.src&&!c.deleted)){const empty=document.createElement('p');empty.className='mini';empty.textContent='No saved designs yet.';custom.append(empty)}
 }
 function mount(){
  board=document.getElementById('stickerBoard');status=document.getElementById('stickerStatus');controls=document.getElementById('stickerControls');sizeInput=document.getElementById('stickerSize');if(!board)return;
  board.addEventListener('dragover',e=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect=e.dataTransfer.effectAllowed==='move'?'move':'copy'});
  board.addEventListener('drop',e=>{e.preventDefault();const item=transfer(e.dataTransfer),rect=board.getBoundingClientRect();if(add(item.id,(e.clientX-rect.left)*600/rect.width-item.size/2,(e.clientY-rect.top)*200/rect.height-item.size/2,item.size))root.InlineStickers?.finishMove()});
  board.tabIndex=0;board.addEventListener('paste',e=>{const item=transfer(e.clipboardData);if(item.id){e.preventDefault();add(item.id,300-item.size/2,100-item.size/2,item.size)}});
  forwardButton=document.getElementById('bringStickerForward');backwardButton=document.getElementById('sendStickerBackward');forwardButton?.addEventListener('click',()=>moveLayer(1));backwardButton?.addEventListener('click',()=>moveLayer(-1));
  renderTray();
  document.getElementById('clearStickerBoard')?.addEventListener('click',()=>{set([]);report('Decoration area cleared. Your writing and saved stickers are unchanged.')});
  const saveButton=document.getElementById('saveStickerDesign');saveButton?.addEventListener('click',async()=>{saveButton.disabled=true;report('Saving your design…');try{const item=await saveDesign(document.getElementById('stickerDesignName').value);document.getElementById('stickerDesignName').value='';report(item.name+' saved in My Stickers. The decoration area is ready for a new design. Select your saved sticker to add it to your writing.')}catch(e){report(e.message)}finally{saveButton.disabled=false}});
  if(collectionError)report(collectionError);

  sizeInput.addEventListener('input',()=>{if(selected<0)return;const s=draft[selected];s.size=Number(sizeInput.value);s.x=clamp(s.x,0,600-s.size);s.y=clamp(s.y,0,200-s.size);render()});
  document.getElementById('removeSticker').addEventListener('click',()=>{if(selected<0)return;draft.splice(selected,1);selected=-1;render();report('Sticker removed. Save your entry to keep the change.')});render();
 }
 root.StickerJournal={catalog,normalize,uri,markup,get,set,mount,report,add,transfer,saveDesign,readCollection,bounds,refreshCollection,deleteDesign};if(typeof module!=='undefined')module.exports=root.StickerJournal;
})(typeof globalThis!=='undefined'?globalThis:this);
