"use strict";
/* =====================================================================
   STANDING ACTIONS (Court phase)
   ===================================================================== */
const ACTIONS=[
  { id:"patronize",label:"Patronize the Church",cool:2,
    hint:"gold to the altars buys the pulpit's blessing — each gift moving the clergy less than the last",
    cost:{gold:-30},fac:{clergy:+8,peasantry:+2},requires:S=>true,diminish:"clergy",
    chron:S=>`the Crown lavished gold upon the Church, and the pulpits of ${S.nation} preached its right to rule.`,
    out:["New chapels rise; old debts to the abbeys are forgiven. From every pulpit your name is blessed."]},
  { id:"fund_army",label:"Fund and drill the army",
    hint:"stronger arms — and a permanently heavier upkeep",
    cost:{gold:-36,arms:+12},fac:{officers:+7,peasantry:-3},requires:S=>true,
    chron:S=>`the Crown swelled and drilled its regiments; ${S.nation} grew formidable, and costly.`,
    out:["Recruiting sergeants work the squares. The army sharpens — and so does the standing bill."]},
  { id:"festival",label:"Hold a festival of the Crown",cool:2,
    hint:"a costly spectacle that quiets the realm for a season",
    cost:{gold:-26,stability:+9},fac:{peasantry:+5,aristocracy:+2},requires:S=>true,
    chron:S=>`${S.nation} was given over to festival; for one gilded season the realm agreed to be content.`,
    out:["Bread, wine and fireworks. The grievances go quiet beneath the noise — for a while."]},
  { id:"festival_realm",label:"Hold a festival of the realm",cool:2,
    hint:"fairs and feasts in every market town — the realm's own celebration, not the palace's",
    cost:{gold:-22,stability:+5},fac:{peasantry:+6,provinces:+5},requires:S=>true,
    chron:S=>`${S.nation} kept festival in every market town and parish; for a season the realm celebrated itself.`,
    out:["Fairs, wakes and harvest feasts from the capital to the border parishes. The palace pays; the country parties; the country remembers."]},
  { id:"privileges",label:"Grant the great houses new privileges",
    hint:"buys noble loyalty — and adds a permanent charge to your upkeep",
    cost:{gold:-14,stability:-4},fac:{aristocracy:+11,peasantry:-4,merchants:-3},requires:S=>true,
    effect:S=>{S.privileges++;},
    chron:S=>`the Crown showered the great houses with privileges; their loyalty was secured, and its burden settled downward.`,
    out:["Charters and exemptions. The dukes beam. The cost will be paid every year hereafter."]},
  { id:"trade",label:"Sponsor trade, guilds and roads",
    hint:"slow investment: raises the realm's wealth, lifting all future revenue",
    cost:{gold:-28},fac:{merchants:+8,provinces:+3},requires:S=>true,
    effect:S=>{S.development=clamp(S.development+6);},
    chron:S=>`the Crown poured coin into roads, guilds and harbours; the wealth of ${S.nation} deepened.`,
    out:["New roads, chartered fairs, dredged harbours. Richer realms are richer to tax."]},
  { id:"suppress",label:"Suppress dissent with the garrison",
    hint:"order by force. Forbidden once a charter binds the Crown",
    cost:{gold:-12,stability:+12},fac:{peasantry:-8,provinces:-6,officers:+2},
    requires:S=>!S.gov.charter,
    chron:S=>`the Crown answered discontent with the garrison; order returned, and a grievance was pressed into memory.`,
    out:["Soldiers in the squares, a curfew at dusk. The unrest subsides into a silence that is not loyalty."]},
  { id:"tax_decree",label:"Levy an emergency tax by decree",
    hint:"raw absolutism: gold now, resentment forever. Impossible once a chamber holds the purse",
    cost:{gold:+38,stability:-9},fac:{peasantry:-8,aristocracy:-4,merchants:-4},
    requires:S=>!rightsHeld(S).has("tax"),
    chron:S=>`the Crown levied an emergency tax by decree; the coffers filled, and so did the ledger of grievances.`,
    out:["The collectors ride out with a warrant and no one's consent. Gold flows in. So does resentment."]},
  { id:"tax_request",label:"Request an extraordinary grant from the chamber",
    hint:"lawful emergency revenue — if the chamber consents",
    cost:{},consent:"tax",requires:S=>rightsHeld(S).has("tax"),
    resolve:S=>{ const c=consentCheck(S,"tax");
      if(c.approve) return {cost:{gold:+34,stability:+2},chron:S=>`the ${c.inst.name} granted the Crown an extraordinary subsidy; revenue by consent proved sturdier than any by fear.`,
        out:"They debate, grumble, and vote it through. Money granted willingly stays granted."};
      return {cost:{gold:+6,stability:-3},fac:{aristocracy:-2},chron:S=>`the ${c.inst.name} refused the Crown's request, and only a thin, grudging sum was raised.`,
        out:"The chamber is in no mood to be generous. A fraction of the ask — and a lecture besides."};
    }},
  { id:"tour",label:"Tour the provinces in state",cool:3,
    hint:"the sovereign's presence soothes the far country",
    cost:{gold:-16,stability:+3},fac:{provinces:+8,peasantry:+3},requires:S=>true,
    chron:S=>`the Crown made a great progress through the provinces, and the far country remembered it had a sovereign.`,
    out:["Banners, feasts, petitions heard in person. The provinces, so often forgotten, feel seen."]},
  { id:"appoint",label:"Appoint capable ministers",cool:3,
    hint:"good administration steadies the realm and its books",
    cost:{gold:-10,stability:+5},fac:{merchants:+3},requires:S=>S.gov.cabinet,
    effect:S=>{S.development=clamp(S.development+3);},
    chron:S=>`the Crown filled its cabinet with able men, and the machinery of ${S.nation} turned more smoothly.`,
    out:["Ministers chosen for merit over blood. The paperwork of the realm stops rotting on desks."]},
  { id:"address_commons",label:"Address the lower chamber in person",cool:3,
    hint:"the crown — or the minister — speaks to the people's benches directly",
    gain:"+4 Stability, the common estates warm",
    cost:{gold:-6,stability:+4},fac:{peasantry:+4,merchants:+3},
    requires:S=>S.gov.institutions.some(i=>i.composition!=="nobility"),
    chron:S=>`the ${S.pm?S.pm.office:"Crown"} addressed the lower chamber in person, and the benches roared.`,
    out:["A speech from the bar of the house — plainly written, plainly meant. The wards repeat it for a season."]},
  { id:"dissolve",label:"Dissolve the chamber",cool:3,
    hint:"send them home and put the realm to the polls before its time",
    gain:"a fresh election — and a chamber reminded who summoned it",
    cost:{gold:-10,stability:-6},requires:S=>S.gov.institutions.length>0&&S.gov.crown.power>=30,
    resolve:S=>{ const fx={}; (composition[S.gov.institutions[0].composition]||[]).forEach(k=>{fx[k]=-6;});
      S._dissolutions=(S._dissolutions||0)+1;
      if(S._dissolutions>=3){ return {cost:{gold:-10,stability:-16},fac:fx,
        effect:S2=>{transferPower(S2,S2.gov.institutions[0],14);S2.legitPen=(S2.legitPen||0)+8;S2.nextElection=S2.turn;},
        chron:S2=>`the Crown dissolved the chamber for the third time in living memory, and the realm decided it had seen enough of that.`,
        out:"You send them home again. This time the country does not go quietly — and when the new chamber sits, it sits with powers the Crown did not intend to give it. There is a limit, and you have found it."};}
      return {cost:{gold:-10,stability:-6},fac:fx,effect:S2=>{S2.nextElection=S2.turn;},
        chron:S2=>`the Crown dissolved the chamber and called the realm to an early poll.`,
        out:"The doors are locked, the mace carried out, the writs issued. The benches go home furious — and the country will now say what it thinks of you, whether you asked or not."};}},
  { id:"refuse_ministry",label:"Refuse the chamber's ministry",cool:4,
    hint:"the winning benches propose; the Crown declines, and appoints its own",
    gain:"a ministry of your choosing — governing without a majority",
    cost:{stability:-8},requires:S=>!!S.pm&&S.gov.crown.power>=38,
    resolve:S=>{ const blocs=Object.keys(S.facs).filter(k=>S.facs[k].present&&k!==S.pm.bloc);
      const nb=blocs.sort((a,b)=>S.facs[b].mood-S.facs[a].mood)[0]||S.pm.bloc;
      return {cost:{stability:-8},fac:{aristocracy:+4},
        effect:S2=>{S2.pm.bloc=nb;S2.pm.holder=pmName();S2.pm.age=46+rand(14);S2.legitPen=(S2.legitPen||0)+9;S2._minority=true;},
        chron:S2=>`the Crown refused the chamber's choice of minister and appointed one of its own, to the fury of the benches.`,
        out:`The Crown will not have them. The ${S.facs[nb].name} take the seals instead, governing on sufferance and without a majority — which historically lasts about as long as the Crown's nerve does.`};}},
  { id:"abdicate",label:"Lay down the crown",cool:99,
    hint:"the sovereign steps aside in favour of the heir, while the stepping is still a choice",
    gain:"a fresh reign, and a realm that exhales",
    cost:{stability:+6},requires:S=>!S.regency&&!!heirOf(S)&&S.monarch.age>=40,
    resolve:S=>({cost:{stability:+6},fac:{aristocracy:-3,peasantry:+4},
      effect:S2=>{S2._abdicate=true;},
      chron:S2=>`${styled(S2,S2.monarch)} laid down the crown in favour of the heir, and the realm changed hands without a funeral.`,
      out:"The instrument is signed in front of witnesses and the thing is done. There is no cortege, no interregnum, no scramble — just a younger head under the same crown, and a court that had not expected to be surprised."})},
  { id:"martial_law",label:"Extend martial law",cool:2,dom:"crown",
    hint:"curfews, tribunals and the suspension of what remains of the ordinary courts",
    gain:"+8 Stability now, and a colder country",
    cost:{gold:-12,stability:+8},fac:{officers:+5,merchants:-7,peasantry:-8},
    requires:S=>regimeIs(S,"junta"),
    chron:S=>`martial law was extended across ${S.nation} for a further term.`,
    out:["Order, of a kind that can be measured. The streets are safe and empty and nobody writes anything down."]},
  { id:"purge_officers",label:"Purge the officer corps",cool:3,dom:"crown",
    hint:"the men who made you can unmake you — retire them, or worse",
    gain:"the barracks quieten sharply",
    cost:{gold:-16,stability:-5},fac:{officers:-10},
    requires:S=>regimeIs(S,"junta"),
    effect:S=>{S.pressure=S.pressure||{};S.pressure.military=Math.max(0,(S.pressure.military||0)-22);
      S.military=clamp(S.military-8);S._costMod=(S._costMod||1)*1.05;S.junta.purges=(S.junta.purges||0)+1;},
    chron:S=>`the government purged its own officer corps.`,
    out:["Lists are drawn up by men who were on other lists last year. The army is safer and markedly worse — and every order you give from now on costs a little more to get carried out."]},
  { id:"plebiscite",label:"Hold a plebiscite",cool:4,dom:"crown",
    hint:"one question, phrased by you, answered by everyone",
    gain:"Legitimacy improves — on paper",
    cost:{gold:-20},fac:{peasantry:+4,merchants:-3},
    requires:S=>regimeIs(S,"junta"),
    effect:S=>{S.legitPen=Math.max(0,(S.legitPen||0)-9);S.junta.years=Math.max(0,S.junta.years-4);},
    chron:S=>`a plebiscite returned an overwhelming endorsement of the provisional government.`,
    out:["Ninety-four per cent, on a turnout of ninety-one. Nobody believes it and everybody cites it, which is most of what legitimacy is."]},
  { id:"promise_elections",label:"Promise elections",cool:6,dom:"crown",
    hint:"a date, announced publicly — which buys quiet now and a reckoning later",
    gain:"+10 Stability, and the question stops being asked for a while",
    cost:{stability:+10},fac:{merchants:+8,peasantry:+7,officers:-6},
    requires:S=>regimeIs(S,"junta")&&!S.junta.promised,
    effect:S=>{S.junta.promised=true;},
    chron:S=>`the provisional government announced a date for elections.`,
    out:["A date in three years' time, printed in every gazette. The country exhales. Three years is a long time, and dates can be moved — but a promise in print is a debt, and this one has witnesses."]},
  { id:"seizures",label:"Seize the property of the disloyal",cool:3,dom:"fiscal",
    hint:"estates, warehouses and bank accounts belonging to the wrong people",
    gain:"+34 gold, immediately",
    cost:{gold:+34,stability:-7},fac:{aristocracy:-14,merchants:-12,peasantry:+4},
    requires:S=>regimeIs(S,"junta"),
    chron:S=>`the provisional government financed itself by seizure.`,
    out:["The lists are long and the criteria are flexible. It solves this year's problem entirely and makes an enemy of everyone who owns anything."]},
  { id:"postpone_vote",label:"Postpone the election",cool:2,dom:"crown",
    hint:"for the duration of the emergency — and the emergency is whatever you say it is",
    gain:"the programme continues; you keep your face and your mandate",
    cost:{stability:-10},requires:S=>regimeIs(S,"republic"),
    effect:S=>{S.rep.entrench=(S.rep.entrench||0)+1;S.rep.nextVote=S.turn+S.rep.termTurns;
      S.rep.friction=(S.rep.friction||1)*1.12;S.legitPen=(S.legitPen||0)+14;
      bumpPressure(S,"radical",8);
      bumpPressure(S,"military",6);},
    fac:{merchants:-9,reformers:-12,peasantry:-7},
    chron:S=>`the government postponed the election, citing the emergency.`,
    out:["The proclamation is careful, legal and entirely unconvincing. You keep the office. From tomorrow every order you give will need a little more persuasion behind it, and it will cost you."]},
  { id:"narrow_franchise",label:"Narrow who may vote",cool:3,dom:"crown",
    hint:"a property qualification, a literacy test, a register that loses certain names",
    gain:"the next election is far easier to win",
    cost:{stability:-8},requires:S=>regimeIs(S,"republic"),
    effect:S=>{S.rep.entrench=(S.rep.entrench||0)+1;S.rep.friction=(S.rep.friction||1)*1.09;
      S.legitPen=(S.legitPen||0)+10;
      S.facs.peasantry.strength=clamp(S.facs.peasantry.strength-10);
      if(S.facs.workers)S.facs.workers.strength=clamp(S.facs.workers.strength-8);
      bumpPressure(S,"radical",12);},
    fac:{aristocracy:+7,merchants:+4,peasantry:-14,workers:-12},
    chron:S=>`the franchise was narrowed, and a great many people discovered they were no longer part of the country.`,
    out:["Done by statute, in daylight, with reasons given. The electorate is now a shape you like. Everyone outside it has noticed, and they have not gone anywhere."]},
  { id:"prosecute_opposition",label:"Prosecute the leader of the opposition",cool:4,dom:"crown",
    hint:"there is always something, and if there isn't, there is always someone willing to say there was",
    gain:"the opposition loses its head and its nerve",
    cost:{gold:-14,stability:-9},requires:S=>regimeIs(S,"republic"),
    effect:S=>{S.rep.entrench=(S.rep.entrench||0)+1;S.rep.friction=(S.rep.friction||1)*1.14;
      S.legitPen=(S.legitPen||0)+16;
      bumpPressure(S,"radical",10);
      bumpPressure(S,"military",8);},
    fac:{reformers:-16,merchants:-10,officers:+4},
    chron:S=>`the leader of the opposition was tried and convicted.`,
    out:["The charges are real enough to print and thin enough that everyone understands. He goes to prison and becomes considerably more popular there than he ever was in the chamber."]},
  { id:"legislate",label:"Pass a program of legislation",
    hint:"the ministry's agenda, put to the chamber — statecraft by majority",
    gain:"if the benches hold: +6 Stability, the realm develops, your bloc rallies",
    cost:{gold:-18},requires:S=>!!S.pm,
    resolve:S=>{ const gv=S.facs[S.pm.bloc];
      if(gv.mood>=45){ const fx={}; fx[S.pm.bloc]=+4;
        return {cost:{gold:-18,stability:+6},fac:fx,effect:S2=>{S2.development=clamp(S2.development+3);},
        chron:S2=>`the ${S2.pm.office}'s program passed the chamber, and the realm was governed by statute rather than whim.`,
        out:"Readings, divisions, assent. The program passes — the machinery of law doing what decree once did."}; }
      const fx={}; fx[S.pm.bloc]=-2;
      return {cost:{gold:-8,stability:-3},fac:fx,
        chron:S2=>`the ${S2.pm.office}'s program stalled in a restless chamber.`,
        out:"Your own benches waver and the program dies in committee. A ministry that cannot legislate is a ministry on notice."};}},
  { id:"coalition",label:"Manage the governing coalition",cool:2,
    hint:"patronage, whips and promises — keeping your own benches loyal",
    gain:"your governing bloc +7, +2 Stability",
    cost:{gold:-12},requires:S=>!!S.pm,
    resolve:S=>{ const fx={}; fx[S.pm.bloc]=+7;
      return {cost:{gold:-12,stability:+2},fac:fx,chron:null,
      out:"Offices promised, feathers smoothed, one baronet bought outright. The benches hold — and the realm feels a steady hand."};}},
  { id:"public_works",label:"Commission public works",requires:S=>!!S.pm,
    hint:"roads, bridges, waterworks — the ministry builds what kings only decreed",
    cost:{gold:-24},fac:{provinces:+4,peasantry:+3},
    effect:S=>{S.development=clamp(S.development+7);},
    chron:S=>`the ministry raised works across ${S.nation} — bridges, roads, waterworks — and the country grew visibly richer.`,
    out:["Surveyors, then scaffolds, then traffic. Development rises where the ministry builds — and so does every future year's revenue."]},
  { id:"surplus",label:"Deliver a surplus budget",cool:3,requires:S=>!!S.pm&&netIncome(S)>0,
    hint:"prudent administration turned directly into gold and confidence",
    cost:{gold:+16,stability:+2},fac:{merchants:+3},
    chron:S=>`the ministry delivered a surplus, and the credit of ${S.nation} strengthened.`,
    out:["The books balance with room to spare. The funds notice; so do the lenders. Competence, it turns out, pays."]},
  { id:"early_election",label:"Call an early election",cool:4,
    hint:"go to the country — renew the mandate, or watch it pass to another interest",
    cost:{stability:-3},requires:S=>!!S.pm,
    effect:S=>{S.nextElection=S.turn+1;},
    chron:S=>`the ${S.pm.office} dissolved the chamber and went to the country.`,
    out:["Writs issued, hustings raised. The realm will speak at the next sitting."]},
];
const ACT_DOM={patronize:"faith",festival:"faith",festival_realm:"faith",
  fund_army:"martial",suppress:"martial",tour:"martial",
  trade:"fiscal",tax_decree:"fiscal",tax_request:"fiscal",privileges:"fiscal",surplus:"fiscal",
  appoint:"civil",address_commons:"civil",legislate:"civil",coalition:"civil",public_works:"civil",
  dissolve:"crown",refuse_ministry:"crown",early_election:"crown"};
