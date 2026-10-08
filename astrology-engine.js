/* Celestial Within — Natal Engine Phase 1 */
(function(global){"use strict";
const SIGNS=[["♈","Aries"],["♉","Taurus"],["♊","Gemini"],["♋","Cancer"],["♌","Leo"],["♍","Virgo"],["♎","Libra"],["♏","Scorpio"],["♐","Sagittarius"],["♑","Capricorn"],["♒","Aquarius"],["♓","Pisces"]];
const BODIES=[["Sun","☉"],["Moon","☽"],["Mercury","☿"],["Venus","♀"],["Mars","♂"],["Jupiter","♃"],["Saturn","♄"],["Uranus","♅"],["Neptune","♆"],["Pluto","♇"]],ASPECTS=[["Conjunction",0,8],["Sextile",60,5],["Square",90,7],["Trine",120,7],["Opposition",180,8]];
const norm=x=>((x%360)+360)%360,rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI;
function jd(d){return d.getTime()/86400000+2440587.5}function obliq(j){let T=(j-2451545)/36525;return 23.43929111-.013004167*T}function gmst(j){let T=(j-2451545)/36525;return norm(280.46061837+360.98564736629*(j-2451545)+.000387933*T*T-T*T*T/38710000)}
// MC right ascension is local sidereal time: tan(longitude) = tan(time) / cos(obliquity).
function angles(date,lat,lon){let j=jd(date),t=rad(norm(gmst(j)+lon)),p=rad(lat),e=rad(obliq(j)),mc=norm(deg(Math.atan2(Math.sin(t),Math.cos(t)*Math.cos(e)))),asc=norm(deg(Math.atan2(-Math.cos(t),Math.sin(t)*Math.cos(e)+Math.tan(p)*Math.sin(e)))+180);return {asc,mc,desc:norm(asc+180),ic:norm(mc+180)}}
function arc(a,b,f){return norm(a+norm(b-a)*f)}function cusps(a,s){if(s==="whole"){let b=Math.floor(a.asc/30)*30;return Array.from({length:12},(_,i)=>norm(b+i*30))}if(s==="porphyry")return [a.asc,arc(a.asc,a.ic,1/3),arc(a.asc,a.ic,2/3),a.ic,arc(a.ic,a.desc,1/3),arc(a.ic,a.desc,2/3),a.desc,arc(a.desc,a.mc,1/3),arc(a.desc,a.mc,2/3),a.mc,arc(a.mc,a.asc,1/3),arc(a.mc,a.asc,2/3)];return Array.from({length:12},(_,i)=>norm(a.asc+i*30))}
// Half-open intervals. Snap only rounding-level equivalents of a cusp to its own house.
function houseOf(l,c){for(let i=0;i<12;i++){let rel=norm(l-c[i]);if(rel<1e-10||360-rel<1e-10)return i+1}for(let i=0;i<12;i++){let span=norm(c[(i+1)%12]-c[i]),rel=norm(l-c[i]);if(rel<span)return i+1}return 1}
// Apparent Earth-centered longitude, converted to the true ecliptic of date.
function longitude(n,d){if(!global.Astronomy)return null;try{let l=global.Astronomy.Ecliptic(global.Astronomy.GeoVector(global.Astronomy.Body[n],d,true)).elon;return typeof l==="number"&&Number.isFinite(l)?norm(l):null}catch(_){return null}}
function planets(d,c){return BODIES.map(([name,glyph])=>{let l=longitude(name,d);if(l==null)return null;let b=longitude(name,new Date(d.getTime()-43200000)),a=longitude(name,new Date(d.getTime()+43200000));if(b==null||a==null)return null;let v=norm(a-b);if(v>180)v-=360;let si=Math.floor(l/30);return {name,glyph,longitude:l,sign:SIGNS[si][1],signGlyph:SIGNS[si][0],degree:l%30,house:houseOf(l,c),retrograde:v<-.00001,speedApprox:v}}).filter(Boolean)}
function aspects(p){let o=[];for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){let s=Math.abs(norm(p[i].longitude-p[j].longitude));if(s>180)s=360-s;for(const [name,angle,maxOrb] of ASPECTS){let orb=Math.abs(s-angle);if(orb<=maxOrb){o.push({name,angle,orb,separation:s,planet1:p[i].name,planet2:p[j].name,glyph1:p[i].glyph,glyph2:p[j].glyph});break}}}return o.sort((a,b)=>a.orb-b.orb)}
function format(l){let i=Math.floor(norm(l)/30);return SIGNS[i][0]+" "+SIGNS[i][1]+" "+(norm(l)%30).toFixed(2)+"°"}
function coordinate(value,max){if(typeof value==="string"){value=value.trim();if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value))return null;value=Number(value)}return typeof value==="number"&&Number.isFinite(value)&&Math.abs(value)<=max?value:null}
function calculate(o){
 if(!o||typeof o!=="object"||Array.isArray(o))return null;
 let d=o.date,lat=coordinate(o.lat,90),lon=coordinate(o.lon,180),s=o.houseSystem===undefined?"whole":o.houseSystem;
 if(!(d instanceof Date)||!Number.isFinite(d.getTime())||lat==null||lon==null||!["whole","equal","porphyry"].includes(s))return null;
 let astronomy=global.Astronomy;if(!astronomy||!astronomy.Body||typeof astronomy.GeoVector!=="function"||typeof astronomy.Ecliptic!=="function")return null;
 let a=angles(d,lat,lon),c=cusps(a,s),p=planets(d,c);
 if(!Object.values(a).every(Number.isFinite)||!c.every(Number.isFinite)||p.length!==BODIES.length)return null;
 return {version:"1.0-phase1",date:d.toISOString(),latitude:lat,longitude:lon,houseSystem:s,angles:a,cusps:c,planets:p,aspects:aspects(p)};
}
global.CelestialNatalEngine={SIGNS,BODIES,ASPECTS,norm,angles,cusps,houseOf,format,calculate};
})(window);