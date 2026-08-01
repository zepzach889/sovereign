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

/* ===================================================================== */
console.log(`\n— chaos: ${STEPS.toLocaleString()} steps, seed ${SEED} —`);
S = freshGame();
try { sandbox.render(); } catch (e) { fail("initial render threw: " + e.message); }

const phasesSeen = new Set(), actionsFired = {};
let clicks = 0, dead = 0, thrown = 0;

for (let step = 0; step < STEPS; step++) {
  const cur = B.S;
  if (cur) { phasesSeen.add(cur.phase); invariants(cur, `step ${step} (phase ${cur.phase})`); }

  const HEADER = ["btnSave", "btnLoad", "btnNew"];   /* save/load/reset are not play */
  const buttons = registry.filter(e => typeof e.onclick === "function" && !HEADER.includes(e.attrs.id));
  if (!buttons.length) {
    dead++;
    try { sandbox.render(); } catch (e) { fail(`render threw at step ${step}: ${e.message}`); break; }
    if (dead > 40) { fail(`no clickable element for 40 consecutive steps at phase ${cur && cur.phase}`); break; }
    continue;
  }
  dead = 0;
  const b = buttons[Math.floor(rnd() * buttons.length)];
  const tag = Object.keys(b.attrs).find(k => k.startsWith("data-")) || "?";
  actionsFired[tag] = (actionsFired[tag] || 0) + 1;
  clicks++;
  try { b.onclick(); } catch (e) {
    thrown++;
    if (thrown <= 10) fail(`click ${tag} at step ${step} (phase ${cur && cur.phase}): ${e.message}`);
  }
  if (failures > 200) { console.error("  too many failures — stopping early"); break; }
}

const fin = B.S;
console.log(`  clicks: ${clicks.toLocaleString()}   exceptions: ${thrown}`);
if (fin) console.log(`  reached year ${fin.year} (turn ${fin.turn}), regime ${fin.regime}, era ${fin.era}`);
console.log(`  phases visited (${phasesSeen.size}): ${[...phasesSeen].sort().join(", ")}`);

console.log(`\n${checks.toLocaleString()} checks, ${failures} failures`);
if (failures) { console.error("HARNESS FAILED"); process.exit(1); }
console.log("HARNESS PASSED");
