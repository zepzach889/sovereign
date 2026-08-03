"use strict";
/* =====================================================================
   THE TURN: Event? -> Court -> Dynastic? -> advance
   ===================================================================== */
function beginTurn(first){
  refreshRelations(S);
  if(typeof autosave==="function")autosave();
  for(const k in S.facs){ const f=S.facs[k]; const m=Math.round(f.mood);
    f.delta=(f.lastMood!=null)?(m-f.lastMood):0; f.lastMood=m; }
  S.phaseDone={event:false,court:false,advance:false,dynastic:false};
  S.currentEvent=null; S.result=null; S.openReform=null; S.pending=null; S.dyn=null;
  S.tab="govern";
  const trans=transitionReady(S);
  if(trans&&!trans.jacquerie&&!S._pendingCoup){
    S._transition=trans; S.phase="transition"; return;
  }
  if(S._regentPick&&!S.regency){ S.phase="regentpick"; return; }
  ensureRegent();
  maybeTransform(S);
  if(S._seatShift){ S.phase="seatshift"; return; }
  if(S.notices&&S.notices.length){ S.phase="tidings"; return; }
  proceedToElection(first);
}
function afterTidings(){ S.notices=[]; proceedToElection(false); render(); }
function proceedToElection(first){
  const mode=electionMode(S);
  /* No ministry, or a crown that summons rather than schedules — either
     way nothing goes to the country this season. */
  if(mode!=="cycle"){ rollEvent(first); return; }
  if(S.pm&&S._minority&&chance(0.45)){
    S._minority=false; S.stability=clamp(S.stability-5);
    S.chronicle.push({year:S.year,text:`In ${S.year}, the ${esc0(S.pm.office)} of the minority lost the confidence of the chamber and fell.`});
    S._electionResult=runElection(); S.phase="election"; return;
  }
  /* A crown in personal rule cannot be voted out of its own ministry —
     the benches may hate the man, but he is the crown's man. */
  if(S.pm&&!crownAppointsPm(S)&&S.turn<S.nextElection&&S.facs[S.pm.bloc].mood<30){
    S.stability=clamp(S.stability-4);
    S.chronicle.push({year:S.year,text:`In ${S.year}, the ${S.facs[S.pm.bloc].name} benches lost confidence in their own ministry, and the government fell to an early election.`});
    S._electionResult=runElection(); S.phase="election"; return;
  }
  if(S.pm&&S.turn>=S.nextElection){ S._electionResult=runElection(); S.phase="election"; return; }
  rollEvent(first);
}
function esc0(x){ return String(x==null?"":x); }
function afterElection(){
  const er=S._electionResult; S._elections=(S._elections||0)+1;
  S.nextElection=S.turn+electionEvery(S);
  S._electionResult=null;
  if(!S.pm||!er){ checkMilestones(); rollEvent(false); render(); return; }
  if(er.winner===S.pm.bloc){
    if(S.pm.age>=68){ const old=S.pm.holder; S.pm.holder=pmName(); S.pm.age=44+rand(16);
      S.chronicle.push({year:S.year,text:`In ${S.year}, the ${S.facs[er.winner].name} interest was returned — but ${old}, grown old in office, gave way to ${S.pm.holder}.`});
    } else S.chronicle.push({year:S.year,text:`In ${S.year}, the government of the ${S.facs[er.winner].name} interest was returned at the polls.`});
    checkMilestones(); rollEvent(false); render(); return;
  }
  /* The country has spoken. What happens next depends entirely on how much
     of the constitution the crown still holds. */
  if(crownAppointsPm(S)){ S._pmField=pmField(S,er.winner); S.phase="pmpick"; render(); return; }
  if(pmContested(S)&&hasPrerog(S,"ministry")){
    S._pmOffer={bloc:er.winner,holder:pmName(),age:44+rand(16)};
    S.phase="pmoffer"; render(); return;
  }
  installPm(S,er.winner,null,"chamber");
  checkMilestones(); rollEvent(false); render();
}

/* =====================================================================
   THE MINISTRY
   One office, three ways of filling it, and the difference between them
   is the whole constitutional question. The crown's gift, the chamber's
   choice, or the chamber's choice that the crown cannot refuse.
   ===================================================================== */
