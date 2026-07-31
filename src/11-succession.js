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
  const wasChild=S.family.some(q=>q.id===p.id&&q.rel==="child");
  const wasSibling=S.family.some(q=>q.id===p.id&&q.rel==="sibling");
  if(wasChild){
    // the crown moves DOWN a generation
    S.family.forEach(q=>{
      if(q.id===p.id) return;
      if(q.rel==="spouse") q.rel="dowager";
      else if(q.rel==="dowager"||q.rel==="uncle") q.rel="kin";
      else if(q.rel==="sibling") q.rel="uncle";
    });
    S.family.forEach(q=>{ if(q.rel==="child"&&q.id!==p.id) q.rel="sibling"; });
    // re-root the heir's own household
    S.family.forEach(q=>{
      if(q.id===p.spouseId&&q.rel==="childspouse") q.rel="spouse";
      else if(q.rel==="grandchild"&&q.parents&&q.parents.includes(p.id)) q.rel="child";
      else if(q.rel==="grandchild") q.rel="nephew";
      else if(q.rel==="childspouse") q.rel="inlaw";
    });
  } else if(wasSibling){
    // the crown moves SIDEWAYS: siblings stay siblings
    S.family.forEach(q=>{
      if(q.id===p.id) return;
      if(q.rel==="spouse"||q.rel==="dowager") q.rel="inlaw";
      else if(q.rel==="child") q.rel="nephew";
      else if(q.rel==="childspouse") q.rel="inlaw";
      else if(q.rel==="grandchild") q.rel="nephew";
    });
    if(p.spouseId){ const psp=S.family.find(q=>q.id===p.spouseId); if(psp)psp.rel="spouse"; }
  } else {
    // a new house or elected outsider: the old family withdraws from court (kept for the record)
    S.family.forEach(q=>{ if(q.id!==p.id&&q.rel!=="former") q.rel="former"; });
    if(S.family.some(q=>q.rel==="former"&&q.alive))
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
  S.married=!!S.family.find(q=>q.rel==="spouse"&&q.alive&&q.id===S.monarch.spouseId);
  // regency?
  if(S.monarch.age<16){ S.regency=newRegent(); S.stability=clamp(S.stability-8); }
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
