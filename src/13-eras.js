"use strict";
/* ================= ERAS, ADVANCES, WORKS ================= */
const ERAS=[
  {id:"dynastic",name:"Dynastic",cost:30,
   blurb:"The realm you inherit: oaths, faith, and personal rule."},
  {id:"sail",name:"Sail & Coin",cost:60,
   blurb:"Money begins to arrive from outside the realm."},
  {id:"powder",name:"Powder & Fortress",cost:105,
   blurb:"War stops being something noblemen do on horseback."},
  {id:"paper",name:"Paper & Office",cost:155,
   blurb:"The state learns to see what it governs."},
  {id:"reason",name:"Reason",cost:235,
   blurb:"Ideas become a political force in their own right."},
  {id:"steam",name:"Steam",cost:340,
   blurb:"Engines, canals and the first works that never sleep."},
  {id:"rail",name:"Rail & Mill",cost:470,
   blurb:"Iron, smoke, and a new estate that did not exist a lifetime ago."},
  {id:"masses",name:"The Masses",cost:620,
   blurb:"Literacy, organization, and a public that will no longer be governed at."}
];
function eraIdx(S){ return S.eraIdx||0; }
function eraDef(S){ return ERAS[eraIdx(S)]||ERAS[ERAS.length-1]; }

const ADVANCES=[
  // ---- I Dynastic ----
  {id:"chancery",era:0,found:true,name:"The Chancery",dom:"fiscal",
   blurb:"A writing office of seals and rolls. The crown can at last record what it owns — and tax it as it truly is, not as it is guessed to be.",
   fac:{clergy:+5},effect:S=>{S._know.admin=(S._know.admin||0)+0.35;S.development=clamp(S.development+4);},
   gives:"Taxation scales properly with development · knowledge income up · begins the line of offices"},
  {id:"kings_peace",era:0,found:true,name:"The King's Peace",dom:"civil",
   blurb:"Royal justice riding circuit over the courts of barons. Where the crown's judges reach, the crown is real.",
   fac:{aristocracy:-6,peasantry:+7},effect:S=>{S.stability=clamp(S.stability+6);},
   gives:"Unlocks the assize (order line) · stability +6 · unrest events soften"},
  {id:"sworn_host",era:0,name:"The Sworn Host",dom:"martial",
   blurb:"The levy formalized by oath and muster roll. Men who once answered their lord now answer a list.",
   fac:{officers:+6,aristocracy:-2},effect:S=>{S.military=clamp(S.military+6);},
   gives:"Levies cost less · officers begin to exist as an interest apart from the nobility"},
  {id:"town_charters",era:0,name:"Charter of the Towns",dom:"fiscal",
   blurb:"Market rights sold to towns for ready cash. A small sum now; a new power in the realm forever.",
   fac:{merchants:+10,aristocracy:-5},effect:S=>{S.development=clamp(S.development+6);S.facs.merchants.strength=clamp(S.facs.merchants.strength+8);},
   gives:"Income up · merchants strengthen markedly · quietly the most consequential act of the age"},
  {id:"great_rite",era:0,name:"The Great Rite",dom:"faith",
   blurb:"A coronation liturgy codified, rehearsed, and made unforgettable. Crowns worn in ceremony are harder to take.",
   fac:{clergy:+7},effect:S=>{S.legitPen=Math.max(0,(S.legitPen||0)-6);S._succEase=(S._succEase||0)+3;},
   gives:"Legitimacy + · every future succession costs less legitimacy, permanently"},
  // ---- II Sail & Coin ----
  {id:"deep_hull",era:1,found:true,name:"The Deep-Water Hull",dom:"fiscal",
   blurb:"Ships built for ocean rather than coast. The world stops ending at the horizon.",
   fac:{merchants:+7,provinces:+5},effect:S=>{S.development=clamp(S.development+5);},
   gives:"Unlocks overseas ventures · development up · new event pool opens"},
  {id:"company",era:1,found:true,name:"The Chartered Company",dom:"fiscal",
   blurb:"A monopoly with its own fleet, its own soldiers, and its own opinions. It will make you rich without your having to ask anyone for money.",
   fac:{merchants:+12,peasantry:-3},effect:S=>{S._companyGold=8;},
   gives:"Large standing income that does NOT come from taxes · the Company becomes a power that lobbies you"},
  {id:"bourse",era:1,name:"The Bourse",dom:"fiscal",
   blurb:"Bills, banks and public credit. The crown may now spend what it does not have, at a price it will one day notice.",
   fac:{merchants:+8},effect:S=>{S._creditBonus=(S._creditBonus||0)+60;},
   gives:"Debt ceiling rises sharply · borrowing cheaper"},
  {id:"foundry",era:1,name:"The Cannon Foundry",dom:"martial",
   blurb:"Siege and naval artillery, cast in the crown's own works. Walls that stood three hundred years become architecture.",
   fac:{officers:+5,aristocracy:-8},effect:S=>{S.military=clamp(S.military+8);},
   gives:"Arms + · the aristocracy's fortified independence ends"},
  {id:"new_crops",era:1,name:"The New Crops",dom:"civil",
   blurb:"Plants carried home from far coasts, grown in poor soil, feeding people who did not eat last winter.",
   fac:{peasantry:+8,provinces:+4},effect:S=>{S.development=clamp(S.development+8);S._famineEase=true;},
   gives:"Development and population up · famine events soften permanently"},
  // ---- III Powder & Fortress ----
  {id:"drilled_ranks",era:2,found:true,name:"The Drilled Ranks",dom:"martial",
   blurb:"Paid, permanent, drilled infantry who manoeuvre as one body. War becomes a profession and a budget line.",
   fac:{officers:+12,aristocracy:-10},effect:S=>{S.military=clamp(S.military+12);S._armyUpkeep=(S._armyUpkeep||0)+6;},
   gives:"The host line becomes a standing army · officers become a full estate · upkeep rises permanently"},
  {id:"bastion",era:2,found:true,name:"The Bastion Trace",dom:"martial",
   blurb:"Low angled walls that cannon cannot break, built at a cost that breaks treasuries instead. This is how crowns learn to bargain.",
   fac:{officers:+6,merchants:-4},effect:S=>{S.military=clamp(S.military+10);S._armyUpkeep=(S._armyUpkeep||0)+8;},
   gives:"Great defensive strength · ruinous standing cost · invasion events blunted"},
  {id:"mil_chest",era:2,name:"The Military Chest",dom:"fiscal",
   blurb:"War finance on contract: arrears settled, suppliers paid, regiments fed by ledger rather than plunder.",
   fac:{merchants:+6,officers:+4},effect:S=>{S._armyUpkeep=Math.max(0,(S._armyUpkeep||0)-6);},
   gives:"Arms upkeep falls · merchants profit from lending to you"},
  {id:"press",era:2,name:"The Printing Press",dom:"civil",
   blurb:"The word set in metal and multiplied. What the crown proclaims travels further — and so does everything else.",
   fac:{clergy:+5,merchants:+4},effect:S=>{S._know.press=(S._know.press||0)+1.0;S._pressOn=true;},
   gives:"Knowledge income up sharply · the word line becomes print · dissent gains reach it never had"},
  {id:"colours",era:2,name:"The Regimental Colours",dom:"martial",
   blurb:"Standing regiments with names, histories and colours they will not see disgraced.",
   fac:{officers:+9},effect:S=>{S.stability=clamp(S.stability+5);},
   gives:"Officer loyalty + · stability + · a rising must now persuade units with traditions"},
  // ---- IV Paper & Office ----
  {id:"census",era:3,found:true,name:"The Census",dom:"fiscal",
   blurb:"Every hearth counted, every field measured. A realm that can be counted can be governed — and billed.",
   fac:{provinces:+6,peasantry:-3},effect:S=>{S._know.admin=(S._know.admin||0)+0.6;S._taxBonus=(S._taxBonus||0)+0.15;},
   gives:"Tax income scales with development properly · knowledge income up"},
  {id:"salaried",era:3,found:true,name:"The Salaried Office",dom:"civil",
   blurb:"Offices examined for and paid a wage, replacing offices bought and farmed. Competence becomes cheaper than patronage.",
   fac:{aristocracy:-12,merchants:+6},effect:S=>{S._costMod=(S._costMod||1)*0.85;S._armyUpkeep=(S._armyUpkeep||0)+4;S.stability=clamp(S.stability+5);},
   gives:"All action costs −15% · standing upkeep up · the aristocracy loses its sinecures"},
  {id:"post_roads",era:3,name:"The Post Roads",dom:"civil",
   blurb:"Metalled roads and relay riders. Orders arrive in days; so does news you would rather have heard sooner.",
   fac:{merchants:+6,provinces:+8},effect:S=>{S.development=clamp(S.development+7);},
   gives:"The works line advances · unrest answered faster · development up"},
  {id:"funded_debt",era:3,name:"The Funded Debt",dom:"fiscal",
   blurb:"A national debt with a bank behind it and a parliament, or a promise, to service it. Enormous power, permanently mortgaged.",
   fac:{merchants:+12},effect:S=>{S._creditBonus=(S._creditBonus||0)+120;S._defaultSevere=true;},
   gives:"Credit expands enormously · a default becomes catastrophic rather than merely painful"},
  {id:"statute",era:3,name:"The Statute Book",dom:"civil",
   blurb:"Law written down, indexed, and applied the same way twice. Even to you.",
   fac:{clergy:+3,merchants:+5,peasantry:+4},effect:S=>{S.legitPen=Math.max(0,(S.legitPen||0)-8);S._consentEase=true;},
   gives:"Legitimacy + · consent easier to win · the courts become a check you cannot simply overrule"},
  // ---- V Reason ----
  {id:"method",era:4,found:true,name:"The Experimental Method",dom:"civil",
   blurb:"Inquiry made repeatable, published, and argued over by strangers. The single most dangerous idea yet funded by a crown.",
   fac:{clergy:-5,merchants:+5},effect:S=>{S._know.mult=(S._know.mult||1)*1.6;},
   gives:"Knowledge income multiplied · nothing in the later ages is reachable without it"},
  {id:"rights",era:4,found:true,name:"The Rights of Subjects",dom:"civil",
   blurb:"A declaration that the crown is bounded — by law, by custom, by something other than its own restraint.",
   fac:{peasantry:+8,merchants:+8,aristocracy:-6},effect:S=>{S.legitPen=Math.max(0,(S.legitPen||0)-10);S._reformPressure=(S._reformPressure||0)+2;S.facs.reformers.present=true;S.facs.reformers.strength=clamp(S.facs.reformers.strength+22);},
   gives:"Legitimacy + · THE REFORMERS WAKE · reform pressure permanently raised"},
  {id:"inoculation",era:4,name:"Inoculation",dom:"civil",
   blurb:"A practice borrowed from abroad, resisted from every pulpit, and quietly saving the children of everyone who adopts it.",
   fac:{clergy:-7,peasantry:+7},effect:S=>{S._mortalityEase=(S._mortalityEase||0)+0.35;S.development=clamp(S.development+5);},
   gives:"Mortality falls for all · royal children survive — your dynasty changes shape"},
  {id:"gazette",era:4,name:"The Gazette",dom:"civil",
   blurb:"Newspapers proper: opinion printed weekly, read aloud in coffee houses, and impossible to answer with a proclamation.",
   fac:{merchants:+6,peasantry:+5,aristocracy:-4},effect:S=>{S._know.press=(S._know.press||0)+0.9;S._opinionOn=true;},
   gives:"The word line advances again · public opinion becomes something to manage, not announce at"},
  {id:"enlightened",era:4,name:"The Enlightened Court",dom:"faith",
   blurb:"Philosophers pensioned, correspondence maintained across hostile borders, and a court that other courts wish to be seen agreeing with.",
   fac:{aristocracy:+7,clergy:-4},effect:S=>{S._advDiscount=(S._advDiscount||1)*0.88;S.stability=clamp(S.stability+4);},
   gives:"Prestige + · every future advance costs less"}
];


