/* ---------- succession law ---------- */
const LAWS={
  agnatic:{name:"Agnatic",desc:"Sons only inherit. Daughters and their lines are passed over entirely."},
  malepref:{name:"Male-preference",desc:"Sons first, by age; daughters inherit only if there are no sons."},
  absolute:{name:"Absolute",desc:"The eldest child inherits, son or daughter alike."},
  elective:{name:"Elective",desc:"The great houses (or the chamber, if one holds power) choose the successor."},
};
function heirOf(S){
  const kids=S.family.filter(p=>p.rel==="child"&&p.alive);
  if(S.law==="elective") return null; // chosen at succession
  if(S.designated){ const d=S.family.find(p=>p.id===S.designated&&p.alive); if(d) return d; }
  function lawPick(list){
    let pool;
    if(S.law==="agnatic") pool=list.filter(k=>k.gender==="m");
    else if(S.law==="malepref"){ pool=list.filter(k=>k.gender==="m"); if(!pool.length) pool=list.filter(k=>k.gender==="f"); }
    else pool=list.slice();
    pool.sort((a,b)=>b.age-a.age);
    return pool[0]||null;
  }
  const byKids=lawPick(kids);
  if(byKids) return byKids;
  // REPRESENTATION: a dead child's own children stand in their parent's place
  const deadKids=S.family.filter(p=>p.rel==="child"&&!p.alive);
  if(deadKids.length){
    const stand=[];
    deadKids.forEach(dk=>{
      const line=S.family.filter(g=>g.alive&&g.parents&&g.parents.includes(dk.id));
      const pick2=lawPick(line); if(pick2){pick2._viaParent=dk; stand.push(pick2);}
    });
    const rep=lawPick(stand);
    if(rep) return rep;
  }
  // the law reaches sideways when the direct line is bare
  return lawPick(S.family.filter(p=>p.rel==="sibling"&&p.alive));
}
function kinDistance(S,p){
  if(p.rel==="child")return 0;
  if(p.rel==="grandchild")return 1;
  if(p.rel==="sibling")return 2;
  if(p.rel==="nephew")return 3;
  if(p.rel==="uncle")return 4;
  return 5;
}
function designatable(S){
  return S.family.filter(p=>p.alive&&p.age>=6&&["child","grandchild","sibling","nephew","uncle","kin"].includes(p.rel))
    .sort((a,b)=>kinDistance(S,a)-kinDistance(S,b)||b.age-a.age).slice(0,9);
}

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
const composition={ nobility:["aristocracy","clergy"], commons:["merchants","peasantry"], broad:["merchants","peasantry","provinces"] };
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
  if(!S.pm&&!S._pmPending&&S.gov.institutions.length&&S.gov.crown.power<50) S._pmPending=true;
}
function runElection(){
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  if(!set.size)set.add("aristocracy");
  const standings=[...set].map(k=>({k,name:S.facs[k].name,score:Math.round(S.facs[k].mood*0.6+S.facs[k].strength*0.4+rand(18))}));
  standings.sort((a,b)=>b.score-a.score);
  return {standings,winner:standings[0].k};
}
function regimeLabel(S){
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

/* ---------- economy (harsher) ---------- */
const TAX_TIERS={
  none:{label:"None",mult:0.2,stab:+2,fac:{peasantry:+4,merchants:+3}},
  light:{label:"Light",mult:0.65,stab:+1,fac:{peasantry:+2}},
  moderate:{label:"Moderate",mult:1.0,stab:0,fac:{peasantry:-1}},
  heavy:{label:"Heavy",mult:1.4,stab:-2,fac:{peasantry:-4,merchants:-3}},
  oppressive:{label:"Oppressive",mult:1.8,stab:-5,fac:{peasantry:-8,merchants:-5,provinces:-4}},
};
const TAX_ORDER=["none","light","moderate","heavy","oppressive"];
function income(S){ const base=(16+S.development*0.55)*(1+(S._taxBonus||0)); return Math.round(base*TAX_TIERS[S.taxRate].mult)+(S._companyGold||0); }
function upkeep(S){
  let u=10+Math.round(S.military*0.4)+S.privileges*4;
  u+=Math.round(S.family.filter(p=>p.alive).length*1.2); // the court eats
  if(S.gov.cabinet)u+=5;
  u+=(S._armyUpkeep||0);
  if(S.debt>0)u+=Math.min(30,Math.round(S.debt*0.12));
  return u;
}
function netIncome(S){ return income(S)-upkeep(S); }
const OVERDRAFT=40;

/* ---------- mortality (era-scaled; Dynastic is dangerous) ---------- */
function mortalityChance(age,years){
  // per span of `years`; Dynastic-era medicine
  let annual;
  if(age<10) annual=0.015; else if(age<30) annual=0.008; else if(age<45) annual=0.014;
  else if(age<55) annual=0.03; else if(age<65) annual=0.07; else if(age<75) annual=0.14; else annual=0.28;
  return 1-Math.pow(1-annual,years);
}
