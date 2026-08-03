"use strict";
/* =====================================================================
   REFORMS
   ===================================================================== */
const REFORMS=[
  { id:"summon_estates",name:"Summon the Estates",tag:"foundational",pmin:12,pmax:30,pdef:20,
    blurb:"Call the great men of the realm into a standing assembly holding the power of the purse — ending taxation by decree, but lending every levy the strength of consent.",
    nameSuggest:["House of Nobles","Estates General","The Grand Assembly","Council of Peers","Diet of the Realm"],
    available:S=>S.gov.institutions.length===0,
    enact:(S,power,name)=>{ S.gov.institutions.push({id:"estates",name,composition:"nobility",power:0,rights:["tax"]});
      transferPower(S,S.gov.institutions[S.gov.institutions.length-1],power);
      S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+8); S.facs.clergy.mood=clamp(S.facs.clergy.mood+3);
      S.reforms.push("summon_estates");
      return `the Crown summoned the ${name}, and the absolute throne of old quietly ended; taxation would now be a matter of consent.`; }},
  { id:"lower_house",name:"Establish a House of Commons",tag:"foundational",pmin:8,pmax:22,pdef:14,
    blurb:"Seat a second chamber for the common estates. It gives the low-born a standing voice — and their petitions the force of expectation.",
    nameSuggest:["House of Commons","The Lower House","Chamber of Deputies","The People's Bench"],
    available:S=>S.reforms.includes("summon_estates")&&!S.reforms.includes("lower_house"),
    enact:(S,power,name)=>{ S.gov.institutions.push({id:"commons",name,composition:"commons",power:0,rights:["petition"]});
      transferPower(S,S.gov.institutions[S.gov.institutions.length-1],power);
      S.facs.merchants.mood=clamp(S.facs.merchants.mood+10); S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+8); S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-5);
      S.facs.merchants.strength=clamp(S.facs.merchants.strength+10); S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+6);
      S.reforms.push("lower_house");
      return `the Crown seated the ${name}, and for the first time the common estates of ${S.nation} held a voice in their own governing.`; }},
  { id:"charter",name:"Codify a Charter of the Realm",tag:"constitutional",pmin:14,pmax:30,pdef:22,
    blurb:"Set the fundamental law in writing, binding even the Crown. The chambers gain the power of law, and the garrison ceases to be an instrument of rule.",
    nameSuggest:["The Great Charter","Charter of Liberties","The Fundamental Law","The Covenant of the Realm"],
    available:S=>S.gov.institutions.length>0&&!S.gov.charter,
    enact:(S,power,name)=>{ const inst=S.gov.institutions[S._reformDest!=null?S._reformDest:S.gov.institutions.length-1]||S.gov.institutions[S.gov.institutions.length-1]; if(!inst.rights.includes("law"))inst.rights.push("law"); transferPower(S,inst,power);
      S.gov.charter=name; S.facs.merchants.mood=clamp(S.facs.merchants.mood+8); S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+6);
      S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-6); S.facs.clergy.mood=clamp(S.facs.clergy.mood-5);
      S.reforms.push("charter");
      return `the Crown set its hand to the ${name}, binding itself to law; the arbitrary power of the throne was buried in ink.`; }},
  { id:"cabinet",name:"Form a Privy Cabinet",tag:"administrative",pmin:0,pmax:0,pdef:0,
    blurb:"Create a standing council of ministries. It costs upkeep, but a governed realm is a wealthier, steadier one — and it lets you appoint able men to office.",
    nameSuggest:["Privy Council","The Cabinet","Council of State","The Ministry"],
    available:S=>!S.gov.cabinet,
    enact:(S,power,name)=>{ S.gov.cabinet=name; raiseDevelopment(S,5); S.facs.merchants.mood=clamp(S.facs.merchants.mood+4);
      S.reforms.push("cabinet");
      return `the Crown established the ${name}, and the daily governing of ${S.nation} passed from whim into standing office.`; }},
  { id:"law_reform",name:"Reform the Succession Law",tag:"dynastic",pmin:0,pmax:0,pdef:0,lawPick:true,
    blurb:"Rewrite the law of who may inherit the crown. The great houses and the Church will judge the change by whose prospects it raises — and whose it buries.",
    nameSuggest:[],
    available:S=>true,
    enact:(S,power,newLaw)=>{ const old=S.law; S.law=newLaw;
      if(newLaw==="absolute"){S.facs.clergy.mood=clamp(S.facs.clergy.mood-6);S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-4);}
      if(newLaw==="agnatic"){S.facs.clergy.mood=clamp(S.facs.clergy.mood+4);}
      if(newLaw==="elective"){S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+8);}
      S.reforms.push("law_reform_"+newLaw);
      return `the law of succession was rewritten: where the crown had passed by ${LAWS[old].name.toLowerCase()} right, it would now pass by ${LAWS[newLaw].name.toLowerCase()}.`; }},
  { id:"devolve",name:"Devolve Powers to a Chamber",tag:"structural",pmin:6,pmax:20,pdef:10,
    blurb:"The Crown, of its own will, lays a further measure of its power upon a chamber. History rarely records it done gladly — but it is the one road to reform that no revolt has to force.",
    nameSuggest:["Act of Devolution","The Concession","Grant of Governance","The Yielding"],
    available:S=>!pmGoverns(S)&&S.gov.institutions.length>0&&S.gov.crown.power>=6,
    enact:(S,power,name)=>{ const inst=S.gov.institutions[S._reformDest!=null?S._reformDest:0]||S.gov.institutions[0];
      transferPower(S,inst,power);
      (composition[inst.composition]||[]).forEach(k=>{S.facs[k].mood=clamp(S.facs[k].mood+Math.round(power*0.4));});
      S.facs.clergy.mood=clamp(S.facs.clergy.mood-2);
      S.reforms.push("devolve_"+S.turn);
      return `by the ${name}, the Crown laid a further measure of its power upon the ${inst.name} — freely, and before any storm compelled it.`; }},
  { id:"chamber_shift",name:"Shift the Balance of the Chambers",tag:"structural",pmin:5,pmax:18,pdef:8,noName:true,twoChamber:true,
    blurb:"Move power between the chambers by statute — feed the Commons from the Lords' share, or the reverse. The chamber that loses will not thank you.",
    nameSuggest:[],
    available:S=>S.gov.institutions.length>1,
    enact:(S,power)=>{ const si=(S._reformSrc!=null?S._reformSrc:0), di=(S._reformDest!=null?S._reformDest:1);
      const src=S.gov.institutions[si], dst=S.gov.institutions[di];
      if(!src||!dst||src===dst) return "the chambers' balance stood unchanged.";
      const a=Math.min(power,src.power); src.power-=a; dst.power+=a;
      (composition[src.composition]||[]).forEach(k=>{S.facs[k].mood=clamp(S.facs[k].mood-Math.round(a*0.6));});
      (composition[dst.composition]||[]).forEach(k=>{S.facs[k].mood=clamp(S.facs[k].mood+Math.round(a*0.4));});
      S.reforms.push("shift_"+S.turn);
      return `power passed by statute from the ${src.name} to the ${dst.name}, and the balance of the chambers tilted.`; }},
  { id:"curtail",name:"Curtail the Royal Prerogative",tag:"parliamentary",pmin:6,pmax:16,pdef:10,vetoable:true,
    blurb:"Strip another measure of power from the Crown by statute. A strong Crown may refuse assent — a figurehead cannot.",
    nameSuggest:["Act of Settlement","The Instrument of State","Act of Prerogative","The Second Charter"],
    available:S=>!!S.pm&&S.gov.crown.power>=6,
    enact:(S,power,name)=>{ const inst=S.gov.institutions[S._reformDest!=null?S._reformDest:0]||S.gov.institutions[0]; transferPower(S,inst,power);
      S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-4);
      S.reforms.push("curtail_"+S.turn);
      return `by the ${name}, the chamber pared another measure of power from the Crown.`; }},
  { id:"franchise",name:"Broaden the Franchise",tag:"parliamentary",pmin:0,pmax:0,pdef:0,
    blurb:"Let more of the country in. The vote is a gate, not a gift — each widening admits another layer of people who were always there, and each one changes what the chamber is for.",
    nameSuggest:["The Reform Act","The Great Enfranchisement","Act of the Common Voice","The Representation Act"],
    available:S=>!!S.pm&&S.gov.institutions.some(i=>i.composition==="commons"||i.composition==="broad")&&franchiseIdx(S)<FRANCHISE.length-1,
    enact:(S,power,name)=>{ const i=franchiseIdx(S); const nx=FRANCHISE[Math.min(FRANCHISE.length-1,i+1)];
      S.franchise=nx.id;
      const inst=S.gov.institutions.find(x=>x.composition==="commons"||x.composition==="broad");
      if(inst&&nx.id==="broad"&&S.facs.workers&&S.facs.workers.present)inst.composition="broad";
      S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+7);
      S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+8);
      if(S.facs.workers&&S.facs.workers.present){ S.facs.workers.strength=clamp(S.facs.workers.strength+7); S.facs.workers.mood=clamp(S.facs.workers.mood+9); }
      S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-6);
      S.reforms.push("franchise_"+nx.id);
      return `the ${name} carried ${S.nation} to ${nx.name}: ${nx.blurb}.`; }},
];
/* =====================================================================
   THE THREE TIERS
   A charter granted freely and a charter signed on a battlefield are the
   same document and entirely different objects. Stein reformed Prussia in
   1807 to survive; Louis-Philippe conceded nothing until 1848 and then
   conceded everything on the way out. The realm remembers which.

   Of its own motion   — full boon
   Upon petition       — half
   Under duress        — none, a lasting mark, and the estate that forced
                         it keeps the strength it built forcing it.

   And the freely-given boon decays past the reform's natural window,
   because seating a commons in 1650 is visionary and seating one in 1900
   is overdue, and everybody knows it.
   ===================================================================== */