/* ---- VI Steam · VII Rail & Mill · VIII The Masses ---- */
const LATE_ADVANCES=[
  {id:"engine",era:5,found:true,name:"The Engine",dom:"fiscal",
   blurb:"A machine that turns coal into work — tirelessly, in any weather, wherever you care to put it. Everything after this is a consequence of it.",
   fac:{merchants:+10,aristocracy:-5},
   effect:S=>{S.development=clamp(S.development+10);S._know.admin=(S._know.admin||0)+0.6;S._upkeepAge=(S._upkeepAge||0)+3;},
   gives:"Development leaps · knowledge up · nothing in the later ages is reachable without it"},
  {id:"canals",era:5,found:true,name:"The Canal Network",dom:"civil",
   blurb:"Water carried uphill by lock and lift, and coal carried anywhere at a tenth of what it cost to cart.",
   fac:{merchants:+8,provinces:+8},
   effect:S=>{S.development=clamp(S.development+8);provinces(S).forEach(p=>{p.loyalty=clamp(p.loyalty+5);});S._upkeepAge=(S._upkeepAge||0)+2;},
   gives:"Development and provincial loyalty rise · the country binds together · locks must be maintained"},
  {id:"manufactory",era:5,name:"The Manufactory",dom:"fiscal",
   blurb:"Work gathered under one roof, one clock and one man's eye. The village workshop cannot compete and will not survive.",
   fac:{merchants:+12,peasantry:-9},
   effect:S=>{S.development=clamp(S.development+7);if(S.facs.workers)S.facs.workers.strength=clamp(S.facs.workers.strength+14);},
   gives:"Development up · merchants gain heavily · labour begins to gather where it can be counted"},
  {id:"joint_stock",era:5,name:"The Joint-Stock Act",dom:"fiscal",
   blurb:"Ownership divided into shares that strangers may buy, so that undertakings larger than any one fortune become possible.",
   fac:{merchants:+10},effect:S=>{S._creditBonus=(S._creditBonus||0)+140;},
   gives:"Credit expands enormously · great works become financeable"},
  {id:"loom",era:5,name:"The Mechanical Loom",dom:"fiscal",
   blurb:"Cloth made faster than hands can manage, by machines that need not be persuaded, fed, or paid what a weaver was.",
   fac:{merchants:+9,peasantry:-12},
   effect:S=>{S.development=clamp(S.development+6);bumpPressure(S,"radical",12);},
   gives:"Development up · the trades that fed whole districts end · expect riots"},

  {id:"furnace",era:6,found:true,name:"The Furnace Works",dom:"fiscal",
   blurb:"Iron in quantities no age has seen, made in towns that did not exist twenty years ago, by people who have nothing to sell but the day.",
   fac:{merchants:+10,aristocracy:-12},
   effect:S=>{S.development=clamp(S.development+12);S._upkeepAge=(S._upkeepAge||0)+4;
     if(S.facs.workers){S.facs.workers.present=true;
       S.facs.workers.strength=clamp(Math.max(S.facs.workers.strength,40)+15);
       S.facs.workers.mood=clamp(S.facs.workers.mood-10);}},
   gives:"THE WORKERS WAKE as an estate · development leaps · the aristocracy's weight falls sharply"},
  {id:"trunkline",era:6,found:true,name:"The Trunk Line",dom:"civil",
   blurb:"Rails from the capital to the border, and a realm that can be crossed in a day rather than a fortnight.",
   fac:{merchants:+8,provinces:+10,officers:+6},
   effect:S=>{S.development=clamp(S.development+9);provinces(S).forEach(p=>{p.loyalty=clamp(p.loyalty+8);});S._upkeepAge=(S._upkeepAge||0)+5;},
   gives:"Provinces bind to the capital · armies move · unrest answered in days · the permanent way is never cheap"},
  {id:"levee",era:6,name:"The Levée en Masse",dom:"martial",
   blurb:"Not an army the crown pays for but an army the nation supplies — which means the nation must be willing.",
   fac:{officers:+9,peasantry:-7},
   effect:S=>{S.military=clamp(S.military+16);S._armyUpkeep=Math.max(0,(S._armyUpkeep||0)-3);bumpPressure(S,"radical",8);},
   gives:"Arms rise sharply and cost less gold · but war now needs the consent of those who fight it"},
  {id:"telegraph",era:6,name:"The Telegraph",dom:"civil",
   blurb:"News from the frontier in minutes. The government hears everything — and within a week, so does everyone else.",
   fac:{merchants:+6,provinces:+5},
   effect:S=>{S._know.admin=(S._know.admin||0)+0.7;S._opinionOn=true;S.stability=clamp(S.stability+5);},
   gives:"Unrest caught early · knowledge up · dissent travels just as fast"},
  {id:"schools",era:6,name:"The Public Schools",dom:"civil",
   blurb:"Every child taught letters at the state's charge — an investment that returns in thirty years and cannot be recalled.",
   fac:{peasantry:+8,clergy:-6},
   effect:S=>{S._know.press=(S._know.press||0)+1.6;S._upkeepAge=(S._upkeepAge||0)+4;
     S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+10);
     if(S.facs.reformers){S.facs.reformers.present=true;S.facs.reformers.strength=clamp(S.facs.reformers.strength+12);}},
   gives:"Knowledge leaps · the common estates gain weight · a literate country is a different country"},
  {id:"aerial",era:6,name:"The Aerial Fleet",dom:"martial",
   blurb:"Airships. Ruinously expensive, magnificently useless in bad weather, and utterly terrifying to anyone who has not got them.",
   fac:{officers:+8,merchants:-6},
   effect:S=>{S.military=clamp(S.military+10);S._armyUpkeep=(S._armyUpkeep||0)+5;S._aerial=true;},
   gives:"Arms and prestige rise · heavy standing cost · the realm's path diverges from the ordinary one"},

  {id:"franchise_mass",era:7,found:true,name:"The Mass Franchise",dom:"civil",
   blurb:"The vote given to men who own nothing, on the theory that they live here too. It is the last argument the old order loses.",
   fac:{peasantry:+12,workers:+12,aristocracy:-12},
   effect:S=>{S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+12);
     if(S.facs.workers)S.facs.workers.strength=clamp(S.facs.workers.strength+12);
     S.legitPen=Math.max(0,(S.legitPen||0)-12);bumpPressure(S,"constitutional",16);},
   gives:"The common estates become the electorate · legitimacy improves · absolutism becomes untenable"},
  {id:"combinations",era:7,found:true,name:"The Combinations Act",dom:"civil",
   blurb:"Working men permitted to organize, bargain and withhold their labour — legalized because the alternative had become worse.",
   fac:{workers:+16,merchants:-10},
   effect:S=>{if(S.facs.workers){S.facs.workers.present=true;S.facs.workers.strength=clamp(S.facs.workers.strength+16);}
     S.civil=S.civil||{};S.civil.unions=clamp((S.civil.unions||45)+18);},
   gives:"Labour becomes an organized power · strikes replace riots"},
  {id:"penny_press",era:7,name:"The Penny Press",dom:"civil",
   blurb:"A newspaper a working man can afford, printed in the hundreds of thousands, and read aloud to those who still cannot.",
   fac:{merchants:+6,peasantry:+7,aristocracy:-6},
   effect:S=>{S._know.press=(S._know.press||0)+1.2;S._opinionOn=true;
     S.civil=S.civil||{};S.civil.press=clamp((S.civil.press||50)+12);bumpPressure(S,"constitutional",8);},
   gives:"Public opinion becomes a daily fact · nothing can be done quietly again"},
  {id:"sanitary",era:7,name:"The Sanitary Board",dom:"civil",
   blurb:"Sewers, clean water and an inspectorate. Unglamorous, unloved, and it will save more lives than every physician in the realm.",
   fac:{peasantry:+10,merchants:-4},
   effect:S=>{S._mortalityEase=(S._mortalityEase||0)+0.3;S.development=clamp(S.development+8);S.stability=clamp(S.stability+6);S._upkeepAge=(S._upkeepAge||0)+5;},
   gives:"Mortality falls · development and stability rise · the cities stop killing their own people"},
  {id:"party_machine",era:7,name:"The Party Machine",dom:"crown",
   blurb:"Organization: agents in every ward, a list of every voter, and a favour remembered on polling day.",
   fac:{aristocracy:-5},
   effect:S=>{S._machine=true;S.stability=clamp(S.stability+5);S.legitPen=(S.legitPen||0)+4;},
   gives:"Elections become manageable · stability up · legitimacy quietly compromised"}
];
ADVANCES.push.apply(ADVANCES,LATE_ADVANCES);

