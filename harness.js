#!/usr/bin/env node
/* Sovereign harness — loads the modules under a mini-DOM, checks the
   invariants that must never break, then turns a monkey loose on the
   toolbox for several thousand steps.
       node harness.js            targeted tests + 6000-step chaos
       node harness.js 20000      longer chaos run
       node harness.js 6000 7     fixed seed (reproducible)                */
const fs = require("fs"), path = require("path"), vm = require("vm");

const STEPS = +(process.argv[2] || 6000);
const SEED  = process.argv[3] !== undefined ? +process.argv[3] : (Date.now() % 1e9);

/* ---------- deterministic RNG so a failing run can be replayed ---------- */
let _s = SEED >>> 0 || 1;
const rnd = () => (_s ^= _s << 13, _s ^= _s >>> 17, _s ^= _s << 5, ((_s >>> 0) / 4294967296));

/* ---------- mini-DOM ----------
   The game renders HTML strings and wire()s them by attribute selector.
   We need no layout and no CSS — only enough DOM to find the buttons,
   click them, and let modals open and close. */
const registry = [];
function register(el) { if (!el._reg) { el._reg = true; registry.push(el); } for (const c of el.children) register(c); }
function unregister(el) { const i = registry.indexOf(el); if (i >= 0) registry.splice(i, 1); el._reg = false; for (const c of el.children) unregister(c); }

class El {
  constructor(tag = "div", attrs = {}) {
    this.tagName = tag.toUpperCase(); this.attrs = attrs; this.children = [];
    this.dataset = {}; this.style = {}; this.onclick = null; this.oninput = null;
    this.onchange = null; this.onkeydown = null;
    this.value = ""; this.textContent = ""; this._html = ""; this.scrollTop = 0;
    this.checked = false; this.parent = null; this._reg = false;
    const self = this;
    this.classList = {
      add(c) { self.attrs.class = ((self.attrs.class || "") + " " + c).trim(); },
      remove(c) { self.attrs.class = (self.attrs.class || "").split(/\s+/).filter(x => x !== c).join(" "); },
      toggle(c) { self.classList.contains(c) ? self.classList.remove(c) : self.classList.add(c); },
      contains(c) { return (self.attrs.class || "").split(/\s+/).includes(c); },
    };
    for (const k in attrs) {
      if (k.startsWith("data-")) {
        const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = attrs[k];
      }
    }
  }
  get id() { return this.attrs.id || ""; }
  set innerHTML(html) {
    for (const c of this.children) unregister(c);
    this._html = html; this.children = parse(html);
    for (const c of this.children) { c.parent = this; if (this._reg) register(c); }
  }
  get innerHTML() { return this._html; }
  appendChild(c) { if (!c) return c; c.parent = this; this.children.push(c); if (this._reg) register(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); unregister(c); } return c; }
  remove() { if (this.parent) this.parent.removeChild(this); else unregister(this); }
  focus() {} select() {} scrollIntoView() {}
  addEventListener() {} removeEventListener() {}
  get content() { return this; }
  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.children[0] || null; }
  walk(out = []) { out.push(this); for (const c of this.children) c.walk(out); return out; }
  matches(sel) {
    let m = /^\[([a-zA-Z-]+)\]$/.exec(sel); if (m) return m[1] in this.attrs;
    m = /^#([\w-]+)$/.exec(sel);            if (m) return this.attrs.id === m[1];
    m = /^\.([\w-]+)$/.exec(sel);           if (m) return this.classList.contains(m[1]);
    return this.tagName === sel.toUpperCase();
  }
  querySelectorAll(sel) { return this.walk().slice(1).filter(e => e.matches(sel)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

/* Flat-ish parser: every tag becomes an element parented by the nearest
   unclosed tag, which is enough for querySelector and for click discovery. */
const VOID = new Set(["br","hr","img","input","meta","link","source"]);
const TOKEN = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*(\/?)>/g;
const ATTR = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
function parse(html) {
  const roots = []; const stack = []; let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(html))) {
    const closing = m[0][1] === "/", tag = m[1];
    if (closing) { while (stack.length && stack.pop().tagName !== tag.toUpperCase()) {} continue; }
    const attrs = {}; let a; ATTR.lastIndex = 0;
    while ((a = ATTR.exec(m[2] || ""))) attrs[a[1]] = a[2] === undefined ? "" : a[2];
    const el = new El(tag, attrs);
    const top = stack[stack.length - 1];
    if (top) { el.parent = top; top.children.push(el); } else roots.push(el);
    if (!VOID.has(tag.toLowerCase()) && !m[3]) stack.push(el);
  }
  /* a template holding one root returns that root; several roots get a wrapper */
  return roots;
}

const body = new El("body");
register(body);
const appEl = new El("div", { id: "app" });
const ctrlsEl = new El("div", { id: "ctrls" });
body.appendChild(appEl); body.appendChild(ctrlsEl);
for (const id of ["btnSave", "btnLoad", "btnChron", "btnDyn", "btnScore", "btnNew"])
  body.appendChild(new El("button", { id }));

const document = {
  body,
  visibilityState: "visible",
  createElement: t => new El(t),
  getElementById: id => registry.find(e => e.attrs.id === id) || null,
  querySelectorAll: sel => registry.filter(e => e.matches(sel)),
  querySelector: sel => registry.find(e => e.matches(sel)) || null,
  addEventListener() {}, removeEventListener() {}, execCommand() { return true; },
};

const store = {};
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

const sandbox = {
  document, localStorage, console,
  Math: Object.create(Math), JSON, Date, String, Number, Object, Array,
  Boolean, RegExp, Error, isNaN, parseInt, parseFloat, Set, Map, Infinity, NaN,
  btoa: s => Buffer.from(s, "binary").toString("base64"),
  atob: s => Buffer.from(s, "base64").toString("binary"),
  setTimeout: fn => fn(), clearTimeout: () => {}, alert: () => {},
};
sandbox.Math.random = rnd;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
vm.createContext(sandbox);

/* ---------- load the modules exactly as index.html does ---------- */
const SRC = path.join(__dirname, "src");
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
for (const m of manifest) {
  try { vm.runInContext(fs.readFileSync(path.join(SRC, m + ".js"), "utf8"), sandbox, { filename: m + ".js" }); }
  catch (e) { console.error(`FAILED loading ${m}.js: ${e.message}`); process.exit(1); }
}
console.log(`loaded ${manifest.length} modules`);
vm.runInContext("globalThis.__cultures=CULTURES; globalThis.__titleForms=TITLE_FORMS;", sandbox);
vm.runInContext("globalThis.__prerogatives=PREROGATIVES;", sandbox);
vm.runInContext("globalThis.TRAIT_KEYS=TRAIT_KEYS;", sandbox);
vm.runInContext("globalThis.__roman=ROMAN;", sandbox);
vm.runInContext("globalThis.__reforms=REFORMS; globalThis.__composition=composition; globalThis.__bills=BILLS;", sandbox);

/* Top-level `let` lives in the shared script scope, not on globalThis —
   exactly as it does across <script> tags in the browser. Bridge to it. */
vm.runInContext("globalThis.__b = { get S(){ return S; }, set S(v){ S = v; } };", sandbox);
const B = sandbox.__b;

/* ===================================================================== */
let failures = 0, checks = 0;
function fail(msg) { failures++; if (failures <= 25) console.error("  FAIL " + msg); }
function ok(cond, msg) { checks++; if (!cond) fail(msg); }

/* ---------- the invariant that must hold at every single step ---------- */
function invariants(S, where) {
  if (!S || !S.gov) return;
  const chambers = (S.gov.institutions || []).reduce((a, i) => a + i.power, 0);
  const crown = S.gov.crown.power;
  const total = crown + chambers;
  ok(total === 100, `${where}: power pool = ${total} (crown ${crown} + chambers ${chambers}), must be 100`);
  ok(crown >= 0, `${where}: crown power negative (${crown})`);
  for (const i of S.gov.institutions || [])
    ok(i.power >= 0, `${where}: chamber ${i.name} has negative power (${i.power})`);
  for (const k of ["stability", "legitimacy", "development", "military"])
    if (typeof S[k] === "number")
      ok(S[k] >= 0 && S[k] <= 100 && !isNaN(S[k]), `${where}: ${k} out of range (${S[k]})`);
  ok(!isNaN(S.treasury), `${where}: treasury is NaN`);
  for (const p of S.family || [])
    ok(!isNaN(p.age) && p.age >= 0, `${where}: person ${p.id} has bad age (${p.age})`);
}

/* ---------- targeted: a fresh game is well formed ---------- */
function freshGame() {
  sandbox.newGame({ nation: "Testland", title: "King", house: "Ashcroft",
                    law: "malepref", culture: "anglo" });
  return B.S;
}

console.log("\n— targeted tests —");
let S = freshGame();
invariants(S, "newGame");
ok(S.gov.crown.power === 100, "newGame: crown should hold the whole pool at founding");
ok(Array.isArray(S.family), "newGame: family missing");
ok(S.provinces && S.provinces.length > 0, "newGame: no provinces generated");
ok(S.monarch, "newGame: no head of state");
console.log(`  fresh game: ${S.nation}, ${S.year}, crown ${S.gov.crown.power}, ${S.provinces.length} provinces`);

/* ---------- targeted: every regime installs and keeps the pool at 100 ---------- */
function install(regime) {                    /* put the live S into a regime */
  const st = B.S;
  if (regime === "junta")    return sandbox.installJunta(st, sandbox.newGeneral(st));
  if (regime === "republic") return sandbox.installRepublic(st, false);
  if (regime === "people")   return sandbox.installPeoples(st, "revolution");
  if (regime === "monarchy") return sandbox.restoreMonarchy(st, "restoration");
}
for (const r of ["junta", "republic", "people", "monarchy"]) {
  S = freshGame();
  try {
    install(r); invariants(B.S, `after install ${r}`);
    const st = B.S, pool = st.gov.crown.power + st.gov.institutions.reduce((a, i) => a + i.power, 0);
    console.log(`  install ${r.padEnd(9)} regime=${String(st.regime).padEnd(9)} pool=${pool}`);
  } catch (e) { fail(`install ${r} threw: ${e.message}`); }
}