function pmField(S,winnerBloc){
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  let blocs=[...set].filter(k=>S.facs[k]&&S.facs[k].present);
  /* whoever carried the chamber is always on the list, whatever else is */
  if(winnerBloc&&S.facs[winnerBloc]&&blocs.indexOf(winnerBloc)<0)blocs.unshift(winnerBloc);
  if(!blocs.length)blocs=["aristocracy"];
  /* the winner first, then whoever else the crown might reach for */
  blocs.sort((a,b)=>(b===winnerBloc)-(a===winnerBloc)||S.facs[b].strength-S.facs[a].strength);
  return blocs.slice(0,3).map(k=>({bloc:k,holder:pmName(),age:44+rand(16),winner:k===winnerBloc}));
}
function installPm(S,bloc,holder,how){
  const first=!S.pm;
  const nm=holder||pmName();
  if(first) S.pm={office:S._pmOffice||"Prime Minister",bloc,holder:nm,age:44+rand(16)};
  else { S.pm.bloc=bloc; S.pm.holder=nm; S.pm.age=44+rand(16); }
  S._pmOffice=S.pm.office;
  const iname=S.facs[bloc]?S.facs[bloc].name:"governing";
  if(first){
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the ${esc0(S.pm.office)} of ${S.nation} was created, and ${nm} of the ${iname} interest was the first to hold it.`});
  } else if(how==="crown"){
    S.chronicle.push({year:S.year,text:`In ${S.year}, the Crown named ${nm} of the ${iname} interest ${esc0(S.pm.office)} — the chamber's arithmetic notwithstanding.`});
  } else {
    S.chronicle.push({year:S.year,text:`In ${S.year}, the election turned the government out: the ${iname} interest took the ministry, and ${nm} took office as ${esc0(S.pm.office)}.`});
  }
  maybeTransform(S);
}
function doPmPick(i){
  const f=(S._pmField||[])[i]; S._pmField=null;
  if(!f){ checkMilestones(); rollEvent(false); render(); return; }
  if(!f.winner){
    /* choosing against the chamber is the prerogative working exactly as
       designed, and exactly as resented */
    S.stability=clamp(S.stability-6);
    S.legitPen=(S.legitPen||0)+4;
    (composition[(S.gov.institutions[0]||{}).composition]||[]).forEach(k=>{ if(S.facs[k])S.facs[k].mood=clamp(S.facs[k].mood-5); });
    bumpPressure(S,"constitutional",7);
  }
  installPm(S,f.bloc,f.holder,f.winner?"chamber":"crown");
  checkMilestones(); rollEvent(false); render();
}
function doPmAccept(){
  const o=S._pmOffer; S._pmOffer=null;
  if(!o){ checkMilestones(); rollEvent(false); render(); return; }
  S.stability=clamp(S.stability+2);
  installPm(S,o.bloc,o.holder,"chamber");
  checkMilestones(); rollEvent(false); render();
}
function doPmRefuse(){
  const o=S._pmOffer; S._pmOffer=null;
  if(!o){ checkMilestones(); rollEvent(false); render(); return; }
  const n=(S._pmRefusals=(S._pmRefusals||0)+1);
  /* every refusal costs more than the last — which is the only reason
     the prerogative ever actually died */
  S.stability=clamp(S.stability-4*n);
  S.legitPen=(S.legitPen||0)+3*n;
  S.facs[o.bloc].mood=clamp(S.facs[o.bloc].mood-12);
  bumpPressure(S,"constitutional",8*n);
  S.chronicle.push({year:S.year,text:`In ${S.year}, the Crown refused the chamber's ministry and sent the question back to the country.`});
  const er=runElection();
  const answered=(er.winner===o.bloc);
  if(answered||n>=3){
    /* answered at the polls, or simply worn out by use. Either way the right
       is not abolished; it is just never reached for again. */
    spendPrerog(S,"ministry");
    const inst=S.gov.institutions[0];
    if(inst)transferPower(S,inst,Math.min(8,S.gov.crown.power));
    S.legitPen=(S.legitPen||0)+8;
    S.stability=clamp(S.stability-6);
    S.chronicle.push({year:S.year,cls:"mstone",text:answered
      ?`In ${S.year}, the country returned the same interest with a larger majority, and the Crown gave way. No sovereign of ${S.nation} refused a ministry again.`
      :`In ${S.year}, the Crown had refused one ministry too many; the right was not abolished so much as quietly retired.`});
    S.notices.push(answered
      ?`The country has answered the Crown. ${S.facs[o.bloc].name} are returned stronger, and the right to refuse a ministry is spent — it will not be offered to you again.`
      :`The right to refuse a ministry is spent. Used three times in living memory, it has stopped meaning anything.`);
    installPm(S,answered?o.bloc:er.winner,answered?o.holder:null,"chamber");
  } else {
    S.chronicle.push({year:S.year,text:`In ${S.year}, the country answered the Crown's dissolution as the palace had hoped, and the ${S.facs[er.winner].name} interest formed a ministry.`});
    installPm(S,er.winner,null,"crown");
  }
  S.nextElection=S.turn+electionEvery(S);
  checkMilestones(); rollEvent(false); render();
}
function doSeatShift(){
  const want=S._seatShift; S._seatShift=null;
  S._seat=want||"crown";
  if(S._seat==="ministry"){
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the Crown's share of power fell below half, and the governing of ${S.nation} passed to the ministry; the throne remained, and was thereafter something to be managed.`});
  } else {
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the Crown recovered a governing share of power, and the ministry became once more the palace's servant.`});
  }
  checkMilestones();
  if(S.notices&&S.notices.length){ S.phase="tidings"; render(); return; }
  proceedToElection(false); render();
}
function rollEvent(first){
  if(first){ S.phaseDone.event=true; S.phase="court"; return; }
  const pool=eligibleEvents(S);
  /* a quiet reign is a rare thing — and gets rarer as the realm grows more
     complicated to govern */
  const eventOdds=Math.min(0.82, 0.62 + eraIdx(S)*0.04 + (S.stability<40?0.08:0));
  if(pool.length&&chance(eventOdds)){
    const total=pool.reduce((a,e)=>a+(e.w||1),0); let r=Math.random()*total; let ch=pool[0];
    for(const e of pool){ r-=e.w||1; if(r<=0){ch=e;break;} }
    S.currentEvent=ch; S.eventLast[ch.id]=S.turn; S.phase="event"; return;
  }
  S.phase="quiet";
}
function afterEvent(){ S.phaseDone.event=true; S.currentEvent=null; S.phase="court"; S.result=null; render(); }
function routeNext(nx){
  if(nx==="court"){afterEvent();}
  else if(nx==="dynastic"){afterCourt();}
  else if(nx==="advance"){afterAdvance();}
  else if(nx==="dyncourt"){toDynCourt();}
  else if(nx==="convention"){toConvention();}
  else if(nx==="congress"){toCongress();}
  else if(nx==="terror"){S.phase="terror";render();}
  else if(nx==="endturn"){toDynCourt();}
  else if(nx==="fresh"){beginTurn(false);render();}
  else {render();}
}
function continueFlow(){
  if(S._pendingCoup){ S.phase="housefate"; S.result=null; render(); return; }
  const nx=S.result&&S.result.next; S.result=null;
  if(S._forcedChamber){ S._afterName=nx; S.phase="chname"; render(); return; }
  if(S._pmPending&&!S.pm){ S._pmPending=false; S._afterName=nx; S.phase="pmname"; render(); return; }
  routeNext(nx);
}
function afterCourt(){
  S.phaseDone.court=true; S.result=null;
  if(!S.phaseDone.advance){ S.phase="advance"; render(); return; }
  toDynastic();
}
function afterAdvance(){
  S.phaseDone.advance=true; S.result=null; toDynastic();
}
function toDynastic(){
  if(regimeIs(S,"junta")){ S.phase="juntaexit"; render(); return; }
  if(regimeIs(S,"republic")&&S.rep&&S.turn>=S.rep.nextVote){
    S._repResult=repElection(S); S.phase="repvote"; render(); return;
  }
  if(regimeIs(S,"republic")){ toConvention(); return; }
  if(regimeIs(S,"people")){ toCongress(); return; }
  const beat=dynasticBeat();
  if(beat){ S.dyn=beat; S.phase="dynastic"; render(); return; }
  toDynCourt();
}
function toDynCourt(){ S.dyn=null; S.result=null; S.phase="dyncourt"; render(); }

