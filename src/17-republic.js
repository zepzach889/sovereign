"use strict";
/* =====================================================================
   THE REPUBLIC
   Power changes hands and you do not leave — you wake behind the winner.
   Each administration inherits a mandate it did not write, pays a price
   for undoing its predecessors, and may refuse to go at a ruinous cost.
   ===================================================================== */
const MANDATES={
  merchants:[
    {id:"m_tax",label:"Lighten the burden on trade",how:"set taxation to light or none",check:S=>["none","light"].includes(S.taxRate)},
    {id:"m_surplus",label:"Balance the books",how:"run the books at or above break-even",check:S=>netIncome(S)>=0},
    {id:"m_build",label:"Build what commerce needs",how:"raise development 4 above where you took office",check:S=>S.development>=(S.rep.devAtStart+4)}],
  peasantry:[
    {id:"p_tax",label:"Lift the taxes off the land",how:"keep taxation at moderate or lower",check:S=>["none","light","moderate"].includes(S.taxRate)},
    {id:"p_bread",label:"Keep the country quiet and fed",how:"hold stability at 55 or better",check:S=>S.stability>=55},
    {id:"p_mood",label:"Govern for the common people",how:"bring the commons to content (mood 55)",check:S=>S.facs.peasantry.mood>=55}],
  officers:[
    {id:"o_arms",label:"Restore the strength of the army",how:"raise Arms 6 above where you took office",check:S=>S.military>=(S.rep.armsAtStart+6)},
    {id:"o_mood",label:"Keep faith with the officer corps",how:"bring the officers to content (mood 55)",check:S=>S.facs.officers.mood>=55}],
  clergy:[
    {id:"c_faith",label:"Honour the faith of the realm",how:"bring the clergy to mood 58",check:S=>S.facs.clergy.mood>=58},
    {id:"c_order",label:"Hold the realm to good order",how:"hold stability at 55 or better",check:S=>S.stability>=55}],
  aristocracy:[
    {id:"a_priv",label:"Respect the ancient privileges",how:"bring the great houses to mood 55",check:S=>S.facs.aristocracy.mood>=55},
    {id:"a_order",label:"Keep property safe",how:"hold stability at 52 or better",check:S=>S.stability>=52}],
  provinces:[
    {id:"v_loyal",label:"Govern the country as well as the capital",how:"hold average provincial loyalty at 55",check:S=>provinceLoyaltyAvg(S)>=55},
    {id:"v_works",label:"Carry the roads out to the provinces",how:"raise development 3 above where you took office",check:S=>S.development>=(S.rep.devAtStart+3)}],
  workers:[
    {id:"w_mood",label:"Answer the demands of labour",how:"bring labour to content (mood 55)",check:S=>(S.facs.workers&&S.facs.workers.mood>=55)},
    {id:"w_works",label:"Put the unemployed to work",how:"raise development 4 above where you took office — works, not words",check:S=>S.development>=(S.rep.devAtStart+4)}],
  reformers:[
    {id:"r_reform",label:"Carry a further measure of reform",how:"carry at least one more reform than you inherited",check:S=>(S.reforms||[]).length>(S.rep.reformsAtStart)},
    {id:"r_legit",label:"Govern by consent, visibly",how:"hold legitimacy at 58 or better",check:S=>legitimacy(S)>=58}]
};
function newMandate(S,bloc){
  const pool=(MANDATES[bloc]||MANDATES.merchants).slice();
  const take=Math.min(pool.length,2+(chance(0.4)?1:0));
  const out=[];
  while(out.length<take&&pool.length){ out.push(pool.splice(rand(pool.length),1)[0]); }
  return out.map(m=>({id:m.id,label:m.label,how:m.how}));
}
function mandateCheck(S,id){
  for(const b in MANDATES){ const m=MANDATES[b].find(x=>x.id===id); if(m)return !!m.check(S); }
  return false;
}
function repLeaderName(S){ return nameFor(chance(0.5)?"m":"f",usedNames(S))+" "+pick(surnamePool()); }
function installRepublic(S,fromJunta){
  clearRegimeState(S,"republic");
  /* a republic needs a legislature, or there is nobody to elect.
     A party congress is not one — it has the same composition and used to
     satisfy this test, which is how a republic inherited an 80-point
     single-party chamber and called it a parliament. */
  if(!S.gov.institutions.some(i=>i.composition==="national"&&i.id!=="party")){
    /* reclaim before dissolving, or the hundred points leak away */
    S.gov.institutions.forEach(inst=>{ powerToCrown(S,inst,inst.power); });
    S.gov.institutions=[];
    const inst={id:"assembly",name:(culture(S).inst[2]||"The National Assembly"),
      composition:"national",power:0,rights:["tax","law","consent"]};
    S.gov.institutions.push(inst);
    transferPower(S,inst,Math.min(62,S.gov.crown.power));
  }
  const er=runElection();
  const bloc=er?er.winner:"merchants";
  S.regime="republic";
  S.gov.crown.titleBase=cleanTitle(S.customTitles&&S.customTitles.republic)||pick(regimeTitles(S,"republic"));
  S.rep={bloc,term:1,termTurns:4,nextVote:S.turn+4,entrench:0,friction:1,
    devAtStart:S.development,armsAtStart:S.military,reformsAtStart:(S.reforms||[]).length,
    mandate:newMandate(S,bloc),kept:0,broken:0};
  S.junta=null;
  const g=chance(0.5)?"m":"f";
  S.monarch={id:PID++,name:repLeaderName(S),gender:g,age:44+rand(18),house:"the Republic",
    regnal:1,alive:true,parents:null,spouseId:null,born:S.year-50,trait:rollTrait(),reignStart:S.year};
  S.legitPen=Math.max(0,(S.legitPen||0)-(fromJunta?20:8));
  S.stability=clamp(S.stability+(fromJunta?10:4));
  S.facs[bloc].mood=clamp(S.facs[bloc].mood+10);
  seedPolitics(S);
  refreshRelations(S);
}
/* ---------- the handover ---------- */
function repElection(S){
  const er=runElection();
  const winner=er?er.winner:S.rep.bloc;
  /* judge the outgoing administration against the promises it inherited */
  let kept=0;
  (S.rep.mandate||[]).forEach(m=>{ if(mandateCheck(S,m.id))kept++; });
  const total=(S.rep.mandate||[]).length||1;
  const ratio=kept/total;
  if(ratio>=0.99){ S.stability=clamp(S.stability+7); S.legitPen=Math.max(0,(S.legitPen||0)-8); }
  else if(ratio>=0.5){ S.stability=clamp(S.stability+2); }
  else { S.stability=clamp(S.stability-6); S.legitPen=(S.legitPen||0)+6; S.facs[S.rep.bloc].mood=clamp(S.facs[S.rep.bloc].mood-10); }
  const changed=winner!==S.rep.bloc;
  const oldName=S.monarch.name, oldBloc=S.rep.bloc;
  S.rep.bloc=winner; S.rep.term++; S.rep.nextVote=S.turn+S.rep.termTurns;
  S.rep.devAtStart=S.development; S.rep.armsAtStart=S.military; S.rep.reformsAtStart=(S.reforms||[]).length;
  S.rep.mandate=newMandate(S,winner);
  if(changed){
    const g=chance(0.5)?"m":"f";
    S.monarch={id:PID++,name:repLeaderName(S),gender:g,age:44+rand(18),house:"the Republic",
      regnal:1,alive:true,parents:null,spouseId:null,born:S.year-50,trait:rollTrait(),reignStart:S.year};
    S.facs[winner].mood=clamp(S.facs[winner].mood+8);
    S.facs[oldBloc].mood=clamp(S.facs[oldBloc].mood-5);
  } else { S.monarch.reignStart=S.monarch.reignStart||S.year; }
  return {kept,total,changed,winner,oldName,oldBloc};
}
function renderRepVote(){
  const r=S._repResult;
  const b=S.facs[r.winner].name;
  return `<div class="eyebrow">The country votes</div>
    <div class="sit-title">${r.changed?"A Change of Government":"The Government Is Returned"}</div>
    <div class="sit-text">The outgoing administration kept ${r.kept} of ${r.total} promises it came in with. ${r.changed
      ? `The ${esc(b)} interest has won, and ${esc(r.oldName)} has conceded. You will wake tomorrow behind ${esc(S.monarch.name)} — who spent the campaign explaining what was wrong with everything you built.`
      : `The ${esc(b)} interest is returned to office. The programme continues, which is its own kind of danger.`}</div>
    <div class="sit-text" style="color:var(--brass-dim)">The new administration owes the country: ${(S.rep.mandate||[]).map(m=>esc(m.label)).join(" · ")}</div>
    <button class="cont" id="repGo">Take office →</button>`;
}
function mandatePanel(S){
  if(!regimeIs(S,"republic")||!S.rep)return "";
  const turns=Math.max(0,S.rep.nextVote-S.turn);
  return `<div class="press"><div class="gt">The Mandate</div>
    ${(S.rep.mandate||[]).map(m=>{const done=mandateCheck(S,m.id);
      const how=m.how||mandateHow(m.id);
      return `<div class="prow ${done?"":"warn"}"><span class="pn">${esc(m.label)}${how?` <small style="color:var(--dim)">· ${esc(how)}</small>`:""}</span><span class="pw">${done?"kept":"outstanding"}</span></div>`;}).join("")}
    <div class="pnote">${S.rep.entrench?`the last election was ${S.rep.entrench===1?"postponed once":"postponed "+S.rep.entrench+" times"} — `:""}${turns<=0?"the country votes this season":`${turns} turn${turns===1?"":"s"} until the country votes`}${S.rep.friction>1?` · a government governing without consent pays ${Math.round((S.rep.friction-1)*100)}% more for everything`:""}</div></div>`;
}

/* saves written before the mandate carried its own instructions */
function mandateHow(id){
  for(const b in MANDATES){ const m=MANDATES[b].find(x=>x.id===id); if(m)return m.how||""; }
  return "";
}