const DOM_NAMES={martial:"The Sword",fiscal:"The Purse",faith:"The Altar",civil:"The Realm",crown:"The Prerogative"};
const DOM_ORDER=["crown","martial","fiscal","faith","civil"];
function actDomain(a){ return a.dom||ACT_DOM[a.id]||"civil"; }
/* ---------- evolution lines ----------
   An action keeps its slot across the centuries but changes its name, its
   description and sometimes its price. `evo` maps an era index to the form
   the action takes from that age onward.                                  */
const ACT_EVO={
  fund_army:{2:{label:"Raise and drill a standing army",hint:"paid regiments kept under arms the year round, not a host summoned and sent home"},
             4:{label:"Expand the standing establishment",hint:"barracks, depots and a peacetime army the treasury feels every single year"}},
  suppress:{2:{label:"Send in the constables",hint:"sworn men with warrants rather than a lord's retainers"},
            3:{label:"Send in the constabulary",hint:"a paid force of order, answerable to the office and not to a family"},
            4:{label:"Send in the police",hint:"uniformed, salaried, and increasingly written about in the newspapers"}},
  tour:{2:{label:"Review the regiments",hint:"the sovereign at the head of drilled ranks, watched by everyone who matters"},
        4:{label:"Hold a grand review",hint:"a spectacle of the state's strength, staged for the realm and for the ambassadors"}},
  trade:{1:{label:"Charter a trading venture",hint:"a monopoly, a fleet and a share of whatever comes home"},
         3:{label:"Subsidize the manufactories",hint:"bounties on cloth, iron and glass — wealth made rather than carried"}},
  tax_decree:{2:{label:"Decree a general tax",hint:"assessed on the whole realm by the crown's own officers"},
              3:{label:"Raise the rate by statute",hint:"written into law, collected by salaried men, and much harder to evade"}},
  patronize:{2:{label:"Endow the cathedral chapters",hint:"stone, stipends and prayers for the dynasty in perpetuity"},
             4:{label:"Endow the established church",hint:"the faith as an institution of state — funded, formal, and increasingly argued with"}},
  festival:{2:{label:"Hold a court masque",hint:"the crown's magnificence performed for those permitted to see it"},
            4:{label:"Stage a royal pageant",hint:"ceremony as statecraft, reported everywhere and believed by many"}},
  festival_realm:{2:{label:"Hold a fair of the realm",hint:"markets, wrestling and free ale in every town that has a square"},
                  4:{label:"Mount a national exhibition",hint:"the realm displaying itself to itself — and to visitors who count"}},
  privileges:{3:{label:"Confirm the ancient privileges",hint:"exemptions the great houses insist are immemorial, whatever the rolls say"}},
  appoint:{3:{label:"Appoint to the offices of state",hint:"examined men to salaried posts — competence bought with a wage rather than a favour"}}
};
function actView(S,a){
  const map=ACT_EVO[a.id]; if(!map) return a;
  const ei=eraIdx(S);
  let form=null;
  Object.keys(map).map(Number).sort((x,y)=>x-y).forEach(k=>{ if(ei>=k) form=map[k]; });
  return form?Object.assign({},a,form):a;
}
const MONARCH_ONLY=["patronize","festival","privileges","appoint","tax_request","abdicate","dissolve","refuse_ministry"];
const REGIME_ONLY={martial_law:"junta",purge_officers:"junta",plebiscite:"junta",promise_elections:"junta",seizures:"junta",
  postpone_vote:"republic",narrow_franchise:"republic",prosecute_opposition:"republic"};
function availableActions(S){ return ACTIONS.filter(a=>(!REGIME_ONLY[a.id]||regimeIs(S,REGIME_ONLY[a.id]))&&(regimeIs(S,"monarchy")||!MONARCH_ONLY.includes(a.id))&&a.requires(S)&&!onCooldown(S,a.id)&&costMod(S,a.id)!==0); }
function onCooldown(S,id){ return (S.cooldowns[id]||0)>S.turn; }
function affordable(S,a){ const g=(adjCost(S,a).gold)||0; if(g>=0)return true; return (S.treasury+g)>=-OVERDRAFT; }
