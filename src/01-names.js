"use strict";
/* ---------- names, gender, titles, culture packs ----------
   A culture pack is pure window dressing: given names (split into an early
   and a later stratum so naming fashions drift as the ages turn), house
   names, family names, the crown's title forms, and suggestions when a
   chamber is chartered. The institutions underneath are unchanged — this
   is what the realm CALLS things.
   To add your own: copy any entry below and change the lists.            */
const CULTURES={
  /* Key stays "anglo" so every save ever written still loads; the realm is
     called English because the game begins in the 1600s and Aelfric of
     Mercia was a very long time dead by then. */
  anglo:{ name:"English", blurb:"Stuart and Hanoverian — parliaments, lawyers, and a crown that learns to bargain.",
    m:{early:["James","Charles","Henry","Edward","William","Robert","Thomas","Richard","Francis","Walter","Humphrey","Ambrose","Rowland","Percival","Nicholas","Gilbert"],
       late:["Albert","Arthur","Reginald","Cecil","Neville","Rupert","Clement","Leopold","Edwin","Harold","Cuthbert","Percy"]},
    f:{early:["Elizabeth","Anne","Mary","Margaret","Jane","Frances","Dorothy","Katherine","Bridget","Isabel","Alice","Cicely","Joan","Winifred"],
       late:["Victoria","Charlotte","Augusta","Adelaide","Beatrice","Alexandra","Maud","Louise","Edith","Millicent","Evelyn","Constance"]},
    surnames:["Ashworth","Holt","Greaves","Fenwick","Marlowe","Blackwood","Corbett","Sedgwick","Whitcombe","Bailey","Rothermere","Calloway"],
    houses:["Rothwell","Ashcombe","Marchmont","Wolverton","Bellingham","Kesteven","Thornbury","Haverstock"],
    titles:["King","King-Emperor","Emperor","Sovereign Prince","Lord of the Isles","Lord Paramount"],
    repTitles:["President","Lord Protector","Chief Magistrate","Speaker of the Commonwealth"],
    juntaTitles:["Lord General","Marshal","Captain-General","President of the Council of State"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Great Council","The House of Commons","Parliament","The Convention Parliament"] },
  german:{ name:"German", blurb:"Electors, free cities and a diet that has never once finished on time.",
    m:{early:["Friedrich","Wilhelm","Albrecht","Ludwig","Ernst","Georg","Christoph","Joachim","Kasimir","Rudolf","Konrad","Bernhard","Wolfgang","Moritz","Otto","Heinrich"],
       late:["Karl","Maximilian","Leopold","Rupprecht","Eitel","Gustav","Waldemar","Adalbert","Hermann","Reinhold","Siegfried","Ottokar"]},
    f:{early:["Sophie","Dorothea","Magdalena","Elisabeth","Amalie","Hedwig","Kunigunde","Barbara","Sibylle","Agnes","Juliane","Eleonore"],
       late:["Auguste","Viktoria","Luise","Cecilie","Hermine","Ilse","Wilhelmine","Charlotte","Therese","Adelheid","Mathilde","Klara"]},
    surnames:["Vogel","Reinhardt","Brenner","Kestner","Hollmann","Steinacker","Lindau","Grunwald","Ammermann","Fürst","Weissbach","Dornberg"],
    houses:["Falkenstein","Hohenwald","Löwenstein","Waldeck","Rosenberg","Sternberg","Greifenau","Königsmark"],
    titles:["König","Kaiser","Kurfürst","Herzog","Landgraf","Markgraf"],
    repTitles:["President","Reichspräsident","Chancellor","Staatspräsident"],
    juntaTitles:["Reichsverweser","Generalfeldmarschall","Marshal","Chairman of the Directorate"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Chairman of the Council of State"],
    inst:["The Landtag","The Chamber of Deputies","The Reichstag","The Nationalversammlung"] },
  french:{ name:"French", blurb:"Capetian and Valois — courts of ceremony, lawyers and long memories.",
    m:{early:["Aubert","Thibault","Renaud","Geoffroi","Amaury","Gaultier","Enguerrand","Hugues","Robert","Philippe","Guillaume","Bertrand"],
       late:["Louis","Charles","Henri","François","Antoine","Édouard","Gaston","Armand","Émile","Théodore","Raymond","Maurice"]},
    f:{early:["Aliénor","Blanche","Adélaïde","Mahaut","Isabeau","Sibylle","Constance","Yolande","Agnès","Perrenelle","Jehanne","Béatrix"],
       late:["Marie","Louise","Antoinette","Joséphine","Céleste","Hortense","Amélie","Eugénie","Clotilde","Adrienne","Séverine"]},
    surnames:["de Montfort","de Rohan","Laval","Beauharnais","d'Aumont","Cressy","Vaugirard","Sancerre","Bellegarde"],
    houses:["Valmont","Aubigny","Carrière","Montclair","Rouvray","Sancerre","Beaumont"],
    titles:["King","Emperor","Most Christian King","Grand Duke","Dauphin-Regnant","Count Palatine"],
    repTitles:["President","First Consul","Director of the Republic","Président du Conseil"],
    juntaTitles:["Marshal","Captain-General","President of the Committee of Public Safety","Supreme Director"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Estates-General","The Parlement","The Grand Council","The Assembly"] },
  italian:{ name:"Italian", blurb:"Peninsular city-crowns — bankers, condottieri and very good architects.",
    m:{early:["Ruggero","Ottone","Lorenzo","Guido","Rinaldo","Ludovico","Ercole","Cosimo","Federico","Ansaldo","Gianfranco"],
       late:["Vittorio","Umberto","Carlo","Amedeo","Massimo","Silvio","Emanuele","Ruggiero","Adalberto","Fulvio","Ottavio"]},
    f:{early:["Bianca","Ippolita","Lucrezia","Costanza","Isabella","Ginevra","Caterina","Beatrice","Fiammetta","Violante","Ottavia","Laudomia"],
       late:["Margherita","Elena","Adelaide","Serafina","Chiara","Vittoria","Clelia","Ortensia","Rosalia","Livia"]},
    surnames:["Malvezzi","Contarini","Falconieri","Ternaldi","Sforzesco","Trevisan","Baglioni","Cavalcanti"],
    houses:["Aldobrandi","Malaspina","Viscardi","Ferrante","Ternaldi","Contarini","Della Rovere"],
    titles:["Prince","Doge","Duke","Signore","King","Marquis"],
    repTitles:["President","Doge","Gonfaloniere","First Citizen"],
    juntaTitles:["Marshal","Captain-General","President of the Governing Council","Condottiero of the Realm"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Signoria","The Grand Council","The Senate","The Council of the Realm"] },
  spanish:{ name:"Spanish", blurb:"Iberian crowns — reconquest, empire, and an aristocracy that answers slowly.",
    m:{early:["Alfonso","Sancho","Ramiro","Fernando","Rodrigo","Bermudo","Enrique","Íñigo","Gonzalo","Pelayo","Ordoño"],
       late:["Carlos","Felipe","Alonso","Joaquín","Rafael","Luis","Ferran","Anselmo","Ignacio","Baltasar","Eugenio"]},
    f:{early:["Urraca","Berenguela","Constanza","Leonor","Sancha","Elvira","Jimena","Blanca","Teresa","Mencía","Aldonza","Estefanía"],
       late:["Isabel","Mariana","Carlota","Amalia","Pilar","Mercedes","Eulalia","Consuelo","Josefa","Rosalía"]},
    surnames:["de Lara","Mendoza","Osorio","Guzmán","Cárdenas","Villalba","Alvarado","Figueroa"],
    houses:["Cardeña","Osorio","Lerma","Trastámar","Valdés","Aragoza","Peñaflor"],
    titles:["King","Catholic King","Emperor","Grand Master","Prince of the Realm","Count-Duke"],
    repTitles:["President","Chief of State","Presidente del Consejo","Regent-President"],
    juntaTitles:["Captain-General","Marshal","President of the Junta","Generalísimo"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Cortes","The Royal Council","The Assembly of Estates","The Junta of the Realm"] },
  hellenic:{ name:"Hellenic-Byzantine", blurb:"The Roman east — purple, bureaucracy, and theology as a contact sport.",
    m:{early:["Alexios","Konstantinos","Nikephoros","Leontios","Basileios","Andronikos","Theodoros","Isaakios","Michael","Romanos"],
       late:["Georgios","Demetrios","Pavlos","Stephanos","Athanasios","Ioannis","Kyriakos","Spyridon","Anastasios","Evangelos"]},
    f:{early:["Theodora","Anna","Eirene","Zoe","Euphrosyne","Helena","Pulcheria","Anastasia","Maria Doukaina","Xene","Martha","Eudokia"],
       late:["Sophia","Alexandra","Kalliope","Despina","Olympia","Photini","Aikaterini","Eleni","Paraskevi","Thalia"]},
    surnames:["Komnenos","Doukas","Laskaris","Bryennios","Kantakouzenos","Palaiologos","Tornikios"],
    houses:["Komnenos","Doukas","Palaiologos","Laskaris","Angelos","Bryennios","Phokas"],
    titles:["Basileus","Autokrator","Despot","Sebastokrator","Emperor","Caesar"],
    repTitles:["President","Archon","Ethnarch","Prytanis"],
    juntaTitles:["Strategos","Marshal","President of the Revolutionary Council","Domestic of the Realm"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Senate","The Synkletos","The Imperial Council","The Assembly of the City"] },
  nordic:{ name:"Nordic", blurb:"Northern crowns — things, jarls, and kings who must be acclaimed as well as born.",
    m:{early:["Halvard","Sigurd","Ragnvald","Eirik","Harald","Torgny","Ivar","Knut","Bjorn","Gunnar","Sverre"],
       late:["Gustav","Christian","Oskar","Magnus","Frederik","Carl","Haakon","Valdemar","Sigvard","Torbjorn","Nils"]},
    f:{early:["Astrid","Gudrun","Ingrid","Sigrid","Thyra","Ragnhild","Solveig","Hallveig","Bergljot","Gyrid","Thorunn","Aasa"],
       late:["Margrethe","Kristina","Ulrika","Ingeborg","Dagmar","Sofia","Alvhild","Gunnhild","Birgitta","Aslaug"]},
    surnames:["Bergstrand","Haugen","Nordahl","Skarsholm","Vinterberg","Aslaksen","Lindqvist"],
    houses:["Ynglinga","Sverkerholm","Bjarnason","Haakonar","Nordheim","Vasborg","Steinhall"],
    titles:["King","High King","Jarl","Drott","Sea-King","Overking"],
    repTitles:["President","Lawspeaker","Chairman of the Thing","First Steward"],
    juntaTitles:["Marshal","Captain-General","Chairman of the Council of Officers","Lord Constable"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
    inst:["The Thing","The Council of Jarls","The Great Thing","The Assembly of Freemen"] },
  indian:{ name:"Indian", blurb:"Subcontinental crowns — dynasties measured in centuries and courts in scholars.",
    m:{early:["Harsha","Vikrama","Devapala","Rajendra","Chandran","Bhoja","Samudra","Narasimha","Pratap","Govinda"],
       late:["Ranjit","Arjun","Mahendra","Bahadur","Jaswant","Vijay","Devraj","Bhupendra","Surendra","Hariram","Kishan"]},
    f:{early:["Prabhavati","Rajyashri","Devika","Ratnavali","Indumati","Chandralekha","Kumaradevi","Lakshmi","Yashodhara","Malavika","Suryamati","Vidyavati"],
       late:["Padmavati","Rukmini","Sharada","Meenakshi","Vasundhara","Anjali","Kamala","Savitri","Gayatri","Indira"]},
    surnames:["Chauhan","Rathore","Sisodia","Tomar","Parmar","Solanki","Bhonsle"],
    houses:["Chauhan","Rathore","Sisodia","Chalukya","Pallava","Kakatiya","Sena"],
    titles:["Raja","Maharaja","Samrat","Chakravartin","Maharana","Emperor"],
    repTitles:["President","Rashtrapati","Sabhapati","First Minister"],
    juntaTitles:["Senapati","Marshal","President of the Governing Council","Captain-General"],
    peopleTitles:["Chairman","First Secretary","General Secretary","Premier"],
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
  /* English */
  "King":{m:"King",f:"Queen"}, "King-Emperor":{m:"King-Emperor",f:"Queen-Empress"},
  "Emperor":{m:"Emperor",f:"Empress"}, "Sovereign Prince":{m:"Sovereign Prince",f:"Sovereign Princess"},
  "Lord of the Isles":{m:"Lord of the Isles",f:"Lady of the Isles"}, "Duke":{m:"Duke",f:"Duchess"}, "Lord Paramount":{m:"Lord Paramount",f:"Lady Paramount"},
  "Overking":{m:"Overking",f:"Overqueen"},
  /* German */
  "König":{m:"König",f:"Königin"}, "Kaiser":{m:"Kaiser",f:"Kaiserin"},
  "Kurfürst":{m:"Kurfürst",f:"Kurfürstin"}, "Herzog":{m:"Herzog",f:"Herzogin"},
  "Landgraf":{m:"Landgraf",f:"Landgräfin"}, "Markgraf":{m:"Markgraf",f:"Markgräfin"},
  /* French */
  "Most Christian King":{m:"Most Christian King",f:"Most Christian Queen"},
  "Grand Duke":{m:"Grand Duke",f:"Grand Duchess"},
  "Dauphin-Regnant":{m:"Dauphin-Regnant",f:"Dauphine-Regnant"},
  "Count Palatine":{m:"Count Palatine",f:"Countess Palatine"},
  /* Italian */
  "Prince":{m:"Prince",f:"Princess"}, "Doge":{m:"Doge",f:"Dogaressa"},
  "Signore":{m:"Signore",f:"Signora"}, "Marquis":{m:"Marquis",f:"Marchioness"},
  /* Spanish */
  "Catholic King":{m:"Catholic King",f:"Catholic Queen"},
  "Grand Master":{m:"Grand Master",f:"Grand Mistress"},
  "Prince of the Realm":{m:"Prince of the Realm",f:"Princess of the Realm"},
  "Count-Duke":{m:"Count-Duke",f:"Countess-Duchess"},
  /* Hellenic */
  "Basileus":{m:"Basileus",f:"Basilissa"}, "Autokrator":{m:"Autokrator",f:"Autokratorissa"},
  "Despot":{m:"Despot",f:"Despoina"}, "Sebastokrator":{m:"Sebastokrator",f:"Sebastokratorissa"},
  "Caesar":{m:"Caesar",f:"Caesarissa"},
  /* Nordic */
  "High King":{m:"High King",f:"High Queen"}, "Jarl":{m:"Jarl",f:"Jarla"},
  "Drott":{m:"Drott",f:"Drottning"}, "Sea-King":{m:"Sea-King",f:"Sea-Queen"},
  /* Indian */
  "Raja":{m:"Raja",f:"Rani"}, "Maharaja":{m:"Maharaja",f:"Maharani"},
  "Samrat":{m:"Samrat",f:"Samragni"}, "Chakravartin":{m:"Chakravartin",f:"Chakravartini"},
  "Maharana":{m:"Maharana",f:"Maharani"},
  /* republics */
  "President":{m:"President",f:"President"}, "Lord Protector":{m:"Lord Protector",f:"Lady Protector"},
  "Chief Magistrate":{m:"Chief Magistrate",f:"Chief Magistrate"},
  "Speaker of the Commonwealth":{m:"Speaker of the Commonwealth",f:"Speaker of the Commonwealth"},
  "Reichspräsident":{m:"Reichspräsident",f:"Reichspräsidentin"},
  "Chancellor":{m:"Chancellor",f:"Chancellor"}, "Staatspräsident":{m:"Staatspräsident",f:"Staatspräsidentin"},
  "First Consul":{m:"First Consul",f:"First Consul"},
  "Director of the Republic":{m:"Director of the Republic",f:"Director of the Republic"},
  "Président du Conseil":{m:"Président du Conseil",f:"Présidente du Conseil"},
  "Gonfaloniere":{m:"Gonfaloniere",f:"Gonfaloniera"}, "First Citizen":{m:"First Citizen",f:"First Citizen"},
  "Chief of State":{m:"Chief of State",f:"Chief of State"},
  "Presidente del Consejo":{m:"Presidente del Consejo",f:"Presidenta del Consejo"},
  "Regent-President":{m:"Regent-President",f:"Regent-President"},
  "Archon":{m:"Archon",f:"Archon"}, "Ethnarch":{m:"Ethnarch",f:"Ethnarch"}, "Prytanis":{m:"Prytanis",f:"Prytanis"},
  "Lawspeaker":{m:"Lawspeaker",f:"Lawspeaker"},
  "Chairman of the Thing":{m:"Chairman of the Thing",f:"Chairwoman of the Thing"},
  "First Steward":{m:"First Steward",f:"First Steward"},
  "Rashtrapati":{m:"Rashtrapati",f:"Rashtrapati"}, "Sabhapati":{m:"Sabhapati",f:"Sabhapati"},
  "First Minister":{m:"First Minister",f:"First Minister"},
  /* juntas */
  "Marshal":{m:"Marshal",f:"Marshal"}, "Lord General":{m:"Lord General",f:"Lady General"},
  "Captain-General":{m:"Captain-General",f:"Captain-General"},
  "President of the Council of State":{m:"President of the Council of State",f:"President of the Council of State"},
  "Reichsverweser":{m:"Reichsverweser",f:"Reichsverweserin"},
  "Generalfeldmarschall":{m:"Generalfeldmarschall",f:"Generalfeldmarschallin"},
  "Chairman of the Directorate":{m:"Chairman of the Directorate",f:"Chairwoman of the Directorate"},
  "President of the Committee of Public Safety":{m:"President of the Committee of Public Safety",f:"President of the Committee of Public Safety"},
  "Supreme Director":{m:"Supreme Director",f:"Supreme Director"},
  "President of the Governing Council":{m:"President of the Governing Council",f:"President of the Governing Council"},
  "Condottiero of the Realm":{m:"Condottiero of the Realm",f:"Condottiera of the Realm"},
  "President of the Junta":{m:"President of the Junta",f:"President of the Junta"},
  "Generalísimo":{m:"Generalísimo",f:"Generalísima"},
  "Strategos":{m:"Strategos",f:"Strategos"},
  "President of the Revolutionary Council":{m:"President of the Revolutionary Council",f:"President of the Revolutionary Council"},
  "Domestic of the Realm":{m:"Domestic of the Realm",f:"Domestic of the Realm"},
  "Chairman of the Council of Officers":{m:"Chairman of the Council of Officers",f:"Chairwoman of the Council of Officers"},
  "Lord Constable":{m:"Lord Constable",f:"Lady Constable"},
  "Senapati":{m:"Senapati",f:"Senapati"},
  /* people's republics */
  "Chairman":{m:"Chairman",f:"Chairwoman"}, "First Secretary":{m:"First Secretary",f:"First Secretary"},
  "General Secretary":{m:"General Secretary",f:"General Secretary"}, "Premier":{m:"Premier",f:"Premier"},
  "Chairman of the Council of State":{m:"Chairman of the Council of State",f:"Chairwoman of the Council of State"}
};
/* A title typed in by the player is used verbatim for both genders; the realm
   may sort out its own grammar. Anything unrecognised degrades the same way. */
function titleForm(base,g){
  const t=TITLE_FORMS[base]; if(!t)return base||"King";
  return g==="f"?t.f:t.m;
}
/* the pool a given regime draws its style from */
function cleanTitle(t){ return String(t||"").replace(/[<>&"'`]/g,"").replace(/\s+/g," ").trim().slice(0,28); }
function regimeTitles(S,r){
  const c=culture(S);
  if(r==="republic")return c.repTitles||["President"];
  if(r==="junta")   return c.juntaTitles||["Marshal"];
  if(r==="people")  return c.peopleTitles||["Chairman"];
  return c.titles||["King"];
}
function titleFor(S,g){ return titleForm(S.gov.crown.titleBase,g); }
function usedNames(S){ const u=new Set(); (S.lineage||[]).forEach(m=>u.add(m.name)); (S.family||[]).forEach(p=>u.add(p.name)); if(S.monarch)u.add(S.monarch.name); return u; }
const ROMAN=["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV"];
function regnalFor(S,name,house){
  if(S&&S.regime&&S.regime!=="monarchy")return 1;   /* only a crown is numbered */
  let n=1; (S.lineage||[]).forEach(m=>{ if(m.name===name&&(m.regime||"monarchy")==="monarchy")n++; }); return n; }
function styled(S,m){ return `${titleFor(S,m.gender)} ${m.name}${m.regnal>1?" "+(ROMAN[m.regnal]||m.regnal):""}`; }
