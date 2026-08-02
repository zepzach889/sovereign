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
  "match","naming","outcome","pmname","quiet","regentpick","repvote",
  "rolepick","succession","terror","tidings","transition",
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

/* ---------- coverage: which screens did the monkey never open? ---------- */
const never = ALL_PHASES.filter(p => !seenEverywhere.has(p));
console.log(`\n— coverage —`);
console.log(`  phases reached (${seenEverywhere.size}/${ALL_PHASES.length}): ${[...seenEverywhere].sort().join(", ")}`);
if (never.length) console.log(`  NEVER REACHED (${never.length}): ${never.join(", ")}`);
else console.log("  every phase reached at least once.");

console.log(`\n${checks.toLocaleString()} checks, ${failures} failures`);
if (failures) { console.error("HARNESS FAILED"); process.exit(1); }
console.log("HARNESS PASSED");
