"use strict";
/* =====================================================================
   SOVEREIGN v3 — Dynastic-era foundation build
   Phased turns (Event? -> Court -> Dynastic?) · full family model
   (children, siblings, ages, era-scaled mortality, regency, rivals)
   · succession law (set at founding, reformable) · succession crises
   with player-chosen candidates that can BREAK the House
   · harsh economy · v2 bug fixes (gendered titles, event recurrence,
   tax-consent, crisis dedup). Standalone & offline.
   ===================================================================== */
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const rand=n=>Math.floor(Math.random()*n);
const pick=a=>a[rand(a.length)];
const chance=p=>Math.random()<p;

/* a second picker, because `pick` is spoken for */
function pick2(a){ return a[Math.floor(Math.random()*a.length)]; }
