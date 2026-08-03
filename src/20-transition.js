"use strict";
/* =====================================================================
   THE TRANSITION GRAPH
   One mechanism for every regime change after the first. Whichever
   pressure breaks first decides what the realm becomes; how much
   legitimacy you have left decides whether you steer it or it happens
   to you.
   ===================================================================== */
const REGIME_OF_PRESSURE={military:"junta",radical:"people",constitutional:"republic",restorationist:"monarchy"};
function regimeName(r){ return r==="junta"?"a military government":r==="people"?"a people's republic":r==="republic"?"a republic":"a crown"; }
/* a realm cannot become what it already is */
function transitionReady(S){
  /* the long-reign toggle: no government falls while it is on */
  if(S.devQuiet)return null;
  /* the honeymoon: three turns in which the new order is simply the order */
  if(S._settledUntil&&(S.turn||0)<S._settledUntil)return null;
  const cur=S.regime||"monarchy";
  let best=null;
  PRESSURES.forEach(p=>{
    const target=REGIME_OF_PRESSURE[p.id];
    if(target===cur)return;
    const v=pressureOf(S,p.id);
    if(v>=68&&(!best||v>best.v))best={id:p.id,target,v};
  });
  if(!best)return null;
  /* the radical road is era-gated: before the press and the mills, a rising
     is a jacquerie, not a revolution */
  if(best.target==="people"&&eraIdx(S)<4&&!(S._pressOn&&S.facs.workers&&S.facs.workers.present))return {jacquerie:true,id:best.id};
  return best;
}
function canSteer(S){ return legitimacy(S)>=42; }
function transitionOptions(S,forced){
  const cur=S.regime||"monarchy";
  const out=[];
  const add=(r)=>{ if(r!==cur&&!out.some(o=>o.r===r))out.push({r}); };
  add(forced.target);
  if(canSteer(S)){
    /* a government with credit left may offer the country something else */
    PRESSURES.forEach(p=>{ if(pressureOf(S,p.id)>=45)add(REGIME_OF_PRESSURE[p.id]); });
  }
  return out.slice(0,3);
}
function restoreMonarchy(S,how){
  const ex=S.exiles&&S.exiles.alive?S.exiles:null;
  const house=ex?ex.house:pick(housePool());
  const m=ex&&(ex.members||[]).sort((a,b)=>b.age-a.age)[0];
  clearRegimeState(S,"monarchy");
  S.regime="monarchy";
  /* a crown that comes back returns under the title the realm remembers */
  S.gov.crown.titleBase=S.foundingTitle||(culture(S).titles[0]||"King");
  const g=m?m.gender:(chance(0.6)?"m":"f");
  S.house=house;
  S.monarch={id:PID++,name:m?m.name:nameFor(g,usedNames(S)),gender:g,
    age:m?Math.min(70,m.age+(S.year-ex.year)):28+rand(18),house,regnal:regnalFor(S,m?m.name:"",house),
    alive:true,parents:null,spouseId:null,born:S.year-40,trait:rollTrait(),reignStart:S.year};
  S.exiles=null; S._martyr=false;
  S.legitPen=Math.max(0,(S.legitPen||0)-(ex?16:8));
  S.stability=clamp(S.stability+10);
  bumpPressure(S,"restorationist",-40);
  refreshRelations(S);
  return ex?`the House of ${house} was recalled and restored`:`the crown was revived and given to the House of ${house}`;
}
function applyTransition(S,r){
  const from=S.regime||"monarchy";
  let line="";
  if(r==="junta"){ const gen=newGeneral(S); installJunta(S,gen); line=`${gen.name} took the state in the name of the emergency`; }
  else if(r==="republic"){ installRepublic(S,from==="junta"); line=`${S.nation} was proclaimed a republic`; }
  else if(r==="people"){ installPeoples(S,"revolution"); line=`${S.nation} was proclaimed a People's Republic`; }
  else { line=restoreMonarchy(S,from); }
  /* A revolution exhausts everybody, not only the faction that won it.
     Draining the matching pressure alone left the people's republic sitting
     on the constitutional reading that would overthrow it two ticks later —
     and the install's own hit to legitimacy and stability fed that reading
     straight back through collapseDrive. Everything comes down. */
  if(S.pressure)PRESSURES.forEach(p=>{
    const cut=(REGIME_OF_PRESSURE[p.id]===r)?50:26;
    S.pressure[p.id]=Math.max(0,S.pressure[p.id]-cut); });

  /* And nothing may break again for a while. A country that has just
     changed its form of government is briefly too tired to do it twice. */
  S._settledUntil=(S.turn||0)+3;
  return line;
}
/* ---------- screens ---------- */
function renderTransition(){
  const t=S._transition, steer=canSteer(S);
  const opts=transitionOptions(S,t);
  const p=PRESSURES.find(x=>x.id===t.id);
  return `<div class="eyebrow">${steer?"The government must answer":"It is decided elsewhere"}</div>
    <div class="sit-title">${steer?"A Settlement for "+esc(S.nation):"The Government Falls"}</div>
    <div class="sit-text">${esc(p.blurb)}, and there is no longer a government here that can say no to them. ${steer
      ? "You still have credit enough to shape what comes next — barely, and only if you move now."
      : "You have no credit left to spend. What follows is not yours to choose; you will simply still be here when it is over."}</div>
    <div class="choices">${opts.map((o,i)=>`<button class="choice" data-trans="${o.r}">
      <div class="cl"><span class="mk">${["I","II","III"][i]||"•"}</span><span class="lbl">${steer?"Give the country":"They will impose"} ${esc(regimeName(o.r))}</span></div>
      <div class="ch">${o.r===t.target?"what the pressure of the realm is actually demanding":"not what is being demanded — but you may still be able to sell it"}</div>
      <div class="costs">${o.r===t.target?`<span class="chip up">accepted readily</span>`:`<span class="chip down">−10 Stability · a settlement nobody asked for</span>`}</div></button>`).join("")}</div>`;
}
function doTransition(r){
  const t=S._transition; S._transition=null;
  const off=(r!==t.target);
  const line=applyTransition(S,r);
  if(off){ S.stability=clamp(S.stability-10); S.legitPen=(S.legitPen||0)+6; }
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${line}.`});
  if(r==="people"){ S._terror=true; }
  S.result={out:`The old arrangement is over, and ${line}. ${off?"It is not what was demanded, and the country can tell."
    :"It is what the country was asking for, which makes the first years easier and the later ones no simpler."}\n\nYou are still here. You are always still here.`,
    fortune:"bad",next:r==="people"?"terror":"fresh"};
  S.phase="outcome"; checkMilestones(); render();
}
function renderTerror(){
  return `<div class="eyebrow">The first decision</div><div class="sit-title">Terror, or Moderation</div>
    <div class="sit-text">Every revolution reaches this within a year of winning. The enemies of the new order are real, they are numerous, and they are mostly people who were respectable last spring. What is to be done with them?</div>
    <div class="choices">
      <button class="choice dom-martial" data-terror="terror"><div class="cl"><span class="mk">I</span><span class="lbl">Terror — the revolution defends itself</span></div>
        <div class="ch">tribunals, lists, and a decade in which any faction may be next, including yours</div>
        <div class="costs"><span class="chip up">+16 Stability now</span><span class="chip down">Legitimacy</span><span class="chip down">every act costs more, permanently</span><span class="chip down">the committees will eat their own</span></div></button>
      <button class="choice dom-civil" data-terror="moderate"><div class="cl"><span class="mk">II</span><span class="lbl">Moderation — govern, and let them live</span></div>
        <div class="ch">the old elites survive, plotting, and the republic has a chance of lasting</div>
        <div class="costs"><span class="chip down">−8 Stability</span><span class="chip up">Legitimacy holds</span><span class="chip up">the only road to something durable</span><span class="chip down">restorationists keep their footing</span></div></button>
    </div>`;
}
function doTerror(kind){
  S._terror=false;
  if(kind==="terror"){
    S._costMod=(S._costMod||1)*1.12; S.legitPen=(S.legitPen||0)+14;
    S._terrorYears=18;
    if(S.facs.merchants)S.facs.merchants.mood=clamp(S.facs.merchants.mood-20);
    applyOutcome({cost:{stability:+16},fac:{workers:+10,peasantry:+6},
      chron:S=>`the revolution turned upon its enemies, and then upon itself.`,
      out:"Tribunals in every district and a list that grows by its own logic. Order arrives immediately. So does a decade in which nobody at the top of this state will die in bed, and every order you give costs more because the people who used to carry them out are gone."},"fresh");
  } else {
    bumpPressure(S,"restorationist",14);
    applyOutcome({cost:{stability:-8},fac:{merchants:+8,workers:-6},
      chron:S=>`the new order chose to govern rather than to purge.`,
      out:"No tribunals. The old families keep their houses and their grievances, the churches keep their doors, and everyone waits to see whether this was mercy or weakness. It is the only version of this that has ever lasted — and it will be tested."},"fresh");
  }
  render();
}

/* =====================================================================
   A REPUBLIC DOES NOT HAVE A SUCCESSION CRISIS
   A dead head of state used to route straight into the dynastic machine
   regardless of regime, which is how a republic came to have the great
   houses choose a President from among the wealthiest families and
   found a new royal house for him. Constitutions exist precisely so
   that the death of the man at the top is an administrative event.
   ===================================================================== */
function succeedNonMonarch(S){
  const old=S.monarch, r=S.regime||"republic";
  /* the outgoing office-holder joins the roll under the title they held */
  S.lineage.push({id:old.id,name:old.name,birthName:old.birthName||null,regnal:old.regnal||1,
    house:old.house,gender:old.gender,start:old.reignStart||null,end:S.year,born:old.born||null,
    title:S.gov.crown.titleBase,regime:r});
  S.ancestors=S.ancestors||[];
  const gone=Object.assign({},old); gone.died=S.year; gone.alive=false; S.ancestors.push(gone);

  let name,g,age,line,out;
  if(r==="junta"){
    const gen=newGeneral(S);
    name=gen.name; g=gen.gender; age=gen.age;
    if(S.junta)S.junta.name=gen.name;
    line=`${old.name} died, and the council named ${name} to the chair before the morning was out.`;
    out=`${old.name} is dead. The council meets before dawn and emerges with ${name}, who was always going to be next and has the good manners to look surprised.`;
    S.stability=clamp(S.stability-6); S.legitPen=(S.legitPen||0)+4;
  } else if(r==="people"){
    g=chance(0.8)?"m":"f"; age=52+rand(18);
    name=nameFor(g,usedNames(S))+" "+pick(surnamePool());
    line=`${old.name} died, and the Presidium confirmed ${name} in their place — unanimously, as it confirms everything.`;
    out=`${old.name} lies in state for nine days. ${name} stands at the head of the queue at the lying-in, which is how the country learns who won.`;
    S.stability=clamp(S.stability-4); S.legitPen=(S.legitPen||0)+3;
  } else {
    g=chance(0.5)?"m":"f"; age=46+rand(18);
    name=repLeaderName(S);
    const bloc=(S.rep&&S.facs[S.rep.bloc])?S.facs[S.rep.bloc].name:"governing";
    line=`${old.name} died in office, and ${name} of the ${bloc} interest took the oath the same afternoon.`;
    out=`${old.name} is dead. ${name} takes the oath in a side room with two witnesses and a borrowed book, and the state goes on — which is, in the end, the only thing a constitution is for.`;
    S.stability=clamp(S.stability-3);
  }
  S.monarch={id:PID++,name,gender:g,age,house:old.house,regnal:1,alive:true,
    parents:null,spouseId:null,born:S.year-age,trait:rollTrait(),reignStart:S.year};
  S.deathRolled=true;
  refreshRelations(S);
  applyOutcome({chron:()=>line,out},"endturn");
}
