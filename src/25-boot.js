"use strict";
/* =====================================================================
   SAVE / LOAD / SCORE / NEW
   ===================================================================== */
const SAVE_VERSION=11;
/* ---------- autosave ----------
   Mobile browsers discard backgrounded tabs to reclaim memory and no page
   can prevent it. So instead of fighting the reload, we make it harmless:
   the reign is written to this browser's own storage every turn and again
   the moment the page goes into the background. */
const AUTOSAVE_KEY="sovereign.autosave";
function autosave(){
  try{ if(!S)return;
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      at:Date.now(), nation:S.nation, year:S.year, regime:S.regime||"monarchy",
      title:(S.monarch?styled(S,S.monarch):""), code:b64enc(JSON.stringify(S))
    }));
  }catch(e){}
}
function autosaveInfo(){
  try{ const raw=localStorage.getItem(AUTOSAVE_KEY); if(!raw)return null;
    const o=JSON.parse(raw); return (o&&o.code&&o.nation)?o:null;
  }catch(e){ return null; }
}
function clearAutosave(){ try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(e){} }
function adoptState(st){
  S=st; PID=Math.max(PID,(S.family||[]).reduce((a,p)=>Math.max(a,p.id||0),0)+1,(S.monarch&&S.monarch.id||0)+1);
  const migrated=migrateSave(S);
  if(S.currentEvent&&S.currentEvent.id){
    S.currentEvent=(S.currentEvent.id==="revolt")?REVOLT:(EVENTS.find(e=>e.id===S.currentEvent.id)||null);
    if(!S.currentEvent)S.phase="court";
  }
  if(S.phase==="naming"){S.phase="court";S.pending=null;}
  return migrated;
}
function resumeAutosave(){
  const info=autosaveInfo(); if(!info)return false;
  try{ adoptState(JSON.parse(b64dec(info.code))); render(); return true; }
  catch(e){ return false; }
}   /* bumped whenever a save needs migrating */
function b64enc(s){return btoa(unescape(encodeURIComponent(s)));}
function b64dec(s){return decodeURIComponent(escape(atob(s)));}
function openModal(inner){const bg=h(`<div class="modal-bg"><div class="modal">${inner}</div></div>`);bg.addEventListener("click",e=>{if(e.target===bg)bg.remove();});document.body.appendChild(bg);return bg;}
/* ---------- save migration ----------
   Old codes still load. Anything a later version added is filled in here,
   and the player is told plainly what was brought forward. */
