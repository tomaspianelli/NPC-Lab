/* Arquetipos: se elige el más cercano a los 5 rasgos (casilleros 0..8, 4 = centro) */
var ORDEN = ['habla','caracter','creatividad','expresividad','social'];

var ARQ = [
 { nombre:'El Amable', v:[-1,.6,0,.3,.5],
   corto:'Cortés, optimista y servicial. Disfruta ayudar y crear un ambiente agradable.',
   largo:'Se caracteriza por su cortesía, su actitud positiva y su disposición para ayudar a los demás. Suele iniciar las conversaciones con un saludo cordial, elegir cuidadosamente sus palabras y responder con tacto incluso cuando está en desacuerdo. Disfruta de las interacciones sociales y busca generar un ambiente agradable a su alrededor. Ante situaciones inesperadas, procura mantener la calma y encontrar una manera respetuosa de resolver los conflictos.' },
 { nombre:'El Formal', v:[-.6,-1,-.3,-.7,0],
   corto:'Serio y respetuoso. Mide sus palabras y evita las bromas y exageraciones.',
   largo:'Mantiene una actitud seria, respetuosa y controlada en la mayoría de las situaciones. Se comunica con educación, evita las expresiones demasiado informales y prefiere las conversaciones ordenadas y concretas. No suele recurrir a las bromas ni demostrar sus emociones de manera exagerada. Antes de responder, tiende a considerar sus palabras y las posibles consecuencias de sus acciones. Se siente cómodo en entornos estructurados, donde las reglas y las expectativas están claramente definidas.' },
 { nombre:'El Entusiasta', v:[0,1,.3,.8,.6],
   corto:'Alegre y expresivo. Se emociona fácilmente y transmite energía y optimismo.',
   largo:'Se destaca por su energía, su optimismo y su facilidad para expresar lo que siente. Reacciona con entusiasmo ante las novedades, celebra los logros y suele encontrar aspectos positivos incluso en situaciones complicadas. Acompaña sus palabras con gestos marcados, cambios de tono de voz y expresiones emocionales intensas. Disfruta compartir sus experiencias con otros NPC y suele involucrarse activamente en las conversaciones. Su entusiasmo puede llevarlo a actuar con espontaneidad antes de evaluar todos los detalles.' },
 { nombre:'El Bromista', v:[.3,1,.7,.5,.6],
   corto:'Ingenioso y espontáneo. Utiliza el humor para relacionarse y entretener a los demás.',
   largo:'Tiene una personalidad ingeniosa, espontánea y orientada al humor. Le gusta hacer comentarios divertidos, jugar con las palabras y encontrar oportunidades para distender las situaciones cotidianas. Suele improvisar respuestas y proponer ideas poco convencionales, utilizando su creatividad para sorprender a los demás. Disfruta de las interacciones sociales y busca generar reacciones a través de sus ocurrencias. Sin embargo, su tendencia a bromear puede hacer que no siempre perciba cuándo una situación requiere una respuesta más seria o cuidadosa.' },
 { nombre:'El Inventor', v:[0,.2,1,.2,0],
   corto:'Curioso y creativo. Explora alternativas y busca soluciones originales.',
   largo:'Se caracteriza por su curiosidad y su interés por explorar posibilidades diferentes. Frente a un problema, suele proponer soluciones originales, experimentar con alternativas y cuestionar los métodos habituales. No teme equivocarse durante el proceso, ya que considera que probar nuevas ideas puede conducir a descubrimientos inesperados. Sus conversaciones pueden incluir propuestas poco convencionales o asociaciones sorprendentes. Aunque disfruta de la experimentación, en ocasiones puede dedicar demasiado tiempo a explorar opciones en lugar de elegir una solución definitiva.' },
 { nombre:'El Tímido', v:[-.4,-.3,0,-.8,-1],
   corto:'Reservado y observador. Prefiere escuchar antes de participar y evita llamar la atención.',
   largo:'Es reservado, observador y poco propenso a llamar la atención. Prefiere escuchar antes de intervenir y rara vez inicia una conversación por iniciativa propia. Cuando interactúa con otros NPC, suele expresarse de manera moderada y acompañar sus palabras con gestos discretos. Se siente más cómodo en encuentros individuales o en ambientes tranquilos que en grupos numerosos. Aunque puede parecer distante, su comportamiento responde principalmente a su preferencia por las interacciones menos intensas. Cuando alguien se acerca y le da espacio para participar, puede involucrarse gradualmente en la conversación.' },
 { nombre:'El Decidido', v:[1,0,0,.3,.5],
   corto:'Directo y seguro. Expresa sus opiniones con firmeza y toma decisiones sin rodeos.',
   largo:'Se expresa con seguridad, claridad y determinación. Prefiere comunicar sus ideas de manera directa, sin demasiados rodeos, y espera que los demás comprendan rápidamente lo que quiere transmitir. Cuando se enfrenta a una decisión, tiende a evaluar las opciones disponibles y elegir un camino sin prolongar innecesariamente el proceso. Defiende sus opiniones con firmeza y no suele evitar los desacuerdos. Su estilo de comunicación puede resultar convincente y resolutivo, aunque su franqueza puede interpretarse como impaciencia o falta de tacto en determinadas situaciones.' },
 { nombre:'El Sereno', v:[0,0,0,-.5,0],
   corto:'Tranquilo y equilibrado. Evita las reacciones impulsivas y mantiene la calma.',
   largo:'Mantiene una actitud tranquila, equilibrada y moderada frente a los acontecimientos. No suele reaccionar de manera impulsiva ni expresar emociones intensas, incluso cuando algo inesperado interrumpe sus actividades. Prefiere analizar la situación con calma y responder de forma neutral antes de tomar una decisión. En las conversaciones, utiliza un tono estable y evita los conflictos innecesarios. Se adapta bien a entornos ordenados y predecibles, aunque puede tardar en mostrar entusiasmo ante una novedad o en reaccionar con intensidad frente a situaciones que otros NPC consideran emocionantes.' },
 { nombre:'El Dramático', v:[.3,.2,.3,1,.6],
   corto:'Intenso y emocional. Expresa sus sentimientos mediante reacciones y gestos notorios.',
   largo:'Experimenta y expresa las situaciones con una intensidad emocional notable. Sus reacciones suelen ser visibles a través de gestos amplios, cambios marcados en la voz y respuestas cargadas de emoción. Puede celebrar una buena noticia con entusiasmo desbordante o manifestar su frustración de manera evidente ante un contratiempo. Le gusta involucrarse en las conversaciones y transmitir sus opiniones con fuerza, utilizando su expresividad para captar la atención de los demás. Su manera de reaccionar puede volver más dinámicas las interacciones, aunque a veces puede exagerar la importancia de acontecimientos cotidianos.' },
 { nombre:'El Analítico', v:[0,-.3,-.8,-.4,-.2],
   corto:'Metódico y observador. Evalúa la información antes de actuar y prefiere decisiones fundamentadas.',
   largo:'Se caracteriza por su pensamiento metódico, su capacidad de observación y su preferencia por las decisiones fundamentadas. Antes de actuar, tiende a reunir información, comparar alternativas y evaluar las posibles consecuencias. Suele comunicarse de forma clara y moderada, priorizando los datos y los argumentos por encima de las reacciones emocionales. Frente a un problema, prefiere recurrir a procedimientos conocidos y soluciones que ya han demostrado funcionar. Aunque puede desarrollar ideas nuevas cuando la situación lo requiere, generalmente necesita comprender el funcionamiento de una propuesta antes de aceptarla.' },
 { nombre:'El Carismático', v:[0,.5,.3,.6,1],
   corto:'Sociable y seguro. Disfruta interactuar, transmite entusiasmo y destaca en los grupos.',
   largo:'Se desenvuelve con naturalidad en situaciones sociales y disfruta de interactuar con distintos personajes. Suele iniciar conversaciones, participar activamente en grupos y expresar sus ideas con confianza. Su lenguaje corporal, sus gestos y su tono de voz acompañan sus palabras, lo que le permite transmitir entusiasmo y mantener el interés de quienes lo escuchan. También suele adaptarse al ritmo de las conversaciones y encontrar temas en común con otros NPC. Su facilidad para relacionarse puede convertirlo en una figura central de las interacciones, aunque en ocasiones puede buscar mantener la atención incluso cuando otros necesitan espacio para participar.' },
 { nombre:'El Gruñón', v:[.9,-1,-.3,-.8,-.7],
   corto:'Serio y poco expresivo. Se comunica de forma seca, cuestiona las propuestas y evita interacciones innecesarias.',
   largo:'Tiene una actitud seria, poco demostrativa y, en ocasiones, malhumorada. Prefiere comunicarse de forma directa y breve, sin dedicar demasiado tiempo a los saludos, las formalidades o las conversaciones que considera innecesarias. Sus respuestas suelen ser secas y sus expresiones emocionales, limitadas. No acostumbra a iniciar interacciones sociales y puede mostrarse crítico ante propuestas que no le convencen. Aunque puede parecer difícil de tratar, su comportamiento no implica necesariamente una intención de generar conflictos: simplemente tiende a mantener la distancia, expresar sus desacuerdos con franqueza y priorizar sus propios intereses.' }
];

