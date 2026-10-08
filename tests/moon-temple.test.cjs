// Run after installing astronomy-engine@2.1.19: node --test tests/moon-temple.test.cjs
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const A=require('astronomy-engine'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function extract(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+1);assert.ok(start>=0&&end>start,name);return html.slice(start,end)}
function setup(astronomy=A,initial={}){
 const stored=new Map(Object.entries(initial)),nodes={},events={},timers=[];
 for(const id of ['moonCurrent','moonEntryDate','moonDateNote','moonJournalText','moonPracticeText','moonJournalStatus','moonJournalEntries','moonArchive'])nodes[id]={value:'',innerHTML:'',textContent:''};
 for(const id of ['moon','today'])nodes[id]={active:false,classList:{contains:()=>nodes[id].active}};
 const fields=[['moonEntryDate','moon-entry-date'],['moonDateNote','moon-date'],['moonJournalText','moon-journal'],['moonPracticeText','moon-practice']].map(([id,save])=>Object.assign(nodes[id],{dataset:{save}}));
 const storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
 const doc={hidden:false,getElementById:id=>nodes[id]||null,querySelectorAll:()=>fields,addEventListener:(name,fn)=>events[name]=fn};
 const ctx=vm.createContext({Date,Astronomy:astronomy,localStorage:storage,document:doc,window:{addEventListener:(name,fn)=>events[name]=fn},setInterval:(fn,ms)=>timers.push({fn,ms})});
 for(const n of ['phaseName','fallbackPhase','moonData','moonLocalDate','readMoonEntries','renderMoonEntries','renderMoon','saveMoonEntry','newMoonEntry','editMoonEntry','refreshLunarViews','startLunarRefresh','bind','renderArchives','esc'])vm.runInContext(extract(n),ctx);
 return {ctx,nodes,stored,storage,events,timers,doc};
}
test('phase labels retain crescents/gibbous outside narrow primary event windows',()=>{
 const {ctx}=setup();for(const [angle,name] of [[0,'New Moon'],[359.5,'New Moon'],[338.7,'Waning Crescent'],[21,'Waxing Crescent'],[68,'Waxing Crescent'],[89.5,'First Quarter'],[112,'Waxing Gibbous'],[158,'Waxing Gibbous'],[180,'Full Moon'],[202,'Waning Gibbous'],[248,'Waning Gibbous'],[270,'Last Quarter'],[292,'Waning Crescent']])assert.equal(ctx.phaseName(angle),name);
 assert.equal(ctx.phaseName(NaN),'Phase unavailable');
});
test('NASA illumination fixtures and USNO October primary phase fixtures',()=>{
 const {ctx}=setup();
 // NASA: https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json
 // Illuminated percentage, rounded to 0.01%.
 // USNO: https://aa.usno.navy.mil/calculated/moon/phases?year=2026
 for(const [date,expected] of [['2026-10-08T22:00:00Z',3.47],['2026-01-14T21:00:00Z',14.30],['2026-10-18T16:00:00Z',50.05],['2026-10-26T04:00:00Z',99.84]]){
  const m=ctx.moonData(new Date(date));assert.equal(m.approximate,false);assert.ok(Math.abs(m.illum*100-expected)<.02,date);
 }
 for(const [date,name] of [['2026-10-03T13:25:00Z','Last Quarter'],['2026-10-10T15:50:00Z','New Moon'],['2026-10-18T16:12:00Z','First Quarter'],['2026-10-26T04:12:00Z','Full Moon']])assert.equal(ctx.moonData(new Date(date)).name,name);
 assert.equal(ctx.moonData(new Date('2026-10-08T22:00:00Z')).name,'Waning Crescent');
});
test('unavailable, throwing and invalid library data are finite and explicitly estimated',()=>{
 const date=new Date('2026-10-08T22:00:00Z');
 for(const astronomy of [null,{}, {...A,MoonPhase:()=>{throw Error('offline')}},... [NaN,Infinity,-1,360].map(x=>({...A,MoonPhase:()=>x})),...[NaN,Infinity,-.1,1.1].map(x=>({...A,Illumination:()=>({phase_fraction:x})}))]){
  const {ctx}=setup(astronomy),m=ctx.moonData(date);assert.equal(m.approximate,true);assert.ok(Number.isFinite(m.angle)&&m.illum>=0&&m.illum<=1);assert.equal(m.date.getTime(),date.getTime());
 }
 const {ctx,nodes}=setup(null);ctx.renderMoon();assert.match(nodes.moonCurrent.innerHTML,/Estimated phase/);assert.match(nodes.moonCurrent.innerHTML,/may differ/);
});
test('legacy draft remains intact, multiple dated entries save and edits update one entry',()=>{
 const env=setup(A,{'cw-moon-date':'old phase note','cw-moon-journal':'my existing reflection','cw-moon-practice':'my practice'}),{ctx,nodes,stored}=env;
 ctx.bind();ctx.renderMoon();assert.equal(nodes.moonJournalText.value,'my existing reflection');assert.equal(nodes.moonDateNote.value,'old phase note');assert.equal(stored.has('cw-moon-entries'),false);
 nodes.moonEntryDate.value='2026-10-08';assert.equal(ctx.saveMoonEntry(),true);ctx.newMoonEntry();assert.equal(JSON.parse(stored.get('cw-moon-entries')).length,1);assert.equal(nodes.moonJournalText.value,'');
 nodes.moonEntryDate.value='2026-10-09';nodes.moonJournalText.value='second reflection';assert.equal(ctx.saveMoonEntry(),true);
 assert.equal(JSON.parse(stored.get('cw-moon-entries')).length,2);ctx.editMoonEntry(1);nodes.moonJournalText.value='edited first';assert.equal(ctx.saveMoonEntry(),true);
 const entries=JSON.parse(stored.get('cw-moon-entries'));assert.equal(entries.length,2);assert.equal(entries.find(x=>x.d==='2026-10-08').journal,'edited first');assert.equal(entries.find(x=>x.d==='2026-10-09').journal,'second reflection');
});
test('invalid date, corrupt history and failed storage writes preserve the draft and history',()=>{
 for(const bad of ['not json','{}','[null]']){
  const {ctx,nodes,stored}=setup(A,{'cw-moon-entries':bad});nodes.moonEntryDate.value='2026-10-08';nodes.moonJournalText.value='keep me';assert.equal(ctx.saveMoonEntry(),false);assert.equal(stored.get('cw-moon-entries'),bad);assert.equal(nodes.moonJournalText.value,'keep me');ctx.newMoonEntry();assert.equal(nodes.moonJournalText.value,'keep me');
 }
 const {ctx,nodes,storage,stored}=setup();nodes.moonJournalText.value='keep me';nodes.moonEntryDate.value='2026-02-30';assert.equal(ctx.saveMoonEntry(),false);assert.equal(stored.has('cw-moon-entries'),false);
 nodes.moonEntryDate.value='2026-10-08';storage.setItem=()=>{throw Error('quota')};ctx.newMoonEntry();assert.equal(nodes.moonJournalText.value,'keep me');assert.match(nodes.moonJournalStatus.textContent,/could not be saved/);
});
test('reopening the same entry cannot reload stale content over an unsaved edit',()=>{
 const {ctx,nodes}=setup();nodes.moonEntryDate.value='2026-10-08';nodes.moonJournalText.value='original';ctx.saveMoonEntry();nodes.moonJournalText.value='unsaved edit';ctx.editMoonEntry(0);assert.equal(nodes.moonJournalText.value,'unsaved edit');
});
test('refresh runs every minute and on return, skips hidden pages and leaves drafts untouched',()=>{
 const {ctx,nodes,events,timers,doc}=setup();nodes.moonJournalText.value='unsaved reflection';nodes.moon.active=true;ctx.startLunarRefresh();assert.equal(timers[0].ms,60000);timers[0].fn();assert.equal(nodes.moonJournalText.value,'unsaved reflection');
 assert.match(nodes.moonCurrent.innerHTML,/Updated/);let calls=0;ctx.renderMoon=()=>calls++;doc.hidden=true;events.visibilitychange();assert.equal(calls,0);doc.hidden=false;events.visibilitychange();events.focus();events.pageshow();assert.equal(calls,3);
 nodes.moon.active=false;events.focus();assert.equal(calls,3);nodes.today.active=true;ctx.renderSky=()=>calls++;timers[0].fn();assert.equal(calls,4);
});
test('archive names, notes and dates display as text rather than executable markup',()=>{
 const payload='<img src=x onerror="alert(1)">',env=setup(A,{'cw-archive-moon':JSON.stringify([{name:payload,text:payload,date:payload}])});env.ctx.renderArchives();assert.ok(!env.nodes.moonArchive.innerHTML.includes('<img'));assert.match(env.nodes.moonArchive.innerHTML,/&lt;img/);
 env.nodes.moonEntryDate.value='2026-10-08';env.nodes.moonJournalText.value=payload;assert.equal(env.ctx.saveMoonEntry(),true);assert.ok(!env.nodes.moonJournalEntries.innerHTML.includes('<img'));
});
test('local entry dates use local calendar components rather than UTC conversion',()=>{
 const {ctx}=setup();assert.equal(ctx.moonLocalDate({getFullYear:()=>2026,getMonth:()=>9,getDate:()=>8}),'2026-10-08');
});