function migrateSave(S){
  const v=S.saveVersion||0, notes=[];
  if(v>=SAVE_VERSION) return notes;
  /* v9: relations became derived from parentage. Saves written before that
     have a founding generation with no parents recorded, which would read
     as distant kin forever. Give them a shared phantom couple. */
  const orphans=(S.family||[]).filter(p=>!p.parents&&p.rel!=="spouse"&&p.rel!=="dowager"&&!p.spouseId);
  if(orphans.length&&S.monarch){
    if(!S.monarch.parents){ S.monarch.parents=[PID++,PID++]; }
    orphans.forEach(p=>{ if(p.rel==="sibling"||p.rel==="uncle") p.parents=S.monarch.parents.slice(); });
    notes.push("The founding generation had no parentage on record, so the family tree read them as distant cousins. They have been restored as brothers and sisters.");
  }
  /* v10: the realm gained provinces. A save from before that has none — so
     generate a country whose loyalty reflects how the provinces estate feels. */
  if(!S.provinces||!S.provinces.length){
    S.provinces=newProvinces(S);
    const mood=(S.facs&&S.facs.provinces)?S.facs.provinces.mood:52;
    S.provinces.forEach(p=>{ p.loyalty=clamp(mood+(rand(13)-6)); });
    S.lostProvinces=S.lostProvinces||[];
    notes.push(`The realm has been surveyed into ${S.provinces.length} provinces, their loyalty taken from the standing of the countryside at court.`);
  }
  if(S.workCount==null&&(S.works||[]).length){
    S.workCount={}; S.works.forEach(id=>{S.workCount[id]=1;});
    notes.push("Your existing works have been entered in the new register.");
  }
  /* v11: the regimes learned to clean up after themselves, titles became
     historical facts, and a country that has just changed its government
     is given three turns before it may do so again. Saves from before that
     may be carrying a regency they should have lost, a party congress
     inside a republic, or estates abolished by a people's republic that
     ended a century ago. Put it right. */
  if(S.foundingTitle==null&&S.gov&&S.gov.crown) S.foundingTitle=S.gov.crown.titleBase;
  if(S.regime&&S.regime!=="monarchy"&&(S.regency||S._minority||S.pm)){
    S.regency=null; S._minority=false; S.pm=null; S._pmPending=false;
    notes.push("Your government was still carrying a royal regency it had no business with. The regent has been retired.");
  }
  if(S.regime&&S.regime!=="people"&&S.gov&&(S.gov.institutions||[]).some(i=>i.id==="party")){
    S.gov.institutions.filter(i=>i.id==="party").forEach(inst=>{ powerToCrown(S,inst,inst.power); });
    S.gov.institutions=S.gov.institutions.filter(i=>i.id!=="party");
    notes.push("A party congress was still sitting in a state that is no longer a people's republic. It has been dissolved, and its share of the power returned.");
  }
  if(S.regime&&S.regime!=="people"&&S.formerPeople){
    ["aristocracy","clergy"].forEach(k=>{ if(S.facs&&S.facs[k]&&!S.facs[k].present){
      S.facs[k].present=true; S.facs[k].strength=clamp(S.facs[k].strength+20); }});
    S.formerPeople=false;
    notes.push("The old estates had stayed abolished long after the revolution that abolished them ended. They are back — poorer, and not pleased.");
  }
  if(S.lineage)S.lineage.forEach(l=>{ if(l.title==null)l.title=S.foundingTitle||"King"; });
  if(S._settledUntil==null)S._settledUntil=0;
  if(S.customTitles==null)S.customTitles={republic:"",junta:"",people:""};
  if(S._debtYears==null)S._debtYears=0;
  if(S._reactYears==null)S._reactYears=0;
  if(S.workCount==null)S.workCount={};
  S.saveVersion=SAVE_VERSION;
  if(!notes.length)notes.push("Minor bookkeeping brought up to date.");
  return notes;
}
function saveModal(){if(!S)return;S.saveVersion=SAVE_VERSION;const code=b64enc(JSON.stringify(S));
  const bg=openModal(`<h2>Save your reign</h2><p>Copy this code and keep it. Paste it under <b>Load</b> to resume exactly here — no connection needed.</p>
    <textarea id="saveCode" readonly>${esc(code)}</textarea><div class="mrow"><button class="go" id="copyC">Copy code</button><button id="closeM">Close</button></div>`);
  bg.querySelector("#copyC").onclick=()=>{const t=bg.querySelector("#saveCode");t.select();try{document.execCommand("copy");}catch(e){}bg.querySelector("#copyC").textContent="Copied ✓";};
  bg.querySelector("#closeM").onclick=()=>bg.remove();}