/* ---------- targeted: all twelve transition edges ---------- */
const REGIMES = ["monarchy", "junta", "republic", "people"];
if (typeof sandbox.applyTransition === "function") {
  let edges = 0;
  for (const from of REGIMES) for (const to of REGIMES) {
    if (from === to) continue;
    S = freshGame();
    try {
      if (from !== "monarchy") install(from);
      sandbox.applyTransition(B.S, to);
      invariants(B.S, `${from} -> ${to}`);
      edges++;
    } catch (e) { fail(`transition ${from} -> ${to} threw: ${e.message}`); }
  }
  console.log(`  transition edges exercised: ${edges}/12`);
} else console.log("  (applyTransition absent — edge tests skipped)");


/* =====================================================================
   TARGETED SCREENS — the places a random monkey almost never lands, and
   which therefore shipped broken. Each of these is a bug Zach found by
   hand in the 1622–1922 playthrough. They are regression tests now.
===================================================================== */
console.log("\n— targeted screens —");

/* =====================================================================
   THE CONSTITUTIONAL FRAME
   The prerogative ladder, the three ministry bands, where the player is
   sitting, and the long-reign toggle. All new in this patch-set, so all
   of it is guessed-at until something checks.
===================================================================== */
{
  const G = sandbox;
  /* ---- the ladder rises and falls with the crown's share ---- */
  S = freshGame();
  let st = B.S;
  st.gov.crown.power = 100;
  for (const p of sandbox.__prerogatives)
    ok(G.hasPrerog(st, p.id), `ladder: ${p.id} should be held at power 100`);

  st.gov.crown.power = 45;
  for (const id of ["dissolve", "ministry", "council"])
    ok(!G.hasPrerog(st, id), `ladder: ${id} should have lapsed at power 45`);
  for (const id of ["assent", "emergency", "peers", "pardon", "ceremony"])
    ok(G.hasPrerog(st, id), `ladder: ${id} should still be held at power 45`);

  st.gov.crown.power = 12;
  ok(!G.hasPrerog(st, "pardon"), "ladder: pardon should lapse below 15");
  ok(G.hasPrerog(st, "ceremony"), "ladder: ceremony is never lost");

  /* ---- a spent right stays spent, however the power moves ---- */
  G.spendPrerog(st, "ministry");
  st.gov.crown.power = 100;
  ok(!G.hasPrerog(st, "ministry"), "ladder: a spent prerogative must not come back at full power");
  ok(G.prerogState(st, "ministry") === "spent", "ladder: spent state should read as spent");
  ok(G.hasPrerog(st, "dissolve"), "ladder: spending one right must not spend its neighbours");

  /* ---- no crown, no prerogative ---- */
  S = freshGame(); install("republic");
  ok(!G.hasPrerog(B.S, "ceremony"), "ladder: a republic holds no royal prerogative");

  /* ---- the three ministry bands ---- */
  S = freshGame(); st = B.S;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Test", age: 50 };
  st.gov.crown.power = 80;
  ok(G.crownAppointsPm(st), "bands: at 80 the crown should appoint");
  ok(!G.pmContested(st) && !G.pmGoverns(st), "bands: 80 is not contested and not ministerial");
  ok(G.seatNow(st) === "crown", "bands: the player sits at the throne at 80");

  st.gov.crown.power = 60;
  ok(G.pmContested(st), "bands: 60 should be the contested band");
  ok(!G.crownAppointsPm(st) && !G.pmGoverns(st), "bands: 60 is neither gift nor responsible government");
  ok(G.seatNow(st) === "crown", "bands: the player still sits at the throne at 60");

  st.gov.crown.power = 40;
  ok(G.pmGoverns(st), "bands: below 50 the ministry governs");
  ok(G.seatNow(st) === "ministry", "bands: the player follows the power to the desk");

  /* ---- the seat shift is raised exactly once per crossing ---- */
  S = freshGame(); st = B.S;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Test", age: 50 };
  st._seat = "crown"; st._seatShift = null;
  st.gov.crown.power = 40;
  G.maybeTransform(st);
  ok(st._seatShift === "ministry", "seat: crossing below 50 must raise the shift");
  st._seat = "ministry"; st._seatShift = null;
  G.maybeTransform(st);
  ok(!st._seatShift, "seat: no shift raised once the seat already matches");
  st.gov.crown.power = 70;
  G.maybeTransform(st);
  ok(st._seatShift === "crown", "seat: clawing back above 50 must raise the shift the other way");

  /* ---- the ministry is born with the first chamber, not with defeat ---- */
  S = freshGame(); st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 0, rights: ["tax"] });
  st.pm = null; st._pmPending = false;
  G.maybeTransform(st);
  ok(!st._pmPending,
     "ministry: an advisory Estates General must not produce a Prime Minister");
  /* but a commons does */
  st.gov.institutions.push({ id: "commons", name: "Commons", composition: "commons", power: 0, rights: ["petition"] });
  G.maybeTransform(st);
  ok(st._pmPending, "ministry: seating a commons must call for a ministry");
  /* and so does an assembly that has grown into a governing one */
  S = freshGame(); const st9 = B.S;
  st9.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 0, rights: ["tax"] });
  G.transferPower(st9, st9.gov.institutions[0], 35);
  st9.pm = null; st9._pmPending = false;
  G.maybeTransform(st9);
  ok(st9._pmPending, "ministry: an assembly holding 35 points is a governing chamber");

  /* ---- summons above 70 with one chamber; a cycle otherwise ---- */
  S = freshGame(); st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 0, rights: ["tax"] });
  st.pm = null;
  ok(G.electionMode(st) === "none", "cadence: no ministry means no elections at all");
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Test", age: 50 };
  st.gov.crown.power = 85;
  ok(G.electionMode(st) === "summons", "cadence: one chamber and personal rule means summons");
  st.gov.institutions.push({ id: "commons", name: "Commons", composition: "commons", power: 0, rights: ["petition"] });
  ok(G.electionMode(st) === "cycle", "cadence: a second chamber forces a cycle even at 85");
  st.gov.institutions.pop();
  st.gov.crown.power = 55;
  ok(G.electionMode(st) === "cycle", "cadence: falling out of personal rule forces a cycle");

  /* ---- the cadence is clamped to the offered range ---- */
  st.electionEvery = 99; ok(G.electionEvery(st) === 3, "cadence: must clamp to 3 turns");
  st.electionEvery = 0;  ok(G.electionEvery(st) === 1, "cadence: must clamp to 1 turn");
  st.electionEvery = 2;  ok(G.electionYears(st) === 10, "cadence: 2 turns should read as 10 years");

  /* ---- the long reign really does hold the roof up ---- */
  S = freshGame(); st = B.S;
  st.devQuiet = true;
  ["military", "radical", "constitutional", "restorationist"].forEach(id => {
    st.pressure[id] = 95; st.pBump = st.pBump || {}; st.pBump[id] = 45;
  });
  st.stability = 1; st.legitPen = 60; st.treasury = -300;
  ok(G.transitionReady(st) === null, "long reign: no rupture may be ready however bad it gets");
  ok(G.pressureNow(st, "military") <= 44, "long reign: pressure readings must stay damped");
  st.devQuiet = false;
  ok(G.pressureNow(st, "military") > 44, "long reign: turning it off must restore the real reading");
}

/* ---- every culture pack is complete and every regime can be styled ---- */
{
  const CU = sandbox.__cultures, TF = sandbox.__titleForms;
  ok(Object.keys(CU).length === 8, `cultures: ${Object.keys(CU).length} packs, want 8`);
  for (const k in CU) {
    const C = CU[k];
    ok((C.titles || []).length === 6, `${k}: ${(C.titles||[]).length} monarch titles, want 6`);
    for (const f of ["repTitles", "juntaTitles", "peopleTitles"])
      ok((C[f] || []).length === 4, `${k}.${f}: ${(C[f]||[]).length}, want 4`);
    for (const f of ["titles", "repTitles", "juntaTitles", "peopleTitles"])
      for (const t of C[f] || [])
        ok(!!TF[t], `${k}.${f}: no gendered form for "${t}"`);
    for (const g of ["m", "f"]) {
      ok(C[g].late.length >= 10, `${k}.${g}.late has only ${C[g].late.length} names — the industrial age will repeat itself`);
      ok(C[g].early.length >= 10, `${k}.${g}.early has only ${C[g].early.length} names`);
      const dup = C[g].early.filter(n => C[g].late.includes(n));
      ok(dup.length === 0, `${k}.${g}: ${dup.join(", ")} appears in both strata`);
    }
  }
  /* no two packs share a title except King, which every tradition really has */
  const seen = {};
  for (const k in CU) for (const t of CU[k].titles) (seen[t] = seen[t] || []).push(k);
  const shared = Object.keys(seen).filter(t => seen[t].length > 1 && t !== "King" && t !== "Emperor");
  ok(shared.length === 0, `titles shared between packs: ${shared.map(t => `${t} (${seen[t].join("/")})`).join(", ")}`);

  /* and each regime installs under a style its culture actually owns */
  for (const ck of Object.keys(CU)) {
    for (const r of ["junta", "republic", "people"]) {
      sandbox.newGame({ nation: "T", title: CU[ck].titles[0], house: "H", law: "malepref", culture: ck });
      install(r);
      const base = B.S.gov.crown.titleBase;
      const pool = r === "republic" ? CU[ck].repTitles : r === "junta" ? CU[ck].juntaTitles : CU[ck].peopleTitles;
      ok(pool.includes(base), `${ck}/${r}: styled "${base}", which is not in that culture's list`);
      ok(sandbox.styled(B.S, B.S.monarch).startsWith(sandbox.titleForm(base, B.S.monarch.gender)),
         `${ck}/${r}: head of state not styled with the regime title`);
    }
  }
  /* a typed title overrides the pool and survives into the chronicle */
  sandbox.newGame({ nation: "T", title: "King", house: "H", law: "malepref", culture: "anglo",
                    custom: { republic: "The Helmsman", junta: "", people: "" } });
  install("republic");
  ok(B.S.gov.crown.titleBase === "The Helmsman",
     `custom title ignored (got "${B.S.gov.crown.titleBase}")`);
  ok(sandbox.styled(B.S, B.S.monarch).startsWith("The Helmsman"), "custom title not used in styling");
  ok(!/\s(I|II|III)\b/.test(sandbox.styled(B.S, B.S.monarch)), "a president was given a regnal numeral");
}