const REFORM_BOON={
  summon_estates:{era:1, stab:+6, legit:+9,  gold:+20, dev:+3},
  lower_house:   {era:2, stab:+5, legit:+10, dev:+6},
  charter:       {era:3, stab:+8, legit:+13, dev:+4},
  cabinet:       {era:2, stab:+4, dev:+7},
  devolve:       {era:3, stab:+5, legit:+8},
  curtail:       {era:4, stab:+4, legit:+7},
  franchise:     {era:6, stab:+6, legit:+11, dev:+5},
  chamber_shift: {era:4, stab:+2, legit:+2},
  law_reform:    {era:3, legit:+4}
};
function askReform(S,id,level){
  S.reformAsk=S.reformAsk||{};
  S.reformAsk[id]=Math.max(S.reformAsk[id]||0,level);
}
function reformTier(S,r){
  if(!r)return "motion";
  if(S._underDuress&&(S.turn-S._underDuress)<=1)return "duress";
  const ask=(S.reformAsk&&S.reformAsk[r.id])||0;
  if(ask>=2)return "duress";
  if(ask>=1)return "petition";
  /* a reform passed while the country is already in uproar is a concession
     whatever the palace chooses to call it */
  if(typeof pressureOf==="function"&&pressureOf(S,"constitutional")>=62)return "petition";
  return "motion";
}
const TIER_LABEL={motion:"of its own motion",petition:"upon petition",duress:"under duress"};
function reformEraFactor(S,r){
  const b=REFORM_BOON[r.id]||REFORM_BOON[(r.id||"").split("_")[0]]; if(!b||b.era==null)return 1;
  const late=Math.max(0,eraIdx(S)-b.era);
  return Math.max(0.3,1-late*0.17);
}
function reformBoon(S,r){
  const base=REFORM_BOON[r.id]; if(!base)return null;
  const tier=reformTier(S,r);
  const mult=(tier==="motion")?1:(tier==="petition")?0.5:0;
  const f=reformEraFactor(S,r)*mult;
  const out={tier,factor:f};
  ["stab","legit","gold","dev"].forEach(k=>{ if(base[k])out[k]=Math.round(base[k]*f); });
  return out;
}
/* what the boon actually does, applied once at enactment */
function applyReformBoon(S,r){
  const b=reformBoon(S,r); if(!b)return null;
  if(b.tier==="duress"){
    /* no boon, a mark that lasts, and the forcing estate keeps its gains */
    S.legitPen=(S.legitPen||0)+10;
    S.stability=clamp(S.stability-5);
    const inst=S.gov.institutions[S.gov.institutions.length-1];
    (composition[inst&&inst.composition]||["peasantry"]).forEach(k=>{
      if(S.facs[k])S.facs[k].strength=clamp(S.facs[k].strength+6); });
    return b;
  }
  if(b.stab)S.stability=clamp(S.stability+b.stab);
  if(b.legit)S.legitPen=Math.max(0,(S.legitPen||0)-b.legit);
  if(b.gold)S.treasury+=b.gold;
  if(b.dev)raiseDevelopment(S,b.dev);
  return b;
}
function reformBoonLine(S,r){
  const b=reformBoon(S,r); if(!b)return "";
  if(b.tier==="duress")
    return `Forced. No boon at all — and a mark on the reign: legitimacy −10, stability −5, and the estate that compelled it keeps what it built.`;
  const bits=[];
  if(b.stab)bits.push(`+${b.stab} Stability`);
  if(b.legit)bits.push(`legitimacy +${b.legit}`);
  if(b.gold)bits.push(`+${b.gold} gold`);
  if(b.dev)bits.push(`+${b.dev} development`);
  const half=(b.tier==="petition")?" — half, because it was asked for first":"";
  const late=(reformEraFactor(S,r)<0.95)?" The age has moved on; a reform overdue is worth less than one ahead of its time.":"";
  return bits.length?`Granted ${TIER_LABEL[b.tier]}: ${bits.join(" · ")}${half}.${late}`:"";
}
function availableReforms(S){ if(S.regency)return []; return REFORMS.filter(r=>r.available(S)); }
function cloneState(S){ const c=JSON.parse(JSON.stringify(S,(k,v)=>typeof v==="function"?undefined:v)); c.currentEvent=null; c.dyn=null; c.pending=null; c.result=null; return c; }
function previewReform(S,r,power,lawChoice){
  const before=new Set(availableActions(S).map(a=>a.label));
  const clone=cloneState(S);
  r.enact(clone,power||r.pdef, r.lawPick?(lawChoice||"absolute"):(r.nameSuggest[0]||"X"));
  const after=new Set(availableActions(clone).map(a=>a.label));
  const unlocks=[...after].filter(x=>!before.has(x));
  const locks=[...before].filter(x=>!after.has(x));
  const fac=[]; for(const k in S.facs){ const d=clone.facs[k].mood-S.facs[k].mood; if(d)fac.push({k,d,name:S.facs[k].name}); }
  const rBefore=rightsHeld(S),rAfter=rightsHeld(clone); const newRights=[...rAfter].filter(x=>!rBefore.has(x)&&x!=="petition");
  let heirNote=null;
  if(r.lawPick){ const h1=heirOf(S),h2=heirOf(clone);
    heirNote=(h2?("Heir would be: "+h2.name):(lawChoice==="elective"?"The houses would choose each successor.":"No eligible heir under this law."))+(h1&&h2&&h1.id!==h2.id?" (changed)":""); }
  return {unlocks,locks,fac,newRights,power:power||r.pdef,heirNote};
}