function loadModal(){const bg=openModal(`<h2>Load a saved reign</h2><p>Paste a save-code to resume that reign.</p>
    <textarea id="loadCode" placeholder="Paste your save-code…"></textarea><div class="mrow"><button class="go" id="doLoad">Resume reign</button><button id="closeM">Cancel</button></div>`);
  bg.querySelector("#closeM").onclick=()=>bg.remove();
  bg.querySelector("#doLoad").onclick=()=>{try{const st=JSON.parse(b64dec(bg.querySelector("#loadCode").value.trim()));if(!st||!st.nation)throw 0;
    S=st;PID=Math.max(PID, (S.family||[]).reduce((a,p)=>Math.max(a,p.id||0),0)+1, (S.monarch&&S.monarch.id||0)+1);
    const migrated=migrateSave(S);
    if(S.currentEvent&&S.currentEvent.id){S.currentEvent=(S.currentEvent.id==="revolt")?REVOLT:(EVENTS.find(e=>e.id===S.currentEvent.id)||null);
      if(!S.currentEvent){S.phase="court";}}
    if(S.phase==="naming"){S.phase="court";S.pending=null;}
    bg.remove();render();
    if(migrated.length) setTimeout(()=>{
      const m=openModal(`<h2>An older chronicle</h2>
        <p>This save was written by an earlier version of the game. It has been brought forward:</p>
        <ul style="margin:0 0 14px 18px;color:#b7c0c8;font-size:13px;line-height:1.7">${migrated.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        <p style="color:var(--dim);font-size:12px">Everything else carries over untouched.</p>
        <div class="mrow"><button id="okM">Continue the reign</button></div>`);
      m.querySelector("#okM").onclick=()=>m.remove();
    },60);
  }catch(e){alert("That doesn't look like a valid save-code.");}};}
function scoreModal(){if(!S)return;
  const bg=openModal(`<h2>The Historian's Verdict</h2><p>The chronicle of ${esc(S.nation)}, as later ages will remember it:</p>
    <div class="scoregrid"><div><span class="n">${S.year-S.startYear}</span><span class="l">years</span></div>
      <div><span class="n">${S._successions+1}</span><span class="l">sovereigns</span></div>
      <div><span class="n">${S._houseBreaks}</span><span class="l">houses fallen</span></div>
      <div><span class="n">${S.seenMilestones.length}</span><span class="l">milestones</span></div>
      <div><span class="n">${S._reforms}</span><span class="l">reforms</span></div>
      <div><span class="n">${legacyScore()}</span><span class="l">legacy</span></div></div>
    <div class="verdict">${esc(verdict())}</div><div class="mrow"><button id="closeM">Return to the throne</button></div>`);
  bg.querySelector("#closeM").onclick=()=>bg.remove();}
function newModal(){const bg=openModal(`<h2>Begin a new reign?</h2><p>This ends the current reign. If you haven't saved its code, its history will be lost.</p>
    <div class="mrow"><button class="go" id="doNew">Begin anew</button><button id="closeM">Keep ruling</button></div>`);
  bg.querySelector("#closeM").onclick=()=>bg.remove();bg.querySelector("#doNew").onclick=()=>{S=null;bg.remove();render();};}

