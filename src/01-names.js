"use strict";
/* ---------- names, gender, titles, culture packs ----------
   A culture pack is pure window dressing: given names (split into an early
   and a later stratum so naming fashions drift as the ages turn), house
   names, family names, the crown's title forms, and suggestions when a
   chamber is chartered. The institutions underneath are unchanged — this
   is what the realm CALLS things.
   To add your own: copy any entry below and change the lists.            */
const CULTURES={
  anglo:{ name:"Anglo-Saxon", blurb:"Old English and Frankish-Germanic — the realm as it has always been named here.",
    m:{early:["Aldric","Theodane","Corvin","Lothair","Emeric","Baldwin","Roderic","Anselm","Godric","Osric","Wulfric","Eadric","Cenric","Aelfric","Beorn","Hereward"],
       late:["Edmund","Henry","Edward","Alfred","Charles","Albert","Frederick","Reginald"]},
    f:{early:["Roswen","Adela","Ysolde","Beatrix","Sabine","Maren","Ottilie","Edda","Aelfwyn","Mildreth","Eadgyth","Wulfrun","Hereswith","Liora"],
       late:["Victoria","Charlotte","Augusta","Eleanor","Matilda","Beatrice","Adelaide"]},
    surnames:["Rothermere","Calloway","Ashworth","Holt","Greaves","Fenwick","Marlowe","Blackwood","Trevayne","Corbett","Vantree","Osteric"],
    houses:["Corran","Alderne","Hastley","Rothwell","Osterly","Blackmere","Vael","Morvane"],
    titles:["King","Emperor","High Prince","Grand Duke"],
    inst:["The Estates","The Witan","The Great Council","The Assembly of the Realm"] },
  french:{ name:"French", blurb:"Capetian and Valois — courts of ceremony, lawyers and long memories.",
    m:{early:["Aubert","Thibault","Renaud","Geoffroi","Amaury","Gaultier","Enguerrand","Hugues","Robert","Philippe","Guillaume","Bertrand"],
       late:["Louis","Charles","Henri","François","Antoine","Édouard","Gaston","Armand"]},
    f:{early:["Aliénor","Blanche","Adélaïde","Mahaut","Isabeau","Sibylle","Constance","Yolande","Agnès"],
       late:["Marie","Louise","Antoinette","Joséphine","Céleste","Hortense","Amélie"]},
    surnames:["de Montfort","de Rohan","Laval","Beauharnais","d'Aumont","Cressy","Vaugirard","Sancerre","Bellegarde"],
    houses:["Valmont","Aubigny","Carrière","Montclair","Rouvray","Sancerre","Beaumont"],
    titles:["King","Emperor","Grand Duke","High Prince"],
    inst:["The Estates-General","The Parlement","The Grand Council","The Assembly"] },
  italian:{ name:"Italian", blurb:"Peninsular city-crowns — bankers, condottieri and very good architects.",
    m:{early:["Ruggero","Ottone","Lorenzo","Guido","Rinaldo","Ludovico","Ercole","Cosimo","Federico","Ansaldo","Gianfranco"],
       late:["Vittorio","Umberto","Carlo","Amedeo","Massimo","Silvio","Emanuele"]},
    f:{early:["Bianca","Ippolita","Lucrezia","Costanza","Isabella","Ginevra","Caterina","Beatrice","Fiammetta"],
       late:["Margherita","Elena","Adelaide","Serafina","Chiara","Vittoria"]},
    surnames:["Malvezzi","Contarini","Falconieri","Ternaldi","Sforzesco","Trevisan","Baglioni","Cavalcanti"],
    houses:["Aldobrandi","Malaspina","Viscardi","Ferrante","Ternaldi","Contarini","Della Rovere"],
    titles:["King","Prince","Grand Duke","Emperor"],
    inst:["The Signoria","The Grand Council","The Senate","The Council of the Realm"] },
  spanish:{ name:"Spanish", blurb:"Iberian crowns — reconquest, empire, and an aristocracy that answers slowly.",
    m:{early:["Alfonso","Sancho","Ramiro","Fernando","Rodrigo","Bermudo","Enrique","Íñigo","Gonzalo","Pelayo","Ordoño"],
       late:["Carlos","Felipe","Alonso","Joaquín","Rafael","Luis","Ferran"]},
    f:{early:["Urraca","Berenguela","Constanza","Leonor","Sancha","Elvira","Jimena","Blanca","Teresa"],
       late:["Isabel","Mariana","Carlota","Amalia","Pilar","Mercedes"]},
    surnames:["de Lara","Mendoza","Osorio","Guzmán","Cárdenas","Villalba","Alvarado","Figueroa"],
    houses:["Cardeña","Osorio","Lerma","Trastámar","Valdés","Aragoza","Peñaflor"],
    titles:["King","Emperor","High Prince","Grand Duke"],
    inst:["The Cortes","The Royal Council","The Assembly of Estates","The Junta of the Realm"] },
  hellenic:{ name:"Hellenic-Byzantine", blurb:"The Roman east — purple, bureaucracy, and theology as a contact sport.",
    m:{early:["Alexios","Konstantinos","Nikephoros","Leontios","Basileios","Andronikos","Theodoros","Isaakios","Michael","Romanos"],
       late:["Georgios","Demetrios","Pavlos","Stephanos","Athanasios","Ioannis"]},
    f:{early:["Theodora","Anna","Eirene","Zoe","Euphrosyne","Helena","Pulcheria","Anastasia"],
       late:["Sophia","Alexandra","Kalliope","Despina","Olympia","Photini"]},
    surnames:["Komnenos","Doukas","Laskaris","Bryennios","Kantakouzenos","Palaiologos","Tornikios"],
    houses:["Komnenos","Doukas","Palaiologos","Laskaris","Angelos","Bryennios","Phokas"],
    titles:["Basileus","Emperor","King","Despot"],
    inst:["The Senate","The Synkletos","The Imperial Council","The Assembly of the City"] },
  nordic:{ name:"Nordic", blurb:"Northern crowns — things, jarls, and kings who must be acclaimed as well as born.",
    m:{early:["Halvard","Sigurd","Ragnvald","Eirik","Harald","Torgny","Ivar","Knut","Bjorn","Gunnar","Sverre"],
       late:["Gustav","Christian","Oskar","Magnus","Frederik","Carl"]},
    f:{early:["Astrid","Gudrun","Ingrid","Sigrid","Thyra","Ragnhild","Solveig","Hallveig","Bergljot"],
       late:["Margrethe","Kristina","Ulrika","Ingeborg","Dagmar","Sofia"]},
    surnames:["Bergstrand","Haugen","Nordahl","Skarsholm","Vinterberg","Aslaksen","Lindqvist"],
    houses:["Ynglinga","Sverkerholm","Bjarnason","Haakonar","Nordheim","Vasborg","Steinhall"],
    titles:["King","High King","Jarl","Emperor"],
    inst:["The Thing","The Council of Jarls","The Great Thing","The Assembly of Freemen"] },
  indian:{ name:"Indian", blurb:"Subcontinental crowns — dynasties measured in centuries and courts in scholars.",
    m:{early:["Harsha","Vikrama","Devapala","Rajendra","Chandran","Bhoja","Samudra","Narasimha","Pratap","Govinda"],
       late:["Ranjit","Arjun","Mahendra","Bahadur","Jaswant","Vijay","Devraj"]},
    f:{early:["Prabhavati","Rajyashri","Devika","Ratnavali","Indumati","Chandralekha","Kumaradevi","Lakshmi"],
       late:["Padmavati","Rukmini","Sharada","Meenakshi","Vasundhara","Anjali"]},
    surnames:["Chauhan","Rathore","Sisodia","Tomar","Parmar","Solanki","Bhonsle"],
    houses:["Chauhan","Rathore","Sisodia","Chalukya","Pallava","Kakatiya","Sena"],
    titles:["Raja","Maharaja","Samrat","Emperor"],
    inst:["The Sabha","The Royal Council","The Great Assembly","The Council of Ministers"] }
};
const CULTURE_KEYS=Object.keys(CULTURES);
function culture(St){ return CULTURES[(St&&St.culture)||"anglo"]||CULTURES.anglo; }
/* naming fashions drift: the later stratum appears once the realm has moved
   past its third age, then increasingly crowds out the older names */