const WORKS=[
  {id:"scriptorium",era:0,name:"The Scriptorium",gold:10,know:0.3,fac:{clergy:+4},
   blurb:"A room of copyists in the abbey, paid by the crown. Slow, beautiful, and the only memory the realm has."},
  {id:"cathedral_school",era:0,name:"The Cathedral School",gold:18,know:0.6,fac:{clergy:+6},
   blurb:"Boys taught letters and law beside the cathedral. Half will serve God; the useful half will serve you."},
  {id:"counting_house",era:1,name:"The Counting House",gold:24,know:0.75,fac:{merchants:+6},
   blurb:"Clerks, ledgers and the arithmetic of empire, kept under one roof at the crown's expense."},
  {id:"curiosities",era:1,name:"The Cabinet of Curiosities",gold:22,know:0.65,fac:{aristocracy:+5},
   blurb:"Shells, bones and impossible animals from far coasts, arranged for visitors who matter."},
  {id:"printing_house",era:2,name:"The Printing House",gold:34,know:1.6,fac:{merchants:+5,clergy:-3},
   blurb:"Presses under royal licence. The first true jump in what the realm can know — and say."},
  {id:"university",era:3,name:"The University",gold:58,know:3.0,fac:{clergy:+4,merchants:+5},
   blurb:"A charter, a quadrangle, and several hundred young men with opinions. It will repay you tenfold and bill you in ways you cannot yet imagine.",
   effect:S=>{S.facs.reformers.strength=clamp(S.facs.reformers.strength+10);}},
  {id:"archive",era:3,name:"The Public Archive",gold:38,know:1.15,fac:{provinces:+4},
   blurb:"Every writ, roll and judgement kept where it can be found again."},
  {id:"observatory",era:4,name:"The Observatory",gold:50,know:1.8,fac:{aristocracy:+4},
   blurb:"Instruments, a dome, and a salaried astronomer who will make your realm famous among people who matter to nobody."},
  {id:"botanical",era:4,name:"The Botanical Garden",gold:44,know:1.45,fac:{merchants:+4,peasantry:+3},
   blurb:"Living specimens from every coast your ships have touched, catalogued and cross-bred."},
  {id:"polytechnic",era:5,name:"The Polytechnic",gold:66,know:2.4,fac:{merchants:+6},
   blurb:"Engineers taught engineering rather than Latin. The men who will build the next age are in this building now."},
  {id:"mechanics",era:6,name:"The Mechanics' Institute",gold:54,know:2.0,fac:{merchants:+4},
   blurb:"Evening classes for working men, funded by employers who have not entirely thought it through.",
   effect:S=>{if(S.facs.workers)S.facs.workers.strength=clamp(S.facs.workers.strength+6);}},
  {id:"board_school",era:7,name:"The Board Schools",gold:72,know:3.2,fac:{peasantry:+7,clergy:-4},
   blurb:"Elementary education, compulsory and free, in every parish that will take a building."}
];