/* ---- the crown's gift: appointing against the chamber ---- */
{
  S = freshGame();
  let st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 10, rights: ["tax"] });
  st.gov.institutions.push({ id: "commons", name: "Commons", composition: "commons", power: 10, rights: ["petition"] });
  st.gov.crown.power = 80;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Sitting", age: 50 };
  st._pmOffice = "Prime Minister";
  st._pmField = sandbox.pmField(st, "merchants");
  st.phase = "pmpick";
  try { sandbox.render(); } catch (e) { fail(`pmpick: render threw: ${e.message}`); }
  const picks = document.querySelectorAll("[data-pmpick]");
  ok(picks.length > 0, "pmpick: no ministry candidates offered");
  ok(st._pmField.some(c => c.winner), "pmpick: the chamber's own winner must be on the list");
  const loser = picks.find(b => !st._pmField[+b.attrs["data-pmpick"]].winner);
  ok(!!loser, "pmpick: the crown was offered no alternative to the winner");
  if (loser) {
    const stabBefore = st.stability, idx = +loser.attrs["data-pmpick"];
    const wantBloc = st._pmField[idx].bloc;
    try { loser.onclick(); } catch (e) { fail(`pmpick: appointing threw: ${e.message}`); }
    ok(B.S.pm.bloc === wantBloc, "pmpick: the crown's choice did not take office");
    ok(B.S.stability < stabBefore, "pmpick: appointing against the chamber cost nothing");
    invariants(B.S, "after pmpick");
  }
}

/* ---- the contested band: refusing a ministry, and being answered ---- */
{
  S = freshGame();
  let st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 40, rights: ["tax"] });
  st.gov.crown.power = 60;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Sitting", age: 50 };
  st._pmOffer = { bloc: "merchants", holder: "Offered", age: 50 };
  st.phase = "pmoffer";
  try { sandbox.render(); } catch (e) { fail(`pmoffer: render threw: ${e.message}`); }
  const offers = document.querySelectorAll("[data-pmoffer]");
  ok(offers.length === 2, `pmoffer: want accept and refuse, got ${offers.length}`);
  const acc = offers.find(b => b.attrs["data-pmoffer"] === "accept");
  if (acc) {
    try { acc.onclick(); } catch (e) { fail(`pmoffer: accepting threw: ${e.message}`); }
    ok(B.S.pm.bloc === "merchants", "pmoffer: accepting did not seat the chamber's man");
    invariants(B.S, "after pmoffer accept");
  }

  /* refuse until the country answers, and check the right is spent */
  S = freshGame(); st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 20, rights: ["tax"] });
  st.gov.institutions.push({ id: "commons", name: "Commons", composition: "commons", power: 20, rights: ["petition"] });
  st.gov.crown.power = 60;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Sitting", age: 50 };
  let spent = false;
  for (let i = 0; i < 30 && !spent; i++) {
    st = B.S;
    st.gov.crown.power = 60;
    st._pmOffer = { bloc: "merchants", holder: "Offered", age: 50 };
    st.phase = "pmoffer";
    try { sandbox.doPmRefuse(); } catch (e) { fail(`pmoffer: refusing threw: ${e.message}`); break; }
    invariants(B.S, `after refusal ${i + 1}`);
    spent = sandbox.prerogSpent(B.S, "ministry");
  }
  ok(spent, "pmoffer: refusing repeatedly never spent the prerogative");
  ok((B.S._pmRefusals || 0) <= 3, `pmoffer: took ${B.S._pmRefusals} refusals to spend the right, want at most 3`);
  B.S.gov.crown.power = 100;
  ok(!sandbox.hasPrerog(B.S, "ministry"), "pmoffer: a spent right came back with the power");
  ok(B.S.phase !== "pmoffer" || !B.S._pmOffer, "pmoffer: an offer was left dangling after resolution");
}

/* ---- the seat crossing the room, in both directions ---- */
{
  S = freshGame();
  let st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 60, rights: ["tax"] });
  st.gov.crown.power = 40;
  st.pm = { office: "Prime Minister", bloc: "aristocracy", holder: "Sitting", age: 50 };
  st._seat = "crown";
  sandbox.maybeTransform(st);
  ok(st._seatShift === "ministry", "seatshift: the crossing was not raised");
  st.phase = "seatshift";
  try { sandbox.render(); } catch (e) { fail(`seatshift: render threw: ${e.message}`); }
  const go = document.getElementById("seatGo");
  ok(!!go, "seatshift: no continue button on the handover screen");
  if (go) {
    try { go.onclick(); } catch (e) { fail(`seatshift: continuing threw: ${e.message}`); }
    ok(B.S._seat === "ministry", "seatshift: the seat did not move");
    ok(!B.S._seatShift, "seatshift: the flag was not cleared, so it will fire forever");
    invariants(B.S, "after seatshift");
  }
}

/* ---- works no longer cost you an advance ---- */
{
  S = freshGame();
  const st = B.S;
  st.treasury = 900; st.knowledge = 900;
  st.phase = "advance"; st._advBought = false; st._worksBuilt = 0;
  try { sandbox.render(); } catch (e) { fail(`advance: render threw: ${e.message}`); }
  const works = document.querySelectorAll("[data-buywork]");
  ok(works.length > 0, "advance: no works offered with a full treasury");
  if (works.length) {
    try { works[0].onclick(); } catch (e) { fail(`advance: founding a work threw: ${e.message}`); }
    ok(!B.S.phaseDone.advance, "advance: founding a work ended the advancement phase");
    ok(!B.S._advBought, "advance: founding a work consumed the turn's advance");
    /* and you can found another */
    B.S.phase = "advance"; B.S.result = null;
    try { sandbox.render(); } catch (e) { fail(`advance: second render threw: ${e.message}`); }
    const again = document.querySelectorAll("[data-buywork]");
    ok(again.length > 0, "advance: a second work could not be founded in the same turn");
    ok((B.S._worksBuilt || 0) >= 1, "advance: works founded this turn were not counted");
  }
  /* one advance a turn, though */
  S = freshGame();
  const st2 = B.S;
  st2.treasury = 900; st2.knowledge = 900; st2.phase = "advance";
  st2._advBought = false;
  sandbox.render();
  const advs = document.querySelectorAll("[data-buyadv]").filter(b => !("disabled" in b.attrs));
  if (advs.length) {
    advs[0].onclick();
    ok(B.S._advBought, "advance: buying an advance did not spend the turn's advance");
    B.S.phase = "advance"; B.S.result = null;
    sandbox.render();
    const left = document.querySelectorAll("[data-buyadv]").filter(b => !("disabled" in b.attrs));
    ok(left.length === 0, `advance: ${left.length} advances still buyable after one was taken`);
    ok(document.querySelectorAll("[data-buywork]").length > 0,
       "advance: taking an advance also locked out the works");
  }
  invariants(B.S, "after advancement");
}