function namePool(St,g){
  const c=culture(St), set=(g==="f")?c.f:c.m;
  const ei=(St&&typeof eraIdx==="function")?eraIdx(St):0;
  /* the oldest names belong to the founding age; fashion moves on quickly */
  if(ei<1) return set.early;
  if(ei<3) return set.early.slice(Math.floor(set.early.length/2)).concat(set.late.slice(0,4));
  if(ei<5) return set.late.concat(set.early.slice(-4));
  return set.late;
}
function curS(){ return (typeof S!=="undefined")?S:null; }
function nameFor(g,used){
  const all=namePool(curS(),g);
  const pool=all.filter(n=>!used.has(n));
  return pool.length?pick(pool):pick(all);
}
function surnamePool(){ return culture(curS()).surnames; }
function housePool(){ return culture(curS()).houses; }
const TITLE_FORMS={
  "King":{m:"King",f:"Queen"}, "Emperor":{m:"Emperor",f:"Empress"},
  "High Prince":{m:"High Prince",f:"High Princess"}, "Grand Duke":{m:"Grand Duke",f:"Grand Duchess"},
  "Prince":{m:"Prince",f:"Princess"}, "Basileus":{m:"Basileus",f:"Basilissa"},
  "Despot":{m:"Despot",f:"Despoina"}, "High King":{m:"High King",f:"High Queen"},
  "Jarl":{m:"Jarl",f:"Jarla"}, "Raja":{m:"Raja",f:"Rani"},
  "Maharaja":{m:"Maharaja",f:"Maharani"}, "Samrat":{m:"Samrat",f:"Samragni"},
  "Marshal":{m:"Marshal",f:"Marshal"}, "Chairman":{m:"Chairman",f:"Chairwoman"},
  "President":{m:"President",f:"President"}
};
function titleFor(S,g){ const t=TITLE_FORMS[S.gov.crown.titleBase]||TITLE_FORMS["King"]; return g==="f"?t.f:t.m; }
function usedNames(S){ const u=new Set(); (S.lineage||[]).forEach(m=>u.add(m.name)); (S.family||[]).forEach(p=>u.add(p.name)); if(S.monarch)u.add(S.monarch.name); return u; }
const ROMAN=["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV"];
function regnalFor(S,name,house){ let n=1; (S.lineage||[]).forEach(m=>{ if(m.name===name)n++; }); return n; }
function styled(S,m){ return `${titleFor(S,m.gender)} ${m.name}${m.regnal>1?" "+(ROMAN[m.regnal]||m.regnal):""}`; }
