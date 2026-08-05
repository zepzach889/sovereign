"use strict";
/* ---------- economy (harsher) ---------- */
const TAX_TIERS={
  none:{label:"None",mult:0.2,stab:+2,fac:{peasantry:+4,merchants:+3}},
  light:{label:"Light",mult:0.65,stab:+1,fac:{peasantry:+2}},
  moderate:{label:"Moderate",mult:1.0,stab:0,fac:{peasantry:-1}},
  heavy:{label:"Heavy",mult:1.4,stab:-2,fac:{peasantry:-4,merchants:-3}},
  oppressive:{label:"Oppressive",mult:1.8,stab:-5,fac:{peasantry:-8,merchants:-5,provinces:-4}},
};
const TAX_ORDER=["none","light","moderate","heavy","oppressive"];
/* Development was clamped at 100, so a realm hit the ceiling in the middle
   ages and every further coin poured into roads and harbours did precisely
   nothing — which is why sponsoring trade stops paying at Powder & Fortress.
   A country's wealth is not bounded at an arbitrary hundred; the ceiling
   rises with the age. */
function devCap(S){ return 100+eraIdx(S)*22; }
function lowerDevelopment(S,n){
  /* a plague must not also clamp a rich realm back down to 100 */
  S.development=Math.max(0,Math.min(devCap(S),(S.development||0)-n));
  return S.development;
}
function raiseDevelopment(S,n){
  S.development=Math.max(0,Math.min(devCap(S),(S.development||0)+n));
  return S.development;
}
function income(S){
  /* crown lands sold in a capitulation are gone for good — the ceiling drops */
  const base=(16+S.development*0.55)*(1+(S._taxBonus||0))*(1-(S._landsSold||0));
  return Math.round(base*TAX_TIERS[S.taxRate].mult)+(S._companyGold||0); }
function upkeep(S){
  let u=10+Math.round(S.military*0.4)+S.privileges*4;
  u+=Math.max(0,Math.round(householdSize(S)*2.4)-(S._civilCut||0)*4); // the civil list, at the posture you set
  if(S.gov.cabinet)u+=5;
  u+=(S._armyUpkeep||0);
  u+=Math.max(0,(S._upkeepAge||0)-(S._worksCut||0)*6);   /* rails, sewers, schools and locks, at the posture you set */
  if(S.debt>0)u+=Math.min(30,Math.round(S.debt*0.12));
  return u;
}
function netIncome(S){ return income(S)-upkeep(S); }
const OVERDRAFT=40;

/* how the money is actually figured — shown in the sidebar so the arithmetic
   is never a mystery */
/* ---------- rupture pressure ----------
   Each rupture builds visible weather before it breaks. These return a
   pressure in years, so a rupture is always something you were warned of. */
function debtPressure(S){ return S._debtYears||0; }
function reactionPressure(S){ return S._reactYears||0; }
function pliableKin(S){
  return (S.family||[]).filter(p=>p.alive&&p.age>=14&&!p.outHouse&&p.house===S.house
      &&["child","sibling","nephew","uncle","grandchild","kin"].includes(p.rel))
    .sort((a,b)=>(a.trait==="cruel"?1:0)-(b.trait==="cruel"?1:0)||b.age-a.age)[0]||null;
}
function budgetBreakdown(S){
  const dev=Math.round(S.development*0.55);
  const tax=TAX_TIERS[S.taxRate];
  const comp=S._companyGold||0;
  const parts=[];
  parts.push(`<b>In:</b> 16 base + ${dev} from development${(S._taxBonus?` +${Math.round((S._taxBonus)*100)}% (census)`:"")}, all ×${tax.mult} (${tax.label.toLowerCase()})${comp?` , +${comp} from the Company (untaxed)`:""}`);
  const up=[];
  up.push("10 court");
  up.push(`${Math.round(S.military*0.4)} arms`);
  if(S.privileges)up.push(`${S.privileges*4} privileges`);
  const kin=householdSize(S);
  if(kin)up.push(`${Math.max(0,Math.round(kin*2.4)-(S._civilCut||0)*4)} civil list`);
  if(S.gov.cabinet)up.push("5 cabinet");
  if(S._armyUpkeep)up.push(`${S._armyUpkeep} standing army`);
  if(S._upkeepAge)up.push(`${Math.max(0,(S._upkeepAge||0)-(S._worksCut||0)*6)} rails, sewers, schools and locks <span style="color:var(--dim)">(promised by your own advances; they do not maintain themselves)</span>`);
  if(S.debt>0)up.push(`${Math.min(30,Math.round(S.debt*0.12))} debt service`);
  parts.push(`<b>Out:</b> ${up.join(" + ")}`);
  if(S._landsSold)parts.push(`<b>Crown lands sold in the capitulation:</b> receipts permanently reduced by ${Math.round(S._landsSold*100)}%`);
  parts.push(`<b>A turn is 3–5 years</b>; the net above is what the treasury takes in a turn of ordinary length.`);
  return parts.join("<br>");
}
/* ---------- mortality (era-scaled; Dynastic is dangerous) ---------- */
function mortalityChance(age,years){
  /* Nobody outlives the record. From ninety the curve steepens hard and by
     a hundred it is certain — no more brothers-in-law dead at 113. */
  if(age>=100)return 1;
  if(age>=90)return Math.min(1,0.55+(age-90)*0.05)*Math.min(1,years/5);

  // per span of `years`; Dynastic-era medicine
  let annual;
  if(age<10) annual=0.015; else if(age<30) annual=0.008; else if(age<45) annual=0.014;
  else if(age<55) annual=0.03; else if(age<65) annual=0.07; else if(age<75) annual=0.14; else annual=0.28;
  return 1-Math.pow(1-annual,years);
}

