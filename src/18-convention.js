"use strict";
/* =====================================================================
   THE CONVENTION — the republic's third phase
   What the dynastic court was to a monarchy. Four strands at different
   cadences: the political class (every turn), civil society (when you
   have given it something to react to), federalism (when the country
   is restive) and constitutional amendment (rare and heavy).
   ===================================================================== */
const CIVIL_BODIES=[
  {id:"press",name:"The Press",blurb:"printers, editors and a readership that has opinions about you"},
  {id:"unions",name:"The Combinations",blurb:"workingmen organized, which is either a partner or a threat"},
  {id:"church",name:"The Church",blurb:"pulpits reach further than proclamations ever did"},
  {id:"academy",name:"The Universities",blurb:"where the next generation of your opposition is currently studying"}
];
function civilOf(S,id){ S.civil=S.civil||{}; if(S.civil[id]==null)S.civil[id]=50; return S.civil[id]; }
function civilWord(v){ if(v>=70)return "friendly"; if(v>=55)return "civil"; if(v>=42)return "cool"; if(v>=28)return "hostile"; return "at war with you"; }

function newPolitician(S,bloc){
  const g=chance(0.5)?"m":"f";
  return {id:PID++,name:nameFor(g,usedNames(S))+" "+pick(surnamePool()),gender:g,age:38+rand(22),
    bloc:bloc||pick(Object.keys(S.facs).filter(k=>S.facs[k].present)),
    trait:rollTrait(),standing:30+rand(30),office:null};
}
function politicians(S){ return S.pols||[]; }
function seedPolitics(S){
  S.pols=[]; for(let i=0;i<5;i++)S.pols.push(newPolitician(S));
  S.civil={press:50,unions:45,church:52,academy:50};
}
function tickPolitics(S,span){
  if(!regimeIs(S,"republic"))return;
  if(!S.pols||!S.pols.length)seedPolitics(S);
  S.pols.forEach(p=>{ p.age+=span;
    p.standing=clamp(p.standing+(S.facs[p.bloc]&&S.facs[p.bloc].mood>55?2:-1)+(p.office?3:0)+(rand(5)-2)); });
  S.pols=S.pols.filter(p=>{
    if(p.age>72&&chance(0.3*span/4)){
      S.notices.push(`${p.name} has retired from public life.`); return false; }
    return true; });
  while(S.pols.length<5)S.pols.push(newPolitician(S));
  /* civil society drifts toward how it is being treated */
  CIVIL_BODIES.forEach(b=>{
    let pull=0;
    if(S.rep&&S.rep.entrench)pull-=S.rep.entrench*1.6;
    if(b.id==="press"&&S._pressOn)pull+=0.5;
    if(b.id==="academy")pull+=(S.works||[]).includes("university")?1:0;
    if(b.id==="unions")pull+=(S.facs.workers&&S.facs.workers.present)?(S.facs.workers.mood>50?1:-1.5):0;
    if(b.id==="church")pull+=(S.facs.clergy.mood>55?1:-1);
    S.civil[b.id]=clamp(civilOf(S,b.id)+pull+(rand(3)-1));
  });
}
const AMENDMENTS=[
  {id:"terms",name:"Fix the Term of Office",cost:{stability:+4},
   blurb:"a term written into the constitution, and a limit on how many a person may serve",
   effect:S=>{S.rep.termTurns=Math.max(2,S.rep.termTurns-1);S.legitPen=Math.max(0,(S.legitPen||0)-8);},
   gives:"shorter terms · legitimacy improves · harder to entrench"},
  {id:"suffrage",name:"Extend the Suffrage",cost:{stability:-3},
   blurb:"the vote given to those who have been paying for the state without choosing it",
   effect:S=>{S.facs.peasantry.strength=clamp(S.facs.peasantry.strength+10);
     if(S.facs.workers)S.facs.workers.strength=clamp(S.facs.workers.strength+10);
     S.facs.aristocracy.mood=clamp(S.facs.aristocracy.mood-8);S.legitPen=Math.max(0,(S.legitPen||0)-10);},
   gives:"the common estates gain weight · legitimacy improves · the old interests resent it"},
  {id:"courts",name:"Establish Judicial Review",cost:{stability:+3},
   blurb:"a bench that may strike down what the government does, including what you do",
   effect:S=>{S._consentEase=true;S.legitPen=Math.max(0,(S.legitPen||0)-9);S._costMod=(S._costMod||1)*1.04;},
   gives:"legitimacy improves · consent easier · everything you do costs a little more"},
  {id:"federal",name:"Grant the Provinces a Federal Charter",cost:{stability:+2},
   blurb:"the provinces given standing of their own, and governors they elect for themselves",
   effect:S=>{S.federal=true;provinces(S).forEach(p=>{p.loyalty=clamp(p.loyalty+12);});
     S.facs.provinces.mood=clamp(S.facs.provinces.mood+12);},
   gives:"every province steadies · the country binds itself in · secession becomes far less likely"}
];
function renderConvention(){
  const pols=politicians(S).slice().sort((a,b)=>b.standing-a.standing);
  const rest=provinces(S).filter(p=>!p.core&&p.loyalty<45);
  const amend=AMENDMENTS.filter(a=>!(S.amendments||[]).includes(a.id));
  let body="";
  body+=`<div class="subhead">The political class</div><div class="choices">${pols.map(p=>{
    const t=traitShown(p);
    return `<button class="choice dyn-role" data-pol="${p.id}">
      <div class="cl"><span class="mk">${p.office?"✦":"·"}</span><span class="lbl">${esc(p.name)}, ${p.age} — ${esc(S.facs[p.bloc].name)}${p.office?` · ${esc(p.office)}`:""}</span></div>
      <div class="ch">${t?(t.sure?`known to be ${esc(t.text.toLowerCase())}`:`said to be ${esc(t.text)}`):"an unknown quantity"} · standing ${Math.round(p.standing)}</div>
      <div class="costs">${p.office?`<span class="chip">holds office</span>`:`<span class="chip up">give them an office</span>`}<span class="chip fac ${S.facs[p.bloc].mood>50?"up":"down"}">${esc(S.facs[p.bloc].name)}</span></div></button>`;}).join("")}</div>`;
  body+=`<div class="subhead">Civil society</div><div class="choices">${CIVIL_BODIES.map(b=>{
    const v=civilOf(S,b.id);
    return `<button class="choice dyn-match" data-civil="${b.id}">
      <div class="cl"><span class="mk">·</span><span class="lbl">${esc(b.name)} — ${civilWord(v)}</span></div>
      <div class="ch">${esc(b.blurb)}</div>
      <div class="costs"><span class="chip">court them, or bring them to heel</span></div></button>`;}).join("")}</div>`;
  if(rest.length&&S.federal!==true)
    body+=`<div class="subhead">The country</div><div class="choices">
      <button class="choice dyn-desig" data-fed="autonomy">
        <div class="cl"><span class="mk">›</span><span class="lbl">Grant ${esc(rest[0].name)} its own assembly</span></div>
        <div class="ch">local government for a province that has stopped listening to the capital</div>
        <div class="costs"><span class="chip up">+16 loyalty there</span><span class="chip down">−12 gold</span><span class="chip">the others will ask too</span></div></button></div>`;
  if(amend.length)
    body+=`<div class="subhead">The constitution</div><div class="choices">${amend.map(a=>`
      <button class="choice dyn-desig" data-amend="${a.id}">
        <div class="cl"><span class="mk">§</span><span class="lbl">${esc(a.name)}</span></div>
        <div class="ch">${esc(a.blurb)}</div>
        <div class="costs"><span class="chip up">${esc(a.gives)}</span></div></button>`).join("")}</div>`;
  return `<div class="eyebrow">The convention</div><div class="sit-title">The Business of the Republic</div>
    <div class="sit-text">Offices, opinion, the country and the constitution. As much of it as the season allows.</div>
    ${body}
    <div class="choices"><button class="choice" data-dc="done"><div class="cl"><span class="mk">›</span><span class="lbl">Rise for the season</span></div></button></div>`;
}