const ROLES=[
  {id:"marshal",name:"Marshal of the Host",dom:"martial",fac:{officers:+7},
   hint:"command of the armies given to one of the blood",gives:"Arms hold steadier · officers warm to the house"},
  {id:"primate",name:"Primate of the Realm",dom:"faith",fac:{clergy:+8},
   hint:"a mitre for a royal child — the church bound to the dynasty",gives:"Clergy warm · legitimacy steadies"},
  {id:"governor",name:"Governor of the Provinces",dom:"civil",fac:{provinces:+7},
   hint:"the far country given a face it recognizes",gives:"Provinces warm · unrest in the country softens"},
  {id:"chancellor",name:"Chancellor of the Exchequer",dom:"fiscal",fac:{merchants:+6},
   hint:"the purse entrusted to kin rather than to strangers",gives:"Merchants warm · the treasury runs a little better"}
];
function roleHolder(S,id){
  const royal=S.family.find(p=>p.alive&&p.job===id);
  if(royal)return royal;
  return (S.court||[]).find(p=>p.alive&&p.job===id)||null;
}
function hasCouncil(S){ return !!S.gov.cabinet; }
/* the officers of state: mostly not royal at all */
const COURT_KINDS=[
  {id:"noble",label:"of an old family",bloc:"aristocracy"},
  {id:"cleric",label:"a churchman",bloc:"clergy"},
  {id:"soldier",label:"a soldier risen from the ranks",bloc:"officers"},
  {id:"lawyer",label:"a lawyer with no name to speak of",bloc:"merchants"},
  {id:"merchant",label:"a man of business",bloc:"merchants"},
  {id:"steward",label:"a steward out of the provinces",bloc:"provinces"}
];
function newCourtier(S){
  const k=pick(COURT_KINDS.filter(x=>S.facs[x.bloc]&&S.facs[x.bloc].present)||COURT_KINDS);
  const kk=k||COURT_KINDS[0];
  const g=(eraIdx(S)>=4&&chance(0.35))?"f":"m";
  return {id:PID++,name:nameFor(g,usedNames(S))+" "+pick(surnamePool()),gender:g,age:36+rand(24),
    kind:kk.id,label:kk.label,bloc:kk.bloc,trait:rollTrait(),alive:true,job:null};
}
function courtiers(S){ if(!S.court)S.court=[]; while(S.court.length<4)S.court.push(newCourtier(S)); return S.court; }
function tickCourt(S,span){
  if(!S.court)return;
  S.court.forEach(c=>{ c.age+=span;
    if(c.alive&&chance(traitMortality(c,mortalityChance(c.age,span)))){ c.alive=false; c.job=null; } });
  S.court=S.court.filter(c=>c.alive);
}
function roleEligible(S){
  const h=heirOf(S);
  return S.family.filter(p=>p.alive&&p.age>=16&&!p.job&&p.rel!=="former"&&(!h||p.id!==h.id)
    &&["child","sibling","uncle","nephew","grandchild"].includes(p.rel));
}
function matchCandidates(S,p){
  const key="m"+p.id;
  if(S._matchC&&S._matchC.key===key) return S._matchC.list;
  const sg=p.gender==="m"?"f":"m";
  const used=usedNames(S);
  const list=[
    {kind:"foreign",name:nameFor(sg,used),house:pick(housePool()),age:Math.max(16,p.age-5+rand(11)),
     note:"kin of a crown beyond the border",chips:[["down","−14 gold"],["up","+4 Arms"],["up","a friend abroad"]]},
    {kind:"domestic",name:nameFor(sg,used),house:pick(housePool()),age:Math.max(16,p.age-4+rand(9)),
     note:"of a great house of the realm",chips:[["fac up","Aristocracy +7"],["up","the old blood bound closer"]]},
    {kind:"love",name:nameFor(sg,used),house:null,age:Math.max(16,p.age-3+rand(7)),
     note:"no house worth the name — but they will not be told no",chips:[["up","+6 Stability"],["up","a fertile and willing marriage"],["fac down","Aristocracy −6"],["down","no alliance"]]}
  ];
  S._matchC={key,list};
  return list;
}
function renderDynCourt(){
  const h=heirOf(S);
  const unwed=S.family.filter(p=>p.alive&&p.age>=16&&p.age<=55&&!p.spouseId&&!p.outHouse
    &&!["spouse","dowager","childspouse","inlaw","former"].includes(p.rel));
  const elig=roleEligible(S);
  let opts="";
  if(!spouseOf(S)&&S.monarch.age>=16&&!S.regency)
    opts+=`<button class="choice dyn-match" data-dc="wedself"><div class="cl"><span class="mk">♥</span><span class="lbl">Seek a consort for ${esc(styled(S,S.monarch))}</span></div>
      <div class="ch">the sovereign is unwed — and an unwed crown is a succession waiting to go wrong</div>
      <div class="costs"><span class="chip">opens the question of marriage</span></div></button>`;
  opts+=unwed.map(p=>`<button class="choice dyn-match" data-dcwed="${p.id}"><div class="cl"><span class="mk">♥</span><span class="lbl">Arrange a match for ${esc(p.name)}, the sovereign's ${esc(relLabel(p))} (${p.age})</span></div>
      <div class="ch">of age, unwed, and watched by every house with a daughter or a son</div>
      <div class="costs"><span class="chip">three suits are pressed</span></div></button>`).join("");
  if(hasCouncil(S))opts+=ROLES.filter(r=>!roleHolder(S,r.id)).map(r=>`<button class="choice dyn-role" data-dcrole="${r.id}"><div class="cl"><span class="mk">✦</span><span class="lbl">Appoint a ${esc(r.name)}</span></div>
      <div class="ch">${esc(r.hint)}</div>
      <div class="costs">${Object.keys(r.fac).map(k=>`<span class="chip fac up">${S.facs[k].name} +${r.fac[k]}</span>`).join("")}<span class="chip">${esc(r.gives)}</span></div></button>`).join("");
  const desig=designatable(S).filter(p=>!h||p.id!==h.id);
  if(desig.length&&!S.regency)
    opts+=`<button class="choice dyn-desig" data-dc="designate"><div class="cl"><span class="mk">›</span><span class="lbl">Name an heir by the sovereign's own will</span></div>
      <div class="ch">${h?`the law would give the crown to ${esc(h.name)} — you need not agree`:"no heir stands by law; someone must be chosen"}</div>
      <div class="costs"><span class="chip">passing over the lawful line has a price</span></div></button>`;
  const held=ROLES.filter(r=>roleHolder(S,r.id));
  return `<div class="eyebrow">The dynastic court</div><div class="sit-title">The House of ${esc(S.house)}</div>
    <div class="sit-text">Marriages, offices and the question of who follows. You may do as much of this as the season allows${S.regency?" — though a regency ties the sovereign's hands":""}.</div>
    ${held.length?`<div class="sit-text" style="color:var(--brass-dim);font-size:12.5px">${held.map(r=>`${esc(roleHolder(S,r.id).name)} serves as ${esc(r.name)}.`).join(" ")}</div>`:""}
    <div class="choices">${opts||`<div class="sit-text">The house has no business this season that cannot wait.</div>`}</div>
    <div class="choices"><button class="choice" data-dc="done"><div class="cl"><span class="mk">›</span><span class="lbl">Conclude the season</span></div>
      <div class="ch">the years turn</div></button></div>`;
}
function renderMatch(){
  const p=S._matchFor==="self"?S.monarch:S.family.find(x=>x.id===S._matchFor);
  if(!p){toDynCourt();return "";}
  const cands=matchCandidates(S,p);
  return `<div class="eyebrow">A match for the house</div><div class="sit-title">Suits for ${esc(p.name)}</div>
    <div class="sit-text">${esc(p.name)}, ${p.age}, is of age. Three suits are pressed — two by houses, one by nobody at all.</div>
    <div class="choices">${cands.map((c,i)=>`<button class="choice ${c.kind==="love"?"dyn-love":"dyn-match"}" data-match="${i}">
      <div class="cl"><span class="mk">${["I","II","III"][i]}</span><span class="lbl">${esc(c.name)}${c.house?` of House ${esc(c.house)}`:""} (${c.age})</span></div>
      <div class="ch">${esc(c.note)}</div>
      <div class="costs">${c.chips.map(([cl,t])=>`<span class="chip ${cl}">${esc(t)}</span>`).join("")}</div></button>`).join("")}
      <button class="choice" data-match="-1"><div class="cl"><span class="mk">›</span><span class="lbl">Let them wait</span></div>
      <div class="ch">the envoys will return</div></button></div>`;
}
function doMatch(i){
  const p=S._matchFor==="self"?S.monarch:S.family.find(x=>x.id===S._matchFor);
  const cands=matchCandidates(S,p); S._matchC=null;
  if(!p||i<0){ S._matchFor=null; toDynCourt(); return; }
  const c=cands[i]; const sg=p.gender==="m"?"f":"m";
  const isSelf=(S._matchFor==="self");
  const sp=makePerson(S,isSelf?"spouse":(p.rel==="child"?"childspouse":"inlaw"),sg,c.age,c.name);
  sp.spouseId=p.id; p.spouseId=sp.id; S.family.push(sp);
  if(isSelf)S.married=true;
  S._matchFor=null;
  S._celebrate={label:`the wedding of ${p.name}`,turn:S.turn+1};
  let out;
  if(c.kind==="foreign") out={cost:{gold:-14,arms:+4},fac:{aristocracy:+2},
    chron:S=>`${p.name} of the royal house wed ${c.name}, kin of the crown of House ${c.house}.`,
    out:`A wedding of state. Two realms are joined at the altar, whatever they may do to each other later.`};
  else if(c.kind==="domestic") out={fac:{aristocracy:+7},
    chron:S=>`${p.name} of the royal house wed ${c.name} of House ${c.house}, of the realm's own great blood.`,
    out:`Old blood binds closer to the crown. One great house is now family — and behaves accordingly, for good and ill.`};
  else { sp.love=true; p.love=true;
    out={cost:{stability:+6},fac:{aristocracy:-6,peasantry:+4},
    chron:S=>`${p.name} of the royal house married ${c.name} for no reason of state whatever, and the realm rather enjoyed it.`,
    out:`No alliance, no dowry, no advantage — and a marriage the whole country is fond of. The great houses are furious. The couple do not appear to notice.`};}
  applyOutcome(out,"dyncourt"); render();
}
function renderRolePick(){
  const r=ROLES.find(x=>x.id===S._rolePick); if(!r){toDynCourt();return "";}
  const free=courtiers(S).filter(c=>!c.job);
  const elig=roleEligible(S).sort((a,b)=>b.age-a.age);
  return `<div class="eyebrow">An office of the realm</div><div class="sit-title">${esc(r.name)}</div>
    <div class="sit-text">${esc(r.hint)}. The council has names to put forward — and the sovereign may always prefer their own blood, which is a different kind of decision.</div>
    <div class="subhead">Servants of the state</div>
    <div class="choices">${free.map(c=>{const t=traitShown(c);
      return `<button class="choice dyn-role" data-rolewho="c${c.id}">
        <div class="cl"><span class="mk">›</span><span class="lbl">${esc(c.name)}, ${c.age} — ${esc(c.label)}</span></div>
        <div class="ch">${t?(t.sure?`known to be ${esc(t.text.toLowerCase())}`:`said to be ${esc(t.text)}`):"an unremarkable record and no enemies"}</div>
        <div class="costs">${Object.keys(r.fac).map(k=>`<span class="chip fac up">${S.facs[k].name} +${r.fac[k]}</span>`).join("")}<span class="chip fac up">${esc(S.facs[c.bloc].name)} +4</span><span class="chip up">no claim on the throne</span></div></button>`;}).join("")}</div>
    ${elig.length?`<div class="subhead">Of the blood</div>
    <div class="choices">${elig.map(p=>{const t=traitShown(p);
      return `<button class="choice dyn-desig" data-rolewho="${p.id}">
        <div class="cl"><span class="mk">✦</span><span class="lbl">${esc(p.name)}, the sovereign's ${esc(relLabel(p))} (${p.age})</span></div>
        <div class="ch">${t?(t.sure?`known to be ${esc(t.text.toLowerCase())}`:`said to be ${esc(t.text)}`):"nothing much is known of them yet"}</div>
        <div class="costs">${Object.keys(r.fac).map(k=>`<span class="chip fac up">${S.facs[k].name} +${r.fac[k]}</span>`).join("")}<span class="chip up">the dynasty is pleased</span><span class="chip down">a relative with a power base</span></div></button>`;}).join("")}</div>`:""}
    <div class="choices"><button class="choice" data-dc="back"><div class="cl"><span class="mk">›</span><span class="lbl">Leave the office vacant</span></div></button></div>`;
}
function doRole(id,who){
  const r=ROLES.find(x=>x.id===id);
  if(!r){toDynCourt();return;}
  const isCourt=(typeof who==="string"&&who.charAt(0)==="c");
  const wid=isCourt?parseInt(who.slice(1),10):who;
  const elig=roleEligible(S);
  const p=isCourt?courtiers(S).find(x=>x.id===wid)
    :((wid!=null?elig.find(x=>x.id===wid):null)||elig.sort((a,b)=>b.age-a.age)[0]);
  if(!p){toDynCourt();return;}
  if(isCourt){
    p.job=r.id;
    const fx=Object.assign({},r.fac); fx[p.bloc]=(fx[p.bloc]||0)+4;
    let extra="";
    if(r.id==="governor"){
      const target=provinces(S).filter(x=>!x.core&&!x.governor).sort((a,b)=>a.loyalty-b.loyalty)[0];
      if(target){ target.governor=p.id; target.loyalty=clamp(target.loyalty+6);
        extra=` ${p.name} takes ship for ${target.name} within the month.`; }
    }
    applyOutcome({cost:{stability:+2},fac:fx,chron:S=>`${p.name} was appointed ${r.name}.`,
      out:`${p.name} — ${p.label} — takes up the ${r.name}.${extra} A competent servant with no blood claim and no ambition the crown need fear. This is what a council is for.`},"dyncourt");
    render(); return;
  }
  p.job=r.id;
  let extra="";
  if(r.id==="governor"){
    /* send them where they are most needed */
    const target=provinces(S).filter(x=>!x.core&&!x.governor).sort((a,b)=>a.loyalty-b.loyalty)[0]
      ||provinces(S).filter(x=>!x.governor)[0];
    if(target){ target.governor=p.id; target.loyalty=clamp(target.loyalty+8);
      extra=` ${p.name} rides for ${target.name}, whose loyalty was the thinnest in the realm.`; }
  }
  applyOutcome({fac:r.fac,chron:S=>`${p.name} of the royal house was made ${r.name}.`,
    out:`${p.name} takes up the office of ${r.name}.${extra} A royal face where the realm can see it — and a royal relation with a power base of their own, which has gone well roughly half the time in history.`},"dyncourt");
  render();
}
function doWillDesignate(pid,nx){
  const p=S.family.find(x=>x.id===pid&&x.alive); if(!p){toDynCourt();return;}
  const lawful=heirOf(S);
  const d=kinDistance(S,p);
  const passedOver=lawful&&lawful.id!==p.id;
  S.designated=p.id;
  let stab=0,legit=0,ari=0;
  if(passedOver){ stab=-4-d*2; legit=3+d*2; ari=-3-d; }
  S.stability=clamp(S.stability+stab); S.legitPen=(S.legitPen||0)+legit;
  if(passedOver&&lawful&&lawful.age>=14&&chance(0.35+d*0.06)) S.rival=lawful;
  applyOutcome({fac:{aristocracy:ari},
    chron:S=>`${styled(S,S.monarch)} named ${p.name} heir to the crown${passedOver?`, passing over ${lawful.name}, whom the law preferred`:""}.`,
    out:passedOver?`The instrument is sealed. ${p.name} is heir by the sovereign's will rather than the realm's custom${S.rival&&S.rival.id===lawful.id?`, and ${lawful.name} has left court without asking leave. That is a claim now, not a grievance.`:". The great houses take note of how little the law weighed."}`
      :`${p.name} is confirmed heir — the law and the sovereign's will agreeing, which is rarer than it sounds.`},nx||"dyncourt");
  render();
}
function renderDesignate(){
  const lawful=heirOf(S);
  const list=designatable(S);
  return `<div class="eyebrow">The succession</div><div class="sit-title">Name an Heir</div>
    <div class="sit-text">${lawful?`By law the crown would pass to ${esc(lawful.name)}, the sovereign's ${esc(relLabel(lawful))}.`:"No heir stands by law."} The sovereign's will may say otherwise — at a cost that grows with the distance.</div>
    <div class="choices">${list.map(p=>{const d=kinDistance(S,p);const over=lawful&&lawful.id!==p.id;
      return `<button class="choice" data-desig="${p.id}"><div class="cl"><span class="mk">›</span><span class="lbl">${esc(p.name)}, the sovereign's ${esc(relLabel(p))} (${p.age})${p.job?` · ${esc((ROLES.find(r=>r.id===p.job)||{}).name||"")}`:""}</span></div>
        <div class="ch">${over?`passing over the lawful line by ${d} degree${d===1?"":"s"}`:"the law and the will agree"}</div>
        <div class="costs">${over?`<span class="chip down">−${4+d*2} Stability</span><span class="chip down">Legitimacy −${3+d*2}</span><span class="chip down">may raise a rival</span>`:`<span class="chip up">no cost — this is the lawful heir</span>`}</div></button>`;}).join("")}
      <button class="choice" data-dc="back"><div class="cl"><span class="mk">›</span><span class="lbl">Leave the question alone</span></div></button></div>`;
}
function afterDynastic(){ S.phaseDone.dynastic=true; S.result=null; endTurn(); render(); }

function endTurn(){
  const span=5; // a turn is always five years
  S.year+=span; S.turn++;
  // ages
  S.monarch.age+=span; S.family.forEach(p=>{ if(p.alive)p.age+=span; });
  if(S.regency){ S.regency.age+=span;
    const rp=S.regency.personId?S.family.find(p=>p.id===S.regency.personId):null;
    if(S.regency.personId&&(!rp||!rp.alive)){
      const old=S.regency.name; S.regency=newRegent(); S.stability=clamp(S.stability-4);
      S.chronicle.push({year:S.year,text:`In ${S.year}, ${old} died with the sovereign still in minority, and ${S.regency.name} took up the seals.`});
      S.notices.push(`${old} has died. ${S.regency.name} now holds the regency.`);
    } else if(!S.regency.personId&&chance(mortalityChance(S.regency.age,span))){
      const old=S.regency.name; S.regency=newRegent(); S.stability=clamp(S.stability-4);
      S.chronicle.push({year:S.year,text:`In ${S.year}, ${old} died with the sovereign still in minority, and ${S.regency.name} took up the seals in their place.`});
      S.notices.push(`${old} has died. ${S.regency.name} now holds the regency — with friends of their own.`);
    }
    if(S.monarch.age>=16){ S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, ${styled(S,S.monarch)} came of age, and the regency of ${S.regency.name} was dissolved; the sovereign ruled at last in their own right.`}); S.regency=null; S._regenciesEnded++; } }
  // budget
  const net=netIncome(S); S.treasury+=Math.round(net*span/3);
  S.treasury=Math.max(-(250+(S._creditBonus||0)),Math.min(999,S.treasury));
  S.debt=S.treasury<0?-S.treasury:0;
  // tax drift
  const t=TAX_TIERS[S.taxRate]; S.stability=clamp(S.stability+t.stab);
  for(const k in (t.fac||{})){ S.facs[k].mood=clamp(S.facs[k].mood+t.fac[k]); }
  tickProvinces(S,span);
  tickPressures(S,span);
  tickPolitics(S,span);
  tickPlan(S,span);
  tickCourt(S,span);
  if(regimeIs(S,"people")&&S.monarch&&chance(mortalityChance(S.monarch.age,span))){
    congressSuccession(S,"died in office");
  }
  if(regimeIs(S,"junta")&&S.junta){
    S.junta.years+=span;
    if(juntaPressure(S)>55)S.stability=clamp(S.stability-2);
    if(juntaPressure(S)>75&&chance(0.18)){
      S.junta.counter=(S.junta.counter||0)+1;
      const g=newGeneral(S);
      S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${S.junta.name} was removed by his own staff and ${g.name} took over the provisional government.`});
      S.notices.push(`${S.junta.name} has been removed by the officers who made him. ${g.name} now governs.`);
      S.junta.name=g.name; S.monarch={id:PID++,name:g.name,gender:g.gender,age:g.age,house:"the Army",
        regnal:1,alive:true,parents:null,spouseId:null,born:S.year-g.age,trait:g.trait,reignStart:S.year};
      S.legitPen=(S.legitPen||0)+8; S.stability=clamp(S.stability-8);
    }
  }
  S._militaryLeaned=Math.max(0,(S._militaryLeaned||0)-span*0.12);
  /* rupture weather accumulates in years, and drains when things improve */
  const deep=S.treasury<-(90+(S._creditBonus||0)*0.4);
  S._debtYears = deep ? (S._debtYears||0)+span : Math.max(0,(S._debtYears||0)-span);
  const nobles=(S.facs.aristocracy.mood+S.facs.clergy.mood)/2;
  const sour = nobles<30 && S.stability<45;
  S._reactYears = sour ? (S._reactYears||0)+span : Math.max(0,(S._reactYears||0)-span*1.5);
  if(S._celebrate&&S._celebrate.turn<S.turn)S._celebrate=null;
  // knowledge accrues
  S.knowledge=Math.round((S.knowledge+knowledgeIncome(S)*span)*10)/10;
  // development creep
  if(S.stability>(S.gov.cabinet?50:58))S.development=clamp(S.development+1);
  if(S.gov.cabinet&&S.stability<60)S.stability=clamp(S.stability+1);
  // contentment fades from above; grievances heal slowly from below
  for(const k in S.facs){ const f=S.facs[k]; if(f.present){
    if(f.mood>50) f.mood-=(f.mood-50)*0.08;
    else if(f.mood<40) f.mood+=(40-f.mood)*0.12;
    if(S.regency) f.mood-=1;
    f.mood=clamp(f.mood); } }
  const mt=S.monarch&&S.monarch.trait;
  if(mt==="martial"){ S.military=clamp(S.military+1); S.facs.officers.mood=clamp(S.facs.officers.mood+1); }
  if(mt==="pious"){ S.facs.clergy.mood=clamp(S.facs.clergy.mood+1); }
  if(mt==="beloved"){ S.stability=clamp(S.stability+2); }
  if(mt==="cruel"){ S.stability=clamp(S.stability-1); S.facs.peasantry.mood=clamp(S.facs.peasantry.mood-1); }
  S.legitPen=Math.max(0,(S.legitPen||0)-(mt==="beloved"?4:mt==="pious"?3:2));
  if(S.regency) S.treasury-=3;
  /* a chamber that is never summoned is a grievance that compounds */
  if(electionMode(S)==="summons"){
    S._unsummoned=(S._unsummoned||0)+1;
    if(S._unsummoned>=2)bumpPressure(S,"constitutional",Math.min(12,(S._unsummoned-1)*3));
  }
  S.family=S.family.filter(p=>p.alive||p.parents||p.spouseId||["child","sibling","spouse","childspouse","grandchild"].includes(p.rel));
  if(S.treasury<-15)S.stability=clamp(S.stability-5);
  if(S.treasury<=-200){S.treasury=-120;S.privileges=Math.max(0,S.privileges-2);S.military=clamp(S.military-8);S.facs.merchants.mood=clamp(S.facs.merchants.mood-8);S.chronicle.push({year:S.year,cls:'rupture',text:'In '+S.year+', the Crown of '+S.nation+' defaulted upon its debts; creditors were ruined, privileges revoked, and regiments disbanded to stanch the bleeding.'});}
  if(S.facs.aristocracy.mood<30||S.facs.peasantry.mood<28)S.stability=clamp(S.stability-4);
  if(S.rival)S.stability=clamp(S.stability-2);
  // births
  maybeBirth(span);
  // deaths in the family + monarch mortality
  rollDeaths(span);
  if(S._abdicate){ S._abdicate=false; S.monarch.alive=false; }
  if(S.pm){ S.pm.age+=span;
    if(chance(mortalityChance(S.pm.age,span))){ const old=S.pm.holder;
      S.pm.holder=pmName(); S.pm.age=44+rand(16);
      S.chronicle.push({year:S.year,text:`In ${S.year}, ${old} died in office, and the ${S.facs[S.pm.bloc].name} interest raised ${S.pm.holder} to the ministry in their place.`});
      S.notices.push(`${old}, the ${S.pm.office}, has died in office. ${S.pm.holder} now holds the seals of government.`);
    } }
  checkMilestones();
  // next turn begins — unless the monarch died (succession phase pending)
  if(!S.monarch.alive){
    /* only a crown has a succession; everything else has a procedure */
    if(!isMonarchy(S)){ succeedNonMonarch(S); render(); return; }
    S.phase="succession"; return; }
  if(S.stability<=5){ S.currentEvent=REVOLT; S.eventLast["revolt"]=S.turn; S.phase="event"; S.phaseDone={event:false,court:false,dynastic:false}; return; }
  beginTurn(false);
}

function spouseOf(S){ return S.family.find(p=>p.rel==="spouse"&&p.alive); }
function maybeBirth(span){
  const sp=spouseOf(S);
  if(sp){
    const bearer=(S.monarch.gender==="f")?S.monarch.age:sp.age;
    if(bearer>=17&&bearer<=45){
      const kids=S.family.filter(p=>p.rel==="child"&&p.alive).length;
      const p=Math.min(0.85, span*0.16*(kids<2?1.4:kids<4?1:0.5)*(S.monarch.love?1.3:1));
      if(chance(p)){
        const g=chance(0.5)?"m":"f";
        const c=makePerson(S,"child",g,0,null,[S.monarch.id,sp.id]);
        S.family.push(c);
        S.chronicle.push({year:S.year,text:`In ${S.year}, a ${g==="m"?"son":"daughter"}, ${c.name}, was born to ${styled(S,S.monarch)}.`});
        S.notices.push({t:"b",name:c.name,g:g});
        S._celebrate={label:`the birth of ${c.name}`,turn:S.turn+1};
      }
    }
  }
  S.family.filter(c=>(c.rel==="sibling"||c.rel==="uncle")&&c.alive&&c.spouseId).forEach(c=>{
    const cs=personById(S,c.spouseId); if(!cs||!cs.alive)return;
    const bearer=(c.gender==="f")?c.age:cs.age;
    if(bearer<17||bearer>45)return;
    const kd=S.family.filter(x=>x.parents&&x.parents.includes(c.id)&&x.alive).length;
    if(chance(Math.min(0.3, span*0.07*(kd<2?1:0.4)))){
      const g=chance(0.5)?"m":"f";
      const nc=makePerson(S,c.rel==="sibling"?"nephew":"kin",g,0,null,[c.id,cs.id]);
      S.family.push(nc);
      S.notices.push(`${c.name} has been delivered of a ${g==="m"?"son":"daughter"}, ${nc.name}.`);
    }
  });
  S.family.filter(c=>c.rel==="child"&&c.alive&&c.spouseId).forEach(c=>{
    const cs=personById(S,c.spouseId); if(!cs||!cs.alive)return;
    const bearer=(c.gender==="f")?c.age:cs.age;
    if(bearer<17||bearer>45)return;
    const gk=S.family.filter(x=>x.rel==="grandchild"&&x.alive&&x.parents&&x.parents.includes(c.id)).length;
    if(chance(Math.min(0.4, span*0.09*(gk<2?1.2:0.5)))){
      const g=chance(0.5)?"m":"f";
      const gc=makePerson(S,"grandchild",g,0,null,[c.id,cs.id]);
      S.family.push(gc);
      S.notices.push(`${c.name} has been delivered of a ${g==="m"?"son":"daughter"}, ${gc.name} — a grandchild to the sovereign.`);
    }
  });
}
function rollDeaths(span){
  S.monarch.alive=S.monarch.alive!==false;
  S.family.forEach(p=>{ if(p.alive&&chance(traitMortality(p,mortalityChance(p.age,span))*(1-(S._mortalityEase||0)))){ p.alive=false; p.diedTurn=S.turn;
    S.chronicle.push({year:S.year,text:`In ${S.year}, the court mourned ${p.name}, ${relLabel(p)} of the sovereign, dead at ${p.age}.`});
    S.notices.push({t:"d",id:p.id,name:p.name,age:p.age});
    if(p.rel==="spouse"){ S.married=false; }
  }});
  if(S.rival&&!S.family.find(p=>p.id===S.rival.id&&p.alive)) S.rival=null;
  // monarch death
  if(chance(traitMortality(S.monarch,mortalityChance(S.monarch.age,span))*(1-(S._mortalityEase||0)))){ S.monarch.alive=false;
    S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, ${styled(S,S.monarch)} died at the age of ${S.monarch.age}.`}); }
}

