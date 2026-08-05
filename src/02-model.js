"use strict";
/* ---------- succession law ---------- */
const LAWS={
  agnatic:{name:"Agnatic",desc:"Sons only inherit. Daughters and their lines are passed over entirely."},
  malepref:{name:"Male-preference",desc:"Sons first, by age; daughters inherit only if there are no sons."},
  absolute:{name:"Absolute",desc:"The eldest child inherits, son or daughter alike."},
  elective:{name:"Elective",desc:"The great houses (or the chamber, if one holds power) choose the successor."},
};
/* heirOf, kinDistance and designatable now live in 03a-family.js */

/* ---------- factions ---------- */
function newFactions(){
  return {
    aristocracy:{name:"Aristocracy",strength:80,mood:56,present:true},
    clergy:{name:"Clergy",strength:70,mood:58,present:true},
    officers:{name:"Officer Corps",strength:52,mood:54,present:true},
    merchants:{name:"Merchants",strength:34,mood:52,present:true},
    peasantry:{name:"Peasantry",strength:66,mood:50,present:true},
    provinces:{name:"Provinces",strength:50,mood:52,present:true},
    workers:{name:"Urban Workers",strength:0,mood:50,present:false},
    reformers:{name:"Reformers",strength:0,mood:50,present:false},
  };
}
/* Provinces are no longer an estate — they are places, with loyalty of
   their own, and counting them twice was flattering nobody. Officers sit
   with the aristocracy in the upper house, where they were, rather than
   in a commons they had no business in for another two centuries. */
const composition={ nobility:["aristocracy","clergy","officers"], commons:["merchants","peasantry"],
  broad:["merchants","peasantry","workers"],
  national:["aristocracy","clergy","merchants","peasantry","officers","workers","reformers"] };

const FRANCHISE=[
  {id:"property", name:"a property franchise", w:{merchants:1,peasantry:0.2,workers:0},
   blurb:"the vote runs with land and trade — the top layer of the country, and no further"},
  {id:"widened",  name:"a widened franchise",  w:{merchants:1,peasantry:0.5,workers:0.15},
   blurb:"tenants and small holders admitted; the counties stop being pocket boroughs"},
  {id:"broad",    name:"a broad franchise",    w:{merchants:1,peasantry:0.75,workers:0.75},
   blurb:"the towns come in — the men who work the mills now count, nearly"},
  {id:"universal",name:"universal suffrage",   w:{merchants:1,peasantry:1,workers:1},
   blurb:"every adult of the realm, counted the same"}
];
function franchiseIdx(S){ const i=FRANCHISE.findIndex(f=>f.id===(S.franchise||"property")); return i<0?0:i; }
function franchiseDef(S){ return FRANCHISE[franchiseIdx(S)]; }
function franchiseWeight(S,k,comp){
  if(comp==="nobility")return 1;                       /* the lords are not elected */
  const w=franchiseDef(S).w;
  return (w[k]!=null)?w[k]:1;
}
function compMood(S,comp){
  const ks=composition[comp]||["aristocracy"];
  let s=0,tot=0;
  ks.forEach(k=>{ if(!S.facs[k]||!S.facs[k].present)return;
    const w=franchiseWeight(S,k,comp); s+=S.facs[k].mood*w; tot+=w; });
  if(!tot)return 50;
  return s/tot;
}

/* ---------- power & consent ---------- */
function rightsHeld(S){ const r=new Set(); S.gov.institutions.forEach(i=>i.rights.forEach(x=>r.add(x))); return r; }
function institutionWithRight(S,right){ return S.gov.institutions.find(i=>i.rights.includes(right)); }
/* =====================================================================
   SEATS, AND THE COUNTING OF VOTES
   Consent used to be a hidden roll: you asked, and afterwards you were
   told. That is not parliamentary government — parliamentary government
   is arithmetic you can see and work on. So a chamber has seats, the
   seats belong to interests, and before you propose anything you can see
   whether you have the numbers and, if not, exactly who is short and
   what they want.
   ===================================================================== */
function chamberSeats(inst){
  if(!inst)return 0;
  if(inst.composition==="nobility")return 90;
  if(inst.composition==="commons"||inst.composition==="broad")return 150;
  return 120;
}
/* how the house is divided. Influence and the franchise decide it; mood
   does not — an interest does not lose its seats for being cross. */
