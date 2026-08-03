"use strict";
/* =====================================================================
   THE FAMILY GRAPH
   Relations are DERIVED, never stored. Each person keeps only facts that
   never change — who their parents are, who they married, which house
   they belong to. Everything else (son, aunt, nephew-by-marriage) is
   computed against whoever currently wears the crown, so no succession
   path can leave a stale or orphaned label behind.
   ===================================================================== */

function allPersons(S){
  const out=[]; if(S.monarch)out.push(S.monarch);
  (S.family||[]).forEach(p=>out.push(p));
  (S.ancestors||[]).forEach(p=>{ if(!out.some(q=>q.id===p.id))out.push(p); });
  return out;
}
function personAny(S,id){ return allPersons(S).find(p=>p.id===id)||null; }
function birthOrder(p){ return (p.born!=null)?p.born:(9999-(p.age||0)); }

/* every ancestor of a person, mapped to how many generations up they are */
function ancestryOf(S,id,depth){
  const seen=new Map(); const lim=depth||6;
  (function walk(pid,d){
    if(d>lim)return;
    /* record the id even when the person object is gone — a pruned or
       never-materialized ancestor must still serve as a join point, or
       whole branches of the family read as strangers */
    if(!seen.has(pid)||seen.get(pid)>d) seen.set(pid,d);
    const p=personAny(S,pid); if(!p)return;
    (p.parents||[]).forEach(par=>{ if(par)walk(par,d+1); });
  })(id,0);
  return seen;
}
/* {up,down} from ref to person through their nearest common ancestor */
function bloodRel(S,refId,pId){
  if(refId===pId) return {up:0,down:0};
  const A=ancestryOf(S,refId), B=ancestryOf(S,pId);
  let best=null;
  A.forEach((up,aid)=>{ if(B.has(aid)){ const down=B.get(aid);
    if(!best||(up+down)<(best.up+best.down)||((up+down)===(best.up+best.down)&&up<best.up)) best={up,down}; } });
  return best;
}
function bloodCode(r){
  if(!r) return null;
  const {up,down}=r;
  if(up===0&&down===1) return "child";
  if(up===1&&down===0) return "parent";
  if(up===1&&down===1) return "sibling";
  if(up===0&&down===2) return "grandchild";
  if(up===2&&down===0) return "grandparent";
  if(up===2&&down===1) return "uncle";
  if(up===1&&down===2) return "nephew";
  if(up===0&&down>=3)  return "grandchild";
  if(up>=3&&down===0)  return "grandparent";
  return "kin";
}
/* the label code for one person, computed against the reigning sovereign */
function relCodeFor(S,p){
  const m=S.monarch; if(!m||p.id===m.id) return "self";
  if(p.outHouse) return "former";
  if(p.spouseId===m.id||m.spouseId===p.id) return (m.alive===false)?"dowager":"spouse";
  const b=bloodCode(bloodRel(S,m.id,p.id));
  if(b) return b;
  /* married in: take the meaning of whoever they married */
  if(p.spouseId){
    const sp=personAny(S,p.spouseId);
    if(sp){
      const sb=bloodCode(bloodRel(S,m.id,sp.id));
      if(sb==="child") return "childspouse";
      if(sb) return "inlaw";
    }
  }
  /* consort of a former sovereign */
  if((S.lineage||[]).some(l=>l.id===p.spouseId)) return "dowager";
  return "kin";
}
/* The civil list is short. The sovereign, the consort, the sovereign's
   own unmarried children, and the heir's household. Everyone else is a
   relative, not an expense. */
const HOUSEHOLD_RELS=["spouse","child","grandchild"];
function inHousehold(S,p){
  if(!p||!p.alive||p.outHouse||p.cadet)return false;
  if(p.rel==="spouse")return true;
  if(p.rel==="child")return !p.spouseId;         /* married out, or still at home */
  if(p.rel==="childspouse"){                      /* the heir's consort only */
    const h=heirOf(S); return !!(h&&p.spouseId===h.id);
  }
  if(p.rel==="grandchild"){
    const h=heirOf(S); return !!(h&&p.parents&&p.parents.indexOf(h.id)>=0);
  }
  return false;
}
function householdSize(S){ return (S.family||[]).filter(p=>inHousehold(S,p)).length; }

