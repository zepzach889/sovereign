"use strict";
/* =====================================================================
   THE PROVINCES
   A light territorial model — no map, no borders, just named places with
   loyalty of their own. The provinces ESTATE remains the countryside's
   voice at court; this is the country itself. Provinces can drift, be
   governed by a royal, and — if neglected long enough — leave.
   ===================================================================== */
const PROV_PARTS={
  pre:["North","South","East","West","Upper","Lower","Old","Far","Inner","Outer"],
  root:["march","vale","reach","moor","fen","weald","holt","strand","hollow","dale","wold","heath"],
  seat:["Aldmoor","Carrow","Brenna","Halstead","Verrin","Dunmere","Kessley","Tarnwick","Ostry","Cawdale","Merrow","Lindholt","Rask","Ferrow"]
};
function newProvinces(S,n){
  const out=[], usedSeat=new Set(), usedName=new Set();
  const count=n||(4+rand(3));
  for(let i=0;i<count;i++){
    let name, guard=0;
    const cap=w=>w.charAt(0).toUpperCase()+w.slice(1);
    do{ name = chance(0.5)
      ? `${pick(PROV_PARTS.pre)} ${cap(pick(PROV_PARTS.root))}`
      : `The ${cap(pick(PROV_PARTS.root))} of ${pick(PROV_PARTS.seat)}`;
    }while(usedName.has(name)&&guard++<20);
    usedName.add(name);
    let seat; guard=0;
    do{ seat=pick(PROV_PARTS.seat); }while(usedSeat.has(seat)&&guard++<20);
    usedSeat.add(seat);
    out.push({ id:"p"+i, name, seat,
      loyalty: 52+rand(16),
      weight: 1,                 /* share of the realm this province is */
      governor: null,            /* a royal id, if one has been sent */
      core: i===0,               /* the heartland never secedes */
      unrest: 0 });
  }
  out[0].name = "The Crownlands";
  out[0].weight = 1.4;
  return out;
}
function provinces(S){ return S.provinces||[]; }
function provinceById(S,id){ return provinces(S).find(p=>p.id===id)||null; }
function provinceOfGovernor(S,personId){ return provinces(S).find(p=>p.governor===personId)||null; }
function provinceLoyaltyAvg(S){
  const ps=provinces(S); if(!ps.length)return 50;
  const tw=ps.reduce((a,p)=>a+p.weight,0);
  return ps.reduce((a,p)=>a+p.loyalty*p.weight,0)/tw;
}
/* provinces drift toward the mood of the provinces estate, with local noise;
   a resident royal governor holds a province steady */
function tickProvinces(S,span){
  const target=S.facs.provinces.mood;
  provinces(S).forEach(p=>{
    const gov=p.governor?(S.family||[]).find(x=>x.id===p.governor&&x.alive):null;
    if(p.governor&&!gov) p.governor=null;
    /* a resident royal blunts the pull of a sour court and lifts the province */
    let pull=(target-p.loyalty)*(gov?0.19:0.28);
    if(gov) pull+=6;
    if(p.core) pull+=1.5;
    if(S.stability<40) pull-=2;
    p.loyalty=clamp(p.loyalty+pull+(rand(5)-2));
    p.unrest = p.loyalty<30 ? (p.unrest||0)+span : 0;
  });
}
function restiveProvinces(S){ return provinces(S).filter(p=>!p.core&&p.loyalty<32); }
function secedingProvince(S){
  /* a province that has been at rock bottom for a decade is ready to go */
  return provinces(S).filter(p=>!p.core&&p.loyalty<24&&(p.unrest||0)>=10)
    .sort((a,b)=>a.loyalty-b.loyalty)[0]||null;
}
function loseProvince(S,p){
  S.provinces=provinces(S).filter(x=>x.id!==p.id);
  S.lostProvinces=S.lostProvinces||[];
  S.lostProvinces.push({name:p.name,seat:p.seat,year:S.year});
  lowerDevelopment(S,Math.round(7*p.weight));
  S.facs.provinces.strength=clamp(S.facs.provinces.strength-6);
  S._realmShrunk=(S._realmShrunk||0)+1;
}
function provinceLabel(l){
  if(l>=70)return "devoted"; if(l>=56)return "content"; if(l>=44)return "quiet";
  if(l>=32)return "restive"; if(l>=24)return "seething"; return "in open defiance";
}

function autonomySeeker(S){
  return provinces(S).filter(p=>!p.core&&!p.autonomy).sort((a,b)=>a.loyalty-b.loyalty)[0]||null;
}