/* =====================================================================
   THE LEDGER
   Retrenchment was one action that rolled a die between three things you
   could not choose. That is not a lever, it is a suggestion. A state's
   establishment is a standing thing revised at intervals, not a heroic
   annual gesture — so it gets a screen, and every commitment on it is a
   named line with a posture you set and somebody who lives off it.
   ===================================================================== */
const LEDGER_LINES=[
  {id:"host", name:"The host",
   what:"regiments under arms, garrisons, powder and forage",
   steps:["as the frontier demands","the peacetime establishment","a token force"],
   cut:S=>{ S.military=clamp(S.military-14); },
   angry:{officers:-11,aristocracy:-4}, glad:{merchants:+5,peasantry:+4},
   cost:S=>Math.round(S.military*0.4)},
  {id:"standing", name:"The standing establishment",
   what:"the permanent army the Drilled Ranks committed you to — pay, pensions, depots",
   steps:["at full strength","reduced","the cadre only"],
   cut:S=>{ S._armyUpkeep=Math.max(0,Math.round((S._armyUpkeep||0)*0.62)); },
   angry:{officers:-13}, glad:{merchants:+6},
   cost:S=>(S._armyUpkeep||0), avail:S=>(S._armyUpkeep||0)>0},
  {id:"priv", name:"Privileges of the great houses",
   what:"sinecures, exemptions, pensions on the roll since nobody remembers when",
   steps:["as their fathers had them","pared back","struck from the roll"],
   cut:S=>{ S.privileges=Math.max(0,S.privileges-2); },
   angry:{aristocracy:-13}, glad:{merchants:+6,peasantry:+7,reformers:+5},
   cost:S=>S.privileges*4, avail:S=>S.privileges>0},
  {id:"household", name:"The civil list",
   what:"the sovereign's household — table, stables, chapel, and everyone attached to them",
   steps:["as befits the crown","modest","austere"],
   cut:S=>{ S._civilCut=Math.min(2,(S._civilCut||0)+1); },
   angry:{aristocracy:-7,clergy:-4}, glad:{merchants:+5,peasantry:+6},
   cost:S=>Math.max(0,Math.round(householdSize(S)*2.4)-(S._civilCut||0)*4),
   avail:S=>isMonarchy(S)},
  {id:"works", name:"Rails, sewers, schools and locks",
   what:"the public works your own advances promised; they do not maintain themselves",
   steps:["kept up","deferred","let go"],
   cut:S=>{ S._worksCut=Math.min(2,(S._worksCut||0)+1); },
   angry:{peasantry:-6,workers:-8,merchants:-5}, glad:{},
   cost:S=>Math.max(0,(S._upkeepAge||0)-(S._worksCut||0)*6),
   avail:S=>(S._upkeepAge||0)>0,
   warn:"deferring the permanent way costs development and invites the diseases you had stopped"}
];
function ledgerStep(S,id){ return (S.ledger&&S.ledger[id])||0; }
function ledgerLine(S,id){ return LEDGER_LINES.find(l=>l.id===id)||null; }
/* you cannot economise on a commitment you do not have */
function ledgerAvailable(S){
  return LEDGER_LINES.filter(l=>(!l.avail||l.avail(S))&&l.cost(S)>0);
}
/* what the current postures are costing, and what a step down would save */
function ledgerSaving(S,l){
  const now=l.cost(S);
  if(l.id==="host")return Math.round(14*0.4);
  if(l.id==="standing")return Math.round(now*0.38);
  if(l.id==="priv")return Math.min(now,8);
  if(l.id==="household")return Math.min(now,4);
  if(l.id==="works")return Math.min(now,6);
  return 0;
}
function doLedgerCut(id){
  const l=ledgerLine(S,id); if(!l)return;
  const step=ledgerStep(S,id);
  if(step>=l.steps.length-1)return;
  S.ledger=S.ledger||{}; S.ledger[id]=step+1;
  l.cut(S);
  for(const k in l.angry) if(S.facs[k]&&S.facs[k].present)S.facs[k].mood=clamp(S.facs[k].mood+l.angry[k]);
  for(const k in l.glad)  if(S.facs[k]&&S.facs[k].present)S.facs[k].mood=clamp(S.facs[k].mood+l.glad[k]);
  S.stability=clamp(S.stability-3);
  if(l.id==="works")lowerDevelopment(S,4);
  if(l.id==="host"||l.id==="standing")bumpPressure(S,"military",6);
  if(l.id==="priv")bumpPressure(S,"restorationist",7);
  S.chronicle.push({year:S.year,text:`In ${S.year}, ${esc0(l.name).toLowerCase()} was cut to ${esc0(l.steps[step+1])}; the saving was counted at once and the grudge took longer.`});
  render();
}
function doLedgerRestore(id){
  const l=ledgerLine(S,id); if(!l)return;
  const step=ledgerStep(S,id); if(step<=0)return;
  S.ledger=S.ledger||{}; S.ledger[id]=step-1;
  if(l.id==="priv")S.privileges=Math.min(9,S.privileges+2);
  if(l.id==="household")S._civilCut=Math.max(0,(S._civilCut||0)-1);
  if(l.id==="works")S._worksCut=Math.max(0,(S._worksCut||0)-1);
  if(l.id==="host")S.military=clamp(S.military+10);
  if(l.id==="standing")S._armyUpkeep=Math.round((S._armyUpkeep||0)/0.62);
  for(const k in l.angry) if(S.facs[k]&&S.facs[k].present)S.facs[k].mood=clamp(S.facs[k].mood-Math.round(l.angry[k]*0.6));
  S.chronicle.push({year:S.year,text:`In ${S.year}, ${esc0(l.name).toLowerCase()} was restored to ${esc0(l.steps[step-1])}, at a price the treasury felt immediately.`});
  render();
}