function seatsOf(S,inst){
  if(!inst)return [];
  const ks=(composition[inst.composition]||[]).filter(k=>S.facs[k]&&S.facs[k].present);
  if(!ks.length)return [];
  const total=chamberSeats(inst);
  const raw=ks.map(k=>({k,name:S.facs[k].name,
    w:Math.max(0.05,S.facs[k].strength*franchiseWeight(S,k,inst.composition))}));
  const sum=raw.reduce((a,r)=>a+r.w,0)||1;
  let given=0;
  const out=raw.map((r,i)=>{
    const n=(i===raw.length-1)?(total-given):Math.round(total*r.w/sum);
    given+=n; return {k:r.k,name:r.name,seats:Math.max(0,n)};
  });
  return out.sort((a,b)=>b.seats-a.seats);
}
function majorityOf(inst){ return Math.floor(chamberSeats(inst)/2)+1; }
/* Where each interest stands on a given measure. Mood decides how they
   vote; seats decide how much it matters. */
function whipCount(S,inst,measure){
  const rows=seatsOf(S,inst).map(r=>{
    const f=S.facs[r.k];
    let lean=f.mood-50;
    if(measure&&measure.likes&&measure.likes[r.k]!=null)lean+=measure.likes[r.k];
    const stance=lean>=8?"for":lean<=-8?"against":"doubtful";
    return Object.assign({},r,{lean:Math.round(lean),stance,mood:Math.round(f.mood)});
  });
  const For=rows.filter(r=>r.stance==="for").reduce((a,r)=>a+r.seats,0);
  const against=rows.filter(r=>r.stance==="against").reduce((a,r)=>a+r.seats,0);
  const doubtful=rows.filter(r=>r.stance==="doubtful").reduce((a,r)=>a+r.seats,0);
  const need=majorityOf(inst);
  /* the doubtful split roughly with their mood, but you cannot rely on it */
  const likely=For+Math.round(doubtful*0.5);
  return {rows,for:For,against,doubtful,need,likely,
    short:Math.max(0,need-likely),
    carries:likely>=need,
    total:chamberSeats(inst)};
}
/* who could be brought over, and what it would take */
function gettable(S,inst,measure){
  const w=whipCount(S,inst,measure);
  return w.rows.filter(r=>r.stance!=="for"&&r.seats>0)
    .sort((a,b)=>b.seats-a.seats)
    .slice(0,3)
    .map(r=>({k:r.k,name:r.name,seats:r.seats,
      price:r.stance==="doubtful"?"a word and a favour":"an office, a bill of theirs, or a concession"}));
}
function consentCheck(S,right){
  const inst=institutionWithRight(S,right); if(!inst) return {required:false,approve:true};
  const w=whipCount(S,inst,null);
  return {required:true,inst,approve:w.carries,mood:compMood(S,inst.composition),
    threshold:w.need,whip:w};
}
function transferPower(S,inst,amount){ const a=Math.min(amount,S.gov.crown.power); S.gov.crown.power-=a; inst.power+=a; }
function powerToCrown(S,inst,amount){ const a=Math.min(amount,inst.power); inst.power-=a; S.gov.crown.power+=a; }
function crownBand(S){
  const p=S.gov.crown.power;
  const w=crownWord(S), W=w.charAt(0).toUpperCase()+w.slice(1);
  if(!isMonarchy(S)){
    if(p>=60)return{label:"dominant",desc:`${w} sets policy at will`};
    if(p>=40)return{label:"strong",desc:"assent is still required, and a veto is within reach"};
    if(p>=21)return{label:"constrained",desc:"ceremony, influence, and little else"};
    return{label:"a figurehead",desc:`${W} presides; it does not rule`};
  }
  /* The three constitutional bands. They are not difficulty settings —
     they are the nineteenth century, in order. */
  if(p>=70)return{label:"personal rule",desc:"the ministry is the crown's servant, and knows it"};
  if(p>=50)return{label:"a mixed constitution",desc:"the chamber names a ministry; the crown may still say no"};
  if(p>=21)return{label:"reigning, not ruling",desc:"prerogative without government"};
  return{label:"ceremonial",desc:`${W} presides; it does not rule — and is the steadier for it`};
}

/* =====================================================================
   THE PREROGATIVE LADDER
   A crown does not lose its rights all at once. It loses them one at a
   time, at thresholds — and, which matters more, it loses them for good
   by using them and losing. William IV dismissed Melbourne in 1834,
   called the country, and was answered. No British monarch dismissed a
   ministry again. The right was never abolished anywhere. It was spent.
   ===================================================================== */