/* Textos largos (versión resumida), en el mismo orden que ARQ */
var LARGOS = [
  'Se caracteriza por su **cortesía** y su actitud **positiva**. Elige con cuidado sus palabras y responde con **tacto**, incluso cuando está en desacuerdo.|Disfruta de **ayudar** a los demás y busca crear un **ambiente agradable** a su alrededor.',
  'Mantiene una actitud **seria**, **respetuosa** y controlada. Se comunica con educación y prefiere las conversaciones **ordenadas** y concretas.|Evita las **bromas** y las emociones exageradas, y mide sus palabras antes de responder.',
  'Se destaca por su **energía** y su **optimismo**. Reacciona con entusiasmo ante las novedades y celebra cada logro.|Expresa lo que siente con **gestos marcados** y disfruta participar activamente en las conversaciones.',
  'Tiene una personalidad **ingeniosa** y **espontánea**. Le gusta hacer comentarios divertidos y jugar con las palabras.|Usa el **humor** para relacionarse, aunque a veces no nota cuándo hace falta ponerse **serio**.',
  'Se caracteriza por su **curiosidad**. Ante un problema, propone soluciones **originales** y experimenta con alternativas.|No teme **equivocarse**: cree que probar ideas nuevas lleva a descubrimientos inesperados.',
  'Es **reservado** y **observador**. Prefiere escuchar antes de intervenir y rara vez inicia una conversación.|Se siente más cómodo en ambientes **tranquilos** y, con confianza, participa de a poco.',
  'Se expresa con **seguridad** y **claridad**. Comunica sus ideas de forma **directa**, sin rodeos.|Toma decisiones rápido y defiende sus opiniones con **firmeza**, aunque a veces parezca impaciente.',
  'Mantiene una actitud **tranquila** y **equilibrada** frente a los acontecimientos. No reacciona de forma impulsiva.|Analiza con **calma**, usa un tono estable y evita los conflictos innecesarios.',
  'Vive las situaciones con gran **intensidad emocional**. Sus reacciones se notan en **gestos amplios** y cambios de voz.|Transmite sus opiniones con **fuerza**, aunque a veces exagera lo cotidiano.',
  'Se caracteriza por su pensamiento **metódico** y su **observación**. Antes de actuar, reúne información y compara alternativas.|Prioriza los **datos** por encima de las emociones y prefiere soluciones que ya **funcionaron**.',
  'Se desenvuelve con **naturalidad** en situaciones sociales. Inicia conversaciones y participa activamente en **grupos**.|Sus gestos y su tono transmiten **entusiasmo** y suele ser el centro de las interacciones.',
  'Tiene una actitud **seria**, poco demostrativa y a veces **malhumorada**. Prefiere comunicarse de forma **breve** y directa.|Mantiene la **distancia**, critica lo que no le convence y expresa sus desacuerdos con franqueza.'
 ];
ARQ.forEach(function(a,i){ a.largo = LARGOS[i]; });

/* p = { habla, caracter, creatividad, expresividad, social } con valores 0..8 */
export function arquetipo(p){
  var x = ORDEN.map(function(k){ return ((typeof p[k]==='number'?p[k]:4) - 4) / 4; });
  var best = ARQ[0], bd = Infinity;
  ARQ.forEach(function(a){
    var d = 0; a.v.forEach(function(v,i){ d += (v - x[i]) * (v - x[i]); });
    if(d < bd){ bd = d; best = a; }
  });
  return best;
}