"use strict";
/* =====================================================================
   APPLY / HANDLERS
   ===================================================================== */
function applyOutcome(o,next){
  if(o.cost){ if("gold"in o.cost)S.treasury+=o.cost.gold; if("arms"in o.cost)S.military=clamp(S.military+o.cost.arms); if("stability"in o.cost)S.stability=clamp(S.stability+o.cost.stability); }
  if(o.fac){ for(const k in o.fac){ if(!S.facs[k])continue; let d=o.fac[k];
    if(d>0){ const m=S.facs[k].mood; if(m<25)d=Math.round(d*2); else if(m<35)d=Math.round(d*1.5); }
    S.facs[k].mood=clamp(S.facs[k].mood+d); } }
  if(o.effect)o.effect(S);
  maybeTransform(S);
  const chronLine=(typeof o.chron==="function")?o.chron(S):o.chron;
  if(chronLine)S.chronicle.push({year:S.year,text:`In ${S.year}, ${chronLine}`,cls:o.rupture?"rupture":""});
  S.result={out:(typeof o.out==="function")?o.out(S):o.out,fortune:o.fortune||null,next};
  checkMilestones();
  S.phase="outcome";
}

function wire(){
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;S.openReform=null;render();});
  document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{S._courtKind="act";doAction(b.dataset.act);});
  document.querySelectorAll("[data-ev]").forEach(b=>b.onclick=()=>doEvent(+b.dataset.ev));
  document.querySelectorAll("[data-tax]").forEach(b=>b.onclick=()=>{S._courtKind="tax";setTax(b.dataset.tax);});
  document.querySelectorAll("[data-openreform]").forEach(b=>b.onclick=()=>{S.openReform=(S.openReform===b.dataset.openreform)?null:b.dataset.openreform;S._reformPower=null;S._reformLaw=null;S._reformDest=null;render();});
  document.querySelectorAll("[data-lawpick]").forEach(b=>b.onclick=()=>{S._reformLaw=b.dataset.lawpick;render();});
  document.querySelectorAll("[data-rdest]").forEach(b=>b.onclick=()=>{S._reformDest=+b.dataset.rdest;render();});
  document.querySelectorAll("[data-rsrc]").forEach(b=>b.onclick=()=>{S._reformSrc=+b.dataset.rsrc;render();});
  document.querySelectorAll("[data-enact]").forEach(b=>b.onclick=()=>{S._courtKind="reform";startReform(b.dataset.enact);});
  document.querySelectorAll("[data-dyn]").forEach(b=>b.onclick=()=>doDyn(b.dataset.dyn));
  document.querySelectorAll("[data-designate]").forEach(b=>b.onclick=()=>doDesignate(+b.dataset.designate));
  document.querySelectorAll("[data-adopt]").forEach(b=>b.onclick=()=>doDyn("adopt"));
  document.querySelectorAll("[data-seekmatch]").forEach(b=>b.onclick=()=>{S._matchFor="self";S._matchC=null;S.phase="match";render();});
  document.querySelectorAll("[data-celebrate]").forEach(b=>b.onclick=()=>doCelebrate());
  document.querySelectorAll("[data-buyadv]").forEach(b=>b.onclick=()=>doBuyAdvance(b.dataset.buyadv));
  document.querySelectorAll("[data-buywork]").forEach(b=>b.onclick=()=>doBuyWork(b.dataset.buywork));
  document.querySelectorAll("[data-skipadv]").forEach(b=>b.onclick=()=>afterAdvance());
  document.querySelectorAll("[data-dc]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.dc;
    if(v==="done"){afterDynastic();}
    else if(v==="back"){ if(regimeIs(S,"republic"))toConvention(); else if(regimeIs(S,"people"))toCongress(); else toDynCourt(); }
    else if(v==="designate"){S.phase="designate";render();}
    else if(v==="wedself"){S._matchFor="self";S._matchC=null;S.phase="match";render();}});
  document.querySelectorAll("[data-dcwed]").forEach(b=>b.onclick=()=>{S._matchFor=+b.dataset.dcwed;S._matchC=null;S.phase="match";render();});
  document.querySelectorAll("[data-dcrole]").forEach(b=>b.onclick=()=>{S._rolePick=b.dataset.dcrole;S.phase="rolepick";render();});
  /* courtier ids arrive as "c17" and doRole parses them itself; a + here
     turned every one of them into NaN and the office stayed vacant */
  document.querySelectorAll("[data-rolewho]").forEach(b=>{const w=b.dataset.rolewho;
    b.onclick=()=>doRole(S._rolePick,/^c/.test(w)?w:+w);});
  document.querySelectorAll("[data-regent]").forEach(b=>b.onclick=()=>chooseRegent(+b.dataset.regent));
  document.querySelectorAll("[data-fate]").forEach(b=>b.onclick=()=>doHouseFate(b.dataset.fate));
  document.querySelectorAll("[data-jexit]").forEach(b=>b.onclick=()=>doJuntaExit(b.dataset.jexit));
  document.querySelectorAll("[data-pol]").forEach(b=>b.onclick=()=>doPol(+b.dataset.pol));
  document.querySelectorAll("[data-plan]").forEach(b=>b.onclick=()=>doPlan(b.dataset.plan));
  document.querySelectorAll("[data-pb]").forEach(b=>b.onclick=()=>doPurge(+b.dataset.pb));
  document.querySelectorAll("[data-rehab]").forEach(b=>b.onclick=()=>doRehabilitate());
  document.querySelectorAll("[data-trans]").forEach(b=>b.onclick=()=>doTransition(b.dataset.trans));
  document.querySelectorAll("[data-terror]").forEach(b=>b.onclick=()=>doTerror(b.dataset.terror));
  document.querySelectorAll("[data-civil]").forEach(b=>b.onclick=()=>{S._civilPick=b.dataset.civil;S.phase="civilpick";render();});
  document.querySelectorAll("[data-civilact]").forEach(b=>b.onclick=()=>doCivil(b.dataset.civilact));
  document.querySelectorAll("[data-fed]").forEach(b=>b.onclick=()=>doFederal());
  document.querySelectorAll("[data-amend]").forEach(b=>b.onclick=()=>doAmend(b.dataset.amend));
  const bt=document.getElementById("bkTog"); if(bt)bt.onclick=()=>{S.ui=S.ui||{};S.ui.budgetOpen=!S.ui.budgetOpen;render();};
  const rg=document.getElementById("repGo"); if(rg)rg.onclick=()=>{S._repResult=null;toDynCourt();};
  document.querySelectorAll("[data-dom]").forEach(b=>b.onclick=()=>{S.ui=S.ui||{};S.ui.shut=S.ui.shut||{};const d=b.dataset.dom;S.ui.shut[d]=!S.ui.shut[d];render();});
  document.querySelectorAll("[data-match]").forEach(b=>b.onclick=()=>doMatch(+b.dataset.match));
  document.querySelectorAll("[data-desig]").forEach(b=>b.onclick=()=>doWillDesignate(+b.dataset.desig));
  document.querySelectorAll("[data-succ]").forEach(b=>b.onclick=()=>doSuccHeir(b.dataset.succ==="crown_heir_keep"));
  document.querySelectorAll("[data-succ_sib]").forEach(b=>b.onclick=()=>doSuccSibling(+b.dataset.succ_sib));
  document.querySelectorAll("[data-crisis]").forEach(b=>b.onclick=()=>{S._crisisMode=b.dataset.crisis;S._crisisCands=crisisCandidates(b.dataset.crisis==="arms");render();});
  document.querySelectorAll("[data-newhouse]").forEach(b=>b.onclick=()=>doNewHouse(+b.dataset.newhouse));
  document.querySelectorAll("[data-extinct]").forEach(b=>b.onclick=()=>doExtinct());
  document.querySelectorAll("[data-contest]").forEach(b=>b.onclick=()=>doContested(b.dataset.contest));
  document.querySelectorAll("[data-ancname]").forEach(b=>b.onclick=()=>doSuccAncestral(b.dataset.ancname));
  document.querySelectorAll("[data-heirwed]").forEach(b=>b.onclick=()=>wedChild(+b.dataset.cid,b.dataset.heirwed));
  document.querySelectorAll("[data-elect]").forEach(b=>b.onclick=()=>doElect(+b.dataset.elect));
  const rp=document.getElementById("rpow");if(rp)rp.oninput=()=>{S._reformPower=+rp.value;render();};
  const cont=document.getElementById("continue");
  if(cont)cont.onclick=()=>continueFlow();
  const tg=document.getElementById("tidingsGo");if(tg)tg.onclick=()=>afterTidings();
  const qg=document.getElementById("quietGo");if(qg)qg.onclick=()=>afterEvent();
  const eg=document.getElementById("electGo");if(eg)eg.onclick=()=>afterElection();
  document.querySelectorAll("[data-pmpick]").forEach(b=>b.onclick=()=>doPmPick(+b.dataset.pmpick));
  document.querySelectorAll("[data-pmoffer]").forEach(b=>b.onclick=()=>{b.dataset.pmoffer==="accept"?doPmAccept():doPmRefuse();});
  const sg=document.getElementById("seatGo");if(sg)sg.onclick=()=>doSeatShift();
  document.querySelectorAll("[data-heirage]").forEach(b=>b.onclick=()=>doHeirAge(b.dataset.heirage));
  document.querySelectorAll("[data-bill]").forEach(b=>b.onclick=()=>doBill(b.dataset.bill));
  const lg=document.getElementById("btnLedger");
  if(lg)lg.onclick=()=>ledgerModal();
  document.querySelectorAll("[data-floor]").forEach(b=>b.onclick=()=>{
    S.ui=S.ui||{}; S.ui.floorOpen=S.ui.floorOpen||{};
    const k=b.dataset.floor; S.ui.floorOpen[k]=!S.ui.floorOpen[k]; render();});
  const ct=document.getElementById("cadTog");
  if(ct)ct.onclick=()=>{S.ui=S.ui||{};S.ui.cadetsOpen=!S.ui.cadetsOpen;render();};
  document.querySelectorAll("[data-elecevery]").forEach(b=>b.onclick=()=>{
    const n=+b.dataset.elecevery; const was=electionEvery(S);
    S.electionEvery=n;
    /* shortening the cycle is a concession; lengthening it is not */
    if(n<was){ S.legitPen=Math.max(0,(S.legitPen||0)-2); S.stability=clamp(S.stability-2); }
    if(n>was){ S.legitPen=(S.legitPen||0)+2; bumpPressure(S,"constitutional",4); }
    S.nextElection=Math.min(S.nextElection,S.turn+n);
    render();});
  const pc=document.getElementById("pmConfirm");
  if(pc){pc.onclick=()=>doPMName((document.getElementById("pmInput").value||"").trim());
    document.querySelectorAll("[data-pmname]").forEach(b=>b.onclick=()=>{document.getElementById("pmInput").value=b.dataset.pmname;});}
  const cc2=document.getElementById("chConfirm");
  if(cc2){cc2.onclick=()=>doChamberName((document.getElementById("chInput").value||"").trim());
    document.querySelectorAll("[data-chname]").forEach(b=>b.onclick=()=>{document.getElementById("chInput").value=b.dataset.chname;});}
  document.querySelectorAll("[data-dynskip]").forEach(b=>b.onclick=()=>doDynSkip());
  const sc=document.getElementById("skipCourt");if(sc)sc.onclick=()=>doSkipCourt();
  const db=document.getElementById("drawerBg");if(db)db.onclick=()=>{S.ui=S.ui||{};S.ui.chronOpen=false;render();};
  const dc=document.getElementById("chronClose");if(dc)dc.onclick=()=>{S.ui=S.ui||{};S.ui.chronOpen=false;render();};
  const ds=document.getElementById("dynSkip");if(ds)ds.onclick=()=>afterDynastic();
  const cn=document.getElementById("confirmName");
  if(cn){cn.onclick=()=>{const v=(document.getElementById("nameInput").value||"").trim()||S.pending.suggest[0];S.pending.done(v);S.pending=null;render();};
    document.querySelectorAll("[data-name]").forEach(b=>b.onclick=()=>{document.getElementById("nameInput").value=b.dataset.name;});}
}