function ownsAdv(S,id){ return (S.advances||[]).includes(id); }
function workCount(S,id){ return (S.workCount&&S.workCount[id])||0; }
function ownsWork(S,id){ return workCount(S,id)>0; }
function workMax(w){ return w.max||3; }
/* each further foundation costs more and yields less — the third university
   is a fine thing, but it is not the first university */
function workGold(S,w){ return Math.round(w.gold*(1+0.65*workCount(S,w.id))); }
function workYield(w,n){ const step=[1,0.6,0.38,0.25]; return w.know*(step[n]||0.2); }
function worksKnowledge(S){
  let k=0;
  WORKS.forEach(w=>{ const n=workCount(S,w.id); for(let i=0;i<n;i++) k+=workYield(w,i); });
  return k;
}
function advCost(S,a){
  const base=ERAS[a.era]?ERAS[a.era].cost:200;
  const era=eraIdx(S);
  let m=1;
  if(a.era>era) m=2.2;               // reaching past your age is expensive
  m*=(S._advDiscount||1);
  return Math.max(4,Math.round(base*m));
}
function knowledgeIncome(S){
  const k=S._know||{};
  let per = 0.30 + S.development*0.030 + (k.admin||0) + (k.press||0);
  per+=worksKnowledge(S);
  if(S.monarch&&S.monarch.trait==="curious") per*=1.22;
  if(S.stability<35) per*=0.75;
  if(S.regency) per*=0.85;
  per*=(k.mult||1);
  per*=(1+((S.advances||[]).length*0.028));
  return per;
}
function availableAdvances(S){
  const era=eraIdx(S);
  return ADVANCES.filter(a=>!ownsAdv(S,a.id)&&a.era<=era+1);
}
function availableWorks(S){
  const era=eraIdx(S);
  return WORKS.filter(w=>w.era<=era&&workCount(S,w.id)<workMax(w));
}
function foundationsHeld(S,era){
  return ADVANCES.filter(a=>a.era===era&&a.found&&ownsAdv(S,a.id)).length;
}
function checkEraAdvance(S){
  const era=eraIdx(S);
  if(era>=ERAS.length-1) return false;
  if(foundationsHeld(S,era)<2) return false;
  S.eraIdx=era+1; S.era=ERAS[S.eraIdx].name;
  const behind=S.year-(1614+S.eraIdx*95);
  S.chronicle.push({year:S.year,cls:"mstone",
    text:`In ${S.year}, ${S.nation} passed into its ${ERAS[S.eraIdx].name} age${behind<-25?" — a lifetime ahead of the world beyond its borders":behind>60?", long after its neighbours had done the same":""}. ${ERAS[S.eraIdx].blurb}`});
  S.notices.push(`The realm has entered the age of ${ERAS[S.eraIdx].name}. The court's business is not what it was.`);
  try{
    const now=availableActions(S).map(a=>a.id);
    const prev=S._prevActs||[];
    const renamed=now.filter(id=>ACT_EVO[id]&&Object.keys(ACT_EVO[id]).map(Number).includes(S.eraIdx));
    /* on the very first crossing the previous list is empty — don't tag the
       whole toolbox as new, only what genuinely arrived or changed its name */
    S._newActs=prev.length?now.filter(id=>!prev.includes(id)).concat(renamed):renamed;
    S._prevActs=now;
  }catch(e){}
  return true;
}