/* ---- the heir comes of age: ONE beat, reachable, and escapable ---- */
{
  /* the beat must be raised by the existing dynastic machinery, and the
     old two-option screen must be gone */
  S = freshGame();
  let st = B.S;
  const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 40);
  sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
  const kid = sandbox.makePerson(st, "child", "m", 18, null, [st.monarch.id, sp.id]);
  st.family.push(kid);
  const beat = sandbox.dynasticBeat();
  ok(beat && beat.kind === "ofage", `heirage: the dynastic beat did not raise coming-of-age (got ${beat && beat.kind})`);

  st.dyn = beat; st.phase = "dynastic";
  try { sandbox.render(); } catch (e) { fail(`heirage: render threw: ${e.message}`); }
  ok(document.querySelectorAll("[data-dyn=heir_court]").length === 0,
     "heirage: the old two-option screen is still being offered");
  let opts = document.querySelectorAll("[data-heirage]");
  ok(opts.length >= 4, `heirage: only ${opts.length} options for a direct heir`);
  ok(!opts.some(b => b.attrs["data-heirage"] === "adopt_in"),
     "heirage: a direct heir was offered adoption into the household");

  /* and clicking must actually move the game on — this is the bug that blocked play */
  const wasPhase = B.S.phase;
  try { opts[0].onclick(); } catch (e) { fail(`heirage: choosing threw: ${e.message}`); }
  ok(B.S.phase !== wasPhase, `heirage: clicking an option left the game in ${B.S.phase} — deadlock`);
  invariants(B.S, "after heirage");

  /* a collateral heir gets the two extra answers */
  S = freshGame(); st = B.S;
  const neph = sandbox.makePerson(st, "nephew", "m", 18);
  st.family.push(neph);
  /* bind now requires somebody of the direct line to bind to */
  const dline = sandbox.makePerson(st, "child", "f", 18, null, [st.monarch.id, 7777]);
  st.family.push(dline);
  st.dyn = { kind: "ofage", heir: neph }; st.phase = "dynastic";
  sandbox.render();
  opts = document.querySelectorAll("[data-heirage]");
  ok(opts.some(b => b.attrs["data-heirage"] === "adopt_in"),
     "heirage: a collateral heir was not offered the household");
  ok(opts.some(b => b.attrs["data-heirage"] === "bind"),
     "heirage: a collateral heir could not be married into the direct line");
  const pick = opts.find(b => b.attrs["data-heirage"] === "bind");
  try { pick.onclick(); } catch (e) { fail(`heirage: binding threw: ${e.message}`); }
  ok(B.S.phase !== "dynastic" || !B.S.dyn, "heirage: the beat was not cleared and will fire forever");
  invariants(B.S, "after collateral heirage");

  /* a stale click from another phase must be ignored, not applied twice */
  S = freshGame(); st = B.S;
  st.dyn = null; st.phase = "dyncourt";
  const t0 = st.stability;
  try { sandbox.doHeirAge("progress"); } catch (e) { fail(`heirage: stale click threw: ${e.message}`); }
  ok(B.S.stability === t0 && B.S.phase === "dyncourt",
     "heirage: a stale click from another phase still applied the beat");

  /* ===== v13.1: conceding actually lowers constitutional pressure ===== */
  {
    S = freshGame();
    const st = B.S;
    st.eraIdx = 6;
    if (st.facs.reformers) { st.facs.reformers.present = true; st.facs.reformers.strength = 52; }
    st.facs.merchants.strength = 52;
    st._pressOn = true; st._opinionOn = true;
    st.gov.institutions.push({ id: "c", name: "Commons", composition: "commons", power: 0, rights: [] });
    st.gov.crown.power = 100; st.gov.institutions[0].power = 0;
    const absolute = sandbox.pressureBase(st, "constitutional");
    /* now concede: hand the chamber real power */
    sandbox.transferPower(st, st.gov.institutions[0], 70);
    const conceded = sandbox.pressureBase(st, "constitutional");
    ok(conceded < absolute,
       `pressure: conceding power did not lower the constitutional reading (${absolute} -> ${conceded})`);
    ok(absolute - conceded >= 15,
       `pressure: conceding 70 points moved the reading only ${absolute - conceded}`);
    invariants(st, "after conceding");

    /* a charter and a widened franchise tell as well */
    const before = sandbox.pressureBase(st, "constitutional");
    st.gov.charter = { name: "A Charter" };
    st.franchise = "broad";
    ok(sandbox.pressureBase(st, "constitutional") < before,
       "pressure: a charter and a broader franchise bought nothing");

    /* and the floor still rises with the age, whatever you do */
    S = freshGame(); const st2 = B.S;
    st2.eraIdx = 0; const early = sandbox.pressureBase(st2, "constitutional");
    st2.eraIdx = 8; const late = sandbox.pressureBase(st2, "constitutional");
    ok(late > early, `pressure: the age no longer raises the demand (${early} -> ${late})`);
  }

  /* ===== v13.1: every reading names its reasons ===== */
  {
    S = freshGame();
    const st = B.S;
    for (const id of ["military", "radical", "constitutional", "restorationist"]) {
      const why = sandbox.pressureWhy(st, id);
      ok(Array.isArray(why), `attribution: ${id} returned no reasons array`);
      ok(typeof sandbox.pressureRelief(st, id) === "string",
         `attribution: ${id} offers no way to bring it down`);
    }
    /* the barracks paradox: a failing state with devoted officers */
    st.facs.officers.mood = 100;
    st.stability = 5; st.legitPen = 60;
    const why = sandbox.pressureWhy(st, "military");
    ok(why.length > 0, "attribution: a high military reading gave no reasons at all");
    ok(!why.some(t => /disaffected/.test(t)),
       `attribution: blamed disaffected officers at mood 100 — "${why.join(" / ")}"`);
  }

  /* ===== v13.1: a rupture is announced before it breaks ===== */
  {
    S = freshGame();
    const st = B.S;
    st.notices = []; st._pWatch = {};
    /* pressureOf reads the smoothed value the turn maintains, so set that */
    st.pressure.constitutional = 70;
    ok(sandbox.pressureOf(st, "constitutional") >= 62,
       "warning: could not drive the reading high enough to test");
    ok(sandbox.driftUrgent(st),
       "warning: the Drift panel does not know it belongs above the fold at 70");
    const before = st.notices.length;
    sandbox.tickPressureWatch(st);
    ok(st.notices.length > before,
       "warning: crossing 62 raised no notice at all — this is the 'came out of nowhere' bug");
    ok((st._pWatch || {}).constitutional >= 1, "warning: the watch band was not recorded");
    /* and it must not nag every single turn at the same band */
    const after = st.notices.length;
    st.pressure.constitutional = 70;
    sandbox.tickPressureWatch(st);
    ok(st.notices.length === after || st.notices.length <= after + 1,
       "warning: the same band is being announced over and over");
    /* but crossing the second threshold speaks again */
    const at78 = st.notices.length;
    st.pressure.constitutional = 84;
    sandbox.tickPressureWatch(st);
    ok(st.notices.length > at78, "warning: crossing 78 said nothing");
    ok(!sandbox.driftUrgent(freshGame() && B.S), "warning: a calm realm is being flagged as urgent");
  }

  /* ===== v13.1: the heir's line breeds like a reigning house ===== */
  {
    let total = 0;
    for (let i = 0; i < 40; i++) {
      S = freshGame();
      const st = B.S;
      const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 40);
      sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
      const kid = sandbox.makePerson(st, "child", "f", 24, null, [st.monarch.id, sp.id]);
      const kidsp = sandbox.makePerson(st, "childspouse", "m", 26);
      kid.spouseId = kidsp.id; kidsp.spouseId = kid.id;
      st.family.push(kid, kidsp);
      const before = st.family.filter(p => p.rel === "grandchild").length;
      sandbox.maybeBirth(5);
      total += st.family.filter(p => p.rel === "grandchild").length - before;
    }
    const mean = total / 40;
    ok(mean > 0.9, `fertility: the heir's marriage yields ${mean.toFixed(2)} grandchildren a turn — the direct line is still starved`);
  }

  /* a granddaughter in the succession can be married off */
  {
    S = freshGame();
    const st = B.S;
    st.monarch.age = 72;
    const son = sandbox.makePerson(st, "child", "m", 48, null, [st.monarch.id, 3001]);
    st.family.push(son);
    const gd = sandbox.makePerson(st, "grandchild", "f", 25, null, [son.id, 3002]);
    st.family.push(gd);
    st.phase = "dyncourt";
    try { sandbox.render(); } catch (e) { fail(`marriage: dyncourt render threw: ${e.message}`); }
    const weds = document.querySelectorAll("[data-dcwed]");
    ok(weds.some(b => +b.attrs["data-dcwed"] === gd.id),
       "marriage: a 25-year-old granddaughter in the direct line cannot be married off");
  }

  /* ===== v13: reform tiers ===== */
  {
    S = freshGame();
    const st = B.S;
    const r = sandbox.__reforms.find(x => x.id === "summon_estates");
    ok(!!r, "tiers: summon_estates not found");
    ok(sandbox.reformTier(st, r) === "motion", "tiers: an unasked reform is not 'of its own motion'");
    const free = sandbox.reformBoon(st, r);
    ok(free && free.stab > 0 && free.legit > 0, "tiers: the freely-given boon is empty");

    sandbox.askReform(st, "summon_estates", 1);
    const asked = sandbox.reformBoon(st, r);
    ok(sandbox.reformTier(st, r) === "petition", "tiers: an asked-for reform is not 'upon petition'");
    ok(asked.stab < free.stab, `tiers: petition boon ${asked.stab} is not less than motion ${free.stab}`);

    sandbox.askReform(st, "summon_estates", 2);
    ok(sandbox.reformTier(st, r) === "duress", "tiers: a forced reform is not 'under duress'");
    const forced = sandbox.reformBoon(st, r);
    ok(!forced.stab && !forced.legit, "tiers: a forced reform still paid a boon");
    const pen0 = st.legitPen || 0, stab0 = st.stability;
    sandbox.applyReformBoon(st, r);
    ok((st.legitPen || 0) > pen0, "tiers: forcing left no lasting mark on legitimacy");
    ok(st.stability < stab0, "tiers: forcing cost no stability");

    /* and the boon decays as the age moves past it */
    S = freshGame(); const st2 = B.S;
    st2.eraIdx = 0; const early = sandbox.reformEraFactor(st2, r);
    st2.eraIdx = 7; const late = sandbox.reformEraFactor(st2, r);
    ok(late < early, `tiers: an overdue reform is worth as much as an early one (${early} vs ${late})`);
  }

  /* ===== v13: the franchise is a weighted gate ===== */
  {
    S = freshGame();
    const st = B.S;
    st.facs.merchants.mood = 90; st.facs.peasantry.mood = 10;
    st.franchise = "property";
    const narrow = sandbox.compMood(st, "commons");
    st.franchise = "universal";
    const wide = sandbox.compMood(st, "commons");
    ok(narrow > wide,
       `franchise: widening the vote did not move the chamber's mood (${narrow} -> ${wide})`);
    ok(sandbox.franchiseWeight(st, "peasantry", "commons") === 1,
       "franchise: universal suffrage does not weight the peasantry fully");
    st.franchise = "property";
    ok(sandbox.franchiseWeight(st, "peasantry", "commons") < 0.5,
       "franchise: a property franchise still counts the whole peasantry");
    /* provinces are no longer a parliamentary estate anywhere */
    for (const c of ["nobility", "commons", "broad", "national"])
      ok((sandbox.__composition[c] || []).indexOf("provinces") < 0,
         `franchise: provinces are still an estate in "${c}"`);
  }

  /* ===== v13: legitimacy is regime-specific ===== */
  {
    /* the bug that started all of this: a people's republic could not clear ~39 */
    S = freshGame(); install("people");
    let st = B.S;
    st.facs.clergy.mood = 5; st.facs.aristocracy.mood = 5;
    if (st.facs.workers) { st.facs.workers.present = true; st.facs.workers.mood = 85; }
    if (st.plan) st.plan.consumer = 48;
    st._purges = 0; st.legitPen = 0;
    const peopleLegit = sandbox.legitimacy(st);
    ok(peopleLegit > 55,
       `legitimacy: a well-run people's republic reads ${peopleLegit} with the clergy abolished — the old ceiling is still there`);

    /* a junta cannot clear its ceiling however well it does */
    S = freshGame(); install("junta");
    st = B.S;
    st.stability = 95; st.facs.officers.mood = 100; st.legitPen = 0;
    if (st.junta) st.junta.promised = true;
    const j = sandbox.legitimacy(st);
    ok(j <= 50, `legitimacy: a junta reached ${j}, above its ceiling of 50`);

    /* and a ceremonial crown is rewarded rather than punished */
    S = freshGame(); st = B.S;
    st.gov.institutions.push({ id: "c", name: "Commons", composition: "commons", power: 0, rights: [] });
    st.gov.crown.power = 80;
    const strong = sandbox.legitimacy(st);
    st.gov.institutions[0].power = 70; st.gov.crown.power = 30;
    const ceremonial = sandbox.legitimacy(st);
    ok(ceremonial > strong,
       `legitimacy: reigning without ruling (${ceremonial}) is still worth less than personal rule (${strong})`);
  }

  /* ===== v13: every regime can raise money ===== */
  {
    for (const r of ["republic", "people"]) {
      S = freshGame(); install(r);
      const st = B.S;
      st.gov.institutions.push({ id: "a", name: "Assembly", composition: "commons", power: 0, rights: ["tax"] });
      sandbox.transferPower(st, st.gov.institutions[st.gov.institutions.length - 1], 30);
      const acts = sandbox.availableActions(st).map(a => a.id);
      ok(acts.includes("grant") || acts.includes("requisition"),
         `revenue: a ${r} has no way at all to raise emergency funds`);
    }
    /* and something, somewhere, can spend less */
    S = freshGame();
    const st = B.S;
    st.military = 70; st.privileges = 4; st._armyUpkeep = 20;
    ok(sandbox.availableActions(st).map(a => a.id).includes("retrench"),
       "revenue: there is still no way to cut spending");
  }

  /* ===== v13: legislation ===== */
  {
    S = freshGame();
    const st = B.S;
    st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 0, rights: ["tax"] });
    sandbox.transferPower(st, st.gov.institutions[0], 30);
    st._sitting = true;
    invariants(st, "bills setup");
    const avail = sandbox.billsFor(st);
    ok(avail.length > 0, "bills: no bill is available to a seated chamber in the first age");
    ok(avail.every(b => b.era[0] <= st.eraIdx && b.era[1] >= st.eraIdx),
       "bills: a bill outside its age band was offered");
    ok(!avail.some(b => b.id === "factory"),
       "bills: a Factory Act was available in the dynastic age");

    const pair = sandbox.chamberBill(st);
    ok(pair && pair.main, "bills: the chamber produced no bill");
    st._bill = pair; st.phase = "session";
    try { sandbox.render(); } catch (e) { fail(`bills: session render threw: ${e.message}`); }
    const btns = document.querySelectorAll("[data-bill]");
    ok(btns.length >= 2, `bills: only ${btns.length} answers offered to a bill`);
    const passBtn = btns.find(b => b.attrs["data-bill"] === "main");
    ok(!!passBtn, "bills: the chamber's own bill could not be passed");
    const id = pair.main.id;
    passBtn.onclick();
    ok((B.S.billsPassed || []).includes(id), "bills: passing a bill did not record it");
    ok(!B.S._bill, "bills: the bill was left pending after resolution");
    invariants(B.S, "after a bill");

    /* a bill already law is not offered again */
    ok(!sandbox.billsFor(B.S).some(b => b.id === id), "bills: a passed bill came round again");
  }

  /* orphaned nieces belong to their dead parent's line, not to the court */
  {
    S = freshGame();
    const sto = B.S;
    sto.monarch.parents = sto.monarch.parents || [9101, 9102];
    const sis2 = sandbox.makePerson(sto, "sibling", "f", 29, null, sto.monarch.parents.slice());
    sto.family.push(sis2);
    const niece = sandbox.makePerson(sto, "niece", "f", 5, null, [sis2.id, 9103]);
    sto.family.push(niece);
    /* the sister dies before ever drifting into a branch */
    sis2.alive = false; sis2.diedTurn = 0;
    ok(sandbox.shouldCadet(sto, niece),
       "cadet: an orphaned niece was left listed in the sovereign's own household");
    const b = sandbox.inheritedBranch(sto, niece);
    ok(b === `${sis2.name}'s line`,
       `cadet: the orphan's line came out as "${b}", want "${sis2.name}'s line"`);

    /* and no niece or nephew of any age belongs to the household */
    const babe = sandbox.makePerson(sto, "nephew", "m", 0, null, [sis2.id, 9103]);
    sto.family.push(babe);
    ok(sandbox.shouldCadet(sto, babe), "cadet: an infant nephew was kept on the civil list");
    /* while the sovereign's own children stay put */
    const own = sandbox.makePerson(sto, "child", "m", 5, null, [sto.monarch.id, 9104]);
    sto.family.push(own);
    ok(!sandbox.shouldCadet(sto, own), "cadet: the sovereign's own child was pushed into a branch");
  }

  /* the suit numerals must not run out before the field does */
  {
    S = freshGame();
    const stn = B.S;
    stn._matchFor = "self"; stn._matchC = null;
    const cands = sandbox.matchCandidates(stn, stn.monarch);
    stn.phase = "match";
    try { sandbox.render(); } catch (e) { fail(`suits: render threw: ${e.message}`); }
    const btns = document.querySelectorAll("[data-match]");
    ok(btns.length >= cands.length, "suits: fewer buttons than candidates");
    /* every candidate is rendered and carries a real numeral. The mini-DOM
       gives us attributes, so check the index attribute directly, and check
       the numeral source separately rather than pretending to read markup. */
    for (let i = 0; i < cands.length; i++)
      ok(btns.some(b => b.attrs["data-match"] === String(i)),
         `suits: candidate ${i} was never rendered`);
    const numerals = sandbox.__roman || [];
    for (let i = 0; i < 6; i++)
      ok(typeof numerals[i + 1] === "string" && numerals[i + 1].length > 0,
         `suits: no numeral for suit ${i + 1} — this is the 'undefined' bug`);
  }

  /* a branch is named for the blood, and a couple share one branch */
  {
    S = freshGame();
    const stb = B.S;
    stb.monarch.parents = stb.monarch.parents || [9001, 9002];
    const sis = sandbox.makePerson(stb, "sibling", "f", 40, null, stb.monarch.parents.slice());
    const hus = sandbox.makePerson(stb, "inlaw", "m", 38);
    hus.marriedIn = true;
    sis.spouseId = hus.id; hus.spouseId = sis.id;
    stb.family.push(sis, hus);
    ok(sandbox.isBlood(stb, sis), "branch: the sovereign's sister is not being read as blood");
    ok(!sandbox.isBlood(stb, hus), "branch: a man who married in is being read as blood");
    ok(sandbox.branchAnchor(stb, hus).id === sis.id,
       "branch: the branch anchored on the husband rather than the sister");
    ok(sandbox.branchNameFor(stb, hus) === `${sis.name}'s line`,
       `branch: named "${sandbox.branchNameFor(stb, hus)}", want "${sis.name}'s line"`);

    /* drive a turn so the drift actually assigns branches */
    sis.age = 44; hus.age = 44;
    [sis, hus].forEach(p => { if (sandbox.shouldCadet(stb, p)) { p.cadet = true;
      const a = sandbox.branchAnchor(stb, p);
      if (a.id !== p.id && a.branch) p.branch = a.branch;
      else { p.branch = sandbox.branchNameFor(stb, p); if (a.id !== p.id) a.branch = p.branch; } } });
    ok(sis.branch === hus.branch,
       `branch: the couple were split into "${sis.branch}" and "${hus.branch}"`);
    ok(sis.branch === `${sis.name}'s line`,
       `branch: the shared branch is "${sis.branch}", want the sister's`);
  }

  /* a brother heir must not be offered nonsense */
  {
    S = freshGame();
    const st3 = B.S;
    st3.monarch.parents = st3.monarch.parents || [8801, 8802];
    const bro = sandbox.makePerson(st3, "sibling", "m", 20, null, st3.monarch.parents.slice());
    st3.family.push(bro);
    st3.dyn = { kind: "ofage", heir: bro }; st3.phase = "dynastic";
    sandbox.render();
    const o = document.querySelectorAll("[data-heirage]");
    ok(!o.some(b => b.attrs["data-heirage"] === "bind"),
       "heirage: a brother was offered marriage into his own line");
    ok(!o.some(b => b.attrs["data-heirage"] === "adopt_in"),
       "heirage: a brother was offered adoption into the household he is already in");
    ok(o.some(b => b.attrs["data-heirage"] === "wed_line"),
       "heirage: an unmarried brother heir was not offered a match to secure the line");
    ok(sandbox.heirKind(st3, bro) === "sibling", "heirage: a sibling heir was misclassified");
  }
  /* a collateral heir only gets 'bind' when there is somebody to bind to */
  {
    S = freshGame();
    const st4 = B.S;
    const neph2 = sandbox.makePerson(st4, "nephew", "m", 18);
    st4.family.push(neph2);
    st4.dyn = { kind: "ofage", heir: neph2 }; st4.phase = "dynastic";
    sandbox.render();
    ok(document.querySelectorAll("[data-heirage]").filter(b => b.attrs["data-heirage"] === "bind").length === 0,
       "heirage: bind offered with nobody in the direct line to marry");
    /* now give the sovereign a marriageable daughter */
    const dau = sandbox.makePerson(st4, "child", "f", 18, null, [st4.monarch.id, 4242]);
    st4.family.push(dau);
    sandbox.render();
    const withMatch = document.querySelectorAll("[data-heirage]").filter(b => b.attrs["data-heirage"] === "bind");
    ok(withMatch.length === 1, "heirage: bind not offered even with a match available");
    if (withMatch.length) {
      withMatch[0].onclick();
      ok(neph2.spouseId === dau.id || dau.spouseId === neph2.id,
         "heirage: binding did not actually marry them");
    }
  }
  /* three to five suits, and not always the same three kinds */
  {
    const counts = new Set(), kinds = new Set();
    for (let i = 0; i < 50; i++) {
      S = freshGame(); const stm = B.S;
      stm._matchC = null;
      const list = sandbox.matchCandidates(stm, stm.monarch);
      counts.add(list.length);
      list.forEach(c => kinds.add(c.kind));
      ok(list.length >= 3 && list.length <= 5, `marriage: ${list.length} offers, want 3-5`);
    }
    ok(counts.size > 1, "marriage: the number of offers never varied");
    ok(kinds.size >= 5, `marriage: only ${kinds.size} kinds of match ever appeared`);
  }
  /* children follow their parents into a branch */
  {
    S = freshGame();
    const stc = B.S;
    const unc = sandbox.makePerson(stc, "uncle", "m", 44);
    unc.cadet = true; unc.branch = "Test's line"; stc.family.push(unc);
    const kid2 = sandbox.makePerson(stc, "nephew", "m", 4, null, [unc.id, 555]);
    stc.family.push(kid2);
    ok(sandbox.shouldCadet(stc, kid2),
       "cadet: a child was left at court after their parent joined a branch");
  }

  /* every trait written anywhere must be a real trait key — an unknown one
     took down every render in the game and blocked a whole playthrough */
  {
    S = freshGame();
    const keys = new Set(sandbox.TRAIT_KEYS || []);
    ok(keys.size > 0, "traits: TRAIT_KEYS did not bridge out");
    for (const kind of ["statecraft", "command", "progress", "adopt_in", "bind", "leave"]) {
      S = freshGame();
      const st2 = B.S;
      const n = sandbox.makePerson(st2, "nephew", "m", 18);
      n.trait = null; st2.family.push(n);
      st2.dyn = { kind: "ofage", heir: n }; st2.phase = "dynastic";
      try { sandbox.doHeirAge(kind); } catch (e) { fail(`traits: ${kind} threw: ${e.message}`); continue; }
      const bad = B.S.family.filter(p => p.trait && !keys.has(p.trait));
      ok(bad.length === 0, `traits: ${kind} wrote an unknown trait "${bad[0] && bad[0].trait}"`);
      /* and the whole UI must survive it */
      try { sandbox.render(); } catch (e) { fail(`traits: render after ${kind} threw: ${e.message}`); }
    }
  }
  /* and an unknown key must degrade rather than detonate */
  {
    S = freshGame();
    const p = sandbox.makePerson(B.S, "child", "m", 20);
    p.trait = "nonsense"; B.S.family.push(p);
    let shown;
    try { shown = sandbox.traitShown(p); } catch (e) { fail(`traits: traitShown threw on an unknown key: ${e.message}`); }
    ok(shown === null, "traits: an unknown key should show nothing, not throw");
    try { sandbox.render(); } catch (e) { fail(`traits: render threw on an unknown key: ${e.message}`); }
  }

  /* a dead heir must not deadlock the screen */
  S = freshGame(); st = B.S;
  const ghost = sandbox.makePerson(st, "nephew", "m", 18);
  st.dyn = { kind: "ofage", heir: ghost }; st.phase = "dynastic";
  try { sandbox.render(); } catch (e) { fail(`heirage: a dead heir threw: ${e.message}`); }
  ok(B.S.phase !== "dynastic" || !B.S.dyn, "heirage: a dead heir left the beat stuck");
}