const PREROGATIVES=[
  {id:"dissolve", floor:50, name:"Dissolve the chamber",   gloss:"send them home and call the country"},
  {id:"ministry", floor:50, name:"Refuse a ministry",      gloss:"the chamber proposes; the crown may decline"},
  {id:"council",  floor:50, name:"Appoint the council",    gloss:"the offices of state are the crown's own gift"},
  {id:"assent",   floor:40, name:"Withhold assent",        gloss:"a bill passed is not yet a law"},
  {id:"emergency",floor:30, name:"Command of the army",    gloss:"the garrison answers the palace, not the ministry"},
  {id:"peers",    floor:25, name:"Create peers",           gloss:"the upper house can always be made larger"},
  {id:"pardon",   floor:15, name:"Pardon",                 gloss:"one life, at the crown's word"},
  {id:"ceremony", floor:0,  name:"Honours and the opening", gloss:"never lost, and not nothing"}
];
function prerogSpent(S,id){ return !!(S._prerogSpent&&S._prerogSpent[id]); }
function spendPrerog(S,id){ S._prerogSpent=S._prerogSpent||{}; S._prerogSpent[id]=true; }
function hasPrerog(S,id){
  if(!isMonarchy(S))return false;
  if(prerogSpent(S,id))return false;
  const p=PREROGATIVES.find(x=>x.id===id); if(!p)return false;
  return (S.gov.crown.power|0)>=p.floor;
}
function prerogState(S,id){
  const p=PREROGATIVES.find(x=>x.id===id); if(!p)return "gone";
  if(prerogSpent(S,id))return "spent";
  return (S.gov.crown.power|0)>=p.floor?"held":"lapsed";
}

/* =====================================================================
   WHERE THE PLAYER SITS
   From 70 down to 50 they hold the palace AND the ministry, which is not
   a compromise but a description: a mixed constitution is two
   governments in one country, arguing. Below 50 the desk moves, the
   crown becomes an NPC, and its leftover prerogatives point at you.
   ===================================================================== */
/* When a disputed crown stops being settled by armies. Not a date: a
   condition. A standing army answerable to the state, or a charter that
   writes the succession down, and the private war goes out of fashion. */
function warClosed(S){
  if(eraIdx(S)>=5)return true;
  return !!S.gov.charter&&eraIdx(S)>=3;
}
function pmGoverns(S){ return isMonarchy(S)&&!!S.pm&&(S.gov.crown.power|0)<50; }
function crownAppointsPm(S){ return isMonarchy(S)&&(S.gov.crown.power|0)>=70; }
function pmContested(S){ const p=S.gov.crown.power|0; return isMonarchy(S)&&p>=50&&p<70; }
function seatNow(S){ return pmGoverns(S)?"ministry":"crown"; }

/* =====================================================================
   SUMMONS OR CYCLE
   With one chamber and a crown in personal rule there is no electoral
   cycle. The chamber sits when it is summoned, and it is summoned when
   the crown needs money. That is not a simplification of the period; it
   is the reason parliaments met at all.
   ===================================================================== */
/* A chamber summoned rather than elected is not permanently in session.
   You cannot dissolve what is not sitting, and there is no early poll to
   call when there was never a scheduled one. */
