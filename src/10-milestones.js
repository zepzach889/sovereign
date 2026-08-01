"use strict";
/* =====================================================================
   MILESTONES
   ===================================================================== */
const MILESTONES=[
  {id:"first_parliament",label:"The First Parliament",test:S=>S.gov.institutions.length>=1,
    line:"the realm's first chamber was summoned — a moment later generations would mark as the birth of their politics."},
  {id:"commons",label:"A Voice for the Commons",test:S=>S.reforms.includes("lower_house"),
    line:"the common estates won a chamber of their own, and power began its long slide from the few toward the many."},
  {id:"charter",label:"A Throne Bound by Law",test:S=>!!S.gov.charter,
    line:"the Crown bound itself to written law, and the age of the sovereign's mere word came quietly to its end."},
  {id:"secure_succession",label:"An Unbroken Line",test:S=>S._successions>=1&&S._houseBreaks===0,
    line:"the crown passed from one head to the next without blood or doubt — rarer than any conquest."},
  {id:"old_dynasty",label:"The Enduring House",test:S=>S._sameHouseSucc>=3,
    line:"thrice the crown changed heads within one House; the dynasty had become, to the people, simply the way of things."},
  {id:"new_house",label:"A New House Rises",test:S=>S._houseBreaks>=1,
    line:"an old royal line ended and a new House took the crown — proof that the throne outlives any family that sits it."},
  {id:"regency_survived",label:"The Realm Kept for a Child",test:S=>S._regenciesEnded>=1,
    line:"a child's crown was carried safely to adulthood through the hungry years of a regency."},
  {id:"golden",label:"A Golden Age",test:S=>{let ok=true;for(const k in S.facs){if(S.facs[k].present&&S.facs[k].mood<62)ok=false;}return ok;},
    line:"for a span of golden years every estate of the realm was content at once — a harmony later ages were shamed by."},
  {id:"queen_regnant",label:"A Queen Regnant",test:S=>S._femaleReigns>=1,
    line:"a woman wore the crown in her own right, and the realm discovered the sky did not fall."},
  {id:"pm",label:"Responsible Government",test:S=>!!S.pm,
    line:"the crown's ministers became the realm's true government, answerable to the chamber rather than the throne."},
  {id:"first_election",label:"The People's Verdict",test:S=>(S._elections||0)>=1,
    line:"for the first time, power changed hands by the counting of votes rather than of heads."},
];
