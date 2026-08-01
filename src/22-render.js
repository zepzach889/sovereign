"use strict";
/* =====================================================================
   RENDER
   ===================================================================== */
const app=document.getElementById("app");
const ctrls=document.getElementById("ctrls");
function h(html){const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstChild;}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}

function costChips(cost,fac,consentRight){
  let out="";const R={gold:"gold",arms:"Arms",stability:"Stability"};
  if(cost){for(const k of["gold","arms","stability"]){if(cost[k]){const up=cost[k]>0;out+=`<span class="chip ${up?"up":"down"}">${up?"+":""}${cost[k]} ${R[k]}</span>`;}}}
  if(fac){for(const k in fac){if(fac[k]&&S.facs[k]){const up=fac[k]>0;out+=`<span class="chip fac ${up?"up":"down"}">${S.facs[k].name} ${up?"+":""}${fac[k]}</span>`;}}}
  if(consentRight){const c=consentCheck(S,consentRight);if(c.required){out+=`<span class="chip consent">${esc(c.inst.name)}: standing ${Math.round(c.mood)} vs required ${Math.round(c.threshold)} — ${c.approve?"will grant":"will refuse"}</span>`;}}
  return out;
}
function meter(label,val,hue){const warn=val<=20?" warn":"";
  return `<div class="meter"><div class="mtop"><span class="mlbl">${label}</span><span class="mval" style="color:${hue}">${val}</span></div>
    <div class="track${warn}"><div class="fill" style="width:${val}%;background:${hue}"></div></div></div>`;}

function phaseStrip(){
  const steps=[];
  if(S.phase==="tidings")steps.push(["tidings","Tidings"]);
  if(S.phase==="election")steps.push(["election","Election"]);
  steps.push(["event","Event"],["court","Court"],["advance","Advancement"],["dynastic","Dynasty"]);
  if(S.phase==="dyncourt"||S.phase==="match"||S.phase==="designate")steps[steps.length-1]=["dyncourt","Dynasty"];
  return `<div class="phasestrip">${steps.map(([k,l])=>{
    const cls=(S.phase===k||(k==="event"&&S.phase==="quiet"))?"now":(S.phaseDone[k]?"done":"");
    return `<div class="phasestep ${cls}">${l}</div>`;}).join("")}</div>`;
}

function relLabel(p){
  // in-laws take their meaning from whoever they married — never stored, always derived
  if((p.rel==="inlaw"||p.rel==="childspouse")&&p.spouseId&&typeof S!=="undefined"&&S){
    const sp=(S.family||[]).find(x=>x.id===p.spouseId)||((S.ancestors||[]).find(x=>x.id===p.spouseId));
    if(sp&&sp.rel&&sp.rel!==p.rel){
      switch(sp.rel){
        case "child": return p.gender==="m"?"son-in-law":"daughter-in-law";
        case "sibling": return p.gender==="m"?"brother-in-law":"sister-in-law";
        case "uncle": return p.gender==="m"?"uncle by marriage":"aunt by marriage";
        case "nephew": return p.gender==="m"?"nephew by marriage":"niece by marriage";
        case "grandchild": return p.gender==="m"?"grandson-in-law":"granddaughter-in-law";
      }
    }
  }
  switch(p.rel){
    case "child": return p.gender==="m"?"son":"daughter";
    case "sibling": return p.gender==="m"?"brother":"sister";
    case "spouse": return "consort";
    case "dowager": return p.gender==="f"?"dowager":"consort dowager";
    case "uncle": return p.gender==="m"?"uncle":"aunt";
    case "childspouse": return p.gender==="m"?"son-in-law":"daughter-in-law";
    case "grandchild": return p.gender==="m"?"grandson":"granddaughter";
    case "inlaw": return p.gender==="m"?"brother-in-law":"sister-in-law";
    case "nephew": return p.gender==="m"?"nephew":"niece";
    case "former": return "of the old house";
    case "parent": return p.gender==="m"?"father":"mother";
    case "grandparent": return p.gender==="m"?"grandfather":"grandmother";
    default: return "cousin";
  }
}
function monarchLine(){
  const t=traitShown(S.monarch);
  const bits=[];
  if(t)bits.push(`<span class="trait ${t.sure?"sure":""}">${t.sure?"":"“"}${esc(t.text)}${t.sure?"":"”"}</span>`);
  if(S.regency)bits.push(`<span class="office" style="color:var(--crisis)">${esc(S.regency.name)} holds the seals</span>`);
  return bits.length?`<div class="person mon"><span class="pr">the sovereign</span><span>${esc(styled(S,S.monarch))}, ${S.monarch.age}</span>${bits.join("")}</div>`:"";
}
function provincePanel(){
  const ps=provinces(S); if(!ps.length)return "";
  const lost=(S.lostProvinces||[]).length;
  return `<div class="provs"><div class="gt">The Country <span style="color:var(--dim);letter-spacing:.04em">— loyalty of each province</span></div>
    ${ps.map(p=>{
      const gov=p.governor?(S.family||[]).find(x=>x.id===p.governor&&x.alive):null;
      const cls=p.loyalty<24?"crit":p.loyalty<32?"warn":"";
      return `<div class="prov ${cls}"><span class="pvn">${esc(p.name)}${p.core?' <small>· the seat of the crown</small>':""}${gov?` <small>· ${esc(gov.name)} governs</small>`:""}</span>
        <span class="pvl">${Math.round(p.loyalty)} <small>${provinceLabel(p.loyalty)}</small></span></div>`;}).join("")}
    ${lost?`<div class="prov gone"><span class="pvn">Lost: ${(S.lostProvinces||[]).map(x=>esc(x.name)+" ("+x.year+")").join(", ")}</span></div>`:""}
  </div>`;
}
function familyPanel(){
  if(!isMonarchy(S))return "";
  const rows=[];
  const monRow=monarchLine(); if(monRow)rows.push(monRow); const h=heirOf(S);
  const order={spouse:0,child:1,childspouse:2,grandchild:3,sibling:4,dowager:5,uncle:6,kin:7};
  const fam=S.family.filter(p=>!p.outHouse&&(p.alive||p.rel==="spouse"||p.rel==="child"||(p.diedTurn!=null&&S.turn-p.diedTurn<=2))).slice().sort((a,b)=>((order[a.rel]!=null?order[a.rel]:9)-(order[b.rel]!=null?order[b.rel]:9))||b.age-a.age);
  fam.forEach(p=>{ const tr=traitShown(p);
    rows.push(`<div class="person ${p.alive?"":"dead"}"><span class="pr">${relLabel(p)}</span>
    <span>${esc(p.name)}, ${p.age}</span>${tr?`<span class="trait ${tr.sure?"sure":""}">${tr.sure?"":"“"}${esc(tr.text)}${tr.sure?"":"”"}</span>`:""}${p.job?`<span class="office">${esc(((typeof ROLES!=="undefined"?ROLES:[]).find(r=>r.id===p.job)||{}).name||"")}</span>`:""}${p.love?`<span class="office" style="color:#c76b8a">love match</span>`:""}${(function(){
      if(!p.spouseId)return "";
      const sp=(S.family||[]).find(x=>x.id===p.spouseId)||((S.monarch&&S.monarch.id===p.spouseId)?S.monarch:null);
      return sp?`<span class="wed">⚭ ${esc(sp.name)}${sp.alive===false?" †":""}</span>`:"";})()}${h&&h.id===p.id?`<span class="heirmark">— heir</span>`:""}${S.rival&&S.rival.id===p.id?`<span class="rival">— rival claimant</span>`:""}${p.exiled?`<span class="rival" style="color:var(--dim)">— exiled</span>`:""}</div>`); });
  if(!rows.length) rows.push(`<div class="person"><span class="pr">—</span><span style="color:var(--dim);font-style:italic">no living kin of note</span></div>`);
  return `<div class="family"><div class="gt"><span>The Royal Family</span><span class="lawpill">${LAWS[S.law].name} succession${spouseOf(S)?" · wed":""}</span></div>${rows.join("")}</div>`;
}

