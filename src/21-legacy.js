"use strict";
/* =====================================================================
   LEGACY
   ===================================================================== */
function legacyScore(){
  const yrs=S.year-S.startYear;
  let s=0,n=0;for(const k in S.facs){if(S.facs[k].present){s+=S.facs[k].mood;n++;}}
  const avg=n?s/n:50;
  return Math.round(yrs*0.45+S.seenMilestones.length*16+S._reforms*9+S._successions*8+S._houseBreaks*6+S.development*0.4+(avg-50)*0.9);
}
function verdict(){
  if(S.gov.charter)return "A crown that knew when to bend. What began as an absolute throne became a realm of law its people had a hand in — and endured the better for it.";
  if(S._houseBreaks>0)return "The Houses rose and fell, but the throne — and the will behind it — went on. The chroniclers struggle to say what ruled the realm, and that is precisely the point.";
  if(S.gov.institutions.length>0)return "A monarchy that learned, grudgingly, to share the burden of power. The old absolutism is gone; something steadier stands in its place.";
  if(S._sameHouseSucc>=2)return "An unbroken absolute line, ruling as its founders did. Steadfastness or stubbornness — the chroniclers still argue.";
  return "A stewardship of an old realm through dangerous times, remembered in the measure of what it survived.";
}
function checkMilestones(){
  S._ms=S._ms||[];
  for(const m of MILESTONES){ if(!S.seenMilestones.includes(m.id)&&m.test(S)){ S.seenMilestones.push(m.id); S._ms.push(m.label);
    S.chronicle.push({year:S.year,cls:"mstone",text:`In ${S.year}, ${m.line}`}); } }
}
