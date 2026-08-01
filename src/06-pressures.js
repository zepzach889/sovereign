"use strict";
/* =====================================================================
   THE FOUR PRESSURES
   Every regime carries all four. They are the weather behind every
   transition in the game — a realm drifts toward the arrangement whose
   pressure is rising, and the player can watch it happen.
   ===================================================================== */
const PRESSURES=[
  {id:"military",name:"The Barracks",toward:"military government",
   blurb:"officers who have been asked to solve too many problems"},
  {id:"radical",name:"The Streets",toward:"a people's republic",
   blurb:"workers and reformers with nothing left to lose"},
  {id:"constitutional",name:"The Chambers",toward:"a republic",
   blurb:"an educated public that wants the crown bounded or gone"},
  {id:"restorationist",name:"The Old Order",toward:"a crown",
   blurb:"the great houses, the church, and whoever waits in exile"}
];
/* the instantaneous reading, 0-100, from the state of the realm */
function bumpPressure(S,id,n){ S.pBump=S.pBump||{}; S.pBump[id]=Math.min(45,(S.pBump[id]||0)+n); }
function pressureNow(S,id){
  const f=S.facs, legit=legitimacy(S);
  const bump=(S.pBump&&S.pBump[id])||0;
  const base=pressureBase(S,id);
  return clamp(base+bump);
}
/* A state failing is the single largest driver of every pressure. A realm
   with no legitimacy, no order, no money and a crown that holds nothing is
   not a realm anyone is going to leave standing. */
function collapseDrive(S){
  const legit=legitimacy(S);
  let c=0;
  c+=Math.max(0,45-legit)*0.85;
  c+=Math.max(0,42-S.stability)*0.75;
  if(S.treasury<-60)c+=12;
  if(S.debt>0&&netIncome(S)<0)c+=10;
  if(isMonarchy(S)&&S.gov.crown.power<=8)c+=14;
  const angry=Object.keys(S.facs).filter(k=>S.facs[k].present&&S.facs[k].mood<25).length;
  c+=angry*6;
  return c;
}
function pressureBase(S,id){
  const f=S.facs;
  const collapse=collapseDrive(S);
  if(id==="military"){
    return clamp( collapse*0.55
      + (S._militaryLeaned||0)*3
      + Math.max(0,S.military-45)*0.5
      + (S._armyUpkeep||0)*1.2
      + (f.officers.mood<40?14:0)
      + (f.officers.mood<20?12:0) );
  }
  if(id==="radical"){
    const w=f.workers||{mood:50,strength:0,present:false};
    const r=f.reformers||{mood:50,strength:0,present:false};
    /* the poor do not need a proletariat to rise — hunger predates industry */
    return clamp( collapse*0.7
      + Math.max(0,45-f.peasantry.mood)*0.7
      + (w.present?Math.max(0,55-w.mood)*0.55+w.strength*0.25:0)
      + (r.present?Math.max(0,55-r.mood)*0.4+r.strength*0.2:0)
      + (S.taxRate==="oppressive"?12:S.taxRate==="heavy"?5:0) );
  }
  if(id==="constitutional"){
    const r=f.reformers||{mood:50,strength:0,present:false};
    return clamp( collapse*0.5
      + f.merchants.strength*0.28
      + (r.present?r.strength*0.3:0)
      + (S._pressOn?10:0) + (S._opinionOn?10:0)
      + eraIdx(S)*4
      + ((S.gov.institutions||[]).length?8:0) );
  }
  if(id==="restorationist"){
    return clamp( (isMonarchy(S)?0:collapse*0.6)
      + (f.aristocracy.mood>55?12:0)
      + f.aristocracy.strength*0.22 + f.clergy.strength*0.18
      + ((S.exiles&&S.exiles.alive)?20:0)
      + (S._martyr?25:0) );
  }
  return 0;
}
/* pressures have memory: they build and ease rather than jumping about */
function tickPressures(S,span){
  S.pressure=S.pressure||{};
  /* a shock fades, but not before it has been felt */
  if(S.pBump)for(const k in S.pBump)S.pBump[k]=Math.max(0,S.pBump[k]-span*0.6);
  PRESSURES.forEach(p=>{
    const now=pressureNow(S,p.id);
    const held=S.pressure[p.id]||now;
    const rate=(now>held)?0.16:0.11;
    S.pressure[p.id]=Math.round((held+(now-held)*rate*span)*10)/10;
  });
}
function pressureOf(S,id){ return (S.pressure&&S.pressure[id])||0; }
function leadingPressure(S){
  let best=null;
  PRESSURES.forEach(p=>{ const v=pressureOf(S,p.id); if(!best||v>best.v)best={def:p,v}; });
  return best;
}
function pressureWord(v){
  if(v>=78)return "at breaking point"; if(v>=62)return "dangerous";
  if(v>=46)return "building"; if(v>=30)return "murmuring"; return "quiet";
}
/* the sidebar reading — deliberately impressionistic, not a progress bar */
function pressurePanel(S){
  const cur=S.regime||"monarchy";
  const live=PRESSURES.filter(p=>REGIME_OF_PRESSURE[p.id]!==cur);
  let lead=null;
  live.forEach(p=>{ const v=pressureOf(S,p.id); if(!lead||v>lead.v)lead={def:p,v}; });
  if(!lead||lead.v<30)return "";
  return `<div class="press"><div class="gt">The Drift of the Realm</div>
    ${PRESSURES.filter(p=>pressureOf(S,p.id)>=30&&REGIME_OF_PRESSURE[p.id]!==(S.regime||"monarchy")).sort((a,b)=>pressureOf(S,b.id)-pressureOf(S,a.id)).map(p=>{
      const v=pressureOf(S,p.id);
      const cls=v>=78?"crit":v>=62?"warn":"";
      return `<div class="prow ${cls}"><span class="pn">${esc(p.name)}</span><span class="pw">${pressureWord(v)}</span></div>`;
    }).join("")}
    <div class="pnote">${esc(lead.def.blurb)} — the realm leans toward ${esc(lead.def.toward)}.</div></div>`;
}