function titleForG(g,base){return titleForm(base||(S&&S.gov.crown.titleBase)||"King",g);}
function dynModal(){
  if(!S)return;
  const seq=[...S.lineage.map(l=>Object.assign({},l,{cur:false})),{id:S.monarch.id,name:S.monarch.name,regnal:S.monarch.regnal,house:S.monarch.house,gender:S.monarch.gender,title:S.gov.crown.titleBase,cur:true}];
  const runs=[];seq.forEach(m=>{const last=runs[runs.length-1];if(last&&last.house===m.house)last.list.push(m);else runs.push({house:m.house,list:[m]});});
  const rollHtml=runs.map(r=>`<div style="margin-bottom:10px"><div style="color:var(--brass);font-size:11px;letter-spacing:.1em;text-transform:uppercase">${/^the /i.test(r.house)?esc(r.house.charAt(0).toUpperCase()+r.house.slice(1)):"House of "+esc(r.house)}</div>${r.list.map(m=>`<div style="font-size:13px;color:#c8cfd6;padding-left:10px">${esc(titleForG(m.gender||"m",m.title))} ${esc(m.name)}${(m.regnal||1)>1?" "+(ROMAN[m.regnal]||m.regnal):""}${m.birthName?` <span style="color:#6f7a84">(born ${esc(m.birthName)})</span>`:""}${m.cur?' <span style="color:var(--brass)">— reigning</span>':""}</div>`).join("")}</div>`).join("");
  const persons=[...S.family,...(S.ancestors||[]),S.monarch];
  const houseNames=[...new Set(seq.map(m=>m.house))];
  const treeHtml=houseNames.map(hn=>{
    const sovsH=seq.filter(m=>m.house===hn&&m.id!=null);
    const inner=sovsH.map(m=>{
    const kids=persons.filter(q=>q.parents&&q.parents.includes(m.id));
    const sps=persons.filter(q=>q.spouseId===m.id&&q.id!==m.id);
    const spTxt=sps.length?sps.map(x=>`${esc(x.name)}${x.alive?"":" †"}`).join(", then "):"";
    const yrs=(m.start||m.born)?` <span style="color:#6f7a84;font-size:11.5px">${m.born?`b. ${m.born}`:""}${m.start?`${m.born?", ":""}r. ${m.start}–${m.end||"present"}`:""}</span>`:"";
    return `<div style="margin-bottom:9px"><div style="font-size:13.5px;color:var(--bone)">◆ ${esc(titleForG(m.gender||"m",m.title))} ${esc(m.name)}${(m.regnal||1)>1?" "+(ROMAN[m.regnal]||m.regnal):""}${spTxt?` ⚭ ${spTxt}`:""}${yrs}</div>${
      kids.map(k=>{const ksps=persons.filter(q=>q.spouseId===k.id&&q.id!==k.id);const gks=persons.filter(q=>q.parents&&q.parents.includes(k.id));
        const crowned=seq.some(x=>x.id===k.id);
        return `<div style="padding-left:16px;font-size:12.5px;color:#b7c0c8">└ ${crowned?"♛ ":""}${esc(k.birthName||k.name)}${k.birthName?` — crowned as ${esc(k.name)}${(k.regnal||1)>1?" "+(ROMAN[k.regnal]||""):""}`:""}${k.alive?"":" †"}${ksps.length?` ⚭ ${ksps.map(x=>esc(x.name)).join(", then ")}`:""}${k.born?` <span style="color:#6f7a84;font-size:11px">b. ${k.born}</span>`:""}</div>${gks.map(g2=>`<div style="padding-left:32px;font-size:12px;color:#93a0ab">└ ${esc(g2.name)}${g2.alive?"":" †"}</div>`).join("")}`;}).join("")
      ||`<div style="padding-left:16px;font-size:12px;color:#6f7a84;font-style:italic">no recorded issue</div>`}</div>`;}).join("");
    return `<div style="margin-bottom:12px"><div style="color:var(--brass);font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px">House of ${esc(hn)}${hn===S.house?" — reigning":" — fallen"}</div>${inner||'<div style="font-size:12px;color:#6f7a84;font-style:italic">no recorded generations</div>'}</div>`;
  }).join("");
  const bg=openModal(`<h2>The Dynasties of ${esc(S.nation)}</h2>
    <p>Every house that has held the crown — and the recorded tree of the reigning house. (The record-keepers began with this age; earlier generations are lost to them.)</p>
    <div style="max-height:46vh;overflow-y:auto">${rollHtml}
      <div style="border-top:1px solid var(--line);margin:10px 0 0;padding-top:10px">
        <div style="color:var(--brass);font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">The Recorded Trees</div>${treeHtml||'<div style="font-size:12px;color:#6f7a84;font-style:italic">the record begins with the reigning sovereign</div>'}</div></div>
    <div class="mrow"><button id="closeM">Close</button></div>`);
  bg.querySelector("#closeM").onclick=()=>bg.remove();
}
document.getElementById("btnSave").onclick=saveModal;
document.getElementById("btnLoad").onclick=loadModal;
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden")autosave(); });
window.addEventListener("pagehide",autosave);
window.addEventListener("beforeunload",autosave);
document.getElementById("btnScore").onclick=scoreModal;
document.getElementById("btnNew").onclick=newModal;
document.getElementById("btnChron").onclick=()=>{if(!S)return;S.ui=S.ui||{};S.ui.chronOpen=!S.ui.chronOpen;render();};
document.getElementById("btnDyn").onclick=()=>dynModal();

render();