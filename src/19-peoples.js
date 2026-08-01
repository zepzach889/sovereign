"use strict";
/* =====================================================================
   THE PEOPLE'S REPUBLIC
   Not a republic in a red flag. The estates are reorganized: the old
   orders are abolished into "former people", labour becomes the
   governing estate, a Party holds the power, and the economy answers
   to a plan rather than to a treasury.
   ===================================================================== */
const PLAN_PARTS=[
  {id:"industry",name:"Heavy industry",blurb:"steel, rail, dams and the smoke that means the future"},
  {id:"consumer",name:"Consumer goods",blurb:"bread, boots and the small comforts a country is actually made of"},
  {id:"arms",name:"Armaments",blurb:"the state's guarantee that it will still be here next year"}
];
function planOf(S,id){ S.plan=S.plan||{industry:40,consumer:40,arms:20}; return S.plan[id]||0; }
function installPeoples(S,how){
  S.regime="people";
  S.gov.crown.titleBase="Chairman";
  /* the old orders are abolished, not outvoted */
  ["aristocracy","clergy"].forEach(k=>{ if(S.facs[k]){
    S.facs[k].present=false; S.facs[k].strength=0; S.facs[k].mood=clamp(S.facs[k].mood-30); }});
  S.formerPeople=true;
  if(S.facs.workers){ S.facs.workers.present=true;
    S.facs.workers.strength=clamp(Math.max(S.facs.workers.strength,55)+10);
    S.facs.workers.mood=clamp(S.facs.workers.mood+22); }
  if(S.facs.peasantry)S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+6);
  if(S.facs.merchants){ S.facs.merchants.strength=clamp(S.facs.merchants.strength-30);
    S.facs.merchants.mood=clamp(S.facs.merchants.mood-25); }
  /* the Party holds what the state held — reclaim it first, or the
     hundred points of power quietly leak away with the old chambers */
  S.gov.institutions.forEach(inst=>{ powerToCrown(S,inst,inst.power); });
  S.gov.institutions=[];
  const party={id:"party",name:"The Party Congress",composition:"national",power:0,rights:["tax","law","consent"]};
  S.gov.institutions.push(party);
  transferPower(S,party,Math.min(70,S.gov.crown.power));
  S.rep=null; S.junta=null; S.pols=null;
  S.plan={industry:45,consumer:35,arms:20};
  S.politburo=[]; for(let i=0;i<4;i++)S.politburo.push(newPolitburo(S));
  S.taxRate="heavy";
  const g=chance(0.75)?"m":"f";
  S.monarch={id:PID++,name:nameFor(g,usedNames(S))+" "+pick(surnamePool()),gender:g,age:46+rand(16),
    house:"the Party",regnal:1,alive:true,parents:null,spouseId:null,born:S.year-52,
    trait:rollTrait(),reignStart:S.year};
  S.legitPen=(S.legitPen||0)+(how==="revolution"?14:8);
  S.stability=clamp(S.stability-12);
  refreshRelations(S);
}
function newPolitburo(S){
  const g=chance(0.7)?"m":"f";
  return {id:PID++,name:nameFor(g,usedNames(S))+" "+pick(surnamePool()),gender:g,age:44+rand(20),
    trait:rollTrait(),standing:35+rand(35),loyalty:40+rand(40),post:null};
}
function politburo(S){ return S.politburo||[]; }
/* the plan is the economy: what you build is what you get */
function tickPlan(S,span){
  if(!regimeIs(S,"people"))return;
  const p=S.plan||{industry:40,consumer:40,arms:20};
  S.development=clamp(S.development+ (p.industry/100)*2.2*span/4);
  const want=48, got=p.consumer;
  S.stability=clamp(S.stability + ((got-want)/100)*16*span/4);
  S.military=clamp(S.military + ((p.arms-18)/100)*5*span/4);
  if(S.facs.workers)S.facs.workers.mood=clamp(S.facs.workers.mood+((got-40)/100)*7);
  if(S.facs.peasantry)S.facs.peasantry.mood=clamp(S.facs.peasantry.mood+((got-45)/100)*5);
  (S.politburo||[]).forEach(m=>{ m.age+=span; m.standing=clamp(m.standing+(rand(5)-2)); });
  S.politburo=(S.politburo||[]).filter(m=>m.age<80);
  while((S.politburo||[]).length<4)S.politburo.push(newPolitburo(S));
}
function planPanel(S){
  if(!regimeIs(S,"people"))return "";
  const p=S.plan||{};
  return `<div class="press"><div class="gt">The Plan</div>
    ${PLAN_PARTS.map(x=>`<div class="prow ${x.id==="consumer"&&planOf(S,x.id)<30?"crit":""}">
      <span class="pn">${esc(x.name)}</span><span class="pw">${planOf(S,x.id)}%</span></div>`).join("")}
    <div class="pnote">${planOf(S,"consumer")<30?"the shops are empty and everyone has noticed"
      :planOf(S,"industry")>=55?"the furnaces run day and night"
      :"the plan is balanced, which pleases nobody entirely"}</div></div>`;
}
/* succession by congress, not by ballot or blood */
function congressSuccession(S,reason){
  const pool=politburo(S).slice().sort((a,b)=>(b.standing+b.loyalty)-(a.standing+a.loyalty));
  const heir=pool[0]||newPolitburo(S);
  const old=S.monarch.name;
  S.politburo=politburo(S).filter(m=>m.id!==heir.id);
  S.monarch={id:PID++,name:heir.name,gender:heir.gender,age:heir.age,house:"the Party",regnal:1,
    alive:true,parents:null,spouseId:null,born:S.year-heir.age,trait:heir.trait,reignStart:S.year};
  while(politburo(S).length<4)S.politburo.push(newPolitburo(S));
  S.chronicle.push({year:S.year,cls:"rupture",text:`In ${S.year}, ${old} ${reason} and the Congress raised ${heir.name} to the chairmanship.`});
  S.notices.push(`${old} ${reason}. ${heir.name} now leads the Party and the state.`);
  S.legitPen=(S.legitPen||0)+5;
  refreshRelations(S);
}

