"use strict";
/* =====================================================================
   STATE
   ===================================================================== */
let S=null;
let PID=1;

function makePerson(S,rel,gender,age,name,parents){
  return { id:PID++, rel, gender:gender||(chance(0.5)?"m":"f"), age:age!=null?age:0,
    name:name||nameFor(gender||"m",usedNames(S)), alive:true,
    parents:parents||null, spouseId:null, born:(S?S.year-(age||0):0), trait:rollTrait(), job:null };
}
const TRAITS={
  shrewd:{name:"Shrewd",hint:"quick with a ledger",desc:"all acts of state cost less"},
  martial:{name:"Martial",hint:"happiest on a horse",desc:"the army holds its strength; officers warm"},
  pious:{name:"Pious",hint:"much at prayer",desc:"the church is content; legitimacy steadies"},
  curious:{name:"Curious",hint:"forever asking why",desc:"the realm learns faster under them"},
  frail:{name:"Frail",hint:"a sickly child",desc:"they will not be long-lived"},
  cruel:{name:"Cruel",hint:"unkind to servants",desc:"feared, obeyed, and quietly hated"},
  beloved:{name:"Beloved",hint:"the people's favourite",desc:"stability and legitimacy both lift"}
};
const TRAIT_KEYS=Object.keys(TRAITS);
function rollTrait(){ return chance(0.72)?pick(TRAIT_KEYS):null; }
function traitShown(p){
  if(!p||!p.trait)return null;
  if(p.age>=16)return {sure:true,text:TRAITS[p.trait].name};
  if(p.age>=8)return {sure:false,text:TRAITS[p.trait].hint};
  return null;
}
function traitMortality(p,base){ return p&&p.trait==="frail"?base*1.85:base; }
function personById(S,id){ if(S.monarch&&S.monarch.id===id)return S.monarch; return S.family.find(p=>p.id===id)||null; }

function newGame(cfg){
  const startYear=1600+rand(30);
  S={ nation:cfg.nation, startYear, year:startYear, turn:1, era:"Dynastic", culture:cfg.culture||"anglo",
    stability:50, military:36, development:18,
    treasury:50, debt:0, taxRate:"moderate", privileges:0,
    facs:newFactions(),
    gov:{ crown:{titleBase:cfg.title, selection:"hereditary", power:100}, institutions:[], cabinet:null, charter:null },
    law:cfg.law, designated:null,
    house:cfg.house, monarch:null, family:[], lineage:[], foundingTitle:cfg.title,
    customTitles:{republic:(cfg.custom&&cfg.custom.republic)||"",junta:(cfg.custom&&cfg.custom.junta)||"",people:(cfg.custom&&cfg.custom.people)||""},
    regency:null, rival:null, married:false,
    reforms:[], cooldowns:{}, eventLast:{}, seenMilestones:[],
    legitPen:0, notices:[], pm:null, nextElection:0, _elections:0,
    /* the constitutional machinery */
    electionEvery:2,           /* turns between elections once there is a cycle */
    devQuiet:!!cfg.devQuiet,   /* the long-reign toggle: weather without storms */
    _seat:"crown", _prerogSpent:{}, _unsummoned:0, _pmRefusals:0, _seatShift:null,
    ui:{chronOpen:false}, _usedCands:[], ancestors:[],
    regime:"monarchy", junta:null, exiles:null, pressure:{}, _militaryLeaned:0, eraIdx:0, knowledge:0, advances:[], works:[], workCount:{}, provinces:[], lostProvinces:[], _know:{}, _advDiscount:1, _newActs:[], _prevActs:[],
    _successions:0,_sameHouseSucc:0,_houseBreaks:0,_regenciesEnded:0,_femaleReigns:0,_reforms:0,_events:0,
    chronicle:[], phase:"court", phaseDone:{event:false,court:false,advance:false,dynastic:false},
    tab:"govern", currentEvent:null, result:null, pending:null, openReform:null, _reformPower:null,_reformLaw:null,
    dyn:null, // pending dynastic beat
  };
  const g=chance(0.5)?"m":"f";
  S.monarch={ id:PID++, name:nameFor(g,new Set()), gender:g, age:30+rand(10), regnal:1, house:cfg.house, parents:null, spouseId:null, trait:rollTrait() };
  S.monarch.born=S.year-S.monarch.age; S.monarch.reignStart=S.year;
  /* the founding generation needs recorded parents, or a derived family
     graph reads the founder's own brothers and sisters as strangers */
  S.provinces=newProvinces(S);
  if(S.devQuiet)S.chronicle.push({year:S.year,text:`In ${S.year}, the chroniclers of ${S.nation} recorded a realm in which no government ever fell — a long reign, kept for the study of it.`});
  const oldKing=PID++, oldQueen=PID++;
  S.monarch.parents=[oldKing,oldQueen];
  // a sibling or two of the founder
  const sibCount=rand(3);
  for(let i=0;i<sibCount;i++){
    let sg=chance(0.5)?"m":"f";
    if((cfg.law==="agnatic"||cfg.law==="malepref")&&S.monarch.gender==="f") sg="f"; // a living brother would outrank her under this law
    const sage=S.monarch.age-1-rand(10); // founder's siblings are always younger than the founder
    S.family.push(makePerson(S,"sibling",sg,sage,null,[oldKing,oldQueen]));
  }
  S.deathRolled=false;
  S.chronicle.push({year:startYear,cls:"founding",
    text:`In ${startYear}, ${S.nation} was an absolute monarchy of the old kind, ruled by ${styled(S,S.monarch)} of the House of ${S.house}, whose word was law — and whose crown would pass by ${LAWS[S.law].name.toLowerCase()} right.`});
  beginTurn(true); render();
}