function chamberSitting(S){
  if(!S.gov.institutions.length)return false;
  if(electionMode(S)==="summons")return !!S._sitting;
  return true;
}
function electionMode(S){
  if(!isMonarchy(S))return "cycle";
  if(!S.pm)return "none";
  if(S.gov.institutions.length<2&&(S.gov.crown.power|0)>=70)return "summons";
  return "cycle";
}
function electionEvery(S){ const n=(S&&S.electionEvery!=null)?S.electionEvery:2; return Math.max(1,Math.min(3,n|0)); }
function electionYears(S){ return electionEvery(S)*5; }
const BLOC_MODS={
  aristocracy:{privileges:0.5,trade:1.3},
  clergy:{patronize:0.5},
  merchants:{trade:0.6,privileges:1.5},
  peasantry:{festival:0.7,privileges:0},
  provinces:{tour:0.6},
  officers:{fund_army:0.7},
};
const BLOC_DESCS={
  aristocracy:"privileges come cheap; trade projects cost more",
  clergy:"church patronage comes at half its price",
  merchants:"trade and works come cheap; noble privileges cost dear",
  peasantry:"festivals and relief come cheap; noble privileges are off the table",
  provinces:"royal tours come cheap",
  officers:"the army is funded gladly",
};
function costMod(S,id){
  let m=1;
  if(S.rep&&S.rep.friction)m*=S.rep.friction;   /* governing without consent is expensive */
  if(S._costMod)m*=S._costMod;
  if(S.monarch&&S.monarch.trait==="shrewd")m*=0.9;
  if(S.gov.cabinet)m*=0.9;
  if(id==="privileges"&&S.gov.institutions.some(i=>i.composition!=="nobility"))m*=1.4; // a lower chamber watches
  if(S.regency)m*=(S.regency.hostile?1.7:1.5);
  if(S.pm&&S.pm.bloc&&BLOC_MODS[S.pm.bloc]&&BLOC_MODS[S.pm.bloc][id]!=null){
    const b=BLOC_MODS[S.pm.bloc][id]; if(b===0)return 0; m*=b;
  }
  return m;
}
function adjCost(S,a){
  const c=Object.assign({},a.cost||{});
  let m=costMod(S,a.id);
  if(typeof officeCostMod==="function")m*=officeCostMod(S,a.id);
  if(c.gold&&c.gold<0)c.gold=Math.round(c.gold*m);
  return c;
}
/* A chamber that can actually sustain or bring down a government: a
   commons, or an assembly grown to hold real governing weight. An Estates
   General holding twelve points and consenting to taxes is not one — it is
   a body you summon when you need money and send home again. Treating it
   as one generated a First Minister, a governing coalition, a programme of
   legislation and early elections in a period where none existed. */
function governingChamber(S){
  return (S.gov.institutions||[]).find(i=>
    i.composition==="commons"||i.composition==="broad"||i.composition==="national"
    ||i.power>=30) || null;
}
function maybeTransform(S){
  if(!isMonarchy(S))return false;   /* only a crown can be reduced to a ministry */
  /* A chamber needs someone who can manage it. The ministry is born with
     the first assembly, not with the crown's defeat — it simply starts as
     a servant and ends as the government. */
  if(!S.pm&&!S._pmPending&&governingChamber(S)) S._pmPending=true;
  if(S.pm){
    S._seat=S._seat||"crown";
    const want=seatNow(S);
    if(want!==S._seat) S._seatShift=want;   /* narrated once, then applied */
  }
}
function runElection(){
  const set=new Set(); S.gov.institutions.forEach(i=>(composition[i.composition]||[]).forEach(k=>set.add(k)));
  if(!set.size)set.add("aristocracy");
  const live=[...set].filter(k=>S.facs[k]&&S.facs[k].present);
  const use=live.length?live:[...set];
  /* the weight of each interest at the polls is the weight the franchise
     gives it — which is the whole point of widening one */
  const comps=new Set(); S.gov.institutions.forEach(i=>comps.add(i.composition));
  const wOf=k=>{ let best=0; comps.forEach(c=>{ if((composition[c]||[]).indexOf(k)>=0)best=Math.max(best,franchiseWeight(S,k,c)); }); return best||1; };
  const standings=use.map(k=>{
    const fw=wOf(k);
    const base=(S.facs[k].mood*0.6+S.facs[k].strength*0.4)*(0.35+0.65*fw);
    const swing=rand(18);
    return {k,name:S.facs[k].name,mood:S.facs[k].mood,strength:S.facs[k].strength,
            base:Math.round(base),swing,score:Math.round(base+swing)};
  });
  standings.sort((a,b)=>b.score-a.score);
  const byBase=standings.slice().sort((a,b)=>b.base-a.base);
  return {standings,winner:standings[0].k,expected:byBase[0].k,upset:byBase[0].k!==standings[0].k};
}
function regimeLabel(S){
  if(regimeIs(S,"junta"))return "Provisional Military Government";
  if(regimeIs(S,"republic"))return (S.rep&&S.rep.entrench>1)?"Republic (in name)":"Republic";
  if(regimeIs(S,"people"))return "People's Republic";
  const cp=S.gov.institutions.reduce((a,i)=>a+i.power,0);
  if(S.gov.crown.selection!=="hereditary") return "Republic";
  if(S.gov.charter) return cp>=45?"Parliamentary Monarchy":"Constitutional Monarchy";
  if(cp<12) return "Absolute Monarchy";
  if(cp<40) return "Constitutional Monarchy";
  return "Parliamentary Monarchy";
}
/* =====================================================================
   LEGITIMACY
   One formula for four governments was the deepest flaw in this game. It
   asked every regime how its clergy were feeling and whether the crown
   had a clear heir — so a people's republic, having abolished both, could
   not exceed about 39 however well it governed, and legitimacy below 45
   is the single largest driver of every pressure. That is the whole
   instability loop, written down.

   A government is legitimate on the terms it claims for itself. A crown
   claims descent and divine sanction. A republic claims consent freely
   given and honoured. A people's republic claims delivery. A junta claims
   nothing at all, which is why it cannot get above a certain line and
   never could.
   ===================================================================== */