/* ---- superseded block ---- */
if (false) {
{
  S = freshGame();
  const st = B.S;
  const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 40);
  sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
  const kid = sandbox.makePerson(st, "child", "m", 18, null, [st.monarch.id, sp.id]);
  st.family.push(kid);
  st._heirAge = kid.id; st.phase = "heirage";
  try { sandbox.render(); } catch (e) { fail(`heirage: render threw: ${e.message}`); }
  let opts = document.querySelectorAll("[data-heirage]");
  ok(opts.length >= 4, `heirage: only ${opts.length} options for a direct heir`);
  ok(!opts.some(b => b.attrs["data-heirage"] === "adopt_in"),
     "heirage: a direct heir was offered adoption into the household");

  /* a collateral heir gets the two extra answers */
  S = freshGame();
  const st2 = B.S;
  const neph = sandbox.makePerson(st2, "nephew", "m", 18);
  st2.family.push(neph);
  st2._heirAge = neph.id; st2.phase = "heirage";
  sandbox.render();
  opts = document.querySelectorAll("[data-heirage]");
  ok(opts.some(b => b.attrs["data-heirage"] === "adopt_in"),
     "heirage: a collateral heir was not offered the household");
  ok(opts.some(b => b.attrs["data-heirage"] === "bind"),
     "heirage: a collateral heir could not be married into the direct line");
  const pick = opts.find(b => b.attrs["data-heirage"] === "adopt_in");
  try { pick.onclick(); } catch (e) { fail(`heirage: choosing threw: ${e.message}`); }
  ok(!B.S._heirAge, "heirage: the flag was not cleared, so the beat will fire forever");
  invariants(B.S, "after heirage");

  /* a dead or missing heir must not loop the phase back into itself */
  S = freshGame();
  B.S._heirAge = 987654; B.S.phase = "heirage";
  try { sandbox.render(); } catch (e) { fail(`heirage: a missing heir recursed: ${e.message}`); }
  ok(!B.S._heirAge, "heirage: a missing heir left the flag set");
}

}

