const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function render(n){
 const el={innerHTML:''};
 const ctx=vm.createContext({document:{getElementById:()=>el},getNatal:()=>n,
  localStorage:{getItem:()=>''},esc:x=>x,natalSVG:()=>'<svg></svg>',
  fmtZodiac:()=>'',ordinal:x=>x,houseOfLongitude:()=>1,renderNatalTransitSummary:()=>{}});
 const start=html.indexOf('function renderNatalPage()'),end=html.indexOf('\nfunction ',start+1);
 vm.runInContext(html.slice(start,end),ctx);ctx.renderNatalPage();return el.innerHTML;
}
test('natal wheel precedes the astrology note, profile actions and detail cards',()=>{
 const out=render({pls:[],aspects:[],cusps:[],ang:{}});
 assert.ok(out.indexOf('natal-hero')<out.indexOf('natal-chart-note'));
 assert.ok(out.indexOf('natal-chart-note')<out.indexOf('natal-toolbar'));
 assert.ok(out.indexOf('natal-toolbar')<out.indexOf('natal-sections'));
 assert.match(out,/editBirthDetails\(\)/);assert.match(out,/View Birth Profile/);
 assert.equal(out.split('Astrology is presented').length-1,1);
});
test('missing profile retains a setup action and the astrology note',()=>{
 const out=render(null);assert.match(out,/Open Birth Profile/);
 assert.equal(out.split('Astrology is presented').length-1,1);
});
test('natal heading uses the centered temple script font',()=>{
 assert.match(html,/#natal>h1\{font-family:"Brush Script MT"[^}]*text-align:center/);
});
