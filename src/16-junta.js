"use strict";
/* =====================================================================
   THE COUP AND THE JUNTA
   The first non-monarchical regime. The head of state object is reused —
   the general simply occupies it — so every existing screen keeps working.
   A junta is explicitly provisional: a clock runs, and it must resolve.
   ===================================================================== */
function regimeIs(S,r){ return (S.regime||"monarchy")===r; }
function isMonarchy(S){ return regimeIs(S,"monarchy"); }

/* ---------- the fall of the house ---------- */
function fleeOdds(S){
  let p=0.32;
  if(S.treasury>60)p+=0.18; else if(S.treasury>20)p+=0.08;
  const loyal=provinces(S).filter(x=>x.loyalty>=55).length;
  p+=Math.min(0.22,loyal*0.08);
  if(S.stability>40)p+=0.08;
  return Math.min(0.9,p);
}
function exileHouse(S,caught){
  const living=(S.family||[]).filter(p=>p.alive&&!p.outHouse);
  if(caught){
    living.forEach(p=>{p.alive=false;p.diedTurn=S.turn;});
    if(S.monarch)S.monarch.alive=false;
    S._martyr=true; S.exiles=null;
    return;
  }
  S.exiles={alive:living.length>0,house:S.house,year:S.year,
    members:living.map(p=>({id:p.id,name:p.name,gender:p.gender,age:p.age,rel:p.rel}))};
  living.forEach(p=>{p.outHouse=true;});
}
function renounceHouse(S){
  (S.family||[]).forEach(p=>{p.outHouse=true;});
  S.exiles={alive:false,renounced:true,house:S.house,year:S.year};
}

/* ---------- installing the junta ---------- */
function installJunta(S,general){
  clearRegimeState(S,"junta");
  S.regime="junta";
  S.junta={name:general.name,years:0,promised:false,purges:0,counter:0};
  S.gov.crown.titleBase=cleanTitle(S.customTitles&&S.customTitles.junta)||pick(regimeTitles(S,"junta"));
  /* the officers hold what the crown held */
  S.gov.institutions.forEach(inst=>{ powerToCrown(S,inst,inst.power); });
  S.gov.institutions=[];
  S.monarch={id:PID++,name:general.name,gender:general.gender,age:general.age,
    house:"the Army",regnal:1,alive:true,parents:null,spouseId:null,
    born:S.year-general.age,trait:general.trait||null,reignStart:S.year};
  S.facs.officers.mood=clamp(S.facs.officers.mood+22);
  S.facs.officers.strength=clamp(S.facs.officers.strength+16);
  S.legitPen=(S.legitPen||0)+22;
  S.stability=clamp(S.stability-16);
  S._militaryLeaned=0;
  S.pressure=S.pressure||{}; S.pressure.military=Math.max(0,(S.pressure.military||0)-45);
}
function newGeneral(S){
  const g=chance(0.88)?"m":"f";
  return {name:nameFor(g,usedNames(S))+" "+pick(surnamePool()),gender:g,age:44+rand(16),
    trait:pick(["martial","shrewd","cruel","beloved"])};
}
/* the provisional clock — a junta must answer for itself */
function juntaPressure(S){ return Math.min(100,(S.junta?S.junta.years:0)*4.5+(S.junta&&S.junta.promised?12:0)); }
function juntaWord(S){
  const y=S.junta?S.junta.years:0;
  if(y<8)return "the emergency is young, and nobody has asked yet";
  if(y<18)return "the word 'provisional' is being said with an edge to it";
  if(y<30)return "nobody says 'provisional' any more; they say 'the regime'";
  return "a generation has now been born under martial law";
}
function juntaPanel(S){
  if(!regimeIs(S,"junta"))return "";
  return `<div class="press"><div class="gt">The Provisional Government</div>
    <div class="prow ${juntaPressure(S)>60?"crit":juntaPressure(S)>35?"warn":""}">
      <span class="pn">Year ${S.junta.years} of the emergency</span>
      <span class="pw">${S.junta.promised?"elections promised":"no settlement"}</span></div>
    <div class="pnote">${esc(juntaWord(S))}</div></div>`;
}
/* ---------- the exits ---------- */
function juntaExits(S){
  const out=[];
  const ex=S.exiles&&S.exiles.alive;
  out.push({id:"crown_general",label:`Crown ${esc(S.junta.name)} and found a dynasty`,
    note:"the oldest trick there is — a general who becomes a king, and whose grandchildren will be told it was always so",
    chips:[["down","Legitimacy suffers for a generation"],["up","the emergency ends"],["fac up","Officers approve"]]});
  if(ex)out.push({id:"restore_house",label:`Recall the House of ${esc(S.exiles.house)} from exile`,
    note:"the old blood brought home to legitimize what the army did — they will not be grateful forever",
    chips:[["up","Legitimacy restored"],["up","the emergency ends"],["fac up","Aristocracy, Clergy"]]});
  if(S.junta.promised||eraIdx(S)>=3)out.push({id:"republic",label:"Hold the elections and stand down",
    note:S.junta.promised?"the date was printed; keeping it is the one thing that would surprise everybody"
      :"no crown at all — let the country choose its own government and see what it does",
    chips:[["up","Legitimacy substantially restored"],["up","the emergency ends"],["fac down","Officers"],["chip","the army returns to barracks it may not stay in"]]});
  if(pressureOf(S,"radical")>=45)out.push({id:"peoples",label:"Hand the state to the workers' councils",
    note:"the soldiers' committees and the workers' councils have been meeting together — join them rather than shoot them",
    chips:[["down","the old orders are abolished"],["up","the emergency ends"],["fac up","Workers"],["down","Legitimacy abroad and at home"]]});
  out.push({id:"new_house",label:"Raise a house of the realm to the throne",
    note:"a great family with no part in the coup, chosen precisely because it is uncontroversial",
    chips:[["up","Legitimacy partly restored"],["fac up","Aristocracy"],["down","Officers grumble"]]});
  return out;
}

