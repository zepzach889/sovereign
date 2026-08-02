"use strict";
/* =====================================================================
   SETUP
   ===================================================================== */
let SETUP={culture:"anglo",title:null,law:"malepref",nation:"",house:"",custom:{republic:"",junta:"",people:""}};
function renderSetup(){
  const C=CULTURES[SETUP.culture]||CULTURES.anglo;
  const titles=C.titles.filter(t=>TITLE_FORMS[t]);
  if(!SETUP.title||!titles.includes(SETUP.title))SETUP.title=titles[0];
  const el=h(`<div class="setup">
    <p class="lede">You are not a king. You are the <b>will that governs</b> — the hand on the wheel while sovereigns are born, crowned and buried. Rule one nation through the dynastic age: raise heirs, survive regencies, watch rival claimants, and decide whether the crown stays absolute or is slowly forced to share its power. There is no winning — only the history you leave behind.</p>
    <div class="field"><label>Name your nation</label>
      <input type="text" id="natInput" placeholder="e.g. Veridia, Old Halentine, Corvane…" maxlength="28" />
      <div class="suggest">${["Veridia","Old Halentine","Corvane","Marovia","Ashfeld"].map(n=>`<button data-nat="${n}">${n}</button>`).join("")}</div></div>
    <div class="field"><label>The naming tradition of the realm</label>
      <div class="radio-row" id="cultRow">${CULTURE_KEYS.map(k=>`<button data-cult="${k}" class="${SETUP.culture===k?"on":""}">${CULTURES[k].name}</button>`).join("")}</div>
      <div class="hint">${esc(C.blurb)} Names, houses and titles are drawn from this tradition — and naming fashions drift as the ages turn. Everything else about the realm is unchanged.</div></div>
    <div class="field"><label>Name your Royal House</label>
      <input type="text" id="houseInput" placeholder="e.g. ${esc(C.houses.slice(0,3).join(", "))}…" maxlength="24" />
      <div class="suggest">${C.houses.slice(0,5).map(n=>`<button data-house="${n}">${esc(n)}</button>`).join("")}</div></div>
    <div class="field"><label>The style of the crown</label>
      <div class="radio-row" id="titleRow">${titles.map(t=>`<button data-title="${t}" class="${SETUP.title===t?"on":""}">${t} / ${TITLE_FORMS[t].f}</button>`).join("")}</div>
      <div class="hint">Sovereigns bear the form matching their person — a King's daughter reigns as Queen.</div></div>
    <div class="field"><label>If the crown should fall</label>
      <div class="hint" style="margin-top:0">Nothing lasts three hundred years. If a republic, a junta or a people's republic takes the state, its head will be styled from the tradition above — or by whatever you write here. Leave them blank and the realm will decide for itself.</div>
      <div class="customtitles">
        <input type="text" id="ctRepublic" placeholder="a republic — ${esc(C.repTitles[0])}, ${esc(C.repTitles[1])}…" maxlength="28" />
        <input type="text" id="ctJunta" placeholder="a junta — ${esc(C.juntaTitles[0])}, ${esc(C.juntaTitles[1])}…" maxlength="28" />
        <input type="text" id="ctPeople" placeholder="a people's republic — ${esc(C.peopleTitles[0])}, ${esc(C.peopleTitles[1])}…" maxlength="28" />
      </div></div>
    <div class="field"><label>The law of succession</label>
      <div class="law-list" id="lawList">${Object.keys(LAWS).map((l,i)=>`
        <button data-law="${l}" class="${SETUP.law===l?"on":""}"><div class="ln">${LAWS[l].name}</div><div class="ld">${LAWS[l].desc}</div></button>`).join("")}</div>
      <div class="hint">Chosen at the founding; it can later be rewritten — at a price — by reform.</div></div>
    <button class="primary" id="beginBtn" disabled>Name your nation to take the throne</button>
    ${(function(){
      const a=(typeof autosaveInfo==="function")?autosaveInfo():null;
      const when=a?new Date(a.at):null;
      return `<div class="resume">
        ${a?`<button class="resumebtn" id="resumeBtn">Resume — ${esc(a.title||a.nation)}, ${esc(String(a.year))}
            <small>${esc(a.nation)} · last played ${when?when.toLocaleDateString():"recently"}</small></button>`:""}
        <button class="loadlink" id="setupLoad">${a?"…or paste a save-code":"Resume a chronicle from a save-code"}</button>
      </div>`;})()}
    </div>`);
  app.innerHTML="";app.appendChild(el);
  const nat=document.getElementById("natInput"),house=document.getElementById("houseInput"),begin=document.getElementById("beginBtn");
  nat.value=SETUP.nation; house.value=SETUP.house;
  const sync=()=>{const ok=nat.value.trim()&&house.value.trim();begin.disabled=!ok;
    begin.textContent=ok?`Take the throne of ${nat.value.trim()}`:"Name your nation and house to take the throne";};
  nat.oninput=()=>{SETUP.nation=nat.value;sync();};
  house.oninput=()=>{SETUP.house=house.value;sync();};
  document.querySelectorAll("[data-cult]").forEach(b=>b.onclick=()=>{
    SETUP.nation=nat.value;SETUP.house=house.value;SETUP.culture=b.dataset.cult;SETUP.title=null;renderSetup();});
  document.querySelectorAll("[data-nat]").forEach(b=>b.onclick=()=>{nat.value=b.dataset.nat;SETUP.nation=nat.value;sync();});
  document.querySelectorAll("[data-house]").forEach(b=>b.onclick=()=>{house.value=b.dataset.house;SETUP.house=house.value;sync();});
  document.querySelectorAll("[data-title]").forEach(b=>b.onclick=()=>{SETUP.title=b.dataset.title;document.querySelectorAll("[data-title]").forEach(x=>x.classList.toggle("on",x===b));});
  document.querySelectorAll("[data-law]").forEach(b=>b.onclick=()=>{SETUP.law=b.dataset.law;document.querySelectorAll("[data-law]").forEach(x=>x.classList.toggle("on",x===b));});
  begin.onclick=()=>{if(nat.value.trim()&&house.value.trim())newGame({nation:nat.value.trim(),title:SETUP.title,house:house.value.trim(),law:SETUP.law,culture:SETUP.culture,
    custom:{republic:(SETUP.custom.republic||"").trim(),junta:(SETUP.custom.junta||"").trim(),people:(SETUP.custom.people||"").trim()}});};
  [["ctRepublic","republic"],["ctJunta","junta"],["ctPeople","people"]].forEach(([id,k])=>{
    const f=document.getElementById(id); if(!f)return;
    f.value=SETUP.custom[k]||"";
    f.oninput=()=>{SETUP.custom[k]=f.value.slice(0,28);};
  });
  const rb=document.getElementById("resumeBtn");
  if(rb)rb.onclick=()=>{ if(!resumeAutosave()){ rb.textContent="That chronicle could not be read"; } };
  const sl=document.getElementById("setupLoad");
  if(sl)sl.onclick=loadModal;
  sync();
}