/* =====================================================================
   LEGISLATION
   "Withhold assent" was a verb without an object. A chamber that never
   proposes anything is furniture, and a veto over nothing is a button.
   So the dominant interest in the chamber brings a bill, the opposition
   brings a counter, and the crown or the government answers it.

   Each bill is tagged with the estate that wants it and the age it
   belongs to, because a Factory Act in 1650 is not a bill, it is a
   category error.
   ===================================================================== */
const BILLS=[
  /* ---- the aristocracy ---- */
  {id:"entail",bloc:"aristocracy",era:[0,4],title:"An Act of Entail",
   text:"binding the great estates so they can never be broken up or sold",
   pass:{fac:{aristocracy:+12,merchants:-6,peasantry:-4},stab:+3},
   effect:S=>{S.privileges=Math.min(9,S.privileges+1);}},
  {id:"game_laws",bloc:"aristocracy",era:[0,5],title:"The Game Laws",
   text:"making the taking of a hare on a lord's land a matter for the assize",
   pass:{fac:{aristocracy:+10,peasantry:-11},stab:+4}},
  {id:"corn",bloc:"aristocracy",era:[4,7],title:"The Corn Duties",
   text:"a tariff on foreign grain, to hold the price of the harvest up",
   pass:{fac:{aristocracy:+11,merchants:-9,peasantry:-8},gold:+14}},
  /* ---- the clergy ---- */
  {id:"tithe",bloc:"clergy",era:[0,5],title:"The Tithe Act",
   text:"confirming the church's ancient tenth, and the courts that collect it",
   pass:{fac:{clergy:+12,peasantry:-7,merchants:-3},legit:+5}},
  {id:"blasphemy",bloc:"clergy",era:[0,6],title:"An Act Against Blasphemy",
   text:"setting penalties for preaching against the established faith",
   pass:{fac:{clergy:+11,reformers:-9},stab:+4,legitPen:+3}},
  {id:"church_schools",bloc:"clergy",era:[5,9],title:"The Church Schools Bill",
   text:"placing the teaching of the realm's children in the hands of the parish",
   pass:{fac:{clergy:+10,reformers:-6},know:+2}},
  /* ---- the merchants ---- */
  {id:"navigation",bloc:"merchants",era:[2,6],title:"The Navigation Act",
   text:"reserving the realm's carrying trade to the realm's own bottoms",
   pass:{fac:{merchants:+11,provinces:-3},gold:+16,dev:+3}},
  {id:"joint_stock",bloc:"merchants",era:[4,8],title:"The Companies Bill",
   text:"limiting the liability of investors, so that failure ruins a company and not a family",
   pass:{fac:{merchants:+13,aristocracy:-5},dev:+6}},
  {id:"free_trade",bloc:"merchants",era:[5,9],title:"The Free Trade Bill",
   text:"striking the duties off, and letting the price of bread find its own level",
   pass:{fac:{merchants:+13,peasantry:+5,aristocracy:-12},dev:+5,gold:-10}},
  /* ---- the peasantry ---- */
  {id:"poor_relief",bloc:"peasantry",era:[1,7],title:"The Poor Relief Act",
   text:"a rate levied in every parish for those who cannot work",
   pass:{fac:{peasantry:+12,merchants:-5},stab:+6,gold:-14}},
  {id:"enclosure_stop",bloc:"peasantry",era:[3,7],title:"An Act Against Enclosure",
   text:"forbidding the fencing of the common land",
   pass:{fac:{peasantry:+13,aristocracy:-11},stab:+5,dev:-3}},
  {id:"tenant_right",bloc:"peasantry",era:[5,9],title:"The Tenant Right Bill",
   text:"giving a farmer the value of what he has improved when he is turned out",
   pass:{fac:{peasantry:+12,aristocracy:-9},stab:+4,dev:+3}},
  /* ---- the officers ---- */
  {id:"purchase",bloc:"officers",era:[2,6],title:"The Purchase Bill",
   text:"confirming that commissions may be bought and sold, as gentlemen have always done",
   pass:{fac:{officers:+9,aristocracy:+6,reformers:-6},gold:+12,arms:-4}},
  {id:"pensions",bloc:"officers",era:[3,9],title:"The Military Pensions Act",
   text:"a pension for the maimed and the long-serving, at the public charge",
   pass:{fac:{officers:+13,merchants:-4},stab:+3,gold:-16}},
  /* ---- the workers ---- */
  {id:"factory",bloc:"workers",era:[6,9],title:"The Factory Act",
   text:"limiting the hours of children in the mills, and sending inspectors to see it done",
   pass:{fac:{workers:+13,peasantry:+5,merchants:-10},stab:+5,dev:-2}},
  {id:"combination",bloc:"workers",era:[6,9],title:"The Combinations Bill",
   text:"making it lawful for men to bargain together over what their labour is worth",
   pass:{fac:{workers:+14,merchants:-11},stab:+3}},
  /* ---- the reformers ---- */
  {id:"secret_ballot",bloc:"reformers",era:[5,9],title:"The Ballot Act",
   text:"a secret vote, so that a tenant may vote against his landlord and still have a farm",
   pass:{fac:{reformers:+13,peasantry:+7,aristocracy:-10},legit:+8}},
  {id:"habeas",bloc:"reformers",era:[3,9],title:"An Act of Habeas Corpus",
   text:"requiring that a man held by the state be produced before a judge, or released",
   pass:{fac:{reformers:+12,peasantry:+5,officers:-6},legit:+9,stab:-2}}
];
function billsFor(S){
  const e=eraIdx(S);
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  return BILLS.filter(b=>e>=b.era[0]&&e<=b.era[1]&&set.has(b.bloc)
    &&S.facs[b.bloc]&&S.facs[b.bloc].present
    &&!(S.billsPassed||[]).includes(b.id));
}
/* whichever interest carries the chamber brings the bill; the strongest of
   the rest brings a counter */
