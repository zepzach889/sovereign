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
    enact:(S,power,name)=>{ S.gov.cabinet=name; S.development=clamp(S.development+5); S.facs.merchants.mood=clamp(S.facs.merchants.mood+4);
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
    available:S=>!S.pm&&S.gov.institutions.length>0&&S.gov.crown.power>=6,
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
    blurb:"Extend the vote beyond the propertied few. The chamber of the commons comes to speak for the whole country — and the whole country starts to matter.",
    nameSuggest:["The Reform Act","The Great Enfranchisement","Act of the Common Voice"],
    available:S=>!!S.pm&&S.gov.institutions.some(i=>i.composition==="commons")&&!S.reforms.includes("franchise"),
    enact:(S,power,name)=>{ const inst=S.gov.institutions.find(i=>i.composition==="commons"); inst.composition="broad";
      S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+8); S.facs.provinces.strength=clamp(S.facs.provinces.strength+6);
      S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+8); S.facs.provinces.mood=clamp(S.facs.provinces.mood+6); S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-6);
      S.reforms.push("franchise");
      return `the ${name} broadened the franchise, and the ${inst.name} came to speak for the country entire.`; }},
];
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