/* ---------- the congress: the people's republic's third phase ---------- */
function renderCongress(){
  const p=S.plan||{};
  const pb=politburo(S).slice().sort((a,b)=>b.standing-a.standing);
  let body=`<div class="subhead">The plan</div><div class="choices">${PLAN_PARTS.map(x=>`
    <button class="choice ${x.id==="industry"?"dom-fiscal":x.id==="arms"?"dom-martial":"dom-civil"}" data-plan="${x.id}">
      <div class="cl"><span class="mk">${planOf(S,x.id)}%</span><span class="lbl">Shift the plan toward ${esc(x.name.toLowerCase())}</span></div>
      <div class="ch">${esc(x.blurb)}</div>
      <div class="costs"><span class="chip">+10% here, taken from the rest</span></div></button>`).join("")}</div>`;
  body+=`<div class="subhead">The Politburo</div><div class="choices">${pb.map(m=>{
    const t=traitShown(m);
    return `<button class="choice dyn-role" data-pb="${m.id}">
      <div class="cl"><span class="mk">·</span><span class="lbl">${esc(m.name)}, ${m.age}</span></div>
      <div class="ch">${t?(t.sure?`known to be ${esc(t.text.toLowerCase())}`:`said to be ${esc(t.text)}`):"a careful man with no recorded opinions"} · standing ${Math.round(m.standing)} · loyalty ${Math.round(m.loyalty)}</div>
      <div class="costs"><span class="chip down">purge them</span><span class="chip">a rival removed is a rival replaced</span></div></button>`;}).join("")}</div>`;
  if(S.formerPeople)body+=`<div class="subhead">The former people</div><div class="choices">
    <button class="choice dyn-desig" data-rehab="1"><div class="cl"><span class="mk">›</span><span class="lbl">Rehabilitate the former orders</span></div>
      <div class="ch">quietly allow the old families and the church back into ordinary life</div>
      <div class="costs"><span class="chip up">+8 Stability</span><span class="chip up">Legitimacy improves</span><span class="chip fac down">Workers disapprove</span><span class="chip">the restorationists gain a foothold</span></div></button></div>`;
  return `<div class="eyebrow">The Congress</div><div class="sit-title">The Business of the People's Republic</div>
    <div class="sit-text">The plan, the Party and the question of who is to be trusted.</div>
    ${body}
    <div class="choices"><button class="choice" data-dc="done"><div class="cl"><span class="mk">›</span><span class="lbl">Close the session</span></div></button></div>`;
}
function doPlan(id){
  const p=S.plan; const others=PLAN_PARTS.map(x=>x.id).filter(x=>x!==id);
  let take=10, got=0;
  others.forEach(o=>{ const t=Math.min(p[o],Math.ceil(take/others.length)); p[o]-=t; got+=t; });
  p[id]+=got;
  const name=PLAN_PARTS.find(x=>x.id===id).name.toLowerCase();
  applyOutcome({chron:S=>`the plan was revised toward ${name}.`,
    out:`The figures are redrawn and the quotas go out. ${id==="consumer"?"There will be more in the shops, and the ministries of steel will complain in writing."
      :id==="industry"?"More furnaces, more rail, more smoke — and less of everything a household actually buys."
      :"More rifles and more shells, and a country that will notice what it is not getting instead."}`},"congress");
  render();
}
function doPurge(id){
  const m=politburo(S).find(x=>x.id===id); if(!m){toCongress();return;}
  S.politburo=politburo(S).filter(x=>x.id!==id);
  S.politburo.push(newPolitburo(S));
  S._costMod=(S._costMod||1)*1.06;
  S.legitPen=(S.legitPen||0)+4;
  bumpPressure(S,"military",5);
  applyOutcome({cost:{stability:+5},fac:{workers:-4},
    chron:S=>`${m.name} was removed from the Politburo and from the record.`,
    out:`${m.name} does not appear in the photograph of the following year's congress, and neither does the photograph. Control improves. So does the average incompetence of everyone left, and every instruction you give from now on costs a little more to see carried out.`},"congress");
  render();
}
function doRehabilitate(){
  S.formerPeople=false;
  ["aristocracy","clergy"].forEach(k=>{ if(S.facs[k]){ S.facs[k].present=true;
    S.facs[k].strength=clamp(S.facs[k].strength+14); S.facs[k].mood=clamp(S.facs[k].mood+18); }});
  S.legitPen=Math.max(0,(S.legitPen||0)-10);
  bumpPressure(S,"restorationist",12);
  applyOutcome({cost:{stability:+8},fac:{workers:-9},
    chron:S=>`the former orders were quietly rehabilitated, and the churches reopened.`,
    out:`No announcement, simply a series of small permissions that add up. The country relaxes. Somewhere a very old family begins, cautiously, to talk about the past again.`},"congress");
  render();
}
function toCongress(){ S.result=null; S.phase="congress"; render(); }