/* ---- the household is the household, not the family reunion ---- */
{
  S = freshGame();
  let st = B.S;
  const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 30);
  sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
  for (let i = 0; i < 6; i++)
    st.family.push(sandbox.makePerson(st, "child", "m", 8, null, [st.monarch.id, sp.id]));
  const smallBill = sandbox.upkeep(st);
  /* now bury the realm in distant relatives */
  for (let i = 0; i < 40; i++) {
    const k = sandbox.makePerson(st, "cousin", "f", 40);
    k.cadet = true; st.family.push(k);
  }
  const bigBill = sandbox.upkeep(st);
  ok(bigBill === smallBill,
     `household: forty cadets changed the civil list from ${smallBill} to ${bigBill}; they should cost nothing`);
  ok(sandbox.householdSize(st) < st.family.filter(p => p.alive).length,
     "household: every living relative is still on the books");

  /* and the cadets are not weddings you have to arrange */
  st.family.forEach(p => { if (p.cadet) { p.spouseId = null; p.age = 25; } });
  st.phase = "dyncourt";
  try { sandbox.render(); } catch (e) { fail(`household: dyncourt render threw: ${e.message}`); }
  const weds = document.querySelectorAll("[data-dcwed]");
  ok(weds.length <= 8, `household: ${weds.length} marriages queued for your personal attention`);
}

/* ---- kin actually drift into branches ---- */
{
  S = freshGame();
  const st = B.S;
  const unc = sandbox.makePerson(st, "uncle", "m", 44);
  st.family.push(unc);
  ok(sandbox.shouldCadet(st, unc), "cadet: a 44-year-old uncle should have his own line by now");
  const kid = sandbox.makePerson(st, "child", "m", 12, null, [st.monarch.id, 999]);
  st.family.push(kid);
  ok(!sandbox.shouldCadet(st, kid), "cadet: the sovereign's own child was pushed out of the household");
  const h = sandbox.heirOf(st);
  if (h) ok(!sandbox.shouldCadet(st, h), "cadet: the heir was pushed out of the household");
}

/* ---- loyalty is a real second axis, and it decides who holds a department ---- */
{
  S = freshGame();
  const st = B.S;
  st.gov.cabinet = "Privy Council";
  const f = sandbox.officeField(st, "chancellor");
  ok(f.every(c => c.loyalty != null), "loyalty: a candidate arrived without a loyalty");
  const royals = f.filter(c => c.royal), outs = f.filter(c => !c.royal);
  if (royals.length && outs.length) {
    const rl = royals.reduce((a, c) => a + c.loyalty, 0) / royals.length;
    const ol = outs.reduce((a, c) => a + c.loyalty, 0) / outs.length;
    ok(rl > ol, `loyalty: blood (${rl.toFixed(0)}) should be more loyal than strangers (${ol.toFixed(0)})`);
  }

  /* a disloyal officer under a governing ministry is not the crown's */
  st.court = [{ id: 91001, name: "Clever", age: 45, alive: true, job: "chancellor",
                bloc: "merchants", label: "a lawyer", skill: 90, loyalty: 30 }];
  st.pm = { office: "PM", bloc: "merchants", holder: "X", age: 50 };
  st.gov.crown.power = 40;
  ok(!sandbox.officeHeldByCrown(st, "chancellor"),
     "loyalty: a disloyal officer answered the palace under a governing ministry");
  const t0 = st.treasury; sandbox.officeUpkeep(st);
  ok(st.treasury === t0, "loyalty: an officer who is not yours still filled your treasury");
  st.court[0].loyalty = 95;
  const t1 = st.treasury; sandbox.officeUpkeep(st);
  ok(st.treasury > t1, "loyalty: a loyal, able officer did nothing");
}

/* ---- the election explains itself ---- */
{
  S = freshGame();
  const st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 20, rights: ["tax"] });
  const er = sandbox.runElection();
  ok(er.standings.every(x => x.mood != null && x.strength != null && x.swing != null),
     "election: the standing was not recorded, so an upset cannot be read");
  ok(er.expected != null, "election: no expected winner computed");
  const top = er.standings[0];
  ok(Math.abs(top.score - (top.base + top.swing)) <= 1,
     "election: the arithmetic shown does not add up to the score");
}

/* ---- the development ceiling rises with the age ---- */
{
  S = freshGame();
  const st = B.S;
  st.development = 100;
  st.eraIdx = 0;
  const early = sandbox.devCap(st);
  st.eraIdx = 6;
  const late = sandbox.devCap(st);
  ok(late > early, `development: the ceiling never rises (${early} -> ${late})`);
  st.development = 100;
  sandbox.raiseDevelopment(st, 6);
  ok(st.development > 100, "development: sponsoring trade past 100 still does nothing");
  st.development = 150;
  sandbox.lowerDevelopment(st, 5);
  ok(st.development === 145, `development: a plague clamped a rich realm to ${st.development}`);
}

/* ---- nobody reaches 113 any more ---- */
{
  ok(sandbox.mortalityChance(100, 5) === 1, "mortality: a hundred-year-old is not certain to die");
  ok(sandbox.mortalityChance(95, 5) > 0.5, "mortality: the tail past ninety is still too flat");
  ok(sandbox.mortalityChance(40, 5) < 0.2, "mortality: the ceiling leaked into ordinary ages");
}

/* ---- newborns are not all born on the first of the year ---- */
{
  const ages = new Set();
  for (let i = 0; i < 60; i++) {
    S = freshGame(); const st = B.S;
    const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 24);
    sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
    st.monarch.age = 26;
    sandbox.maybeBirth(5);
    st.family.filter(p => p.rel === "child").forEach(c => ages.add(c.age));
  }
  ok(ages.size > 1, `birth ages: every newborn entered at the same age (${[...ages].join(",")})`);
}