function regentCandidates(S){
  const out=[];
  const par=(S.family||[]).find(p=>p.alive&&S.monarch.parents&&S.monarch.parents.includes(p.id));
  if(par)out.push({kind:"person",p:par,
    label:`${par.name}, the sovereign's own ${par.gender==="f"?"mother":"father"}`,
    note:"a parent's interest in the child is the one interest you can rely on"});
  (S.family||[]).filter(p=>p.alive&&p.age>=24&&!p.outHouse&&p.id!==S.monarch.id&&(!par||p.id!==par.id)
      &&["uncle","sibling","grandparent","kin","nephew"].includes(p.rel))
    .sort((a,b)=>b.age-a.age).slice(0,3)
    .forEach(p=>out.push({kind:"person",p,
      label:`${p.name}, the sovereign's ${relLabel(p)} (${p.age})`,
      note:"of the blood, and therefore with a claim of their own to consider"}));
  out.push({kind:"lord",label:"A lord protector from outside the family",
    note:"no claim to the throne — and no love for the child either"});
  return out;
}
function chooseRegent(i){
  const c=regentCandidates(S)[i];
  if(!c){S.regency=newRegent();}
  else if(c.kind==="person"){
    const isParent=S.monarch.parents&&S.monarch.parents.includes(c.p.id);
    S.regency={name:`${c.p.name}, ${isParent?"the Dowager Regent":"Regent of the Realm"}`,
      age:c.p.age,gender:c.p.gender,favors:pick(["aristocracy","clergy"]),hostile:false,personId:c.p.id};
    if(!isParent)S.legitPen=(S.legitPen||0)+3;
  } else { S.regency=newRegent(); S.regency.personId=null; }
  S.chronicle.push({year:S.year,text:`In ${S.year}, with the sovereign in minority, ${S.regency.name} took up the seals of the realm.`});
  S._regentPick=false; S.phase="tidings"; if(!S.notices.length)S.phase="court"; render();
}
function renderRegentPick(){
  const cands=regentCandidates(S);
  return `<div class="eyebrow">A crown too heavy</div><div class="sit-title">Who Shall Hold the Seals?</div>
    <div class="sit-text">${esc(styled(S,S.monarch))} is ${S.monarch.age}. Until they come of age someone must govern in their name — and whoever that is will have years to arrange the realm to their liking.</div>
    <div class="choices">${cands.map((c,i)=>`<button class="choice ${c.kind==="lord"?"":"dyn-role"}" data-regent="${i}">
      <div class="cl"><span class="mk">${["I","II","III","IV","V"][i]||"•"}</span><span class="lbl">${esc(c.label)}</span></div>
      <div class="ch">${esc(c.note)}</div></button>`).join("")}</div>`;
}
function newRegent(){
  // the surviving parent takes the regency first, if one lives
  const dow=S.family.find(p=>p.alive&&(p.rel==="dowager"||p.rel==="spouse")&&S.monarch.parents&&S.monarch.parents.includes(p.id));
  if(dow) return {name:`${dow.name}, the Dowager Regent — the sovereign's own ${dow.gender==="f"?"mother":"father"}`,
    age:dow.age, gender:dow.gender, favors:pick(["aristocracy","clergy"]), hostile:false, personId:dow.id};
  const g=chance(0.7)?"m":"f";
  const given=nameFor(g,usedNames(S));
  return {name:`${g==="m"?"Lord":"Lady"} ${given}, ${pick(["the Lord Protector","the High Steward","Regent of the Realm"])}`,
    given, house:pick(housePool()),
    age:42+rand(20), gender:g, favors:pick(["aristocracy","clergy","officers","merchants"]), hostile:false};
}
function ensureRegent(){
  if(!S.regency||!S.regency.personId)return;
  const rp=S.family.find(p=>p.id===S.regency.personId);
  if(!rp||!rp.alive){
    const old=S.regency.name; S.regency=newRegent(); S.stability=clamp(S.stability-4);
    S.chronicle.push({year:S.year,text:`In ${S.year}, ${old} died with the sovereign still in minority, and ${S.regency.name} took up the seals.`});
    S.notices.push(`${old} has died. ${S.regency.name} now holds the regency.`);
  }
}