const MILITARY_ACTS=["suppress","fund_army","tour"];
function doAction(id){
  if(MILITARY_ACTS.includes(id)) S._militaryLeaned=(S._militaryLeaned||0)+1;
  const a=ACTIONS.find(x=>x.id===id);if(!a||!affordable(S,a)){render();return;}
  let o;
  if(a.resolve){o=a.resolve(S);}
  else o={cost:adjCost(S,a),fac:Object.assign({},a.fac),effect:a.effect,chron:a.chron,out:Array.isArray(a.out)?pick(a.out):a.out};
  S._used=S._used||{};S._usedT=S._usedT||{};
  if(a.diminish&&o.fac&&o.fac[a.diminish]){
    const raw=(S._used[id]||0), idle=Math.floor((S.turn-(S._usedT[id]!=null?S._usedT[id]:S.turn))/3);
    const used=Math.max(0,raw-idle);
    o.fac[a.diminish]=Math.max(1,Math.round(o.fac[a.diminish]*Math.pow(0.55,used)));
    S._used[id]=used+1;
  } else { S._used[id]=(S._used[id]||0)+1; }
  S._usedT[id]=S.turn;
  if(a.cool)S.cooldowns[id]=S.turn+a.cool;
  applyOutcome(o,"dynastic");render();
}
function doEvent(i){
  const ev=S.currentEvent;const c=ev.choices[i];
  let o;
  if(c.resolve){o=c.resolve(S);if(c.cost)o.cost=Object.assign({},c.cost,o.cost||{});if(c.fac)o.fac=Object.assign({},c.fac,o.fac||{});}
  else o={cost:c.cost,fac:c.fac,effect:c.effect,chron:c.chron,out:c.out};
  if(c.courtRisk&&chance(0.18)){ // plague can reach the palace
    const vict=S.family.filter(p=>p.alive); if(vict.length){const v=pick(vict);v.alive=false;
      S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the fever reached the palace itself and took ${v.name} of the royal family.`});} }
  if(c.grantPetition){S.facs.merchants.strength=clamp(S.facs.merchants.strength+3);S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+3);}
  if(c.spurnPetition){const inst=institutionWithRight(S,"petition");if(inst)inst._spurned=(inst._spurned||0)+1;}
  S._events++;
  applyOutcome(o,"court");render();
}
function setTax(t){
  const lowering=TAX_ORDER.indexOf(t)<TAX_ORDER.indexOf(S.taxRate);
  const c=consentCheck(S,"tax");
  if(c.required&&!lowering&&!c.approve){
    S.result={out:`The ${c.inst.name} refuses its consent: its estates are too aggrieved to grant the Crown a new rate. Soothe them first — or find your revenue another way.`,fortune:"bad",next:"dynastic"};
    S.phase="outcome";render();return;
  }
  S.taxRate=t;
  S.chronicle.push({year:S.year,text:`In ${S.year}, the burden of taxation was set to ${TAX_TIERS[t].label.toLowerCase()}${c.required?(lowering?` to the glad approval of the ${c.inst.name}`:` with the consent of the ${c.inst.name}`):""}.`});
  S.result={out:`Taxation is now ${TAX_TIERS[t].label.toLowerCase()}. It will be felt in the treasury — and in the temper of those who pay.`,fortune:null,next:"dynastic"};
  S.phase="outcome";render();
}
function startReform(id){
  const r=REFORMS.find(x=>x.id===id);if(!r)return;
  const power=(S._reformPower!=null?S._reformPower:r.pdef);
  if(r.vetoable&&S.gov.crown.power>=40&&chance(0.3)){
    S.chronicle.push({year:S.year,text:`In ${S.year}, the Crown refused assent to the chamber's bill, and the prerogative survived another season.`});
    S.result={out:"The Crown refuses assent. While the throne keeps this much of its power, its veto is real — pare it further, or wait for a more pliant sovereign.",fortune:"bad",next:"dynastic"};
    S.phase="outcome";S.openReform=null;render();return;
  }
  const boonLine=(rr)=>{ const b=applyReformBoon(S,rr); if(!b)return "";
    if(b.tier==="duress")return "\n\nIt was not given. It was taken — and the realm will remember which.";
    if(b.tier==="petition")return "\n\nAsked for, and granted. Half the credit of a thing done unprompted, which is still more than none.";
    return "\n\nDone before anyone demanded it. That is worth more than the statute itself, and the realm knows it."; };
  if(r.noName){
    const line=r.enact(S,power);maybeTransform(S);S._reforms++;
    const bl=boonLine(r);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${line}`});
    S.result={out:"The statute passes, and the architecture of power shifts within the chambers themselves."+bl,fortune:null,next:"dynastic"};
    checkMilestones();S.phase="outcome";S.openReform=null;S._reformSrc=null;S._reformDest=null;render();return;
  }
  if(r.lawPick){
    const law=S._reformLaw||Object.keys(LAWS).filter(l=>l!==S.law)[0];
    const line=r.enact(S,0,law);maybeTransform(S);S._reforms++;
    const bl=boonLine(r);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${line}`});
    S.result={out:`The law of succession is remade. The court recalculates every ambition in the realm by nightfall.`+bl,fortune:null,next:"dynastic"};
    checkMilestones();S.phase="outcome";S.openReform=null;render();return;
  }
  S.pending={title:`Establish: ${r.name}`,blurb:r.blurb,suggest:r.nameSuggest,
    done:(name)=>{const line=r.enact(S,power,name);maybeTransform(S);S._reforms++;
      const bl=boonLine(r);
      S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${line}`});
      S.result={out:`The ${name} is established. You have reshaped what your throne is — and what you can do from it.`+bl,fortune:null,next:"dynastic"};
      checkMilestones();S.phase="outcome";S.openReform=null;S._reformPower=null;}};
  S.phase="naming";render();
}
function wedChild(cid,mode){
  const c=S.family.find(p=>p.id===cid&&p.alive); if(!c){afterDynastic();return;}
  if(mode==="none"){applyOutcome({chron:null,out:`${c.name} remains unwed — for now. The envoys will return.`},"endturn");render();return;}
  const sg=c.gender==="m"?"f":"m";
  const sp=makePerson(S,c.rel==="child"?"childspouse":"inlaw",sg,Math.max(17,c.age-4+rand(9)));
  sp.spouseId=c.id; c.spouseId=sp.id; S.family.push(sp);
  S._celebrate={label:`the wedding of ${c.name}`,turn:S.turn+1};
  if(mode==="foreign"){applyOutcome({cost:{gold:-12,arms:+3},
    chron:S=>`${c.name} of the royal house wed ${sp.name}, kin of a foreign crown.`,
    out:`A wedding of state. ${c.name} and ${sp.name} are joined — and two realms with them. Grandchildren may follow.`},"endturn");}
  else {applyOutcome({fac:{aristocracy:+6},
    chron:S=>`${c.name} of the royal house wed ${sp.name} of a great house of the realm.`,
    out:`Old blood binds to the crown. ${c.name} and ${sp.name} are joined; one great house moves closer to the throne.`},"endturn");}
  render();
}
function wedSpouse(){
  const sg=S.monarch.gender==="m"?"f":"m";
  const sa=S.monarch.age<=40?Math.max(17,S.monarch.age-6+rand(12)):(20+rand(16));
  S.family.forEach(p=>{ if(p.rel==="spouse"&&!p.alive)p.rel="kin"; });
  const sp=makePerson(S,"spouse",sg,sa); sp.spouseId=S.monarch.id; S.monarch.spouseId=sp.id; S.family.push(sp); S.married=true; return sp;
}
function doDyn(kind){
  if(kind==="marry_foreign"){const sp=wedSpouse();S._celebrate={label:"the royal wedding",turn:S.turn+1};applyOutcome({cost:{gold:-16,arms:+5},fac:{aristocracy:+3},
    chron:S=>`${styled(S,S.monarch)} wed ${sp.name}, kin of a foreign crown, binding two realms by vow.`,
    out:`Envoys, dowries, a wedding of two realms. ${sp.name}, ${sp.age}, is crowned consort — and the succession, in time, may follow.`},"endturn");}
  else if(kind==="marry_domestic"){const sp=wedSpouse();S._celebrate={label:"the royal wedding",turn:S.turn+1};applyOutcome({fac:{aristocracy:+8,provinces:-3},
    chron:S=>`${styled(S,S.monarch)} wed ${sp.name} of one of the realm's great houses, binding old blood to the throne.`,
    out:`A union of crown and country. ${sp.name}, ${sp.age}, is now consort; one great house is family, and the others take careful note.`},"endturn");}
  else if(kind==="marry_none"){applyOutcome({chron:null,out:"The envoys are dismissed with courtesy. The sovereign remains unwed — and the line remains a question."},"endturn");}
  else if(kind==="adopt"){const g=chance(0.5)?"m":"f";
    /* adopted INTO the house — the whole point of the instrument. Without
       recorded parents they are kin to nobody and inherit an empty court. */
    const ghost=PID++;
    const c=makePerson(S,"child",g,10+rand(6),null,[S.monarch.id,ghost]);
    c.adopted=true; S.family.push(c);S.designated=c.id;
    applyOutcome({fac:{aristocracy:-5},chron:S=>`the sovereign, without issue, adopted ${c.name} of a loyal house as heir; the great houses swallowed their objections, mostly.`,
      out:`${c.name}, ${c.age}, is adopted into the royal household and named heir. The line is secured — by ink rather than blood, which some will never forget.`},"endturn");}
  else if(kind==="ignore"){applyOutcome({chron:null,out:"You trust to fate. The court's whispering does not stop, but it quiets — for now."},"endturn");}
  else if(kind==="amb_embrace"){const sib=S.dyn.sib;
    if(chance(0.6)){sib.placated=true;applyOutcome({cost:{gold:-14},chron:S=>`the sovereign drew an ambitious sibling close with honours, and the ambition, well-fed, went to sleep.`,
      out:`${sib.name} kneels, laden with new titles, and the dangerous friends drift away. Ambition fed is ambition tamed — this time.`,fortune:"good"},"endturn");}
    else {S.rival=sib;applyOutcome({cost:{gold:-14},chron:S=>`the sovereign fed a sibling's ambition with honours, and the ambition grew teeth: ${sib.name} began to style themself a rightful claimant.`,
      out:`${sib.name} takes the titles — and keeps the friends. The honours read, from the outside, like a court-in-waiting. You have a rival.`,fortune:"bad"},"endturn");}}
  else if(kind==="amb_exile"){const sib=S.dyn.sib;sib.exiled=true;applyOutcome({fac:{aristocracy:-4},chron:S=>`an ambitious royal sibling was dispatched to a distant and honourable post, and the capital breathed easier.`,
    out:"A governorship at the edge of the map — prestigious, remote, and very far from the barracks. The threat recedes. The resentment travels with them."},"endturn");}
  else if(kind==="amb_ignore"){const sib=S.dyn.sib;
    if(chance(0.45)){S.rival=sib;applyOutcome({chron:S=>`the court watched a royal sibling's ambition and did nothing; ${sib.name} declared themself a claimant to the crown.`,
      out:`${sib.name} stops pretending. Letters patent, a badge, a retinue — a rival claimant in all but open war.`,fortune:"bad"},"endturn");}
    else applyOutcome({chron:null,out:"You watch, and wait, and the gathering... disperses. Perhaps it truly was nothing. You will never be sure."},"endturn");}
  else if(kind==="banners_fight"){const rv=S.dyn.rival;
    if(S.military>=45&&S.facs.officers.mood>=45){
      rv.exiled=true; if(S.rival&&S.rival.id===rv.id)S.rival=null;
      S._celebrate={label:"the breaking of the rising",turn:S.turn+1};
      applyOutcome({cost:{gold:-10,stability:+6,arms:-4},fac:{officers:+4},
        chron:S=>`the rival ${rv.name} raised banners against the crown and was broken in the field; the claim died with the rising.`,
        out:`The columns meet, and yours hold. ${rv.name} is taken, attainted, and shut away. No one will raise that banner again.`,fortune:"good"},"endturn");}
    else{
      const usurper=rv;
      applyOutcome({cost:{gold:-10},chron:null,out:""},"endturn"); S.result=null;
      crownPerson(usurper,S.house,true);
      S.legitPen=(S.legitPen||0)+10; S.stability=clamp(S.stability-12);
      S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the rising prevailed: the sovereign was deposed and died soon after in a quiet tower, and ${styled(S,S.monarch)} took the crown by right of victory.`});
      S.result={out:`Your regiments break. The palace gates open from the inside. You open your eyes behind those of ${styled(S,S.monarch)} — the usurper — and the realm learns to bow to the new order. Legitimacy will be a long time healing.`,fortune:"bad",next:"fresh"};
      checkMilestones(); S.phase="outcome";}}
  else if(kind==="banners_buy"){const rv=S.dyn.rival;
    rv.placated=true; if(S.rival&&S.rival.id===rv.id)S.rival=null;
    applyOutcome({cost:{gold:-28},fac:{aristocracy:+3},
      chron:S=>`the rival claim of ${rv.name} was bought out — gold, titles, and a renunciation under seal.`,
      out:`${rv.name} signs, richer and diminished. The banners are folded away. Expensive — and far cheaper than a war.`},"endturn");}
  else if(kind==="coup_resist"){
    const win=legitimacy(S)>=42||S.facs.aristocracy.mood>=55;
    if(win){ const old=S.regency.name; S.regency=newRegent(); S.legitPen=Math.max(0,(S.legitPen||0)-4);
      applyOutcome({cost:{stability:-6},fac:{aristocracy:-3},
        chron:S=>`the regent ${old} reached for the crown itself and was broken by the court; a new regency was sworn under closer watch.`,
        out:`The great houses, weighed, choose the child. ${old} is arrested at the council table and dies attainted. The new regent signs their oath in front of witnesses.`,fortune:"good"},"endturn");}
    else{
      const rg=S.regency;
      S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the child-sovereign ${styled(S,S.monarch)} died of a sudden fever — it is said — and the regent took the crown: the House of ${rg.house} was proclaimed.`});
      S.monarch.alive=false; // recorded via crownPerson below
      crownPerson({id:PID++,name:rg.given,gender:rg.gender,age:rg.age},rg.house,true);
      S.regency=null; S.legitPen=(S.legitPen||0)+12; S.stability=clamp(S.stability-15);
      S.result={out:`No one comes when you call. The child is "taken ill," the bells toll a week later, and ${styled(S,S.monarch)} is crowned amid careful silence. You open your eyes behind the usurper's — the will endures even this.`,fortune:"bad",next:"fresh"};
      checkMilestones(); S.phase="outcome";}}
  else if(kind==="coup_buy"){ S.regency.hostile=false;
    applyOutcome({cost:{gold:-26},chron:S=>`the regent's ambition was bought with lands and honours, and the child-crown was left in peace.`,
      out:"A duchy, hunting rights, a marriage for their heir. The regent, satisfied, remembers how to bow. Ambition postponed is not ambition ended."},"endturn");}
  else if(kind==="regent_indulge"){const fv={};fv[S.regency.favors]=+6;
    applyOutcome({cost:{gold:-10},fac:fv,chron:S=>`the regent's favourites were indulged, and the regency bought itself another quiet season.`,
    out:"Offices and grants flow to the regent's friends. The regency is placid — and a little more entrenched."},"endturn");}
  else if(kind==="regent_defy"){S.regency.hostile=true;S.legitPen=Math.max(0,(S.legitPen||0)-3);
    applyOutcome({cost:{stability:-5},chron:S=>`the child-crown's household defied the regent's reach, and the court split between them.`,
    out:"You check the regent's hand in open council. The child's authority is asserted — and the regent's patience ends. Everything will cost more now."},"endturn");}
  render();
}
function doDynSkip(){
  const d=S.dyn||{};
  if(d.kind==="ambition"&&chance(0.45)){ S.rival=d.sib;
    applyOutcome({chron:S=>`the court looked away from a sibling's ambition, and ${d.sib.name} declared themself a claimant to the crown.`,
      out:`You turn away — and ${d.sib.name} takes silence for weakness. A rival claimant stands.`,fortune:"bad"},"endturn"); render(); return; }
  if(d.kind==="childless") S.legitPen=(S.legitPen||0)+3;
  if(d.kind==="regent"){ S.regency.hostile=true;
    applyOutcome({chron:null,out:"You leave the regent unanswered — and unwatched. Their grip on the seals tightens."},"endturn"); render(); return; }
  if(d.kind==="regent_coup"){ S.regency.hostile=true; S.stability=clamp(S.stability-6);
    applyOutcome({chron:null,out:"The court averts its eyes, and the moment — this time — passes. The regent's retainers do not go home.",fortune:"bad"},"endturn"); render(); return; }
  if(d.kind==="banners"){ S.stability=clamp(S.stability-6); S.legitPen=(S.legitPen||0)+3;
    applyOutcome({chron:null,out:"You refuse to meet the challenge — and the realm watches a crown ignore an army. The rising grows bolder.",fortune:"bad"},"endturn"); render(); return; }
  applyOutcome({chron:null,out:"You turn from family matters to the business of the realm. The court notices what the sovereign neglects."},"endturn"); render();
}
function doCelebrate(){
  if(!S._celebrate)return;
  const lbl=S._celebrate.label; S._celebrate=null;
  S.legitPen=Math.max(0,(S.legitPen||0)-3);
  applyOutcome({cost:{gold:-14,stability:+7},fac:{peasantry:+4,aristocracy:+2},
    chron:S=>`the realm was given over to celebration of ${lbl}, and for a season crown and country rejoiced together.`,
    out:`Bells, bonfires, an amnesty for small debts. The realm celebrates ${lbl} — and remembers, for a while, why it puts up with you.`},"dynastic");
  render();
}
function doSkipCourt(){
  const d=S._courtDid||{};
  if(d.act||d.reform||d.tax){ endCourt(); return; }   /* you governed; you are simply finished */
  S.legitPen=(S.legitPen||0)+6; S.stability=clamp(S.stability-4);
  S._courtKind="act";
  applyOutcome({chron:null,out:"The season passes ungoverned. Petitions gather dust, the court drifts, and the realm quietly notes the empty chair."},"dynastic");
  render();
}
function doDesignate(pid){ return doWillDesignate(pid,"dynastic"); }
function doSuccHeir(keepName){
  const heir=heirOf(S);if(!heir)return;
  const oldName=S.monarch.name;
  const wasTrained=S._heirTrained;S._heirTrained=null;
  crownPerson(heir,S.house,false);
  if(keepName){S.monarch.birthName=S.monarch.name;S.monarch.name=oldName;S.monarch.regnal=regnalFor(S,oldName,S.house);}
  if(wasTrained==="court")S.facs.clergy.mood=clamp(S.facs.clergy.mood+4);
  if(wasTrained==="army")S.facs.officers.mood=clamp(S.facs.officers.mood+4);
  S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, the crown passed to ${styled(S,S.monarch)}${S.regency?", a child, under the guard of a regency":""}; the possession of power went on unbroken.`});
  S.result={out:pmGoverns(S)?`The old sovereign is laid to rest, and ${styled(S,S.monarch)} is proclaimed — but the seals of government stay on your desk. The palace changes its portrait; the ministry does not change its address.`:`The old sovereign is laid to rest, and you open your eyes behind those of ${styled(S,S.monarch)}. ${S.regency?"A regency holds the seals until they come of age — hungry years for every faction with an appetite.":"The face has changed. The hand on the wheel has not."}`,fortune:null,next:"endturn2"};
  checkMilestones();S.phase="outcome";
  // special: continue into fresh turn after outcome
  S.result.next="fresh";
  render();
}
function doSuccAncestral(nm){
  const heir=heirOf(S);if(!heir)return;
  const wasTrained=S._heirTrained;S._heirTrained=null;
  crownPerson(heir,S.house,false);
  S.monarch.birthName=S.monarch.name; S.monarch.name=nm; S.monarch.regnal=regnalFor(S,nm,S.house);
  S.stability=clamp(S.stability+4); S.legitPen=Math.max(0,(S.legitPen||0)-3);
  if(wasTrained==="court")S.facs.clergy.mood=clamp(S.facs.clergy.mood+4);
  if(wasTrained==="army")S.facs.officers.mood=clamp(S.facs.officers.mood+4);
  S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, the crown passed to ${styled(S,S.monarch)} — born ${S.monarch.birthName}, crowned under an ancestral name, that the realm might feel the old thread unbroken.`});
  S.result={out:pmGoverns(S)?`${styled(S,S.monarch)} is proclaimed under a name the realm already loves — while the seals stay on your desk.`:`You open your eyes behind those of ${styled(S,S.monarch)} — a new sovereign wearing an old and steadying name.`,fortune:null,next:"fresh"};
  checkMilestones();S.phase="outcome";render();
}
function doSuccSibling(pid){
  const sib=S.family.find(p=>p.id===pid&&p.alive);if(!sib)return;
  crownPerson(sib,S.house,true);
  S.stability=clamp(S.stability-6);
  S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, with the direct line failed, the crown passed sidelong to ${styled(S,S.monarch)}, and the House of ${S.house} endured by a branch.`});
  S.result={out:`The House survives through its ${S.monarch.gender==="m"?"brother":"sister"}. The step is contested in whispers — but the whispers stay whispers, and you go on.`,fortune:null,next:"fresh"};
  checkMilestones();S.phase="outcome";render();
}
function doNewHouse(i){
  const c=S._crisisCands[i];const byArms=S._crisisMode==="arms";
  // costs of the crisis path
  if(byArms){S.stability=clamp(S.stability-14);S.military=clamp(S.military-10);S.treasury-=25;
    S.facs.officers.mood=clamp(S.facs.officers.mood+4);S.facs.peasantry.mood=clamp(S.facs.peasantry.mood-6);}
  else {S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+8);S.facs.merchants.mood=clamp(S.facs.merchants.mood+6);}
  const oldHouse=S.house;
  crownPerson({id:PID++,name:c.name,gender:c.gender,age:c.age},c.house,true);
  S._crisisMode=null;S._crisisCands=null;
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the House of ${oldHouse} ended, and by ${byArms?"the fortune of war":"the choice of the great houses"} the crown passed to ${styled(S,S.monarch)} of the new House of ${c.house}.`});
  S.result={out:`The banners over the palace change. You open your eyes behind those of ${styled(S,S.monarch)} — a new House, a new court, the same unbroken will. ${byArms?"The war's scars will take a generation to fade.":"Gold chose this crown; gold will expect gratitude."}`,fortune:null,next:"fresh"};
  checkMilestones();S.phase="outcome";render();
}
function doContested(side){
  const so=successionOptions(); if(so.mode!=="contested")return;
  const heir=so.heir, rv=so.rival;
  if(side==="rival"){
    crownPerson(rv,S.house,true); S.legitPen=(S.legitPen||0)+6; S.stability=clamp(S.stability-8);
    if(heir&&heir.alive&&heir.age>=14&&chance(0.5)) S.rival=heir; 
    S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the crown passed not to the heir but to the claimant: ${styled(S,S.monarch)} was crowned over the lawful line, and the realm swallowed it.`});
    S.result={out:`You back the claimant, and the claimant wins by your backing. ${styled(S,S.monarch)} is crowned.${S.rival?` ${S.rival.name}, passed over, does not kneel quite low enough — the wheel turns again.`:""}`,fortune:null,next:"fresh"};
    checkMilestones(); S.phase="outcome"; render(); return;
  }
  const win=S.military>=45&&S.facs.officers.mood>=45;
  S.stability=clamp(S.stability-4);
  if(win){
    rv.exiled=true; S.rival=null;
    if(side==="heir"&&heir){
      S.military=clamp(S.military-5);
      S._celebrate={label:"the victory of the lawful crown",turn:S.turn+1};
      crownPerson(heir,S.house,false);
      S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, the claimant's rising was broken at the succession, and ${styled(S,S.monarch)} was crowned in lawful right over a defeated rival.`});
      S.result={out:`The claim is tested and found wanting. ${rv.name} is taken and shut away; ${styled(S,S.monarch)} is crowned with the smoke still in the air.`,fortune:"good",next:"fresh"};
      checkMilestones(); S.phase="outcome"; render(); return;
    }
    S.chronicle.push({year:S.year,text:`In ${S.year}, the claimant's rising was broken; the succession remained to be settled by law.`});
    render(); return; // fall through to the ordinary crisis, rival removed
  }
  crownPerson(rv,S.house,true); S.legitPen=(S.legitPen||0)+10; S.stability=clamp(S.stability-10);
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, the claimant's army settled the succession: ${styled(S,S.monarch)} took the crown over the lawful line by right of victory.`});
  S.result={out:`The trial of strength goes against you. ${styled(S,S.monarch)} is crowned by the sword — and you, as ever, open your eyes behind the winner's.`,fortune:"bad",next:"fresh"};
  checkMilestones(); S.phase="outcome"; render();
}
function doExtinct(){
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, with the line failed and no appetite left for kings, the ${S.gov.institutions[0]?S.gov.institutions[0].name:"chamber"} declared the crown of ${S.nation} extinct. There was no proclamation of a new sovereign — because there was no sovereign. The chronicle of the crown ends here; what ${S.nation} became next is another book.`});
  S.ended=true; S.phase="ended"; render();
}
function renderEnded(){
  return `<div class="eyebrow">The chronicle closes</div><div class="sit-title">The Sovereign Is No More</div>
    <div class="sit-text">The crown of ${esc(S.nation)} is extinct — laid down, unclaimed, unmourned by half the realm and quietly grieved by the other. The will that governed through ${S._successions+1} sovereigns has no throne left to stand behind. A republic waits beyond this page, but that is a different chronicle.</div>
    <div class="sit-text">Open <b>Legacy</b> for the historian's verdict on all you built — or begin a new reign.</div>`;
}
function doElect(i){
  const c=S._electCands[i];S._electCands=null;
  const oldHouse=S.house;const sameHouse=c.house===oldHouse;
  S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood+6);
  if(c.kin){ const kp=S.family.find(x=>x.id===c.personId);
    if(kp){ crownPerson(kp,S.house,false); }
    else { crownPerson({id:PID++,name:c.name,gender:c.gender,age:c.age},c.house,!sameHouse); } }
  else crownPerson({id:PID++,name:c.name,gender:c.gender,age:c.age},c.house,!sameHouse);
  S.chronicle.push({year:S.year,cls:"reign",text:`In ${S.year}, the houses elected ${styled(S,S.monarch)} of House ${c.house} to the crown of ${S.nation}.`});
  S.result={out:`The election falls where you willed it. You open your eyes behind those of ${styled(S,S.monarch)}. The electors expect to be remembered.`,fortune:null,next:"fresh"};
  checkMilestones();S.phase="outcome";render();
}

/* continue handler for "fresh" (post-succession) */
document.addEventListener("click",e=>{
  // handled via wire(); this is a safety net for the fresh path
});


