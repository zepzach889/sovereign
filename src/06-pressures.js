"use strict";
/* =====================================================================
   THE FOUR PRESSURES
   Every regime carries all four. They are the weather behind every
   transition in the game — a realm drifts toward the arrangement whose
   pressure is rising, and the player can watch it happen.
   ===================================================================== */
const PRESSURES=[
  {id:"military",name:"The Barracks",who:"the officer corps",toward:"military government",
   blurb:"officers who have been asked to solve too many problems"},
  {id:"radical",name:"The Streets",who:"the peasantry and the urban workers",toward:"a people's republic",
   blurb:"workers and reformers with nothing left to lose"},
  {id:"constitutional",name:"The Chambers",who:"merchants, reformers and an educated public",toward:"a republic",
   blurb:"an educated public that wants the crown bounded or gone"},
  {id:"restorationist",name:"The Old Order",who:"the great houses and the church",toward:"a crown",
   blurb:"the great houses, the church, and whoever waits in exile"}
];
/* the instantaneous reading, 0-100, from the state of the realm */
function bumpPressure(S,id,n){ S.pBump=S.pBump||{}; S.pBump[id]=Math.min(45,(S.pBump[id]||0)+n); }
function pressureNow(S,id){
  const f=S.facs, legit=legitimacy(S);
  const bump=(S.pBump&&S.pBump[id])||0;
  const base=pressureBase(S,id);
  const v=clamp(base+bump);
  /* The long-reign toggle. The weather still moves — you can watch a
     realm lean — but it never breaks, so a single crown can be walked all
     the way to the end of the tech tree and judged on its own terms. */
  if(S.devQuiet)return Math.min(44,Math.round(v*0.4));
  return v;
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
/* What the age expects a crown to hold. Absolute rule was unremarkable in
   1600 and an outrage by 1900; the number is the same and the meaning is
   not. */
function expectedCrown(S){ return Math.max(5,88-eraIdx(S)*11); }
/* How much of the country's demand for representative government has
   already been met. This is the thing that was missing: reform has to pay
   in the currency that kills you, or reform is not a strategy. */
function constitutionalRelief(S){
  let r=0;
  const held=(S.gov.institutions||[]).reduce((a,i)=>a+i.power,0);
  if(isMonarchy(S)){
    const gap=expectedCrown(S)-(S.gov.crown.power|0);
    /* no floor on the way down: the FIRST concession is the one that has to
       feel like it bought something, and being far over the curve must not
       flatten every step you take toward it */
    r+=Math.min(30,gap*0.55);
  } else {
    r+=14;                                     /* the crown question is settled */
  }
  r+=Math.min(20,held*0.28);                   /* chambers that actually hold something */
  if(S.gov.charter)r+=8;
  if(typeof franchiseIdx==="function")r+=franchiseIdx(S)*4;
  if(S.pm&&typeof pmGoverns==="function"&&pmGoverns(S))r+=10;
  /* a concession freely given buys more than one extracted */
  r+=Math.min(10,(S._freeReforms||0)*3);
  return r;
}
/* =====================================================================
   ATTRIBUTION
   A reading with no reasons is an oracle, not a diagnosis. The panel now
   names its two largest drivers, so "the barracks are at breaking point"
   stops meaning "your soldiers hate you" when what it means is "the state
   is failing and the army is what is left".
   ===================================================================== */
function pressureWhy(S,id){
  const f=S.facs, collapse=collapseDrive(S), out=[];
  const add=(n,t)=>{ if(n>3)out.push({n,t}); };
  if(id==="military"){
    add(collapse*0.55,"a state the officers no longer believe can govern");
    add((S._militaryLeaned||0)*3,"a crown that keeps calling for the regiment");
    add(Math.max(0,S.military-45)*0.5,"an army larger than the country needs");
    add((S._armyUpkeep||0)*1.2,"a standing establishment nobody can pay for");
    add(f.officers.mood<40?14:0,"officers who are genuinely disaffected");
  } else if(id==="radical"){
    const w=f.workers||{mood:50,strength:0,present:false};
    add(collapse*0.7,"a state visibly failing");
    add(Math.max(0,45-f.peasantry.mood)*0.7,"a countryside that is hungry and knows why");
    add(w.present?Math.max(0,55-w.mood)*0.55+w.strength*0.25:0,"mill towns that can now organise");
    add(S.taxRate==="oppressive"?12:S.taxRate==="heavy"?5:0,"a tax burden the poor carry");
  } else if(id==="constitutional"){
    const r=f.reformers||{mood:50,strength:0,present:false};
    add(f.merchants.strength*0.28,"a merchant class with money and no say");
    add(r.present?r.strength*0.3:0,"reformers with a programme and a printing press");
    add(eraIdx(S)*4,"an age in which absolute rule has stopped being normal");
    add((S._pressOn?10:0)+(S._opinionOn?10:0),"a public that reads");
    if(isMonarchy(S)){
      const gap=expectedCrown(S)-(S.gov.crown.power|0);
      if(gap<-4)out.push({n:-gap*0.55,t:`a crown holding ${S.gov.crown.power|0} in an age that expects ${expectedCrown(S)}`});
    }
  } else {
    add(isMonarchy(S)?0:collapse*0.6,"a republic that has not convinced anyone");
    add(f.aristocracy.strength*0.22,"great houses with land and memory");
    add(f.clergy.strength*0.18,"a church that preferred the old arrangement");
    add((S.exiles&&S.exiles.alive)?20:0,"a claimant alive in exile");
  }
  out.sort((a,b)=>b.n-a.n);
  return out.slice(0,2).map(x=>x.t);
}
/* and what would actually bring it down */
function pressureRelief(S,id){
  if(id==="constitutional"){
    if(!isMonarchy(S))return "Elections held when due, a franchise widened, and a chamber whose bills you do not simply refuse.";
    const gap=expectedCrown(S)-(S.gov.crown.power|0);
    if(gap<0)return `Conceding power would tell: every point the crown gives up below ${expectedCrown(S)} takes this reading down with it.`;
    return "The crown already sits under what the age expects, which is most of why this is survivable.";
  }
  /* every remedy named here must be a thing the player can actually do */
  if(id==="military")return "Pay the army's arrears · cut the host or the standing establishment in the Ledger · commission from outside the great houses.";
  if(id==="radical")return "Open the granaries and fund relief · lighten the tax burden · widen the franchise before it is demanded.";
  return "Endow the old order · restore privileges in the Ledger · a marriage into a great house.";
}
/* leaning on the army fades from memory, as it did */
function decayGrievance(S){
  if((S._militaryLeaned||0)>0&&chance(0.5))S._militaryLeaned=Math.max(0,S._militaryLeaned-1);
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
    const demand=collapse*0.5
      + f.merchants.strength*0.28
      + (r.present?r.strength*0.3:0)
      + (S._pressOn?10:0) + (S._opinionOn?10:0)
      + eraIdx(S)*4;
    return clamp(demand-constitutionalRelief(S));
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
      return `<div class="prow ${cls}"><span class="pn">${esc(p.name)}${p.who?` <small style="color:var(--dim)">· ${esc(p.who)}</small>`:""}</span><span class="pw">${pressureWord(v)}</span></div>`;
    }).join("")}
    <div class="pnote">${esc((pressureWhy(S,lead.def.id)[0])||lead.def.blurb)} — the realm leans toward ${esc(lead.def.toward)}.</div>
    ${lead.v>=52?`<div class="pwhy"><div class="pwhyh">Why ${esc(lead.def.name.toLowerCase())}</div>
      ${pressureWhy(S,lead.def.id).map(t=>`<div class="pwhyr">· ${esc(t)}</div>`).join("")}
      <div class="pwhyr rel">${esc(pressureRelief(S,lead.def.id))}</div></div>`:""}
    </div>`;
}
/* is anything close enough to breaking that the panel belongs at the top? */
function driftUrgent(S){
  const cur=S.regime||"monarchy";
  return PRESSURES.some(p=>REGIME_OF_PRESSURE[p.id]!==cur&&pressureOf(S,p.id)>=62);
}