function render(){
  if(!S){renderSetup();ctrls.style.display="none";return;}
  refreshRelations(S);
  ctrls.style.display="flex";
  const legit=legitimacy(S),net=netIncome(S);
  const instHtml=S.gov.institutions.map(i=>`
    <div class="powerrow"><span class="pn">${esc(i.name)} <small>· ${i.composition}</small></span>
      <span class="powerbar chamber"><i style="width:${i.power}%"></i></span><span class="pp">${i.power}</span></div>
    <div class="rights">${i.rights.filter(r=>r!=="petition").length?"consent over "+i.rights.filter(r=>r!=="petition").join(", "):"advisory"}${i.rights.includes("petition")?" · may petition":""}</div>`).join("");
  const govHtml=`<div class="gov">
    <div class="gt"><span>The Government of ${esc(S.nation)}</span><span class="house">House of ${esc(S.house)}</span></div>
    <div class="hos">${esc(styled(S,S.monarch))} <small>· aged ${S.monarch.age}</small></div>
    ${S.pm?`<div class="hos" style="margin-top:4px">${esc(S.pm.office)}: ${esc(S.pm.holder)}, ${S.pm.age} <small>· ${esc(S.facs[S.pm.bloc].name)} interest — you govern from this desk</small></div>
    <div class="legit-src" style="margin:2px 0 0">Next election: turn ${S.nextElection} (~${S.year+(S.nextElection-S.turn)*4}). The estates ARE the electorate — their mood and influence decide it; a vote of no confidence falls if your bloc drops below 30.</div>`:""}
    <div class="legit-src" style="margin:4px 0 0">The Crown is ${crownBand(S).label} — ${crownBand(S).desc}.</div>
    ${S.regency?`<div class="regency">A regency governs in the sovereign's minority — ${esc(S.regency.name)} holds the seals.</div>`:""}
    <div class="powerrow"><span class="pn">The Crown</span><span class="powerbar"><i style="width:${S.gov.crown.power}%"></i></span><span class="pp">${S.gov.crown.power}</span></div>
    ${instHtml}${S.gov.cabinet?`<div class="rights" style="margin-left:0;margin-top:6px">Cabinet: ${esc(S.gov.cabinet)} — action costs −10% · the realm develops and steadies more readily</div>`:""}${S.gov.charter?`<div class="rights" style="margin-left:0">Charter: ${esc(S.gov.charter)}</div>`:""}
  </div>`;
  const facHtml=Object.keys(S.facs).map(k=>{const f=S.facs[k];
    const hue=f.mood>=60?"var(--good)":f.mood>=42?"var(--brass)":"var(--crisis)";
    const txt=f.mood>=72?"devoted":f.mood>=58?"content":f.mood>=44?"uneasy":f.mood>=30?"resentful":"seething";
    const dl=f.present&&f.delta?`<span class="fd ${f.delta>0?"up":"dn"}">${f.delta>0?"▲":"▼"}${Math.abs(f.delta)}</span>`:"";
    return `<div class="fac${f.present?"":" dormant"}"><div class="frow"><span class="fn">${esc(f.name)}${f.present?` <small>· influence ${f.strength}</small>`:""}</span>
      <span class="fm">${f.present?txt+" "+Math.round(f.mood):"not yet"}${dl}</span></div>
      <span class="ft"><i style="width:${f.present?f.mood:0}%;background:${hue}"></i></span></div>`;}).join("");

  let main="";
  if(S.phase==="event")main=renderEvent();
  else if(S.phase==="quiet")main=renderQuiet();
  else if(S.phase==="tidings")main=renderTidings();
  else if(S.phase==="election")main=renderElection();
  else if(S.phase==="pmname")main=renderPmName();
  else if(S.phase==="chname")main=renderChName();
  else if(S.phase==="court")main=renderCourt();
  else if(S.phase==="dynastic")main=renderDynastic()+(S.dyn?dynSkipBtn():"");
  else if(S.phase==="succession")main=renderSuccession();
  else if(S.phase==="naming")main=renderNaming();
  else if(S.phase==="advance")main=renderAdvance();
  else if(S.phase==="dyncourt")main=renderDynCourt();
  else if(S.phase==="match")main=renderMatch();
  else if(S.phase==="designate")main=renderDesignate();
  else if(S.phase==="rolepick")main=renderRolePick();
  else if(S.phase==="regentpick")main=renderRegentPick();
  else if(S.phase==="housefate")main=renderHouseFate();
  else if(S.phase==="juntaexit")main=renderJuntaExit();
  else if(S.phase==="repvote")main=renderRepVote();
  else if(S.phase==="convention")main=renderConvention();
  else if(S.phase==="congress")main=renderCongress();
  else if(S.phase==="transition")main=renderTransition();
  else if(S.phase==="terror")main=renderTerror();
  else if(S.phase==="civilpick")main=renderCivil();
  else if(S.phase==="ended")main=renderEnded();
  else if(S.phase==="outcome")main=renderOutcome();

  const treasNeg=S.treasury<0?"neg":"";const netCls=net>=0?"net-pos":"net-neg";
  const chronOpen=S.ui&&S.ui.chronOpen;
  const el=h(`<div><div class="grid">
    <aside class="side">
      <div class="nationname">${esc(S.nation)}</div>
      <div class="regime">${esc(regimeLabel(S))} · ${esc(eraDef(S).name)} age</div>
      <div class="yearrow"><span class="yearnum">${S.year}</span><span class="yearlbl">legacy ${legacyScore()}</span></div>
      <div class="meters">${meter("Stability",S.stability,"var(--blue)")}${meter("Arms",S.military,"var(--rust)")}${meter("Legitimacy",legit,"var(--sage)")}</div>
      <div class="budget">
        <div class="bx"><span class="bk">Treasury</span><span class="bv treasury-v ${treasNeg}">${S.treasury<0?"−":""}${Math.abs(S.treasury)}${S.debt>0?` (credit left ${Math.max(0,40+(S._creditBonus||0)+S.treasury)})`:""}</span></div>
        <div class="bx"><span class="bk">Income</span><span class="bv">+${income(S)}</span></div>
        <div class="bx"><span class="bk">Upkeep</span><span class="bv">−${upkeep(S)}</span></div>
        <div class="bx"><span class="bk">Net / turn</span><span class="bv ${netCls}">${net>=0?"+":"−"}${Math.abs(net)}</span></div>
        <div class="grow"></div><span class="taxpill">Tax: ${TAX_TIERS[S.taxRate].label}</span>
      </div>
      <div class="bkline"><button class="bktog" id="bkTog">${(S.ui&&S.ui.budgetOpen)?"hide the reckoning ▴":"how is this figured? ▾"}</button></div>
      ${(S.ui&&S.ui.budgetOpen)?`<div class="budgetbreak">${budgetBreakdown(S)}</div>`:""}
      <div class="kbox"><span class="kk">Knowledge</span><span class="kv">${S.knowledge.toFixed(1)} <small style="color:var(--dim);font-size:10px">+${knowledgeIncome(S).toFixed(2)}/yr</small></span></div>
      <div class="legit-src" style="margin:7px 0 0">${legitSources(S)}</div>
      ${juntaPanel(S)}
      ${mandatePanel(S)}
      ${planPanel(S)}

      <div class="facs"><div class="gt">The Powers of the Realm <span style="color:var(--dim);letter-spacing:.04em">— number = influence, bar = mood</span></div>${facHtml}</div>
      ${pressurePanel(S)}
      ${provincePanel()}
    </aside>
    <section class="console">
      ${phaseStrip()}
      ${govHtml}
      ${familyPanel()}
      <div class="mainpanel">${main}</div>
    </section>
  </div>
  <div class="drawerbg${chronOpen?" open":""}" id="drawerBg"></div>
  <aside class="chron${chronOpen?" open":""}">
    <div class="ch-head"><span class="ch-title">The Chronicle of ${esc(S.nation)}</span><span class="ch-sub">the history your choices have written</span>
      <button class="chronclose" id="chronClose">Close ✕</button></div>
    <div class="dynasty">House of <b>${esc(S.house)}</b> · sovereign ${S.lineage.length+1} · since ${S.startYear}${S._houseBreaks?` · ${S._houseBreaks} house${S._houseBreaks>1?"s":""} fallen`:""}</div>
    <div class="ch-scroll" id="chronScroll">${S.chronicle.map(e=>`<p class="${e.cls||""}">${esc(e.text)}</p>`).join("")}</div>
  </aside></div>`);
  app.innerHTML="";app.appendChild(el);
  const cs=document.getElementById("chronScroll");if(cs)cs.scrollTop=cs.scrollHeight;
  wire();
}

function renderAdvance(){
  const era=eraDef(S), ei=eraIdx(S);
  const advs=availableAdvances(S), wks=availableWorks(S);
  const held=foundationsHeld(S,ei);
  const nextEra=ERAS[ei+1];
  const advHtml=advs.map(a=>{
    const c=advCost(S,a), aff=S.knowledge>=c, ahead=a.era>ei;
    return `<button class="choice adv-${a.dom}" data-buyadv="${a.id}" ${aff?"":"disabled"}>
      <div class="cl"><span class="mk">${a.found?"✦":"·"}</span><span class="lbl">${esc(a.name)}${ahead?" — of the coming age":""}</span></div>
      <div class="ch">${esc(a.blurb)}</div>
      <div class="costs"><span class="chip know">${c} knowledge</span>${a.found?`<span class="chip up">foundation</span>`:""}${ahead?`<span class="chip down">reached for early</span>`:""}
        ${Object.keys(a.fac||{}).map(k=>`<span class="chip fac ${a.fac[k]>0?"up":"down"}">${S.facs[k].name} ${a.fac[k]>0?"+":""}${a.fac[k]}</span>`).join("")}</div>
      <div class="ch" style="color:var(--brass-dim);margin-top:3px">${esc(a.gives)}</div>
      ${aff?"":`<div class="why">The realm does not yet know enough.</div>`}
    </button>`;}).join("");
  const wkHtml=wks.map(w=>{
    const n=workCount(S,w.id), g=workGold(S,w), y=workYield(w,n);
    const aff=S.treasury-g>-(40+(S._creditBonus||0));
    return `<button class="choice adv-works" data-buywork="${w.id}" ${aff?"":"disabled"}>
      <div class="cl"><span class="mk">⌂</span><span class="lbl">${esc(w.name)}${n?` — a further foundation (${n} standing)`:""}</span></div>
      <div class="ch">${esc(w.blurb)}</div>
      <div class="costs"><span class="chip down">−${g} gold</span><span class="chip know">+${y.toFixed(2)} knowledge/yr, forever</span>${n?`<span class="chip">${workMax(w)-n} more may be founded</span>`:""}
        ${Object.keys(w.fac||{}).map(k=>`<span class="chip fac ${w.fac[k]>0?"up":"down"}">${S.facs[k].name} ${w.fac[k]>0?"+":""}${w.fac[k]}</span>`).join("")}</div>
      ${aff?"":`<div class="why">The treasury cannot bear this.</div>`}
    </button>`;}).join("");
  return `<div class="eyebrow">The advancement of the realm</div>
    <div class="sit-title">${esc(era.name)}</div>
    <div class="sit-text">${esc(era.blurb)} The realm holds <b>${S.knowledge.toFixed(1)} knowledge</b>, gaining about ${knowledgeIncome(S).toFixed(2)} a year.
      ${nextEra?`Two foundations (✦) carry ${esc(S.nation)} into the age of ${esc(nextEra.name)} — you hold <b>${held} of 2</b>.`:"The realm stands at the furthest edge of what this world yet knows."}</div>
    <div class="subhead">Advances — bought with knowledge</div>
    <div class="choices">${advHtml||`<div class="sit-text">Nothing further is within reach in this age.</div>`}</div>
    ${(function(){const held=WORKS.filter(w=>workCount(S,w.id)>0);
      if(!held.length)return "";
      return `<div class="subhead">The realm's foundations</div>
        <div class="register">${held.map(w=>{const n=workCount(S,w.id);let y=0;for(let i=0;i<n;i++)y+=workYield(w,i);
          return `<div class="regrow"><span class="rn">${esc(w.name)}${n>1?` ×${n}`:""}</span><span class="rv">+${y.toFixed(2)}/yr</span></div>`;}).join("")}
          <div class="regrow tot"><span class="rn">All foundations</span><span class="rv">+${worksKnowledge(S).toFixed(2)}/yr</span></div></div>`;})()}
    <div class="subhead">Works — built with gold, and paying knowledge forever</div>
    <div class="choices">${wkHtml||`<div class="sit-text">No new works can be founded in this age.</div>`}</div>
    <div class="choices"><button class="choice" data-skipadv="1">
      <div class="cl"><span class="mk">›</span><span class="lbl">Fund nothing this season</span></div>
      <div class="ch">the knowledge keeps; the realm waits</div></button></div>`;
}
function doBuyAdvance(id){
  const a=ADVANCES.find(x=>x.id===id); if(!a)return;
  const c=advCost(S,a); if(S.knowledge<c)return;
  S.knowledge=Math.round((S.knowledge-c)*10)/10;
  S.advances.push(a.id);
  for(const k in (a.fac||{})) S.facs[k].mood=clamp(S.facs[k].mood+a.fac[k]);
  if(a.effect)a.effect(S);
  S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${S.nation} took up ${a.name.replace(/^The /,"the ")}. ${a.gives}`});
  const crossed=checkEraAdvance(S);
  S.result={out:`${a.blurb}\n\n${crossed?`And with it the realm crosses into a new age: ${eraDef(S).name}. The business of the court will not be what it was.`:a.gives}`,fortune:crossed?"good":null,next:"advance"};
  S.phase="outcome"; checkMilestones(); render();
}
function doBuyWork(id){
  const w=WORKS.find(x=>x.id===id); if(!w)return;
  const n=workCount(S,w.id), g=workGold(S,w), y=workYield(w,n);
  S.treasury-=g;
  S.workCount=S.workCount||{}; S.workCount[w.id]=n+1;
  if(!S.works.includes(w.id))S.works.push(w.id);
  for(const k in (w.fac||{})) S.facs[k].mood=clamp(S.facs[k].mood+w.fac[k]);
  if(w.effect)w.effect(S);
  S.chronicle.push({year:S.year,text:`In ${S.year}, ${n?`a further ${w.name.replace(/^The /,"")}`:w.name.replace(/^The /,"the ")} was founded at the crown's charge.`});
  S.result={out:`${w.blurb}\n\nIt will yield ${y.toFixed(2)} knowledge a year for as long as ${S.nation} stands${n?` — the realm now keeps ${n+1} of them.`:"."}`,fortune:null,next:"advance"};
  S.phase="outcome"; render();
}
function renderCourt(){
  const tabs=`<div class="tabs">
    <button data-tab="govern" class="${S.tab==="govern"?"on":""}">Govern</button>
    <button data-tab="reforms" class="${S.tab==="reforms"?"on":""}">Reforms${availableReforms(S).length?` (${availableReforms(S).length})`:""}</button>
    <button data-tab="policy" class="${S.tab==="policy"?"on":""}">Taxation</button>

  </div>`;
  let body="";
  if(S.tab==="govern"){
    const acts=availableActions(S);
    const celeb=(S._celebrate&&S._celebrate.turn===S.turn)?`<button class="choice" data-celebrate="1" style="border-color:var(--brass-dim)">
        <div class="cl"><span class="mk">✦</span><span class="lbl">Proclaim a celebration of ${esc(S._celebrate.label)}</span></div>
        <div class="ch">a realm given a reason to rejoice — this season only</div>
        <div class="costs"><span class="chip down">-14 gold</span><span class="chip up">+7 Stability</span><span class="chip up">Legitimacy steadies</span><span class="chip fac up">Peasantry +4</span><span class="chip fac up">Aristocracy +2</span><span class="chip">one season only</span></div>
      </button>`:"";
    S.ui=S.ui||{}; S.ui.shut=S.ui.shut||{};
    const groups={};
    acts.forEach(a=>{ const d=actDomain(a); (groups[d]=groups[d]||[]).push(a); });
    const card=(a0,idx)=>{
      const a=actView(S,a0);
      const aff=affordable(S,a0);const chips=costChips(adjCost(S,a0),a0.fac,a0.consent);
      const isNew=(S._newActs||[]).includes(a.id);
      return `<button class="choice dom-${actDomain(a)}${isNew?" isnew":""}" data-act="${a.id}" ${aff?"":"disabled"}>
        <div class="cl"><span class="mk">${idx+1}</span><span class="lbl">${esc(a.label)}${isNew?`<span class="newtag">new this age</span>`:""}</span></div>
        <div class="ch">${esc(a.hint)}</div>
        <div class="costs">${chips||`<span class="chip">no direct cost</span>`}${a.gain?`<span class="chip up">${esc(a.gain)}</span>`:""}</div>
        ${aff?"":`<div class="why">The treasury cannot bear this.</div>`}
      </button>`;};
    let n=0;
    const groupHtml=DOM_ORDER.filter(d=>groups[d]&&groups[d].length).map(d=>{
      const shut=!!S.ui.shut[d];
      const inner=groups[d].map(a=>card(a,++n)).join("");
      return `<div class="domgroup ${shut?"shut":""}">
        <div class="domhead" data-dom="${d}"><span class="dn">${DOM_NAMES[d]}</span><span class="dc">${groups[d].length} ${shut?"▸":"▾"}</span></div>
        <div class="choices">${inner}</div></div>`;}).join("");
    body=`${celeb?`<div class="choices">${celeb}</div>`:""}${groupHtml}`;
  } else if(S.tab==="reforms"){
    const rs=availableReforms(S);
    body=rs.length?rs.map(r=>renderReformCard(r)).join(""):`<div class="sit-text">${S.regency?"No regent has the standing to remake the realm — reform must wait for the sovereign's majority.":"No further reforms are within reach in this age."}</div>`;
  } else if(S.tab==="policy"){
    const c=consentCheck(S,"tax");
    const gated=c.required;
    body=`<div class="sit-text">Set the standing burden of taxation. ${gated?`The ${esc(c.inst.name)} holds the purse: changing the rate requires its consent.`:"The Crown sets the rate at will."} Changing the rate is your act for this turn.</div>
      <div class="taxtiers">${TAX_ORDER.map(t=>{const T=TAX_TIERS[t];const cur=S.taxRate===t;
        const chips=Object.keys(T.fac||{}).map(k=>`<span class="chip fac ${T.fac[k]>0?"up":"down"}">${S.facs[k].name} ${T.fac[k]>0?"+":""}${T.fac[k]}/turn</span>`).join("");
        const inc=Math.round((16+S.development*0.55)*T.mult);
        return `<button class="taxtier ${cur?"cur":""}" data-tax="${t}" ${cur?"disabled":""}>
          <span class="tn">${T.label}</span><span class="td">≈ ${inc}/yr${T.stab?`, stability ${T.stab>0?"+":""}${T.stab}/turn`:""}</span>
          <span class="tc">${chips}</span></button>`;}).join("")}</div>
      ${gated?`<div class="consentnote">To RAISE the rate, the ${esc(c.inst.name)}'s estates must stand at ${Math.round(c.threshold)} or better — they currently stand at ${Math.round(c.mood)} (${c.approve?"they would grant it":"they would refuse"}). A reduction they grant gladly at any time.</div>`:""}`;
  } else if(S.tab==="dynastic"){
    const kids=S.family.filter(p=>p.rel==="child"&&p.alive);
    const h=heirOf(S);
    let opts="";
    if(S.law!=="elective"){
      if(kids.length>1) opts+=kids.map(k=>`<button class="choice" data-designate="${k.id}">
          <div class="cl"><span class="mk">›</span><span class="lbl">Designate ${esc(k.name)} (${k.age}) as heir${h&&h.id===k.id?" — current heir by law":""}</span></div>
          <div class="ch">overrides the default order of succession; the passed-over will remember</div>
          <div class="costs">${h&&h.id!==k.id?`<span class="chip down">passed-over kin may turn rival</span>`:`<span class="chip up">confirms the law's choice</span>`}</div></button>`).join("");
      if(!kids.length){
        const kinD=S.family.filter(p=>["sibling","nephew","uncle"].includes(p.rel)&&p.alive).sort((a,b)=>b.age-a.age).slice(0,5);
        opts+=kinD.map(sb=>`<button class="choice" data-designate="${sb.id}">
          <div class="cl"><span class="mk">›</span><span class="lbl">Designate ${esc(sb.name)}, the sovereign's ${relLabel(sb)} (${sb.age}), as heir</span></div>
          <div class="ch">keeps the House alive through its branch when the direct line is bare</div>
          <div class="costs"><span class="chip up">succession secured</span><span class="chip">the House endures</span></div></button>`).join("");
        opts+=`<button class="choice" data-adopt="1">
          <div class="cl"><span class="mk">›</span><span class="lbl">Adopt an heir from a loyal house</span></div>
          <div class="ch">secures the succession when the line is bare — the great houses will have opinions</div>
          <div class="costs"><span class="chip up">succession secured</span><span class="chip fac down">Aristocracy ▼</span></div></button>`; }
      // an unwed adult sovereign may always seek a match from court
      if(!spouseOf(S)&&S.monarch.age>=16) opts+=`<button class="choice" data-seekmatch="1">
          <div class="cl"><span class="mk">›</span><span class="lbl">Seek a match for the sovereign</span></div>
          <div class="ch">the envoys can always be summoned — an heir may yet follow</div>
          <div class="costs"><span class="chip">opens the question of marriage</span></div></button>`;
    } else opts=`<div class="sit-text">Under elective law, the houses will choose each successor. There is no heir to designate.</div>`;
    body=`<div class="choices">${opts||`<div class="sit-text">The succession stands as the law provides${h?` — ${esc(h.name)} is heir`:""}.</div>`}</div>`;
  }
  const skip=`<div style="margin-top:14px;text-align:right"><button class="cont" id="skipCourt" style="opacity:.8">Let the season pass ungoverned → <span style="font-size:10px;color:var(--dim)">(−4 Stability, Legitimacy suffers)</span></button></div>`;
  const who=S.pm?`${esc(S.pm.holder)}, ${esc(S.pm.office)},`:`${esc(styled(S,S.monarch))} ${S.regency?"(under regency)":""}`;
  return `<div class="eyebrow">Court phase — your governing act</div><div class="sit-title">${who} governs</div>${tabs}${body}${skip}`;
}

function renderReformCard(r){
  const open=S.openReform===r.id;let body="";
  if(open){
    const power=S._reformPower!=null?S._reformPower:r.pdef;
    const lawChoice=S._reformLaw||Object.keys(LAWS).filter(l=>l!==S.law)[0];
    const pv=previewReform(S,r,power,lawChoice);
    const unlockHtml=pv.unlocks.length?`<div class="unlock">✦ Unlocks: ${pv.unlocks.map(esc).join(", ")}</div>`:"";
    const lockHtml=pv.locks.length?`<div class="lock">✕ Removes: ${pv.locks.map(esc).join(", ")}</div>`:"";
    const rightsHtml=pv.newRights.length?`<div class="neutral">Consent gained over: ${pv.newRights.map(esc).join(", ")}</div>`:"";
    const facHtml=pv.fac.length?`<div class="costs">${pv.fac.map(f=>`<span class="chip fac ${f.d>0?"up":"down"}">${esc(f.name)} ${f.d>0?"+":""}${f.d}</span>`).join("")}</div>`:"";
    const powerPick=(r.pmax>0)?`<div class="powerpick"><label>${r.twoChamber?"Power moved between chambers":"Power ceded"}</label>
        <input type="range" id="rpow" min="${r.pmin}" max="${r.pmax}" value="${power}" /><span class="pv">${r.twoChamber?("move "+power):("Crown −"+power)}</span></div>`:"";
    const destPick=((r.id==="charter"||r.id==="curtail"||r.id==="devolve")&&S.gov.institutions.length>1)?`<div class="prevblock"><div class="pl">The power passes to</div><div class="radio-row">${S.gov.institutions.map((it,ix)=>`<button data-rdest="${ix}" class="${(S._reformDest||0)===ix?"on":""}">${esc(it.name)}</button>`).join("")}</div></div>`:"";
    const shiftPick=(r.twoChamber&&S.gov.institutions.length>1)?`<div class="prevblock"><div class="pl">Take power from</div><div class="radio-row">${S.gov.institutions.map((it,ix)=>`<button data-rsrc="${ix}" class="${(S._reformSrc!=null?S._reformSrc:0)===ix?"on":""}">${esc(it.name)} (${it.power})</button>`).join("")}</div>
      <div class="pl" style="margin-top:8px">And give it to</div><div class="radio-row">${S.gov.institutions.map((it,ix)=>`<button data-rdest="${ix}" class="${(S._reformDest!=null?S._reformDest:1)===ix?"on":""}">${esc(it.name)} (${it.power})</button>`).join("")}</div></div>`:"";
    const lawPick=r.lawPick?`<div class="prevblock"><div class="pl">New law</div><div class="law-list">${Object.keys(LAWS).filter(l=>l!==S.law).map(l=>`
        <button data-lawpick="${l}" class="${lawChoice===l?"on":""}"><div class="ln">${LAWS[l].name}</div><div class="ld">${LAWS[l].desc}</div></button>`).join("")}</div>
        ${pv.heirNote?`<div class="neutral" style="margin-top:8px">${esc(pv.heirNote)}</div>`:""}</div>`:"";
    body=`<div class="reformbody">${powerPick}${shiftPick}${destPick}${lawPick}
      <div class="prevblock"><div class="pl">What this changes in your toolbox</div>
        ${unlockHtml}${lockHtml}${!pv.unlocks.length&&!pv.locks.length?`<div class="neutral">No standing actions change — the effect is structural.</div>`:""}</div>
      ${rightsHtml?`<div class="prevblock"><div class="pl">New rights</div>${rightsHtml}</div>`:""}
      ${facHtml?`<div class="prevblock"><div class="pl">How the estates will take it</div>${facHtml}</div>`:""}
      <button class="enactbtn" data-enact="${r.id}">Enact — ${esc(r.name)}</button></div>`;
  }
  return `<div class="reformcard ${open?"open":""}"><div class="rhead" data-openreform="${r.id}"><span class="rn">${esc(r.name)}</span><span class="rt">${r.tag}</span></div>
    <div class="rblurb">${esc(r.blurb)}</div>${body}</div>`;
}

function renderEvent(){
  const ev=S.currentEvent;
  const title=(typeof ev.title==="function")?ev.title(S):ev.title;
  const text=(typeof ev.text==="function")?ev.text(S):ev.text;
  return `<div class="eyebrow">Event phase — ${ev.id==="revolt"?"a rupture":"a matter before the Crown"}</div>
    <div class="sit-title">${esc(title)}</div><div class="sit-text">${esc(text)}</div>
    <div class="choices">${ev.choices.map((c,i)=>{
      let chips=c.resolve?`${c.cost?costChips(c.cost,c.fac):""}<span class="chip">outcome depends on your strength</span>`:costChips(c.cost,c.fac,c.consent);
      return `<button class="choice" data-ev="${i}"><div class="cl"><span class="mk">${["I","II","III"][i]||"•"}</span><span class="lbl">${esc(c.label)}</span>${c.rf?`<span class="rf">reform</span>`:""}</div>
        <div class="costs">${chips||`<span class="chip">no direct cost</span>`}</div></button>`;}).join("")}</div>`;
}

function renderDynastic(){
  const d=S.dyn;
  if(d.kind==="marriage"){
    return `<div class="eyebrow">Dynastic phase</div><div class="sit-title">A Match for the Sovereign</div>
      <div class="sit-text">${esc(styled(S,S.monarch))} is unwed. Envoys present suitable matches: a foreign alliance, or a union with one of the realm's own great houses.</div>
      <div class="choices">
        <button class="choice" data-dyn="marry_foreign"><div class="cl"><span class="mk">I</span><span class="lbl">Wed a foreign crown's kin</span></div>
          <div class="ch">an alliance abroad; heirs may follow</div><div class="costs"><span class="chip down">−16 gold</span><span class="chip up">+5 Arms</span><span class="chip fac up">Aristocracy ▲</span></div></button>
        <button class="choice" data-dyn="marry_domestic"><div class="cl"><span class="mk">II</span><span class="lbl">Wed into a great house of the realm</span></div>
          <div class="ch">binds a mighty family to the throne; heirs may follow</div><div class="costs"><span class="chip fac up">Aristocracy ▲▲</span><span class="chip fac down">Provinces ▼</span></div></button>
        <button class="choice" data-dyn="marry_none"><div class="cl"><span class="mk">III</span><span class="lbl">Remain unwed for now</span></div>
          <div class="ch">freedom kept; the line left to chance</div><div class="costs"><span class="chip down">no heirs while unwed</span></div></button>
      </div>`;
  }
  if(d.kind==="childless"){
    return `<div class="eyebrow">Dynastic phase</div><div class="sit-title">The Line Grows Thin</div>
      <div class="sit-text">${esc(styled(S,S.monarch))} is ${S.monarch.age} and without issue. The court whispers about what follows. An adoption from a loyal house would settle the question — or leave it to fate.</div>
      <div class="choices">
        <button class="choice" data-dyn="adopt"><div class="cl"><span class="mk">I</span><span class="lbl">Adopt an heir from a loyal house</span></div>
          <div class="ch">succession secured; the great houses will have opinions</div><div class="costs"><span class="chip up">succession secured</span><span class="chip fac down">Aristocracy ▼</span></div></button>
        <button class="choice" data-dyn="ignore"><div class="cl"><span class="mk">II</span><span class="lbl">Trust to fate</span></div>
          <div class="ch">the question stays open — and so does the door to crisis</div><div class="costs"><span class="chip down">Legitimacy suffers while no heir stands</span></div></button>
      </div>`;
  }
  if(d.kind==="ambition"){
    const sib=d.sib;
    return `<div class="eyebrow">Dynastic phase</div><div class="sit-title">The Sovereign's ${sib.gender==="m"?"Brother":"Sister"} Grows Ambitious</div>
      <div class="sit-text">${esc(sib.name)}, ${sib.age}, has been gathering friends — officers, malcontent lords, men with debts. Nothing treasonous can be proven. Yet.</div>
      <div class="choices">
        <button class="choice" data-dyn="amb_embrace"><div class="cl"><span class="mk">I</span><span class="lbl">Draw them close — titles, honours, command</span></div>
          <div class="ch">ambition fed may sleep; or grow</div><div class="costs"><span class="chip down">−14 gold</span><span class="chip">a gamble on their loyalty</span></div></button>
        <button class="choice" data-dyn="amb_exile"><div class="cl"><span class="mk">II</span><span class="lbl">Send them to a distant, honourable post</span></div>
          <div class="ch">distance defuses; the insult is remembered</div><div class="costs"><span class="chip fac down">Aristocracy ▼</span><span class="chip up">threat removed</span></div></button>
        <button class="choice" data-dyn="amb_ignore"><div class="cl"><span class="mk">III</span><span class="lbl">Watch, and do nothing</span></div>
          <div class="ch">perhaps it is nothing. perhaps.</div><div class="costs"><span class="chip down">they may declare as a rival claimant</span></div></button>
      </div>`;
  }
  if(d.kind==="ofage"){
    const heir=d.heir;
    return `<div class="eyebrow">Dynastic phase</div><div class="sit-title">${esc(heir.name)} Comes of Age</div>
      <div class="sit-text">The heir to the crown is ${heir.age}, and the court takes notice: how shall the heir be prepared?</div>
      <div class="choices">
        <button class="choice" data-dyn="heir_court"><div class="cl"><span class="mk">I</span><span class="lbl">Train them at court, in law and statecraft</span></div>
          <div class="costs"><span class="chip up">Legitimacy ▲ at succession</span><span class="chip fac up">Clergy ▲</span></div></button>
        <button class="choice" data-dyn="heir_army"><div class="cl"><span class="mk">II</span><span class="lbl">Give them a command on the frontier</span></div>
          <div class="costs"><span class="chip up">+4 Arms</span><span class="chip fac up">Officers ▲</span><span class="chip down">a soldier's risks</span></div></button>
      </div>`;
  }
  if(d.kind==="banners"){
    const rv=d.rival;
    return `<div class="eyebrow">Dynastic phase — the claim turns to steel</div><div class="sit-title">${esc(rv.name)} Raises the Banners</div>
      <div class="sit-text">The rival claimant has stopped waiting. Musters are called in their name, oaths taken, a rival court proclaimed. The realm holds its breath: two heads cannot wear one crown.</div>
      <div class="choices">
        <button class="choice" data-dyn="banners_fight"><div class="cl"><span class="mk">I</span><span class="lbl">Meet the rising in the field</span></div>
          <div class="ch">victory ends the claim forever; defeat ends the reign — the rival takes the throne</div>
          <div class="costs"><span class="chip">resolved by your Arms and the officers' loyalty</span><span class="chip down">-10 gold</span></div></button>
        <button class="choice" data-dyn="banners_buy"><div class="cl"><span class="mk">II</span><span class="lbl">Buy the claim — gold, titles, and a signed renunciation</span></div>
          <div class="costs"><span class="chip down">-28 gold</span><span class="chip up">the claim ends in ink, not blood</span><span class="chip fac up">Aristocracy +3</span></div></button>
      </div>`;
  }
  if(d.kind==="heirmatch"){
    const c=d.child;
    return `<div class="eyebrow">Dynastic phase</div><div class="sit-title">A Match for ${esc(c.name)}</div>
      <div class="sit-text">${esc(c.name)}, ${c.age}, is of age to wed. Houses at home and crowns abroad have made their interest known — and every match strengthens, or entangles, the line.</div>
      <div class="choices">
        <button class="choice" data-heirwed="foreign" data-cid="${c.id}"><div class="cl"><span class="mk">I</span><span class="lbl">Wed them to a foreign crown's kin</span></div>
          <div class="costs"><span class="chip down">-12 gold</span><span class="chip up">+3 Arms</span><span class="chip up">grandchildren may follow</span></div></button>
        <button class="choice" data-heirwed="domestic" data-cid="${c.id}"><div class="cl"><span class="mk">II</span><span class="lbl">Wed them into a great house of the realm</span></div>
          <div class="costs"><span class="chip fac up">Aristocracy +6</span><span class="chip up">grandchildren may follow</span></div></button>
        <button class="choice" data-heirwed="none" data-cid="${c.id}"><div class="cl"><span class="mk">III</span><span class="lbl">Let them wait</span></div>
          <div class="costs"><span class="chip">the match can be made later</span></div></button>
      </div>`;
  }
  if(d.kind==="regent_coup"){
    return `<div class="eyebrow">Dynastic phase — the regency turns</div><div class="sit-title">The Regent Reaches for the Crown</div>
      <div class="sit-text">${esc(S.regency.name)} has stopped pretending to serve. Retainers fill the palace, the child-sovereign is "protected" behind closed doors, and the great houses wait to see whether anyone dares object. Regencies have swallowed dynasties before.</div>
      <div class="choices">
        <button class="choice" data-dyn="coup_resist"><div class="cl"><span class="mk">I</span><span class="lbl">Rally the court and confront the regent</span></div>
          <div class="ch">resolved by the crown's Legitimacy and the great houses — lose, and the child is lost with the crown</div>
          <div class="costs"><span class="chip">a trial of loyalty</span></div></button>
        <button class="choice" data-dyn="coup_buy"><div class="cl"><span class="mk">II</span><span class="lbl">Buy the regent's contentment — lands, honours, a duchy</span></div>
          <div class="costs"><span class="chip down">-26 gold</span><span class="chip up">the ambition is fed, for now</span></div></button>
      </div>`;
  }
  if(d.kind==="regent"){
    const fav=S.facs[S.regency.favors].name;
    return `<div class="eyebrow">Dynastic phase — the regency</div><div class="sit-title">The Regent's Price</div>
      <div class="sit-text">${esc(S.regency.name)} governs in the sovereign's name — and governs, increasingly, for the ${esc(fav)}. Offices, grants and favours flow their way, and the court watches to see whether anyone will object.</div>
      <div class="choices">
        <button class="choice" data-dyn="regent_indulge"><div class="cl"><span class="mk">I</span><span class="lbl">Indulge the regent's friends</span></div>
          <div class="ch">a quiet regency is worth a corrupt one — for now</div><div class="costs"><span class="chip down">-10 gold</span><span class="chip fac up">${esc(fav)} +6</span></div></button>
        <button class="choice" data-dyn="regent_defy"><div class="cl"><span class="mk">II</span><span class="lbl">Check the regent in open council</span></div>
          <div class="ch">assert the child-crown's authority; the regent will not forget</div><div class="costs"><span class="chip down">-5 Stability</span><span class="chip up">Legitimacy recovers</span><span class="chip down">a hostile regent — everything costs more</span></div></button>
      </div>`;
  }
  return `<div class="sit-text">The court is quiet.</div><button class="cont" id="dynSkip">Continue →</button>`;
}

function renderSuccession(){
  const so=successionOptions();
  if(so.mode==="contested"){
    const rv=so.rival,heir=so.heir;
    return `<div class="eyebrow">Succession — a crown with two claimants</div>
      <div class="sit-title">${esc(rv.name)} Presses the Claim</div>
      <div class="sit-text">The sovereign is dead, and the rival claimant has not waited for the funeral. ${heir?`${esc(heir.name)} stands as heir by law — but law is only as strong as the swords behind it.`:"No heir stands by law; the claimant's case is uncomfortably good."} Choose whom the will behind the throne shall back.</div>
      <div class="choices">
        ${heir?`<button class="choice" data-contest="heir"><div class="cl"><span class="mk">I</span><span class="lbl">Back ${esc(heir.name)}, the lawful heir</span></div>
          <div class="ch">resolved by Arms and the officers — victory finishes the claimant; defeat crowns them</div>
          <div class="costs"><span class="chip">a trial of strength</span><span class="chip down">-4 Stability either way</span></div></button>`:""}
        <button class="choice" data-contest="rival"><div class="cl"><span class="mk">II</span><span class="lbl">Back the claimant — crown ${esc(rv.name)}</span></div>
          <div class="ch">the house continues through the rival${heir?"; the passed-over heir will remember":""}</div>
          <div class="costs"><span class="chip down">-8 Stability</span><span class="chip down">Legitimacy wounded</span>${heir?`<span class="chip down">${esc(heir.name)} may become the next rival</span>`:""}</div></button>
        ${!heir?`<button class="choice" data-contest="deny"><div class="cl"><span class="mk">III</span><span class="lbl">Deny the claim by force and let the law decide after</span></div>
          <div class="ch">win, and the crisis proceeds without them; lose, and they are crowned anyway</div>
          <div class="costs"><span class="chip">a trial of strength</span></div></button>`:""}
      </div>`;
  }
  if(so.mode==="heir"){
    const heir=so.heir;
    const minor=heir.age<16;
    return `<div class="eyebrow">Succession — a transition fired upon you</div>
      <div class="sit-title">The Crown Passes</div>
      <div class="sit-text">${esc(heir.name)}, ${heir.age}, stands ${minor?"— a child —":""} as heir under ${LAWS[S.law].name.toLowerCase()} law. ${minor?"A regency must govern until the sovereign comes of age — hungry years, when every faction reaches for the regent's chair.":"Choose how the new sovereign shall be styled."}</div>
      <div class="choices">
        ${heir.gender===S.monarch.gender?`<button class="choice" data-succ="crown_heir_keep"><div class="cl"><span class="mk">›</span><span class="lbl">Crown ${esc(heir.name)}${minor?" under a regency":""}, taking the regnal name ${esc(S.monarch.name)}</span></div>
          <div class="costs"><span class="chip up">continuity ▲</span>${minor?`<span class="chip down">regency: −8 Stability, Legitimacy suffers</span>`:""}</div></button>`:""}
        <button class="choice" data-succ="crown_heir_own"><div class="cl"><span class="mk">›</span><span class="lbl">Crown ${esc(heir.name)}${minor?" under a regency":""} under their own name</span></div>
          <div class="costs">${minor?`<span class="chip down">regency: −8 Stability, Legitimacy suffers</span>`:`<span class="chip">a new chapter of the House</span>`}</div></button>
        ${[...new Set(S.lineage.filter(l=>l.gender===heir.gender&&l.name!==heir.name&&l.name!==S.monarch.name).map(l=>l.name))].slice(0,4).map(nm=>`
        <button class="choice" data-ancname="${esc(nm)}"><div class="cl"><span class="mk">›</span><span class="lbl">Crown ${esc(heir.name)} under the ancestral name ${esc(nm)}</span></div>
          <div class="ch">an old sovereign's name taken up again — continuity worn like a crown</div>
          <div class="costs"><span class="chip up">+4 Stability</span><span class="chip up">Legitimacy steadies</span></div></button>`).join("")}
      </div>`;
  }
  if(so.mode==="elective"){
    if(!S._electCands){
      const kin=S.family.filter(p=>(p.rel==="child"||p.rel==="sibling")&&p.alive&&p.age>=16).sort((a,b)=>b.age-a.age).slice(0,2)
        .map(p=>({kin:true,personId:p.id,name:p.name,gender:p.gender,age:p.age,house:S.house,note:`of the blood royal — the House of ${S.house} would continue`}));
      S._electCands=[...kin,...crisisCandidates(false)].slice(0,4);
    }
    return `<div class="eyebrow">Succession — the houses convene</div>
      <div class="sit-title">An Elective Crown</div>
      <div class="sit-text">Under elective law, the great houses ${S.gov.institutions.length?`— through the ${esc(S.gov.institutions[0].name)} —`:""} put forward their candidates. You will inhabit whichever is crowned. Choose where the election falls.</div>
      <div class="choices">${S._electCands.map((c,i)=>`
        <button class="choice" data-elect="${i}"><div class="cl"><span class="mk">${["I","II","III","IV"][i]||"•"}</span><span class="lbl">${esc(c.name)} of House ${esc(c.house)} (${c.age})${c.kin?" ♛":""}</span></div>
          <div class="ch">${esc(c.note)}</div>
          <div class="costs"><span class="chip">House ${esc(c.house)} takes the crown</span><span class="chip fac up">Aristocracy ▲</span></div></button>`).join("")}
      </div>`;
  }
  // crisis
  if(!S._crisisMode){
    const sibBtns=so.sibs.map(s=>`
      <button class="choice" data-succ_sib="${s.id}"><div class="cl"><span class="mk">›</span><span class="lbl">Crown ${esc(s.name)}, the late sovereign's ${s.gender==="m"?"brother":"sister"} (${s.age}) — the House of ${esc(S.house)} endures</span></div>
        <div class="costs"><span class="chip up">continuity of the House</span><span class="chip down">−6 Stability (a contested step)</span></div></button>`).join("");
    return `<div class="eyebrow">Succession crisis — the line has failed</div>
      <div class="sit-title">No Heir Stands</div>
      <div class="sit-text">${esc(styled(S,S.monarch))} is dead with no heir under ${LAWS[S.law].name.toLowerCase()} law. ${so.sibs.length?"Kin of the old House survive — or":"No kin of the House survive."} the crown may pass to a new House entirely${S.pm?" by the chamber's choice — or pass to no one at all. A contest of arms is unthinkable now; the age of settling crowns by war has closed":`: by the choice of the ${S.gov.institutions.length?"chamber and the wealthiest houses":"wealthiest houses"}, or by a contest of arms among the strongest`}.</div>
      <div class="choices">
        ${sibBtns}
        <button class="choice" data-crisis="wealth"><div class="cl"><span class="mk">›</span><span class="lbl">Let the ${S.gov.institutions.length?"chamber":"great houses"} choose from the wealthiest houses</span></div>
          <div class="ch">a peaceful transfer — to whichever house gold has raised highest. The old House falls.</div>
          <div class="costs"><span class="chip fac up">Aristocracy ▲</span><span class="chip fac up">Merchants ▲</span><span class="chip down">the House of ${esc(S.house)} ends</span></div></button>
        ${S.pm?`<button class="choice" data-extinct="1"><div class="cl"><span class="mk">›</span><span class="lbl">Declare the crown extinct</span></div>
          <div class="ch">no new house. No new sovereign. The chamber governs alone — and this chronicle ends.</div>
          <div class="costs"><span class="chip down">the monarchy of ${esc(S.nation)} ends forever</span><span class="chip">ends this chronicle</span></div></button>`
        :`<button class="choice" data-crisis="arms"><div class="cl"><span class="mk">›</span><span class="lbl">Let a contest of arms decide it</span></div>
          <div class="ch">the strongest-armed houses fight for the crown; you choose where victory falls. The old House falls.</div>
          <div class="costs"><span class="chip down">−14 Stability</span><span class="chip down">−10 Arms</span><span class="chip down">treasury bleeds</span><span class="chip down">the House of ${esc(S.house)} ends</span></div></button>`}
      </div>`;
  } else {
    const byArms=S._crisisMode==="arms";
    return `<div class="eyebrow">Succession crisis — ${byArms?"the war of the crown":"the houses convene"}</div>
      <div class="sit-title">${byArms?"Choose Where Victory Falls":"Choose Whom They Crown"}</div>
      <div class="sit-text">${byArms?"The armies of the claimant houses take the field. You are the will that will inhabit the winner — decide who wins.":"The wealthiest houses put forward their candidates. You will inhabit whichever is crowned."}</div>
      <div class="choices">${S._crisisCands.map((c,i)=>`
        <button class="choice" data-newhouse="${i}"><div class="cl"><span class="mk">${["I","II","III"][i]}</span><span class="lbl">${esc(c.name)} of House ${esc(c.house)} (${c.age})</span></div>
          <div class="ch">${esc(c.note)}</div>
          <div class="costs"><span class="chip">House ${esc(c.house)} takes the crown</span></div></button>`).join("")}
      </div>`;
  }
}

function renderTidings(){
  return `<div class="eyebrow">Tidings — the turn of the years</div><div class="sit-title">Word Reaches the Court</div>
    ${S.notices.map(n=>{
      if(typeof n==="string")return `<div class="sit-text" style="margin:0 0 8px">— ${esc(n)}</div>`;
      if(n.t==="d"){ const per=S.family.find(x=>x.id===n.id)||(S.ancestors||[]).find(x=>x.id===n.id);
        const lbl=per?relLabel(per):"kin";
        return `<div class="sit-text" style="margin:0 0 8px">— ${esc(n.name)}, the sovereign's ${lbl}, has died at ${n.age}.</div>`; }
      return `<div class="sit-text" style="margin:0 0 8px">— A ${n.g==="m"?"son":"daughter"}, ${esc(n.name)}, has been born to the royal house.</div>`;
    }).join("")}
    <button class="cont" id="tidingsGo" style="margin-top:10px">Continue →</button>`;
}
function renderQuiet(){
  return `<div class="eyebrow">Event phase</div><div class="sit-title">The Years Are Quiet</div>
    <div class="sit-text">No crisis reaches the throne this season. The realm turns beneath you, waiting to be governed.</div>
    <button class="cont" id="quietGo">To the court phase →</button>`;
}
function renderElection(){
  const er=S._electionResult; const ch=er.winner!==S.pm.bloc;
  return `<div class="eyebrow">Election — the chamber renewed</div><div class="sit-title">The Country Speaks</div>
    <div class="sit-text">The writs return. ${ch?`The ${esc(S.facs[er.winner].name)} interest has carried the chamber — the government changes hands.`:`The ${esc(S.facs[er.winner].name)} interest is returned to power.`}</div>
    ${er.standings.map((st,i)=>`<div class="sit-text" style="margin:0 0 6px">${i===0?"◆":"◇"} ${esc(st.name)} — ${st.score}</div>`).join("")}
    <div class="sit-text" style="color:var(--brass)">Under this government: ${esc(BLOC_DESCS[er.winner]||"no change to the toolbox")}.</div>
    <button class="cont" id="electGo">The ministry forms →</button>`;
}
function renderPmName(){
  const sug=["Prime Minister","First Minister","Chancellor","Lord Steward"];
  return `<div class="eyebrow">A transformation — power has tipped</div><div class="sit-title">The Crown No Longer Governs</div>
    <div class="sit-text">The Crown's share of power has fallen below half. Governing passes to a ministry answerable to the chamber — and you, the will behind the throne, now sit at the minister's desk instead. The monarchy remains: watched, managed, and occasionally in the way. Name the office you now hold.</div>
    <div class="namein"><input type="text" id="pmInput" value="Prime Minister" maxlength="30" />
      <div class="suggest">${sug.map(x=>`<button data-pmname="${x}">${x}</button>`).join("")}</div></div>
    <button class="cont" id="pmConfirm">Take office →</button>`;
}
function renderChName(){
  const sug=culture(S).inst.slice();
  return `<div class="eyebrow">Born of the rising</div><div class="sit-title">A Chamber Forced Upon the Crown</div>
    <div class="sit-text">The concession is made: a standing assembly will hold the power of the purse. It was not your idea — but its name, at least, is yours to give.</div>
    <div class="namein"><input type="text" id="chInput" value="${sug[0]}" maxlength="34" />
      <div class="suggest">${sug.map(x=>`<button data-chname="${x}">${x}</button>`).join("")}</div></div>
    <button class="cont" id="chConfirm">Let it convene →</button>`;
}
function dynSkipBtn(){return `<div style="margin-top:12px;text-align:right"><button class="cont" data-dynskip="1" style="opacity:.8">Turn away from these matters →</button></div>`;}
function pmGender(){ return eraIdx(S)<=2?"m":(chance(0.5)?"m":"f"); }
function pmName(){ return nameFor(pmGender(),usedNames(S))+" "+pick(surnamePool()); }
function doPMName(v){
  const er=runElection();
  S.pm={office:v||"Prime Minister",bloc:er.winner,holder:pmName(),age:45+rand(14)};
  S.nextElection=S.turn+4;
  S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, the Crown's share of power fell below half, and governing passed to a ministry: ${S.pm.holder}, of the ${S.facs[er.winner].name} interest, took office as the first ${S.pm.office} of ${S.nation}.`});
  checkMilestones();
  const nx=S._afterName;S._afterName=null;routeNext(nx);
}
function doChamberName(v){
  const fc=S._forcedChamber;S._forcedChamber=null;
  S.gov.institutions.push({id:"estates",name:v||"Estates of the Realm",composition:"nobility",power:0,rights:["tax"]});
  transferPower(S,S.gov.institutions[S.gov.institutions.length-1],fc.power);
  if(!S.reforms.includes("summon_estates"))S.reforms.push("summon_estates");
  maybeTransform(S);checkMilestones();
  if(S._pmPending&&!S.pm){S._pmPending=false;S.phase="pmname";render();return;}
  const nx=S._afterName;S._afterName=null;routeNext(nx);
}
function renderNaming(){
  const p=S.pending;
  return `<div class="eyebrow">Name the institution</div><div class="sit-title">${esc(p.title)}</div>
    <div class="sit-text">${esc(p.blurb)}</div>
    <div class="namein"><input type="text" id="nameInput" value="${esc(p.suggest[0])}" maxlength="34" />
      <div class="suggest">${p.suggest.map(s=>`<button data-name="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
    <button class="cont" id="confirmName">Establish it →</button>`;
}
function renderOutcome(){
  const r=S.result;
  const ms=(S._ms&&S._ms.length)?`<div class="msNote"><b>Milestone:</b> ${S._ms.map(esc).join(" · ")}</div>`:"";
  S._ms=[];
  return `<div class="outcome">${ms}
    ${r.fortune?`<div class="fortune ${r.fortune}">${r.fortune==="good"?"A good turn":"It goes ill"}</div>`:""}
    <p class="ot">${esc(r.out)}</p>
    <button class="cont" id="continue">${r.next==="court"?"To the court phase →":r.next==="dynastic"?"To dynastic matters →":"Let the years pass →"}</button></div>`;
}
