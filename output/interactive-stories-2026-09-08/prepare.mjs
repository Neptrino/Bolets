import {readFileSync,writeFileSync} from 'node:fs';
const dir='output/interactive-stories-2026-09-08/';
const data=JSON.parse(readFileSync(dir+'before.json'));if(data.posts.pageInfo.hasNextPage)throw Error('Incomplete');
const background=data.posts.edges.map(e=>e.node).find(p=>p.id==='6aa07bcbedb8de67a74608d1').assets[1];
const rows=[
['09-10','poll','On gaudeixes més buscant bolets?',['Pirineu','Boscos mediterranis'],'Pregunta per paisatges amplis. Sense revelar els teus racons!'],
['09-12','poll','Quin bosc et tira més?',['Pineda','Roureda o alzinar'],'Preferències personals; no demanis ubicacions exactes.'],
['09-14','poll','Si només en poguessis triar un…',['Rovelló','Cep'],'Pregunta de preferències, no d’identificació.'],
['09-16','poll','Quin t’agrada més trobar?',['Rossinyol','Camagroc'],'Pregunta de preferències, no d’identificació.'],
['09-18','poll','Com t’agraden més els bolets?',['A la paella','Amb arròs'],'Pregunta de preferències culinàries; no dona instruccions de consum.'],
['09-20','question','Quin plat amb bolets no falla mai a casa?',[],'Recull idees de plats per al contingut futur.'],
['09-22','poll','Què et costa més?',['Reconèixer el bolet','Triar el bosc'],'Recull dubtes per a futures guies.'],
['09-23','poll','Com t’agrada fer la sortida?',['Ben d’hora','Sense presses'],'Preferències sobre el ritme de la sortida.'],
['09-24','quiz','Una foto del barret és suficient per identificar un bolet?',['Sí','No'],'Resposta: No. Cal observar més trets i context; una fotografia no garanteix una identificació segura.'],
['09-26','question','Amb qui acostumes a anar al bosc?',[],'No demanis noms complets, etiquetes ni localitzacions.'],
['09-27','poll','Quin detall vols aprendre a observar?',['Làmines','Peu i base'],'Usa els resultats per prioritzar una lliçó.'],
['09-29','quiz','El reig bord i l’ou de reig són la mateixa espècie?',['Sí','No'],'Resposta: No. Reig bord: Amanita muscaria. Ou de reig: Amanita caesarea. No identifiquis ni decideixis el consum només amb aquesta pregunta.'],
['09-30','question','Com en dieu del rovelló a casa teva?',[],'Demana noms locals, no punts de recol·lecció.'],
['10-01','poll','Quina guia vols després?',['Fredolics','Llenegues'],'La votació orienta futures ampliacions; no promet una nova fitxa que ja estigui programada.'],
['10-03','poll','Què vols veure més aquí?',['Espècies','Idees de cuina'],'Resultats entre els qui han votat, no representatius de tots els boletaires.'],
['10-04','quiz','El fredolic té…',['Làmines','Plecs','Porus'],'Resposta: Làmines. Aquest tret sol no identifica l’espècie ni garanteix la comestibilitat.'],
['10-06','poll','Què consultes primer?',['Espècie','Territori'],'Pregunta sobre com prepares una sortida.'],
['10-08','quiz','Un senyal alt al mapa confirma que trobaràs bolets?',['Sí','No'],'Resposta: No. El mapa estima condicions, no confirma presència ni troballes.']
];
const plan=rows.map(([day,kind,prompt,options,note],i)=>({key:`interactive-2026-${day}-${i+1}`,dueAt:`2026-${day}T14:00:00.000Z`,kind,prompt,options,note,asset:background,
 instructions:`Afegeix a Instagram l’adhesiu ${kind==='question'?'Preguntes':kind==='quiz'?'Quiz (si no està disponible, Enquesta)':'Enquesta'}. Pregunta: ${prompt}${options.length?' Opcions: '+options.join(' / ')+'.':''} ${kind==='quiz'?'Mostra després la resposta i l’explicació en una Story; no posis la solució damunt la pregunta. ':''}${note} Afegeix @bolets.app si vols una menció clicable. Imatge de l’arxiu, no una troballa d’avui; no vinculis la foto amb un lloc o una espècie de la pregunta. Ajusta el fons i la posició de l’adhesiu a Instagram.`}));
for(const p of plan){if(data.posts.edges.some(e=>e.node.dueAt===p.dueAt))throw Error('Slot collision '+p.key);}
writeFileSync(dir+'plan.json',JSON.stringify(plan,null,2));console.log('Prepared '+plan.length+' interactive Story reminders, all 16:00 Europe/Madrid, no exact slot collisions.');