function legitMonarchy(S){
  const succ=(S.law==="elective")?58:(heirOf(S)?76:34);
  let v=0.28*S.facs.clergy.mood+0.22*S.facs.aristocracy.mood+0.32*succ
       +(S.gov.charter?7:0)+(S.facs.peasantry.mood-50)*0.12;
  /* a crown that reigns without ruling is not a weak crown; it is the most
     durable arrangement anyone has yet found, and the formula should say so */
  const p=S.gov.crown.power|0;
  if(S.gov.institutions.length&&p<50) v+=Math.min(16,(50-p)*0.32);
  if(S.regency) v-=10;
  return v;
}
function legitRepublic(S){
  const r=S.rep||{};
  const since=Math.max(0,(S.turn||0)-(S._lastElection||0));
  const fresh=Math.max(0,26-since*7);                 /* a recent, honoured election */
  const clean=Math.max(0,22-(r.entrench||0)*11);      /* and one that meant something */
  const courts=(S.gov.charter?12:0)+(rightsHeld(S).has("law")?8:0);
  const consent=(S.gov.institutions.reduce((a,i)=>a+i.power,0))*0.25;
  const breadth=franchiseIdx(S)*5;
  const country=(compMood(S,"commons")-50)*0.22;
  return 16+fresh+clean+courts+consent+breadth+country;
}
function legitPeople(S){
  const pl=S.plan||{};
  const consumer=(pl.consumer!=null)?pl.consumer:33;
  const deliver=Math.max(0,32-Math.abs(48-consumer)*0.85);   /* shops with goods in them */
  const unity=Math.max(0,18-(S._purges||0)*6);
  const party=((S.facs.workers&&S.facs.workers.present)?S.facs.workers.mood:S.facs.peasantry.mood);
  const written=(S.gov.charter?10:0)+(S.gov.institutions.length?8:0);
  return 12+deliver+unity+party*0.28+written;
}
function legitJunta(S){
  /* A provisional government cannot be legitimate. It can only be tolerated,
     and only for so long. The one road upward is to stop being provisional. */
  const j=S.junta||{};
  let v=18+(j.promised?14:0)+(S.stability-45)*0.22+(S.facs.officers.mood-50)*0.18;
  v-=Math.min(18,(j.years||0)*1.5);
  return Math.min(JUNTA_CEILING,v);
}
const JUNTA_CEILING=50;
function legitimacyRaw(S){
  if(regimeIs(S,"republic"))return legitRepublic(S);
  if(regimeIs(S,"people"))return legitPeople(S);
  if(regimeIs(S,"junta"))return legitJunta(S);
  return legitMonarchy(S);
}
function legitimacy(S){
  let v=legitimacyRaw(S)-(S.legitPen||0);
  if(regimeIs(S,"junta"))v=Math.min(JUNTA_CEILING,v);
  return clamp(v);
}
/* what the reading is actually made of — so the player can act on it */
function legitSources(S){
  const out=[];
  if(regimeIs(S,"republic")){
    const since=Math.max(0,(S.turn||0)-(S._lastElection||0));
    out.push(since<=2?"a recent election":"an election long past");
    if((S.rep&&S.rep.entrench)||0)out.push("a ballot nobody quite believes");
    if(S.gov.charter)out.push("a written constitution");
    if(franchiseIdx(S)>=2)out.push("a broad franchise");
  } else if(regimeIs(S,"people")){
    const c=(S.plan&&S.plan.consumer!=null)?S.plan.consumer:33;
    out.push(Math.abs(48-c)<12?"shops with goods in them":"queues, and explanations");
    if((S._purges||0)>0)out.push("a Party that eats its own");
    if(S.gov.charter)out.push("a constitution of sorts");
  } else if(regimeIs(S,"junta")){
    out.push(S.junta&&S.junta.promised?"a promise of elections":"no answer to the question");
    out.push("a ceiling no provisional government clears");
  } else {
    if(heirOf(S))out.push("a clear succession"); else out.push("no settled heir");
    if(S.facs.clergy.mood>=60)out.push("divine favour");
    if(S.gov.charter)out.push("a charter kept");
    if(S.gov.institutions.length&&(S.gov.crown.power|0)<50)out.push("a crown that reigns without ruling");
  }
  return out.join(" · ");
}

