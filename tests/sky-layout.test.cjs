const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('function layoutSkyPlanets('),end=html.indexOf('\nfunction ',start+1);
const ctx=vm.createContext({});vm.runInContext(html.slice(start,end),ctx);

test('all ten live planet labels fit, remain separate and preserve true positions',()=>{
 const cases=[Array(10).fill(0),[359,0,1,2,3,4,5,6,7,8],[0,30,60,90,120,150,180,210,240,270]];
 let seed=20261008;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 for(let n=0;n<100;n++)cases.push(Array.from({length:10},()=>random()*360));
 for(const size of [180,240,285,310,390,560])for(const lons of cases){
  const dot=Math.min(34,size*.105),placed=ctx.layoutSkyPlanets(lons.map((lon,i)=>({name:String(i),lon})),size,dot);
  assert.equal(placed.length,10);
  placed.forEach((p,i)=>{
   assert.equal(p.lon,lons[i]);
   assert.ok(Math.hypot(p.x-size/2,p.y-size/2)+dot/2<size/2,'label inside circle');
   assert.ok(Math.abs(p.anchorX-(size/2+size*.4*Math.cos((p.lon-90)*Math.PI/180)))<1e-9,'exact longitude anchor X');
   assert.ok(Math.abs(p.anchorY-(size/2+size*.4*Math.sin((p.lon-90)*Math.PI/180)))<1e-9,'exact longitude anchor Y');
   for(const q of placed.slice(i+1))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=dot+5-1e-9,'no overlapping glyphs');
  });
 }
});

test('wheel uses available card width and stays square and centered',()=>{
 assert.match(html,/#today #astroWheel\{width:min\(100%,560px\);height:auto;max-height:none;aspect-ratio:1;box-sizing:border-box;margin:18px auto 24px\}/);
 assert.match(html,/new ResizeObserver/);
});

test('Today’s Chart suppresses old pseudo-element artwork while keeping the approved border',()=>{
 assert.match(html,/#today \.today-chart-card::before,#today \.today-chart-card::after\{content:none!important;display:none!important;background:none!important\}/);
 assert.match(html,/background:#faf7ef url\("assets\/todays-chart-crystal-border-v1\.webp"\)/);
});