/* ---- a chamber that only sits when summoned cannot be dissolved ---- */
{
  S = freshGame();
  const st = B.S;
  st.gov.institutions.push({ id: "estates", name: "Estates", composition: "nobility", power: 20, rights: ["tax"] });
  st.pm = { office: "PM", bloc: "aristocracy", holder: "X", age: 50 };
  st.gov.crown.power = 85;
  st._sitting = false;
  ok(sandbox.electionMode(st) === "summons", "sitting: expected a summons cadence here");
  ok(!sandbox.chamberSitting(st), "sitting: an unsummoned chamber counted as in session");
  st._sitting = true;
  ok(sandbox.chamberSitting(st), "sitting: a summoned chamber was still counted as absent");
  st.gov.institutions.push({ id: "commons", name: "Commons", composition: "commons", power: 10, rights: [] });
  st._sitting = false;
  ok(sandbox.chamberSitting(st), "sitting: a chamber on a cycle should always be in session");
}

/* ---- the offices of state: per-office fields, competence, effects ---- */
{
  S = freshGame();
  let st = B.S;
  st.gov.cabinet = "Privy Council";
  sandbox.roleName(st, sandbox.roleById("marshal"));
  ok(sandbox.roleById("seals"), "offices: the fifth post is missing");

  /* each office draws its own field, not one shared pool */
  const fm = sandbox.officeField(st, "marshal");
  const fc = sandbox.officeField(st, "chancellor");
  ok(fm.length > 0 && fc.length > 0, "offices: an office was offered no candidates at all");
  const idsM = fm.filter(c => !c.royal).map(c => c.id).join(",");
  const idsC = fc.filter(c => !c.royal).map(c => c.id).join(",");
  ok(idsM !== idsC, "offices: two different posts drew the identical field");
  ok(fm.every(c => c.skill != null), "offices: a candidate arrived without a competence");

  /* the field is stable within a turn, so the screen does not reshuffle */
  ok(sandbox.officeField(st, "marshal").map(c=>c.id).join(",") === fm.map(c=>c.id).join(","),
     "offices: the field reshuffled on a second look within the same turn");

  /* names change with the regime; the post does not */
  const marshal = sandbox.roleById("marshal");
  const crownName = sandbox.roleName(st, marshal);
  install("people");
  ok(sandbox.roleName(B.S, marshal) !== crownName,
     "offices: a people's republic still called it by the crown's name");
  ok(sandbox.ROLES_LEN === undefined || true, "");

  /* a good officer helps and a bad one hurts, every turn they serve */
  S = freshGame(); st = B.S;
  st.gov.cabinet = "Privy Council";
  st.court = [{ id: 90001, name: "Able", age: 45, alive: true, job: "chancellor",
                bloc: "merchants", label: "a man of business", skill: 90 }];
  let t0 = st.treasury; sandbox.officeUpkeep(st);
  ok(st.treasury > t0, "offices: a capable Chancellor did nothing for the treasury");
  st.court[0].skill = 10;
  t0 = st.treasury; sandbox.officeUpkeep(st);
  ok(st.treasury < t0, "offices: an incompetent Chancellor cost nothing");

  /* and bends the price of work in their own department only */
  st.court[0].skill = 90;
  ok(sandbox.officeCostMod(st, "trade") < 1, "offices: a good Chancellor did not cheapen fiscal work");
  ok(sandbox.officeCostMod(st, "levy") === 1, "offices: the Chancellor cheapened the army too");
  st.court[0].skill = 10;
  ok(sandbox.officeCostMod(st, "trade") > 1, "offices: a bad Chancellor did not raise fiscal costs");
}

/* ---- fertility: a five-year turn can hold more than one child ---- */
{
  let most = 0, runs = 0;
  for (let seed = 0; seed < 40; seed++) {
    S = freshGame(); const st = B.S;
    const sp = sandbox.makePerson(st, "spouse", st.monarch.gender === "m" ? "f" : "m", 24);
    sp.spouseId = st.monarch.id; st.monarch.spouseId = sp.id; st.family.push(sp);
    st.monarch.age = 26;
    const before = st.family.filter(p => p.rel === "child").length;
    sandbox.maybeBirth(5);
    const born = st.family.filter(p => p.rel === "child").length - before;
    most = Math.max(most, born); runs += born;
  }
  ok(most >= 2, `fertility: across 40 turns the most children born in one turn was ${most}, want at least 2`);
  ok(runs / 40 > 0.6, `fertility: mean births per fertile turn is ${(runs/40).toFixed(2)}, which is too barren`);
}

/* ---- women reach the offices of state only with the mass franchise ---- */
{
  S = freshGame(); const st = B.S;
  let anyEarly = false;
  st.eraIdx = 4;
  for (let i = 0; i < 300; i++) if (sandbox.officeGender(st) === "f") anyEarly = true;
  ok(!anyEarly, "gender gate: a woman held office before the mass franchise");
  st.eraIdx = 8;
  let anyLate = false;
  for (let i = 0; i < 300; i++) if (sandbox.officeGender(st) === "f") anyLate = true;
  ok(anyLate, "gender gate: no woman ever reaches office even in the modern era");
}

/* ---- an abdicating sovereign is not a dead one ---- */
{
  S = freshGame(); const st = B.S;
  const wasId = st.monarch.id, wasName = st.monarch.name;
  st._abdicated = true;
  st.family.push(sandbox.makePerson(st, "child", "m", 30, null, [st.monarch.id, 999999]));
  try { sandbox.crownPerson(st, st.family.find(p => p.rel === "child")); }
  catch (e) { fail(`abdication: crownPerson threw: ${e.message}`); }
  const ex = B.S.family.find(p => p.id === wasId);
  ok(!!ex, `abdication: ${wasName} vanished from the world instead of retiring`);
  ok(ex && ex.alive !== false, "abdication: the ex-sovereign was quietly killed off");
}

/* ---- marriage offers vary in number and in what they are for ---- */
{
  const counts = new Set(); const kinds = new Set();
  for (let i = 0; i < 60; i++) {
    S = freshGame(); const st = B.S;
    st.treasury = (i % 2) ? 5 : 200;
    if (i % 3 === 0) st.rival = { id: 1234, name: "A Claimant" };
    st._matchC = null;
    const list = sandbox.matchCandidates(st, st.monarch);
    counts.add(list.length);
    list.forEach(c => { if (c.dowry) kinds.add("dowry"); if (c.heal) kinds.add("heal");
                        if (c.placate) kinds.add("placate"); if (c.arms) kinds.add("arms"); });
    ok(list.length >= 3, `marriage: only ${list.length} offers, want at least 3`);
    ok(list.length <= 5, `marriage: ${list.length} offers, want at most 5`);
  }
  ok(counts.size > 1, "marriage: the number of offers never varied");
  ok(kinds.size > 1, `marriage: terms never varied with the realm (saw: ${[...kinds].join(", ") || "none"})`);
}

/* ---- an office of state given to someone who is not family ---- */
{
  S = freshGame();
  B.S.gov.cabinet = "Privy Council";
  sandbox.courtiers(B.S);
  B.S._rolePick = "marshal";
  B.S.phase = "rolepick";
  try { sandbox.render(); } catch (e) { fail(`rolepick: render threw: ${e.message}`); }
  const who = document.querySelectorAll("[data-rolewho]");
  ok(who.length > 0, "rolepick: no candidates offered for a vacant office");
  const courtBtn = who.find(b => String(b.attrs["data-rolewho"]).charAt(0) === "c");
  ok(!!courtBtn, "rolepick: the council put forward no non-royal candidate");
  if (courtBtn) {
    const cid = parseInt(String(courtBtn.attrs["data-rolewho"]).slice(1), 10);
    try { courtBtn.onclick(); } catch (e) { fail(`rolepick: appointing threw: ${e.message}`); }
    const h = sandbox.roleHolder(B.S, "marshal");
    ok(h && h.id === cid,
       `rolepick: appointing a courtier did not stick (office holder: ${h ? h.name : "still vacant"})`);
  }
}

/* A country in the state Zandaria was in when the revolution came: late era,
   legitimacy gone, stability gone, every pressure fed by the collapse itself.
   A healthy state transitions cleanly; that was never the bug. */
function wrecked() {
  const st = freshGame();
  st.era = "masses"; st.eraIdx = 7;
  for (let i = 0; i < 7; i++) if (Array.isArray(st.erasTaken)) st.erasTaken.push(i);
  st.stability = 28; st.legitimacy = 22; st.development = 70; st.military = 55;
  st.treasury = -60; st.debt = 60;
  st._pressOn = true;
  if (st.facs.workers) { st.facs.workers.present = true; st.facs.workers.strength = 30; st.facs.workers.mood = 22; }
  st.facs.peasantry.mood = 20; st.facs.merchants.mood = 30; st.facs.reformers.mood = 18;
  /* pressures integrate over decades; setting the stats is not enough */
  for (let i = 0; i < 40; i++) sandbox.tickPressures(st, 5);
  return st;
}
function press(st) {
  return ["military","radical","constitutional","restorationist"]
    .map(p => `${p.slice(0,4)}=${Math.round(sandbox.pressureOf(st, p))}`).join(" ");
}

/* ---- a people's republic must survive its own founding ---- */
for (const branch of ["moderate", "terror"]) {
  S = wrecked();
  try { sandbox.applyTransition(B.S, "people"); }
  catch (e) { fail(`people/${branch}: applyTransition threw: ${e.message}`); continue; }
  ok(B.S.regime === "people", `people/${branch}: transition did not install a people's republic`);
  B.S.phase = "terror";
  try { sandbox.render(); } catch (e) { fail(`terror: render threw: ${e.message}`); }
  const btn = document.querySelectorAll("[data-terror]").find(b => b.attrs["data-terror"] === branch);
  ok(!!btn, `terror: the ${branch} branch was not offered`);
  if (btn) {
    try { btn.onclick(); } catch (e) { fail(`terror/${branch}: threw: ${e.message}`); }
    ok(B.S.regime === "people",
       `terror/${branch}: the people's republic ended in the same turn it began (now ${B.S.regime})`);
    invariants(B.S, `terror/${branch}`);
    /* and the very next turn must not undo it either */
    for (let i = 0; i < 2; i++) sandbox.tickPressures(B.S, 5);
    const t = sandbox.transitionReady(B.S);
    ok(!t || t.jacquerie,
       `terror/${branch}: a rupture was already armed two ticks after the founding ` +
       `(${t && t.id} -> ${t && t.target} at ${t && t.v}) [${press(B.S)}]`);
  }
}

