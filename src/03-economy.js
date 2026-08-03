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
  u+=Math.round(householdSize(S)*2.4); // the civil list — the household, not every cousin
  if(S.gov.cabinet)u+=5;
  u+=(S._armyUpkeep||0);
  u+=(S._upkeepAge||0);   /* rails, sewers, schools and locks do not maintain themselves */
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
  if(kin)up.push(`${Math.round(kin*2.4)} royal household`);
  if(S.gov.cabinet)up.push("5 cabinet");
  if(S._armyUpkeep)up.push(`${S._armyUpkeep} standing army`);
  if(S._upkeepAge)up.push(`${S._upkeepAge} public works and services`);
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