/* ---------- the fate of the fallen house ---------- */
function renderHouseFate(){
  const g=S._pendingCoup;
  const odds=Math.round(fleeOdds(S)*100);
  const loyal=provinces(S).filter(x=>x.loyalty>=55).length;
  return `<div class="eyebrow">The palace is surrounded</div><div class="sit-title">The House of ${esc(S.house)}</div>
    <div class="sit-text">${esc(g.name)} has the capital and the treasury will be his by morning. What remains to decide is what becomes of the family — and there are perhaps two hours in which to decide it.</div>
    <div class="choices">
      <button class="choice" data-fate="flee"><div class="cl"><span class="mk">I</span><span class="lbl">Flee — get them out ahead of the people's guard</span></div>
        <div class="ch">bribes at the gates, a loyal province to cross, a coast at the end of it${loyal?` — ${loyal} province${loyal>1?"s":""} would still shelter them`:" — no province would shelter them now"}</div>
        <div class="costs"><span class="chip">roughly ${odds} in 100</span><span class="chip up">a house in exile, and a claim that lives</span><span class="chip down">if taken on the road: executed</span></div></button>
      <button class="choice" data-fate="renounce"><div class="cl"><span class="mk">II</span><span class="lbl">Surrender, and renounce the claim entirely</span></div>
        <div class="ch">a signed abdication for the whole line in exchange for their lives</div>
        <div class="costs"><span class="chip up">they live</span><span class="chip">a pension and a small house somewhere</span><span class="chip down">no restoration — the claim is given up</span></div></button>
      <button class="choice" data-fate="stand"><div class="cl"><span class="mk">III</span><span class="lbl">Stand. A sovereign does not run from their own capital</span></div>
        <div class="ch">the family is taken in the palace and tried within the month</div>
        <div class="costs"><span class="chip down">the house is executed</span><span class="chip up">a martyred crown poisons whatever replaces it</span></div></button>
    </div>`;
}
function doHouseFate(kind){
  const g=S._pendingCoup; S._pendingCoup=null;
  const house=S.house;
  let line="", out="";
  if(kind==="flee"){
    const made=chance(fleeOdds(S));
    exileHouse(S,!made);
    line=made?`the royal family fled the capital by night and reached the coast; the House of ${house} went into exile with its claim intact.`
             :`the royal family was taken on the road within sight of the sea, and the House of ${house} ended against a wall.`;
    out=made?`Carriages at three in the morning, a bribed gate, and a fishing boat that asked no questions. They are alive, they are abroad, and somewhere in another kingdom a child is being taught what they are owed.`
            :`They very nearly made it. A cavalry picket on the coast road, an officer who recognised a face from a coin, and it was over by the following week. The new regime did not want martyrs and has been given a family of them.`;
  } else if(kind==="renounce"){
    renounceHouse(S);
    line=`the royal family surrendered and renounced its claim for all its line, and was permitted to live.`;
    out=`A signed instrument, witnessed, renouncing everything for themselves and their descendants forever. They are given a pension and a house in a small town. It is an unheroic end, and every one of them is alive to see the next century.`;
  } else {
    exileHouse(S,true);
    line=`the sovereign refused to leave the capital; the House of ${house} was taken in the palace and executed within the month.`;
    out=`They come for them at dawn and there is no resistance and no flight. The trial is short and the sentence is not in doubt. Whatever is built on this ground will be built on that morning, and everyone who builds it knows it.`;
  }
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${line}`});
  installJunta(S,g);
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${S.junta.name} assumed the government of ${S.nation} in the name of the emergency. No date was given for its ending.`});
  S.result={out:out+`\n\nAnd you open your eyes behind the general's. The palace is the same. The people in it are entirely new.`,fortune:"bad",next:"fresh"};
  S.phase="outcome"; checkMilestones(); render();
}
/* ---------- resolving the emergency ---------- */
function renderJuntaExit(){
  return `<div class="eyebrow">The emergency</div><div class="sit-title">A Settlement for ${esc(S.nation)}</div>
    <div class="sit-text">${esc(juntaWord(S))}. A provisional government that does not become something else eventually becomes a joke, and then a target. The crown is the only settled form this realm has ever known — for now.</div>
    <div class="choices">${juntaExits(S).map((e,i)=>`<button class="choice" data-jexit="${e.id}">
      <div class="cl"><span class="mk">${["I","II","III"][i]||"•"}</span><span class="lbl">${e.label}</span></div>
      <div class="ch">${esc(e.note)}</div>
      <div class="costs">${e.chips.map(c=>`<span class="chip ${c[0]}">${esc(c[1])}</span>`).join("")}</div></button>`).join("")}
      <button class="choice" data-jexit="wait"><div class="cl"><span class="mk">›</span><span class="lbl">Not yet — the emergency continues</span></div>
        <div class="ch">every year without a settlement is a year the question gets louder</div></button></div>`;
}
function doJuntaExit(kind){
  if(kind==="wait"){ S.junta.promised=false; toDynCourt(); return; }
  const wasJunta=S.junta.name;
  if(kind==="peoples"){
    installPeoples(S,"junta");
    S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${wasJunta} dissolved the provisional government into the workers' and soldiers' councils; ${S.nation} was proclaimed a People's Republic.`});
    S.result={out:`The general does not resign so much as dissolve — into a committee, then a congress, then a Party. The old orders are abolished by decree within the month.\n\nYou open your eyes behind a Chairman, in a state that has no intention of ever holding an election.`,fortune:null,next:"fresh"};
    S.junta=null; S.phase="outcome"; checkMilestones(); render(); return;
  }
  if(kind==="republic"){
    S.facs.officers.mood=clamp(S.facs.officers.mood-14);
    installRepublic(S,true);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${wasJunta} held the promised elections and stood down; ${S.nation} became a republic.`});
    S.result={out:`The ballot boxes are real, the count is watched, and the general walks out of the palace to a car that is not an escort. It is the rarest ending an emergency has.\n\nYou wake behind a president — ${S.monarch.name} — with a mandate you did not write and a country that has never done this before.`,fortune:"good",next:"fresh"};
    S.junta=null; S._militaryLeaned=0;
    if(S.pressure)S.pressure.military=Math.max(0,(S.pressure.military||0)-25);
    S.phase="outcome"; checkMilestones(); render(); return;
  }
  S.regime="monarchy"; S.gov.crown.titleBase=(culture(S).titles[0]||"King");
  if(kind==="crown_general"){
    const hs=housePool().filter(h=>h!==S.house); const nh=pick(hs.length?hs:["Vael"]);
    S.house=nh; S.monarch.house=nh;
    S.monarch.name=String(S.monarch.name).split(" ")[0];  /* a crown drops the surname */
    S.monarch.regnal=regnalFor(S,S.monarch.name,nh);
    S.legitPen=(S.legitPen||0)+10; S.stability=clamp(S.stability+8);
    S.facs.officers.mood=clamp(S.facs.officers.mood+8);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${wasJunta} laid down the emergency and took up a crown; the House of ${nh} was proclaimed, and the army became a dynasty.`});
    S.result={out:`The uniform is exchanged for regalia and the emergency is declared over by the man who declared it. It fools nobody now and it will fool everybody in eighty years — which is, historically, how most dynasties began.`,fortune:null,next:"fresh"};
  } else if(kind==="restore_house"){
    const ex=S.exiles, m=(ex.members||[]).sort((a,b)=>b.age-a.age)[0];
    S.house=ex.house;
    S.monarch={id:PID++,name:m?m.name:nameFor("m",usedNames(S)),gender:m?m.gender:"m",
      age:m?Math.min(70,m.age+(S.year-ex.year)):30,house:ex.house,regnal:regnalFor(S,m?m.name:"",ex.house),
      alive:true,parents:null,spouseId:null,born:S.year-(m?m.age:30),trait:rollTrait(),reignStart:S.year};
    S.family.forEach(p=>{p.outHouse=true;});
    S.exiles=null;
    S.legitPen=Math.max(0,(S.legitPen||0)-18); S.stability=clamp(S.stability+12);
    S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+14);
    S.facs.clergy.mood=clamp(S.facs.clergy.mood+12);
    S.facs.officers.mood=clamp(S.facs.officers.mood-8);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the House of ${ex.house} was recalled from exile and restored; the emergency was declared to have been, all along, a regency.`});
    S.result={out:`They come back older, poorer and considerably harder than they left. The restoration is popular in a way nothing the army did ever was — and the generals who arranged it are already discovering that a restored crown remembers who put it there, and why it had to be put there at all.`,fortune:"good",next:"fresh"};
  } else {
    const hs=housePool().filter(h=>h!==S.house); const nh=pick(hs.length?hs:["Vael"]);
    const g=chance(0.6)?"m":"f";
    S.house=nh;
    S.monarch={id:PID++,name:nameFor(g,usedNames(S)),gender:g,age:26+rand(20),house:nh,regnal:1,
      alive:true,parents:null,spouseId:null,born:S.year-30,trait:rollTrait(),reignStart:S.year};
    S.legitPen=Math.max(0,(S.legitPen||0)-8); S.stability=clamp(S.stability+9);
    S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+12);
    S.facs.officers.mood=clamp(S.facs.officers.mood-6);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the army handed the crown to the House of ${nh} — a family chosen for having done nothing at all — and went back to its barracks.`});
    S.result={out:`A compromise candidate with clean hands and no opinions, which is exactly the qualification required. The generals retire covered in honours. The new crown will spend forty years quietly making sure it never needs them again.`,fortune:null,next:"fresh"};
  }
  S.junta=null; S._militaryLeaned=0;
  if(S.pressure)S.pressure.military=Math.max(0,(S.pressure.military||0)-30);
  refreshRelations(S);
  S.phase="outcome"; checkMilestones(); render();
}
