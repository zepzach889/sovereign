"use strict";
/* =====================================================================
   REVOLT (order collapse — no game over)
   ===================================================================== */
const REVOLT={ id:"revolt",title:"The Realm Rises",freq:3,
  text:S=>`Order has broken. The mob holds the capital and the provinces send no taxes. The great houses arrive at the palace with a demand dressed as a rescue: share your power, or lose it.`,
  choices:[
    {label:"Bow to the storm — concede power",rf:true,cost:{stability:+30},fac:{aristocracy:+6,peasantry:+4},
      effect:S=>{ if(!S.gov.institutions.length){ S._forcedChamber={power:26}; }
        else { transferPower(S,S.gov.institutions[0],10); } },
      chron:S=>`the Crown bowed to the great rising and conceded power; the throne was kept by making it smaller.`,
      out:S=>"You concede. The barricades come down as the criers announce it. You have kept the crown by shrinking it."},
    {label:"Crush the rising with every soldier you have",cost:{gold:-14},
      resolve:S=>{ leanOnArmy(S,3);
        if(S.military>=50)return{cost:{stability:+26,arms:-10},fac:{provinces:-12,officers:+4,peasantry:-10},chron:S=>`the Crown drowned the great rising in blood and kept its power entire; ${S.nation} fell silent, and afraid.`,out:"The army holds. The price is written in the parish registers. You are still absolute — and feared as never before."};
        if(!S.gov.institutions.length){ S._forcedChamber={power:26}; } else { transferPower(S,S.gov.institutions[0],10); }
        return{cost:{stability:+10,arms:-16},fac:{provinces:-8,officers:-6,aristocracy:-6},chron:S=>`the Crown tried to crush the great rising and could not; it kept its throne only by surrendering power.`,out:"Your soldiers are too few. You keep the crown only by conceding what you fought to avoid."};}},
  ]};

/* ---------- rupture machinery ---------- */
function forceChamber(S,power){
  const nm=(typeof culture==="function"?culture(S).inst[0]:"The Estates");
  const inst={id:"ch"+S.gov.institutions.length,name:nm,composition:"nobility",
    power:0,rights:["tax","consent"]};
  S.gov.institutions.push(inst);
  transferPower(S,inst,Math.min(power,S.gov.crown.power));
  S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${nm} was called into being — not by the Crown's grace but by its creditors.`});
}
/* the aristocratic reaction: reforms rolled back, and a more agreeable head found */
function doReaction(S){
  S._reactYears=0;
  /* power drains back to the throne */
  S.gov.institutions.forEach(inst=>{ powerToCrown(S,inst,Math.ceil(inst.power*0.6)); });
  S.gov.institutions=S.gov.institutions.filter(i=>i.power>0);
  if(S.pm){ S.pm=null; S._minority=false; }
  S.reforms=(S.reforms||[]).slice(0,Math.max(0,Math.ceil((S.reforms||[]).length*0.4)));
  S.facs.aristocracy.strength=clamp(S.facs.aristocracy.strength+8);
  S.legitPen=(S.legitPen||0)+8;
  /* a pliable member of the existing house if one can be found; a new house if not */
  const kin=pliableKin(S);
  if(kin){
    S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the great houses set aside the sovereign and raised ${kin.name} of the same blood in their place — a crowned signature for the restored order.`});
    crownPerson(kin,S.house,true);
  } else {
    const hs=(typeof housePool==="function"?housePool():["Vael"]).filter(h=>h!==S.house);
    const nh=pick(hs.length?hs:["Vael"]);
    const g=chance(0.7)?"m":"f";
    S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, with no acceptable heir of the old blood, the great houses gave the crown to the House of ${nh}.`});
    crownPerson({id:PID++,name:nameFor(g,usedNames(S)),gender:g,age:26+rand(22)},nh,true);
  }
  refreshRelations(S);
}
