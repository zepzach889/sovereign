"use strict";
/* ---------- succession law ---------- */
const LAWS={
  agnatic:{name:"Agnatic",desc:"Sons only inherit. Daughters and their lines are passed over entirely."},
  malepref:{name:"Male-preference",desc:"Sons first, by age; daughters inherit only if there are no sons."},
  absolute:{name:"Absolute",desc:"The eldest child inherits, son or daughter alike."},
  elective:{name:"Elective",desc:"The great houses (or the chamber, if one holds power) choose the successor."},
};
/* heirOf, kinDistance and designatable now live in 03a-family.js */

/* ---------- factions ---------- */
function newFactions(){
  return {
    aristocracy:{name:"Aristocracy",strength:80,mood:56,present:true},
    clergy:{name:"Clergy",strength:70,mood:58,present:true},
    officers:{name:"Officer Corps",strength:52,mood:54,present:true},
    merchants:{name:"Merchants",strength:34,mood:52,present:true},
    peasantry:{name:"Peasantry",strength:66,mood:50,present:true},
    provinces:{name:"Provinces",strength:50,mood:52,present:true},
    workers:{name:"Urban Workers",strength:0,mood:50,present:false},
    reformers:{name:"Reformers",strength:0,mood:50,present:false},
  };
}
const composition={ nobility:["aristocracy","clergy"], commons:["merchants","peasantry"], broad:["merchants","peasantry","provinces"],
  national:["aristocracy","clergy","merchants","peasantry","provinces","officers","workers","reformers"] };
function compMood(S,comp){ const ks=composition[comp]||["aristocracy"]; let s=0; ks.forEach(k=>s+=S.facs[k].mood); return s/ks.length; }

/* ---------- power & consent ---------- */
function rightsHeld(S){ const r=new Set(); S.gov.institutions.forEach(i=>i.rights.forEach(x=>r.add(x))); return r; }
function institutionWithRight(S,right){ return S.gov.institutions.find(i=>i.rights.includes(right)); }
function consentCheck(S,right){
  const inst=institutionWithRight(S,right); if(!inst) return {required:false,approve:true};
  const mood=compMood(S,inst.composition);
  const threshold=48+inst.power*0.3;
  return {required:true,inst,approve:mood>=threshold,mood,threshold};
}
function transferPower(S,inst,amount){ const a=Math.min(amount,S.gov.crown.power); S.gov.crown.power-=a; inst.power+=a; }
function powerToCrown(S,inst,amount){ const a=Math.min(amount,inst.power); inst.power-=a; S.gov.crown.power+=a; }
function crownBand(S){
  const p=S.gov.crown.power;
  if(p>=60)return{label:"dominant",desc:"the Crown sets policy at will"};
  if(p>=40)return{label:"strong",desc:"assent is still required, and a royal veto is within reach"};
  if(p>=21)return{label:"constrained",desc:"ceremony, influence, and little else"};
  return{label:"a figurehead",desc:"the Crown reigns; it does not rule"};
}
const BLOC_MODS={
  aristocracy:{privileges:0.5,trade:1.3},
  clergy:{patronize:0.5},
  merchants:{trade:0.6,privileges:1.5},
  peasantry:{festival:0.7,privileges:0},
  provinces:{tour:0.6},
  officers:{fund_army:0.7},
};
const BLOC_DESCS={
  aristocracy:"privileges come cheap; trade projects cost more",
  clergy:"church patronage comes at half its price",
  merchants:"trade and works come cheap; noble privileges cost dear",
  peasantry:"festivals and relief come cheap; noble privileges are off the table",
  provinces:"royal tours come cheap",
  officers:"the army is funded gladly",
};
function costMod(S,id){
  let m=1;
  if(S.rep&&S.rep.friction)m*=S.rep.friction;   /* governing without consent is expensive */
  if(S._costMod)m*=S._costMod;
  if(S.monarch&&S.monarch.trait==="shrewd")m*=0.9;
  if(S.gov.cabinet)m*=0.9;
  if(id==="privileges"&&S.gov.institutions.some(i=>i.composition!=="nobility"))m*=1.4; // a lower chamber watches
  if(S.regency)m*=(S.regency.hostile?1.7:1.5);
  if(S.pm&&S.pm.bloc&&BLOC_MODS[S.pm.bloc]&&BLOC_MODS[S.pm.bloc][id]!=null){
    const b=BLOC_MODS[S.pm.bloc][id]; if(b===0)return 0; m*=b;
  }
  return m;
}
function adjCost(S,a){
  const c=Object.assign({},a.cost||{});
  const m=costMod(S,a.id);
  if(c.gold&&c.gold<0)c.gold=Math.round(c.gold*m);
  return c;
}
function maybeTransform(S){
  if(!isMonarchy(S))return false;   /* only a crown can be reduced to a ministry */
  if(!S.pm&&!S._pmPending&&S.gov.institutions.length&&S.gov.crown.power<50) S._pmPending=true;
}
function runElection(){
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  if(!set.size)set.add("aristocracy");
  const live=[...set].filter(k=>S.facs[k]&&S.facs[k].present);
  const use=live.length?live:[...set];
  const standings=use.map(k=>({k,name:S.facs[k].name,score:Math.round(S.facs[k].mood*0.6+S.facs[k].strength*0.4+rand(18))}));
  standings.sort((a,b)=>b.score-a.score);
  return {standings,winner:standings[0].k};
}
function regimeLabel(S){
  if(regimeIs(S,"junta"))return "Provisional Military Government";
  if(regimeIs(S,"republic"))return (S.rep&&S.rep.entrench>1)?"Republic (in name)":"Republic";
  if(regimeIs(S,"people"))return "People's Republic";
  const cp=S.gov.institutions.reduce((a,i)=>a+i.power,0);
  if(S.gov.crown.selection!=="hereditary") return "Republic";
  if(S.gov.charter) return cp>=45?"Parliamentary Monarchy":"Constitutional Monarchy";
  if(cp<12) return "Absolute Monarchy";
  if(cp<40) return "Constitutional Monarchy";
  return "Parliamentary Monarchy";
}
function legitimacy(S){
  const clergy=S.facs.clergy.mood, aristo=S.facs.aristocracy.mood;
  const succ=(S.law==="elective")?58:(heirOf(S)?76:34);
  let v=0.30*clergy+0.24*aristo+0.34*succ+(S.gov.charter?6:0)+(S.facs.peasantry.mood-50)*0.12;
  if(S.regency) v-=10;
  v-=(S.legitPen||0);
  return clamp(v);
}
function legitSources(S){
  const bits=[];
  bits.push(S.facs.clergy.mood>=55?"divine favour":"the faith wavers");
  if(S.law==="elective") bits.push("an elective crown");
  else bits.push(heirOf(S)?"a clear succession":"no clear heir");
  if(S.regency) bits.push("a regency governs");
  return bits.join(" · ");
}