/* =====================================================================
   THE TEARDOWN
   Every regime change used to clean up after whichever predecessor its
   author happened to be thinking about. So a republic could be governed
   by a president under a royal regency, and the Party Congress could sit
   on for a century after the party that convened it was gone. One door,
   and every install walks through it first.
   ===================================================================== */
function clearRegimeState(S,to){
  /* the crown's private machinery — a president has no regent, no heir
     designate and no rival claimant */
  S.regency=null; S._minority=false; S.designated=null; S.rival=null;
  S._regentPick=null; S._rolePick=null;
  if(to!=="monarchy"){ S.pm=null; S._pmPending=false; }
  /* a bill does not survive the chamber that passed it */
  S._bill=null; S._lastBill=-99; S._sitting=false;

  /* the outgoing regime's own organs */
  if(to!=="republic"){ S.rep=null; S.pols=null; S.civilPick=null; }
  if(to!=="junta"){ S.junta=null; }
  if(to!=="people"){ S.plan=null; S.politburo=null; S._terror=false; S._terrorYears=0; }

  /* dissolve the party — reclaiming its power BEFORE it goes, or the
     hundred points quietly leak away with it */
  if(to!=="people"){
    S.gov.institutions.filter(i=>i.id==="party").forEach(inst=>{ powerToCrown(S,inst,inst.power); });
    S.gov.institutions=S.gov.institutions.filter(i=>i.id!=="party");
  }

  /* You cannot go on amending the constitution of a republic that no longer
     exists. Any screen belonging to the outgoing regime is abandoned; the
     caller sets the real phase a moment later. */
  const OWNED={republic:["convention","civilpick","repvote","election"],
               junta:["juntaexit"],
               people:["congress","terror"],
               monarchy:["dynastic","dyncourt","rolepick","designate","regentpick","match","succession","housefate"]};
  for(const r in OWNED){ if(r!==to&&OWNED[r].includes(S.phase))S.phase="court"; }

  /* estates abolished by a people's republic come back when it ends —
     poorer and angrier, but back */
  if(to!=="people"&&S.formerPeople){
    ["aristocracy","clergy"].forEach(k=>{ if(S.facs[k]&&!S.facs[k].present){
      S.facs[k].present=true; S.facs[k].strength=clamp(S.facs[k].strength+20);
      S.facs[k].mood=clamp(S.facs[k].mood-10); }});
    S.formerPeople=false;
  }
}

/* =====================================================================
   THE VOICE OF THE STATE
   Forty-one events were written for a monarchy and every one of them
   says "the Crown", which is how a people's republic in 1917 came to
   hunt down the presses in the name of a throne it had abolished.
   ===================================================================== */
/* the name on the executive's row of the power pool */
function execWord(S){
  const r=(S&&S.regime)||"monarchy";
  if(r==="junta")    return "The Junta";
  if(r==="republic") return "The Presidency";
  if(r==="people")   return "The Chairman";
  return "The Crown";
}
/* what stands where the reigning house stands under a crown */
function execHouse(S){
  const r=(S&&S.regime)||"monarchy";
  if(r==="junta")    return "The Officers";
  if(r==="republic") return S.rep&&S.facs[S.rep.bloc]?`${S.facs[S.rep.bloc].name} interest`:"The Republic";
  if(r==="people")   return "The Party";
  return `House of ${S.house}`;
}
function crownWord(S){
  const r=(S&&S.regime)||"monarchy";
  if(r==="junta")    return "the provisional government";
  if(r==="republic") return "the government";
  if(r==="people")   return "the Party";
  return "the Crown";
}

/* =====================================================================
   THE FOURTH PHASE
   A turn is five years: Event, Court, Advancement, and then whichever
   settlement the regime demands. It used to say "Dynasty" in all four,
   so a people's republic in 1917 went to the court phase and then to
   dynastic matters, where it was invited to seek a consort.
   ===================================================================== */
function lastPhaseName(S){
  const r=(S&&S.regime)||"monarchy";
  if(r==="junta")    return "Settlement";
  if(r==="republic") return "Convention";
  if(r==="people")   return "Congress";
  return "Dynasty";
}
function lastPhaseLabel(S){
  const r=(S&&S.regime)||"monarchy";
  if(r==="junta")    return "the question of the settlement";
  if(r==="republic") return "the business of the republic";
  if(r==="people")   return "the party congress";
  return "dynastic matters";
}