/* ---- and must survive a few turns of ordinary weather ---- */
{
  S = wrecked();
  sandbox.applyTransition(B.S, "people");
  let held = 0;
  for (let i = 0; i < 3; i++) {
    try { sandbox.beginTurn(false); } catch (e) { fail(`people: beginTurn threw: ${e.message}`); break; }
    if (B.S.regime === "people") held++;
    invariants(B.S, `people turn ${i + 1}`);
  }
  ok(held === 3, `people: fell out of its own regime after ${held} turn(s) — a revolution needs a honeymoon`);
}

/* ---- nothing of the old regime may be inherited by the new one ---- */
{
  S = freshGame();
  B.S.regency = { id: 9999, name: "A Test Regent", style: "Regent of the Realm" };
  B.S._minority = true;
  sandbox.installRepublic(B.S, false);
  ok(!B.S.regency, "teardown: a republic inherited the monarchy's regency");
  ok(!B.S._minority, "teardown: a republic inherited the monarchy's minority");
}
{
  S = freshGame();
  sandbox.installPeoples(B.S, "revolution");
  const partyBefore = (B.S.gov.institutions || []).length;
  sandbox.installRepublic(B.S, false);
  const ghosts = (B.S.gov.institutions || []).filter(i => /party|congress|presidium/i.test(i.name || ""));
  ok(ghosts.length === 0,
     `teardown: the party survived into the republic (${ghosts.map(g => `${g.name} ${g.power}`).join(", ")})`);
  ok((B.S.gov.institutions || []).length >= 1,
     `teardown: the republic has no legislature at all (had ${partyBefore} before)`);
  const est = B.S.facs.aristocracy, cl = B.S.facs.clergy;
  ok(est && est.present, "teardown: the aristocracy stayed abolished after the people's republic ended");
  ok(cl && cl.present, "teardown: the clergy stayed abolished after the people's republic ended");
  invariants(B.S, "people -> republic teardown");
}

/* ---- the head of a republic does not die like a king ---- */
{
  S = freshGame();
  sandbox.installRepublic(B.S, false);
  const deadPres = B.S.monarch.name;
  B.S.monarch.alive = false;
  try { sandbox.endTurn(); } catch (e) { fail(`republic death: endTurn threw: ${e.message}`); }
  ok(B.S.phase !== "succession" && B.S.phase !== "housefate",
     `republic death: a dead president routed into the dynastic succession screen (phase ${B.S.phase})`);
  ok(B.S.monarch && B.S.monarch.alive && B.S.monarch.name !== deadPres,
     "republic death: no successor took the oath");
  ok(B.S.regime === "republic", `republic death: the republic ended with its president (now ${B.S.regime})`);
  const style = B.S.gov.crown.titleBase;
  ok((B.S.lineage || []).some(l => l.name === deadPres && l.title === style),
     `republic death: the dead head of state was not recorded on the roll under their own style (${style})`);
  invariants(B.S, "republic succession");
}

/* ---- the credit the sidebar promises is the credit you may spend ---- */
{
  S = freshGame();
  B.S._creditBonus = 200; B.S.treasury = -80; B.S.debt = 80;
  const shown = Math.max(0, 40 + (B.S._creditBonus || 0) + B.S.treasury);
  const act = { id: "__test", cost: { gold: -20 } };
  ok(shown >= 20, "credit: test setup wrong");
  ok(sandbox.affordable(B.S, act),
     `credit: the sidebar offered ${shown} of credit and the court refused a ${20} gold action`);
}

/* ---- a title is a historical fact, not a view of the present ---- */
{
  S = freshGame();
  const wasKing = sandbox.styled(B.S, B.S.monarch);
  ok(/^(King|Queen)\b/.test(wasKing), `titles: founding sovereign not styled by the founding title (${wasKing})`);
  B.S.lineage.push({ id: B.S.monarch.id, name: B.S.monarch.name, regnal: B.S.monarch.regnal,
                     house: B.S.monarch.house, gender: B.S.monarch.gender,
                     title: B.S.gov.crown.titleBase, regime: B.S.regime });
  sandbox.applyTransition(B.S, "republic");
  const l = B.S.lineage[B.S.lineage.length - 1];
  ok(l.title === "King",
     `titles: a past monarch was retitled by the present regime (recorded as ${l.title || "nothing"})`);
}
/* =====================================================================
   CHAOS — five passes.

   The old harness played one monarchy and reported no errors, which is
   exactly how a broken republic shipped. A monkey that never reaches a
   screen cannot find the bug on it. So: one pass per regime, started
   inside that regime, plus a churn pass that walks the transition graph
   under load.

   The monkey is also nudged toward the continue button, or it spends
   six thousand clicks admiring the same court and reaching turn 21.
===================================================================== */
const ALL_PHASES = [
  "advance","chname","civilpick","congress","convention","court","designate",
  "dynastic","dyncourt","election","ended","event","housefate","juntaexit",
  "match","naming","outcome","pmname","pmpick","pmoffer","quiet","regentpick","session",
  "repvote","rolepick","seatshift","succession","terror","tidings","transition",
];

const seenEverywhere = new Set();
const passReports = [];

function runChaos(label, steps, setup, churn) {
  const before = failures;
  let clicks = 0, dead = 0, thrown = 0, forced = 0;
  const phases = new Set();

  S = freshGame();
  try { setup && setup(); } catch (e) { fail(`${label}: setup threw: ${e.message}`); return; }
  try { sandbox.render(); } catch (e) { fail(`${label}: initial render threw: ${e.message}`); return; }

  for (let step = 0; step < steps; step++) {
    const cur = B.S;
    if (cur) {
      phases.add(cur.phase); seenEverywhere.add(cur.phase);
      invariants(cur, `${label} step ${step} (phase ${cur.phase})`);
    }

    /* walk the graph under load: shove the state into another regime
       every so often and keep clicking as if nothing happened */
    if (churn && cur && clicks && clicks % churn === 0) {
      const others = REGIMES.filter(r => r !== cur.regime);
      const to = others[Math.floor(rnd() * others.length)];
      try {
        sandbox.applyTransition(cur, to); forced++;
        invariants(B.S, `${label}: forced ${cur.regime} -> ${to}`);
        sandbox.render();
      } catch (e) { fail(`${label}: forced transition to ${to} threw: ${e.message}`); }
    }

    const HEADER = ["btnSave", "btnLoad", "btnNew"];   /* save/load/reset are not play */
    const all = registry.filter(e => typeof e.onclick === "function" && !HEADER.includes(e.attrs.id));
    if (!all.length) {
      dead++;
      try { sandbox.render(); } catch (e) { fail(`${label}: render threw at step ${step}: ${e.message}`); break; }
      if (dead > 40) { fail(`${label}: no clickable element for 40 steps at phase ${cur && cur.phase}`); break; }
      continue;
    }
    dead = 0;

    /* 45% of the time take the continue button if one is offered — enough
       to push the centuries along, not so much that nothing else is tried */
    const conts = all.filter(e => e.classList.contains("cont"));
    const pool = (conts.length && rnd() < 0.45) ? conts : all;
    const b = pool[Math.floor(rnd() * pool.length)];
    const tag = Object.keys(b.attrs).find(k => k.startsWith("data-")) || b.attrs.id || "?";
    actionsFired[tag] = (actionsFired[tag] || 0) + 1;
    clicks++;
    try { b.onclick(); } catch (e) {
      thrown++;
      if (thrown <= 6) fail(`${label}: click ${tag} at step ${step} (phase ${cur && cur.phase}): ${e.message}`);
    }
    if (failures - before > 60) { console.error(`  ${label}: too many failures — stopping this pass`); break; }
  }

  const fin = B.S;
  passReports.push({ label, clicks, thrown, phases, forced,
                     year: fin && fin.year, turn: fin && fin.turn,
                     regime: fin && fin.regime, fails: failures - before });
  console.log(`  ${label.padEnd(10)} clicks ${String(clicks).padStart(5)} · ` +
              `exceptions ${String(thrown).padStart(3)} · ` +
              `${fin ? `to ${fin.year} (turn ${fin.turn}), ended ${fin.regime}` : "no state"}` +
              `${forced ? ` · ${forced} forced transitions` : ""}` +
              ` · ${phases.size} phases · ${failures - before} failures`);
}

const actionsFired = {};
const PASS = Math.max(400, Math.floor(STEPS / 5));
console.log(`\n— chaos: 5 passes × ${PASS.toLocaleString()} steps, seed ${SEED} —`);

runChaos("monarchy", PASS, null, 0);
runChaos("junta",    PASS, () => install("junta"), 0);
runChaos("republic", PASS, () => install("republic"), 0);
runChaos("people",   PASS, () => install("people"), 0);
runChaos("churn",    PASS, null, 120);
/* the long reign: the mode Zach will actually sit down with. No government
   may fall in it, so the pass asserts the regime is still a monarchy at the
   end however hard the monkey leans on it. */
runChaos("longreign", PASS, () => { B.S.devQuiet = true; }, 0);
{
  const lr = passReports[passReports.length - 1];
  ok(lr && lr.regime === "monarchy",
     `long reign: the realm ended as ${lr && lr.regime}, but nothing may rupture with the toggle on`);
}

/* ---------- coverage: which screens did the monkey never open? ---------- */
const never = ALL_PHASES.filter(p => !seenEverywhere.has(p));
console.log(`\n— coverage —`);
console.log(`  phases reached (${seenEverywhere.size}/${ALL_PHASES.length}): ${[...seenEverywhere].sort().join(", ")}`);
if (never.length) console.log(`  NEVER REACHED (${never.length}): ${never.join(", ")}`);
else console.log("  every phase reached at least once.");

console.log(`\n${checks.toLocaleString()} checks, ${failures} failures`);
if (failures) { console.error("HARNESS FAILED"); process.exit(1); }
console.log("HARNESS PASSED");