function chamberBill(S){
  const avail=billsFor(S); if(!avail.length)return null;
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  const ranked=[...set].filter(k=>S.facs[k]&&S.facs[k].present)
    .sort((a,b)=>(S.facs[b].mood*0.4+S.facs[b].strength*0.6)-(S.facs[a].mood*0.4+S.facs[a].strength*0.6));
  const gov=(S.pm&&S.pm.bloc)||ranked[0];
  const main=avail.filter(b=>b.bloc===gov)[0]||avail[0];
  if(!main||!S.facs[main.bloc])return null;
  const opp=avail.filter(b=>b.bloc!==main.bloc&&S.facs[b.bloc])
    .sort((a,b)=>(S.facs[b.bloc].strength-S.facs[a.bloc].strength))[0]||null;
  return {main,opp};
}
function applyBill(S,b){
  const p=b.pass||{};
  for(const k in (p.fac||{})) if(S.facs[k])S.facs[k].mood=clamp(S.facs[k].mood+p.fac[k]);
  if(p.stab)S.stability=clamp(S.stability+p.stab);
  if(p.gold)S.treasury+=p.gold;
  if(p.dev)p.dev>0?raiseDevelopment(S,p.dev):lowerDevelopment(S,-p.dev);
  if(p.arms)S.military=clamp(S.military+p.arms);
  if(p.know)S.knowledge=Math.round((S.knowledge+p.know)*10)/10;
  if(p.legit)S.legitPen=Math.max(0,(S.legitPen||0)-p.legit);
  if(p.legitPen)S.legitPen=(S.legitPen||0)+p.legitPen;
  if(b.effect)b.effect(S);
  S.billsPassed=S.billsPassed||[]; S.billsPassed.push(b.id);
}
function billChips(S,b){
  const p=b.pass||{}; const out=[];
  for(const k in (p.fac||{})) if(S.facs[k])out.push([p.fac[k]>0?"fac up":"fac down",`${S.facs[k].name} ${p.fac[k]>0?"+":""}${p.fac[k]}`]);
  if(p.stab)out.push([p.stab>0?"up":"down",`${p.stab>0?"+":""}${p.stab} Stability`]);
  if(p.gold)out.push([p.gold>0?"up":"down",`${p.gold>0?"+":""}${p.gold} gold`]);
  if(p.dev)out.push([p.dev>0?"up":"down",`${p.dev>0?"+":""}${p.dev} development`]);
  if(p.arms)out.push([p.arms>0?"up":"down",`${p.arms>0?"+":""}${p.arms} Arms`]);
  if(p.legit)out.push(["up",`legitimacy +${p.legit}`]);
  if(p.legitPen)out.push(["down",`legitimacy −${p.legitPen}`]);
  return out;
}
