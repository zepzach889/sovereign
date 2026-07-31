/* =====================================================================
   SAVE / LOAD / SCORE / NEW
   ===================================================================== */
function b64enc(s){return btoa(unescape(encodeURIComponent(s)));}
function b64dec(s){return decodeURIComponent(escape(atob(s)));}
function openModal(inner){const bg=h(`<div class="modal-bg"><div class="modal">${inner}</div></div>`);bg.addEventListener("click",e=>{if(e.target===bg)bg.remove();});document.body.appendChild(bg);return bg;}
function saveModal(){if(!S)return;const code=b64enc(JSON.stringify(S));
  const bg=openModal(`<h2>Save your reign</h2><p>Copy this code and keep it. Paste it under <b>Load</b> to resume exactly here — no connection needed.</p>
    <textarea id="saveCode" readonly>${esc(code)}</textarea><div class="mrow"><button class="go" id="copyC">Copy code</button><button id="closeM">Close</button></div>`);
  bg.querySelector("#copyC").onclick=()=>{const t=bg.querySelector("#saveCode");t.select();try{document.execCommand("copy");}catch(e){}bg.querySelector("#copyC").textContent="Copied ✓";};
  bg.querySelector("#closeM").onclick=()=>bg.remove();}
function loadModal(){const bg=openModal(`<h2>Load a saved reign</h2><p>Paste a save-code to resume that reign.</p>
    <textarea id="loadCode" placeholder="Paste your save-code…"></textarea><div class="mrow"><button class="go" id="doLoad">Resume reign</button><button id="closeM">Cancel</button></div>`);
  bg.querySelector("#closeM").onclick=()=>bg.remove();
  bg.querySelector("#doLoad").onclick=()=>{try{const st=JSON.parse(b64dec(bg.querySelector("#loadCode").value.trim()));if(!st||!st.nation)throw 0;
    S=st;PID=Math.max(PID, (S.family||[]).reduce((a,p)=>Math.max(a,p.id||0),0)+1, (S.monarch&&S.monarch.id||0)+1);
    if(S.currentEvent&&S.currentEvent.id){S.currentEvent=(S.currentEvent.id==="revolt")?REVOLT:(EVENTS.find(e=>e.id===S.currentEvent.id)||null);
      if(!S.currentEvent){S.phase="court";}}
    if(S.phase==="naming"){S.phase="court";S.pending=null;}
    bg.remove();render();
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

function titleForG(g){const t=TITLE_FORMS[(S&&S.gov.crown.titleBase)||"King"]||TITLE_FORMS["King"];return g==="f"?t.f:t.m;}
function dynModal(){
  if(!S)return;
  const seq=[...S.lineage.map(l=>Object.assign({},l,{cur:false})),{id:S.monarch.id,name:S.monarch.name,regnal:S.monarch.regnal,house:S.monarch.house,gender:S.monarch.gender,cur:true}];
  const runs=[];seq.forEach(m=>{const last=runs[runs.length-1];if(last&&last.house===m.house)last.list.push(m);else runs.push({house:m.house,list:[m]});});
  const rollHtml=runs.map(r=>`<div style="margin-bottom:10px"><div style="color:var(--brass);font-size:11px;letter-spacing:.1em;text-transform:uppercase">House of ${esc(r.house)}</div>${r.list.map(m=>`<div style="font-size:13px;color:#c8cfd6;padding-left:10px">${esc(titleForG(m.gender||"m"))} ${esc(m.name)}${(m.regnal||1)>1?" "+(ROMAN[m.regnal]||m.regnal):""}${m.birthName?` <span style="color:#6f7a84">(born ${esc(m.birthName)})</span>`:""}${m.cur?' <span style="color:var(--brass)">— reigning</span>':""}</div>`).join("")}</div>`).join("");
  const persons=[...S.family,...(S.ancestors||[]),S.monarch];
  const houseNames=[...new Set(seq.map(m=>m.house))];
  const treeHtml=houseNames.map(hn=>{
    const sovsH=seq.filter(m=>m.house===hn&&m.id!=null);
    const inner=sovsH.map(m=>{
    const kids=persons.filter(q=>q.parents&&q.parents.includes(m.id));
    const sps=persons.filter(q=>q.spouseId===m.id&&q.id!==m.id);
    const spTxt=sps.length?sps.map(x=>`${esc(x.name)}${x.alive?"":" †"}`).join(", then "):"";
    const yrs=(m.start||m.born)?` <span style="color:#6f7a84;font-size:11.5px">${m.born?`b. ${m.born}`:""}${m.start?`${m.born?", ":""}r. ${m.start}–${m.end||"present"}`:""}</span>`:"";
    return `<div style="margin-bottom:9px"><div style="font-size:13.5px;color:var(--bone)">◆ ${esc(titleForG(m.gender||"m"))} ${esc(m.name)}${(m.regnal||1)>1?" "+(ROMAN[m.regnal]||m.regnal):""}${spTxt?` ⚭ ${spTxt}`:""}${yrs}</div>${
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
document.getElementById("btnScore").onclick=scoreModal;
document.getElementById("btnNew").onclick=newModal;
document.getElementById("btnChron").onclick=()=>{if(!S)return;S.ui=S.ui||{};S.ui.chronOpen=!S.ui.chronOpen;render();};
document.getElementById("btnDyn").onclick=()=>dynModal();

render();