/* ---------- dynastic beats ---------- */
function dynasticBeat(){
  const m=S.monarch;
  if(S.regency&&!S.regency.personId&&S.monarch.age<=12&&chance(S.regency.hostile?0.16:0.07)) return {kind:"regent_coup"};
  if(S.regency&&chance(0.35)) return {kind:"regent"};
  const spAlive=spouseOf(S);
  const succNeeds=!heirOf(S)||m.age<35;
  /* marriages are no longer sprung on the player — every match is chosen in
     the dynastic court, where the suitors are named. */
  const single=S.family.filter(p=>(p.rel==="child"||p.rel==="sibling"||(S.regency&&p.rel==="uncle"))&&p.alive&&p.age>=17&&p.age<=45&&!p.spouseId);
  if(S.rival){ const rv=S.family.find(p=>p.id===S.rival.id&&p.alive);
    if(rv&&chance(Math.min(0.5,0.2+(50-S.stability)*0.006))) return {kind:"banners",rival:rv}; }

  // heir designation reminders / adoption when childless & aging
  const kids=S.family.filter(p=>p.rel==="child"&&p.alive);
  if(S.law!=="elective"&&!kids.length&&!S.designated&&m.age>=40) return {kind:"childless"};
  // sibling ambition: an adult male sibling under agnatic/malepref w/ no sons, or any strong sibling when stability low
  const sibs=S.family.filter(p=>p.rel==="sibling"&&p.alive&&p.age>=18&&!p.exiled&&!p.placated);
  if(!S.rival&&sibs.length&&chance(0.3)){
    const threatened=(S.law!=="elective")&&(!heirOf(S)||S.stability<35);
    if(threatened) return {kind:"ambition",sib:pick(sibs)};
  }
  // heir comes of age (flavor + optional designation confirmation)
  const h=heirOf(S);
  if(h&&h.age>=16&&!h._noted){ h._noted=true; return {kind:"ofage",heir:h}; }
  return null;
}
