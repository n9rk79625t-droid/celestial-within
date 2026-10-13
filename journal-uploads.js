(function(root){
 'use strict';
 const KEY='cw-journal-uploads',PNG=/^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
 const types={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',txt:'text/plain',rtf:'application/rtf',odt:'application/vnd.oasis.opendocument.text',csv:'text/csv',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
 let startupError='';
 function read(storage){
  const items=JSON.parse(storage.getItem(KEY)||'[]');
  if(!Array.isArray(items)||items.filter(i=>i&&!i.deleted).length>20||items.some(i=>!i||!/^upload-[a-z0-9-]+$/.test(i.id)||typeof i.name!=='string'||i.name.length>120||!PNG.test(i.src)||i.src.length>500000||!['image','document'].includes(i.kind)||(i.deleted!==undefined&&typeof i.deleted!=='boolean')||(i.kind==='document'&&(!Object.hasOwn(types,i.ext)||i.mime!==types[i.ext]||typeof i.data!=='string'||!i.data.startsWith('data:'+i.mime+';base64,')||!/^[A-Za-z0-9+/=]+$/.test(i.data.split(',')[1]||'')||i.data.length>1500000)))||new Set(items.map(i=>i.id)).size!==items.length)throw Error('Your uploads could not be read.');
  return items;
 }
 function sync(storage=root.localStorage){
  const items=read(storage),catalog=root.StickerJournal.catalog;
  items.forEach(item=>{const existing=catalog.find(c=>c.id===item.id);if(existing)Object.assign(existing,{deleted:false},item,{upload:true});else catalog.push({...item,upload:true})});
  renderTray();return items;
 }
 try{if(root.localStorage)sync()}catch(e){startupError=e.message}
 const fileData=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The file could not be read.'));reader.readAsDataURL(file)});
 const imageData=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('This picture format could not be opened. Try a JPG, PNG, or WebP picture.'));img.src=src});
 async function upload(file,env={}){
  if(startupError)throw Error(startupError);
  const ext=String(file.name||'').split('.').pop().toLowerCase(),isImage=/^image\/(png|jpeg|webp|gif|bmp|avif)$/.test(file.type||''),kind=isImage?'image':Object.hasOwn(types,ext)?'document':null;
  if(!kind)throw Error('Choose a JPG, PNG, WebP, GIF, BMP, AVIF picture, or a PDF, Office, text, or OpenDocument file.');
  if(file.size>(isImage?10000000:1000000))throw Error(isImage?'Choose a picture smaller than 10 MB.':'Choose a document smaller than 1 MB.');
  const storage=env.storage||root.localStorage;if(!storage)throw Error('Upload storage is unavailable.');
  const saved=read(storage);if(saved.filter(i=>!i.deleted).length>=20)throw Error('Your uploads have reached 20 files.');
  const raw=await (env.read||fileData)(file);if(typeof raw!=='string'||!/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/.test(raw))throw Error('The file could not be read.');
  const make=env.canvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c}),png=env.png||(c=>c.toDataURL('image/png'));
  let src;
  if(isImage){
   const img=await (env.image||imageData)(raw),width=img.naturalWidth||img.width,height=img.naturalHeight||img.height;if(!width||!height)throw Error('The picture could not be opened.');
   for(const side of [512,384,256,192]){const c=make(side,side),ctx=c.getContext('2d'),scale=Math.min(side/width,side/height);ctx.drawImage(img,(side-width*scale)/2,(side-height*scale)/2,width*scale,height*scale);src=await png(c);if(src.length<=500000)break}
  }else{
   const c=make(300,300),ctx=c.getContext('2d');ctx.fillStyle='#fffaf5';ctx.fillRect(20,12,260,276);ctx.strokeStyle='#c5a465';ctx.lineWidth=3;ctx.strokeRect(20,12,260,276);ctx.fillStyle='#603650';ctx.textAlign='center';ctx.font='bold 26px sans-serif';ctx.fillText(ext.toUpperCase(),150,65);ctx.font='18px sans-serif';
   const name=String(file.name).slice(0,120),lines=name.match(/.{1,22}/g)||['Document'];lines.slice(0,5).forEach((line,i)=>ctx.fillText(line,150,112+i*24));ctx.font='14px sans-serif';ctx.fillText('Attached document',150,267);src=await png(c);
  }
  if(!PNG.test(src)||src.length>500000)throw Error('This picture could not be prepared for your journal.');
  const item={id:'upload-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:String(file.name||'My picture').slice(0,120),kind,src};
  if(!isImage){item.ext=ext;item.mime=types[ext];item.data='data:'+item.mime+';base64,'+raw.split(',')[1]}
  const data=JSON.stringify([...saved,item]);if(data.length>2000000)throw Error('Your upload storage is full. Try a smaller file.');
  try{storage.setItem(KEY,data)}catch(e){throw Error('The upload could not be saved because browser storage is unavailable or full. Your journal is unchanged.')}
  sync(storage);return item;
 }
 function download(id){
  const item=root.StickerJournal.catalog.find(c=>c.id===id&&c.upload&&c.kind==='document');if(!item)return;
  const bytes=Uint8Array.from(atob(item.data.split(',')[1]),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:item.mime})),link=document.createElement('a');link.href=url;link.download=item.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 function remove(id,storage=root.localStorage){const items=read(storage),item=items.find(i=>i.id===id);if(!item)return;item.deleted=true;try{storage.setItem(KEY,JSON.stringify(items))}catch(e){throw Error('The upload could not be removed.')}sync(storage)}
 function renderTray(){
  if(typeof document==='undefined')return;const tray=document.getElementById('uploadStickerTray');if(!tray)return;tray.innerHTML='';
  const items=root.StickerJournal.catalog.filter(c=>c.upload&&!c.deleted);
  for(const item of items){const group=document.createElement('div');group.className='saved-sticker';const button=document.createElement('button');button.type='button';button.className='sticker-choice';button.draggable=true;const img=document.createElement('img');img.src=item.src;img.alt='';button.append(img,document.createTextNode(item.name));button.addEventListener('click',()=>root.StickerJournal.add(item.id,undefined,undefined,100));button.addEventListener('dragstart',e=>{e.dataTransfer.setData('application/x-celestial-sticker',item.id);e.dataTransfer.setData('application/x-celestial-sticker-size','100');e.dataTransfer.effectAllowed='copy'});group.append(button);
   if(item.kind==='document'){const open=document.createElement('button');open.type='button';open.textContent='Download Document';open.addEventListener('click',()=>download(item.id));group.append(open)}
   const erase=document.createElement('button');erase.type='button';erase.className='delete-saved-sticker';erase.textContent='Remove Upload';erase.addEventListener('click',()=>{try{remove(item.id);root.StickerJournal.report('Upload removed from the collection. Existing entries keep their attachment.')}catch(e){root.StickerJournal.report(e.message)}});group.append(erase);tray.append(group);
  }
  if(!items.length){const p=document.createElement('p');p.className='mini';p.textContent='Your uploaded pictures and documents appear here.';tray.append(p)}
 }
 function links(list){const items=root.StickerJournal.normalize(list),seen=new Set();return items.map(s=>root.StickerJournal.catalog.find(c=>c.id===s.id)).filter(c=>c.upload&&c.kind==='document'&&!seen.has(c.id)&&seen.add(c.id)).map(c=>'<button type="button" class="document-download" data-upload-download="'+c.id+'">Download '+c.name.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))+'</button>').join('')}
 function mount(){
  renderTray();const button=document.getElementById('uploadJournalButton'),input=document.getElementById('journalUploadInput');if(!button||!input)return;
  button.addEventListener('click',()=>input.click());input.addEventListener('change',async()=>{button.disabled=true;try{const file=input.files?.[0];if(!file)return;root.StickerJournal.report('Preparing your upload…');const item=await upload(file);const added=root.StickerJournal.add(item.id,undefined,undefined,100);document.getElementById('uploadCollection').open=true;root.StickerJournal.report(added?item.name+' uploaded. Save your entry to keep its position.':item.name+' saved in My Uploads. The decoration area is full; remove an item to place this upload.')}catch(e){root.StickerJournal.report(e.message)}finally{input.value='';button.disabled=false}});
  document.addEventListener('click',e=>{const target=e.target.closest?.('[data-upload-download]');if(target)download(target.dataset.uploadDownload)});
  if(startupError)root.StickerJournal.report(startupError);
 }
 root.JournalUploads={upload,read,sync,remove,download,renderTray,links,mount};if(typeof module!=='undefined')module.exports=root.JournalUploads;
})(typeof globalThis!=='undefined'?globalThis:this);