/* ---------- convention handlers ---------- */
function doPol(id){
  const p=politicians(S).find(x=>x.id===id); if(!p){toConvention();return;}
  if(p.office){
    p.office=null; p.standing=clamp(p.standing-14);
    applyOutcome({cost:{stability:-3},fac:{[p.bloc]:-7},
      chron:S=>`${p.name} was dismissed from the government.`,
      out:`${p.name} clears their desk and gives an interview on the way out. A politician out of office has nothing to do but campaign, and they are rather good at it.`},"convention");
  } else {
    const posts=["Minister of the Interior","Minister of Finance","Minister of War","Foreign Minister","Minister of Works"];
    const taken=politicians(S).filter(x=>x.office).map(x=>x.office);
    const post=posts.find(x=>!taken.includes(x))||"Minister without Portfolio";
    p.office=post; p.standing=clamp(p.standing+12);
    applyOutcome({cost:{stability:+3},fac:{[p.bloc]:+8},
      chron:S=>`${p.name} was appointed ${post}.`,
      out:`${p.name} takes the ${post}. Their interest is flattered and their own standing grows — which is useful now and will be a problem in about fifteen years.`},"convention");
  }
  render();
}
function renderCivil(){
  const b=CIVIL_BODIES.find(x=>x.id===S._civilPick); if(!b){toConvention();return "";}
  const v=civilOf(S,b.id);
  return `<div class="eyebrow">Civil society</div><div class="sit-title">${esc(b.name)}</div>
    <div class="sit-text">${esc(b.blurb)}. They are currently ${civilWord(v)} toward the government.</div>
    <div class="choices">
      <button class="choice dyn-match" data-civilact="fund"><div class="cl"><span class="mk">I</span><span class="lbl">Fund them</span></div>
        <div class="ch">subsidies, charters, a building with your name on it</div>
        <div class="costs"><span class="chip down">−18 gold</span><span class="chip up">+14 goodwill</span></div></button>
      <button class="choice dyn-match" data-civilact="license"><div class="cl"><span class="mk">II</span><span class="lbl">License them</span></div>
        <div class="ch">permitted, registered, and required to be reasonable</div>
        <div class="costs"><span class="chip up">+6 Stability</span><span class="chip down">−8 goodwill</span></div></button>
      <button class="choice dyn-match" data-civilact="suppress"><div class="cl"><span class="mk">III</span><span class="lbl">Suppress them</span></div>
        <div class="ch">closed, banned, and driven to do the same work somewhere you cannot see it</div>
        <div class="costs"><span class="chip up">+10 Stability now</span><span class="chip down">−26 goodwill</span><span class="chip down">Legitimacy</span></div></button>
      <button class="choice" data-dc="back"><div class="cl"><span class="mk">›</span><span class="lbl">Leave them alone</span></div></button></div>`;
}
function doCivil(kind){
  const b=CIVIL_BODIES.find(x=>x.id===S._civilPick); S._civilPick=null;
  if(!b){toConvention();return;}
  if(kind==="fund"){ S.civil[b.id]=clamp(civilOf(S,b.id)+14);
    applyOutcome({cost:{gold:-18},fac:b.id==="unions"?{workers:+6}:b.id==="church"?{clergy:+7}:{merchants:+4},
      chron:S=>`the government took ${b.name.toLowerCase()} into its patronage.`,
      out:`Money, a charter and a photograph. They are friendlier. They are not bought — nobody who matters ever quite is — but they will give you the benefit of the doubt for a while.`},"convention");
  } else if(kind==="license"){ S.civil[b.id]=clamp(civilOf(S,b.id)-8);
    applyOutcome({cost:{stability:+6},fac:{reformers:-5},
      chron:S=>`${b.name} was brought under licence.`,
      out:`Registration, conditions, an office that grants and withdraws permission. Everything continues, slightly more carefully, and everyone knows exactly what changed.`},"convention");
  } else { S.civil[b.id]=clamp(civilOf(S,b.id)-26); S.legitPen=(S.legitPen||0)+8;
    bumpPressure(S,"radical",9);
    applyOutcome({cost:{stability:+10},fac:{reformers:-12,merchants:-6},
      chron:S=>`the government suppressed ${b.name.toLowerCase()}.`,
      out:`Presses seized, halls closed, a list of names. It works immediately and it costs you the argument permanently — whatever they were saying is now true simply because you stopped them saying it.`},"convention");
  }
  render();
}
function doFederal(){
  const rest=provinces(S).filter(p=>!p.core&&p.loyalty<45);
  const p=rest[0]; if(!p){toConvention();return;}
  p.loyalty=clamp(p.loyalty+16); p.autonomy=true;
  applyOutcome({cost:{gold:-12},fac:{provinces:+8},
    chron:S=>`${p.name} was granted an assembly of its own.`,
    out:`${p.name} gets a chamber, a budget and the right to argue with the capital in public. Loyalty follows almost at once — and every other province has now seen what asking loudly achieves.`},"convention");
  render();
}
function doAmend(id){
  const a=AMENDMENTS.find(x=>x.id===id); if(!a){toConvention();return;}
  S.amendments=(S.amendments||[]).concat([a.id]);
  S.amendYear=S.amendYear||{}; S.amendYear[a.id]=S.year;
  a.effect(S);
  applyOutcome({cost:a.cost,chron:S=>`the constitution of ${S.nation} was amended: ${a.name}.`,
    out:`${a.blurb}.\n\nIt is written down, and written down is different. ${a.gives}.`},"convention");
  render();
}
function toConvention(){ S.result=null; S.phase="convention"; render(); }
