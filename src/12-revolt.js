/* =====================================================================
   REVOLT (order collapse — no game over)
   ===================================================================== */
const REVOLT={ id:"revolt",title:"The Realm Rises",freq:3,
  text:S=>`Order has broken. The mob holds the capital and the provinces send no taxes. The great houses arrive at the palace with a demand dressed as a rescue: share your power, or lose it.`,
  choices:[
    {label:"Bow to the storm — concede power",rf:true,cost:{stability:+30},fac:{aristocracy:+6,peasantry:+4},
      effect:S=>{ if(!S.gov.institutions.length){ S._forcedChamber={power:26}; }
        else { transferPower(S,S.gov.institutions[0],10); } },
      chron:S=>`the Crown bowed to the great rising and conceded power; the throne was kept by making it smaller.`,
      out:S=>"You concede. The barricades come down as the criers announce it. You have kept the crown by shrinking it."},
    {label:"Crush the rising with every soldier you have",cost:{gold:-14},
      resolve:S=>{ if(S.military>=50)return{cost:{stability:+26,arms:-10},fac:{provinces:-12,officers:+4,peasantry:-10},chron:S=>`the Crown drowned the great rising in blood and kept its power entire; ${S.nation} fell silent, and afraid.`,out:"The army holds. The price is written in the parish registers. You are still absolute — and feared as never before."};
        if(!S.gov.institutions.length){ S._forcedChamber={power:26}; } else { transferPower(S,S.gov.institutions[0],10); }
        return{cost:{stability:+10,arms:-16},fac:{provinces:-8,officers:-6,aristocracy:-6},chron:S=>`the Crown tried to crush the great rising and could not; it kept its throne only by surrendering power.`,out:"Your soldiers are too few. You keep the crown only by conceding what you fought to avoid."};}},
  ]};
