"use strict";
/* =====================================================================
   SUCCESSION
   ===================================================================== */
function successionOptions(){
  const heir=heirOf(S);
  if(S.rival){ const rv=S.family.find(p=>p.id===S.rival.id&&p.alive);
    if(rv&&S.law!=="elective") return {mode:"contested",heir,rival:rv}; }
  if(S.law==="elective"){
    return {mode:"elective"};
  }
  if(heir){
    return {mode:"heir",heir};
  }
  // no heir: siblings can continue the House; else crisis
  const sibs=S.family.filter(p=>p.rel==="sibling"&&p.alive&&p.age>=16);
  return {mode:"crisis",sibs};
}
function crownPerson(p,houseName,viaCrisis){
  S.lineage.push({id:S.monarch.id,name:S.monarch.name,birthName:S.monarch.birthName||null,regnal:S.monarch.regnal,house:S.monarch.house,gender:S.monarch.gender,start:S.monarch.reignStart||null,end:S.year,born:S.monarch.born||null});
  S.ancestors=S.ancestors||[];
  const oldM=Object.assign({},S.monarch); oldM.died=S.year; oldM.alive=false; S.ancestors.push(oldM);
  const newHouse=houseName||S.house;
  const sameHouse=newHouse===S.house;
  /* Relations are derived, not rewritten. The only question a succession
     has to answer is whether the crown has LEFT this family altogether —
     if a stranger takes it, the old house withdraws from court but stays
     in the record. Everything else recomputes itself from the graph. */
  const bloodTie=bloodRel(S,S.monarch.id,p.id);
  const strangerTook=!bloodTie&&!(p.spouseId&&bloodRel(S,S.monarch.id,p.spouseId));
  if(strangerTook){
    let withdrew=false;
    S.family.forEach(q=>{ if(q.id!==p.id&&!q.outHouse){ q.outHouse=true; if(q.alive)withdrew=true; } });
    if(withdrew)
      S.chronicle.push({year:S.year,text:`In ${S.year}, the old royal family withdrew from court, their titles courtesy and their future uncertain.`});
  }
  // remove crowned person from family list
  S.family=S.family.filter(q=>q.id!==p.id);
  S.house=newHouse;
  S.monarch={ id:p.id||PID++, name:p.name, gender:p.gender, age:p.age, house:newHouse, regnal:regnalFor(S,p.name,newHouse), alive:true, parents:p.parents||null, spouseId:p.spouseId||null, born:p.born||(S.year-p.age) };
  if(p.gender==="f")S._femaleReigns++;
  S._successions++;
  if(sameHouse&&!viaCrisis)S._sameHouseSucc++;
  if(!sameHouse){S._houseBreaks++; S._sameHouseSucc=0;}
  S.designated=null; S.rival=null;
  S.monarch.reignStart=S.year;
  refreshRelations(S);
  S.married=!!S.family.find(q=>q.alive&&q.id===S.monarch.spouseId);
  // regency?
  if(S.monarch.age<16){ S.stability=clamp(S.stability-8); S._regentPick=true; }
}

function crisisCandidates(byArms){
  const houses=[]; while(houses.length<3){ const h=pick(housePool()); if(!houses.includes(h))houses.push(h); }
  S._usedCands=S._usedCands||[];
  return houses.map(h=>{ const g=chance(0.5)?"m":"f";
    const used=new Set([...(S._usedCands),...usedNames(S)]);
    const nm=nameFor(g,used); S._usedCands.push(nm);
    return { name:nm, gender:g, age:25+rand(20), house:h,
      note: (byArms? pick(["commands the border legions","backed by the veteran regiments","holds the capital garrison"])
                  : pick(["the wealthiest house in the realm","backed by the merchant banks","master of the grain trade"]))
            +(S.lineage.some(l=>l.house===h)?" — an old claimant house returns":"") }; });
}