/* Who has drifted far enough from the throne to be their own family. A
   cadet is still kin, still in the Dynasties page, still a claimant if
   the line ever fails — just not a line item and not a wedding you have
   to arrange. */
const CADET_RELS=["uncle","aunt","cousin","nephew","niece","kin","inlaw",
  "auntmarriage","unclemarriage","sibling-in-law","sister-in-law","brother-in-law"];
function shouldCadet(S,p){
  if(!p||!p.alive||p.outHouse||p.cadet)return false;
  if(p.id===S.monarch.id)return false;
  const h=heirOf(S); if(h&&p.id===h.id)return false;
  if(p.job)return false;                          /* serving officers stay at court */
  if(["spouse","child","childspouse","dowager","former"].includes(p.rel))return false;
  if(p.rel==="grandchild"){ return !(h&&p.parents&&p.parents.indexOf(h.id)>=0); }
  if(p.rel==="sibling")return p.age>=30&&!!p.spouseId;  /* married and settled */
  return p.age>=25;
}
function branchKin(S){
  /* the ones who have left the household but not the chronicle */
  return (S.family||[]).filter(p=>p.cadet&&p.alive);
}
function refreshRelations(S){
  if(!S||!S.monarch)return;
  (S.family||[]).forEach(p=>{ p.rel=relCodeFor(S,p); });
}

/* ---------- succession: a proper walk of the tree, by law ---------- */
function lawFilter(S,list){
  if(S.law==="agnatic") return list.filter(p=>p.gender==="m");
  return list.slice();
}
function lawSort(S,list){
  const byBirth=(a,b)=>birthOrder(a)-birthOrder(b);
  if(S.law==="malepref"){
    const m=list.filter(p=>p.gender==="m").sort(byBirth);
    const f=list.filter(p=>p.gender!=="m").sort(byBirth);
    return m.concat(f);
  }
  return list.slice().sort(byBirth);
}
function childrenOf(S,id){
  return allPersons(S).filter(p=>p.parents&&p.parents.includes(id)&&p.id!==id);
}
/* a person's line: themselves if living, then their issue by representation */
function lineFrom(S,id,out,depth){
  out=out||[]; depth=depth||0; if(depth>5)return out;
  const kids=lawSort(S,lawFilter(S,childrenOf(S,id)));
  kids.forEach(k=>{
    if(k.alive&&!k.exiled&&!k.outHouse) out.push(k);
    lineFrom(S,k.id,out,depth+1);
  });
  return out;
}
function successionLine(S){
  if(!S.monarch) return [];
  const line=lineFrom(S,S.monarch.id);
  if(line.length) return line;
  /* the direct line is bare — climb to the parents, then the grandparents,
     taking each generation's other branches in order */
  let node=S.monarch, guard=0;
  while(guard++<4){
    const parents=(node.parents||[]).map(id=>personAny(S,id)).filter(Boolean);
    if(!parents.length) break;
    for(const par of parents){
      const branch=lineFrom(S,par.id).filter(p=>p.id!==S.monarch.id&&p.id!==node.id);
      if(branch.length) return branch;
    }
    node=parents[0];
  }
  /* nothing by descent — fall back to any living sibling recorded flat */
  return lawSort(S,lawFilter(S,(S.family||[]).filter(p=>p.alive&&p.rel==="sibling")));
}
function heirOf(S){
  if(S.law==="elective") return null;
  if(S.designated){ const d=(S.family||[]).find(p=>p.id===S.designated&&p.alive); if(d) return d; }
  return successionLine(S)[0]||null;
}
/* how far from the lawful line someone sits — drives the cost of passing over */
function kinDistance(S,p){
  const r=bloodRel(S,S.monarch.id,p.id);
  if(!r) return 5;
  const d=r.up+r.down;
  return Math.min(5,Math.max(0,d-1));
}
function designatable(S){
  return (S.family||[]).filter(p=>p.alive&&p.age>=6&&!p.outHouse&&p.rel!=="spouse"&&p.rel!=="dowager"&&p.rel!=="childspouse"&&p.rel!=="inlaw")
    .sort((a,b)=>kinDistance(S,a)-kinDistance(S,b)||birthOrder(a)-birthOrder(b)).slice(0,10);
}
