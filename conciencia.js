import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { fitInto } from './fit.js';
import { NPC_URL, NPC_FACING, HAIR_MODELS, OUTFIT_MODELS } from './modelos.js';
import { makeRig, POSES, JOINTS, pose } from './rig.js';
import './conciencia-botones.js';
import { cargarAtuendo } from './ropa.js';

/* ===== Núcleo 3 · Conciencia (NUCLEO_3_1 … NUCLEO_3_10) =====
   Slides (índice · pantalla del diseño):
   0 · 3.1  Antes / Ahora
   1 · 3.2  Cartas boca abajo: ← da vuelta la de la izquierda (IA tradicional) · → la de la derecha (IA generativa).
            Quedan abiertas; con las dos abiertas aparece "Siguiente" y Enter avanza.
   2 · 3.3  Científico sobre las cartas
   3 · 3.4  Científico + sentidos
   4 · 3.5  Sentidos (menú) y 3.5.1 … 3.5.4 (visión, audición, olfato, tacto)
   5 · 3.6  Aparece solo cuando viste los 4 sentidos
   6 · 3.7  Lógica clásica (muerto 0 / vivo 1)
   7 · 3.8  Lógica difusa (barra de 9 pasos)
   8 · 3.9  Elige una habilidad: carrusel vertical (↑ ↓) · Enter o → elige · ← vuelve
   9 · 3.10 Resultados de la clase elegida (DPS, Tanque o Healer) · Enter termina
   Teclas: Enter / Espacio = avanzar · ← → = elegir (cartas, sentidos, lógica clásica y difusa) · ← = volver en las pantallas simples.
   Al terminar emite 'npclab:conciencia' y vuelve al menú de núcleos ('npclab:backtocores'). */

var NPC_COLORS = { 'Material': 0xe8e8e8, 'Material.001': 0x1a1a1a };

var TXT_A = 'Ahora veamos cómo el NPC percibe el mundo a través de <span class="cy">sentidos virtuales</span>. Ve, escucha, huele y siente.';
var TXT_B = 'La <span class="cy">simulación sensorial</span>, que <span class="cy">emula sentidos</span> humanos.';

/* Imágenes de la izquierda de cada sentido (las ponés vos en la carpeta img) */
var SENSES = [
  { n:'Visión',   img:'img/sentido-vision.png',   html:'Cono de líneas invisibles para <b class="hl">verificar</b> si hay <b class="hl">paredes</b> u <b class="hl">obstáculos</b> bloqueando la vista física entre ambos.' },
  { n:'Audición', img:'img/sentido-audicion.png', html:'Esfera invisible de percepción que <b class="hl">detecta ruidos cercanos</b>.' },
  { n:'Olfato',   img:'img/sentido-olfato.png',   html:'Estela invisible que el personaje <b class="hl">sigue</b> y puede ir tras un <b class="hl">objetivo</b> aunque <b class="hl">no lo vea ni lo oiga</b>.' },
  { n:'Tacto',    img:'img/sentido-tacto.png',    html:'<b class="hl">Detecta objetos por proximidad</b>, cuando algo entra <b class="hl">en un radio muy corto</b> alrededor del NPC, el personaje lo percibe.' }
];

/* Íconos chicos (viewBox 70×70) para las etiquetas de la barra */
var IC = {
  plus:  '<path d="M22 0h26v22h22v26H48v22H22V48H0V22h22z" fill="#4ea844"/>',
  skull: '<path d="M35 0C16 0 4 13 4 30c0 9 4 16 11 20v14h9v-7h6v7h10v-7h6v7h9V50c7-4 11-11 11-20C66 13 54 0 35 0Z" fill="#e0231f"/><circle cx="21" cy="30" r="8" fill="#02010a"/><circle cx="49" cy="30" r="8" fill="#02010a"/><path d="M35 40l-4 8h8z" fill="#02010a"/>',
  kit:   '<rect x="2" y="18" width="66" height="48" rx="8" fill="#e0231f"/><path d="M22 18V9a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v9" fill="none" stroke="#e0231f" stroke-width="6"/><path d="M31 30h8v10h10v8H39v10h-8V48H21v-8h10z" fill="#fff"/>',
  shield:'<path d="M35 2L62 10V34C62 52 50 64 35 70C20 64 8 52 8 34V10Z" fill="#e0b040"/><path d="M35 2L62 10V34C62 52 50 64 35 70Z" fill="#a67c1c"/>',
  sword: '<path d="M60 2l8 8-34 34-8-8z" fill="#4ea844"/><path d="M14 34l22 22-6 6L8 40z" fill="#4ea844"/><path d="M8 56l6 6-8 8-6-6z" fill="#4ea844"/>'
};
/* Íconos de las cartas (viewBox 100×100) */
var CARDS = {
  g:{ t:'IA Generativa', tx:['Memoria persistente','Diálogos en tiempo real','Posibilidades infinitas'], ic:[
    '<path d="M50 10C38 2 20 8 20 24C8 26 6 42 14 50C6 58 10 76 24 78C26 90 42 94 50 88M50 10C62 2 80 8 80 24C92 26 94 42 86 50C94 58 90 76 76 78C74 90 58 94 50 88M50 10V88M50 34H36M50 52H30M50 70H38M62 28h12M62 46h18M62 64h10"/>',
    '<path d="M68.6 73.5L86 92 81.8 56.3A36 36 0 1 0 68.6 73.5Z"/>',
    '<path d="M50 50C42 26 6 26 6 50C6 74 42 74 50 50C58 26 94 26 94 50C94 74 58 74 50 50Z" stroke-width="11"/>'] },
  t:{ t:'IA tradicional', tx:['Habla con reglas ya escritas','Contestaciones predecibles','Diálogos repetitivos'], ic:[
    '<path d="M28 40V26Q28 8 50 8Q72 8 72 26V40"/><rect x="14" y="40" width="72" height="54"/><path d="M45 58h10v22H45zM38 64h24v10H38z" fill="currentColor" stroke="none"/>',
    '<path d="M10 12h80v56H72l4 22-26-22H10z"/><path d="M26 30h48M26 48h48" stroke-width="9"/>',
    '<path d="M18 52A32 32 0 0 1 76 34"/><path d="M64 18l28 8-14 24z" fill="currentColor" stroke="none"/><path d="M82 48A32 32 0 0 1 24 66"/><path d="M36 82L8 74l14-24z" fill="currentColor" stroke="none"/>'] }
};
var IY=[153,352,558], TY=[248,444,637];                    // posición (dentro de la carta) de cada ícono y de su texto

var DCOL = ['#e23a22','#e25a26','#e67a30','#e59a3a','#e0b34a','#c8b04c','#aaa84a','#92ab48','#72a844'];   // 9 pasos de la lógica difusa

/* ---- 3.9 · Habilidades (el orden es el del carrusel: ↓ avanza al siguiente, ↑ al anterior) ----
   n = nombre en el carrusel · img = ícono (carpeta img) · html = descripción (.kc = resaltado celeste)
   r = resultado de esa clase: n = título · color · desc = descripción · ls = lista · npc = cómo se ve tu NPC */
var SK = [
  { n:'VITALIDAD', img:'img/botiquin.png',
    html:'La <span class="kc">velocidad de regeneración</span> de energía y curación en área <span class="kc">aumenta</span> un <span class="kc">+ 60%</span>.',
    r:{ n:'Healer', color:'#ff1a1a',
      desc:'Mantiene con vida a todo el equipo mediante la <b class="hl">curación constante</b> de heridas y la <b class="hl">restauración de salud</b>. Su labor es clave para asegurar la <b class="hl">resistencia</b> de la escuadra en combate.',
        ls:['Curación en área','Regeneración de energía','Capacidad de curar aliados','Salud máxima + 50%','Buen uso de bastones','Mal uso de espada/arcos'],
        npc:{ pose:'heal', prop:'kit' } } },
  { n:'FUERZA', img:'img/espada.png',
    html:'El <span class="kc">daño de ataque</span> base <span class="kc">escala</span> un <span class="kc">+ 40%</span> y adquiere velocidad de <span class="kc">golpe acelerada</span>.',
    r:{ n:'DPS', color:'#1fe01f',
      desc:'Se especializa en infligir el <b class="hl">máximo daño ofensivo</b> posible para eliminar enemigos de forma <b class="hl">rápida y letal</b>. Aunque posee una <b class="hl">defensa frágil</b>, compensa con <b class="hl">gran velocidad</b>.',
        ls:['Daño crítico maximizado','Movilidad aumentada + 50%','Ataque base + 40%','Buen uso de dagas/arcos','Mal uso de armas pesadas'],
        npc:{ pose:'attack', ry:.85, feet:868, prop:'sword' } } },
  { n:'PROTECCIÓN', img:'img/escudo.png',
    html:'La <span class="kc">barra de vida</span> máxima <span class="kc">aumenta</span> un <span class="kc">+ 50%</span> y <span class="kc">absorbe impactos</span> de daño crítico.',
    r:{ n:'Tanque', color:'#ff8a1a',
      desc:'Se encarga de <b class="hl">absorber todo el daño enemigo</b> en la primera línea de combate. Actúa como el <b class="hl">muro de contención</b> del equipo para <b class="hl">proteger a los compañeros</b> más vulnerables.',
        ls:['Salud aumentada + 50%','Atrae enemigos','Velocidad reducida - 25%','Buen uso de martillos','Nulo conocimiento mágico','Absorbe el daño de críticos'],
        npc:{ pose:'shield', ry:.9, feet:868, prop:'shield' } } }
];
POSES.heal = pose({ rth:.42, reb:.45 });          // healer: el brazo derecho (el de la derecha de la pantalla) sostiene el botiquín

/* ---- NPC de las pantallas 3.7 y 3.8: dónde está y cómo se ve en cada estado (px del diseño 1920×1080) ----
   x = centro · y = pies · h = alto · ry = giro · rz = inclinación · drop = cuánto baja el cuerpo (sentado, agachado)
   feet = y (px del diseño) donde quedan los pies · mid = y donde queda el centro del cuerpo (se calcula con la pose real, en place()) */
var BASE = { x:1450, y:850, h:610 };
var LST = {
  neutral:{ pose:'idle',   face:'none' },
  dead:   { pose:'dead',   face:'x',      rz:-.5, ry:.25, x:1380 },
  alive:  { pose:'wave',   face:'none',   ry:-.3 },
  sit:    { pose:'sit',    face:'spiral', ry:-.8, mid:554, x:1450 },      // centrado en el cuadro (212–897)
  shield: { pose:'shield', face:'none',   ry:.9,  feet:865, prop:'shield' },  // los pies dentro del cuadro
  attack: { pose:'attack', face:'none',   ry:.85, feet:880, prop:'sword' }
};

/* ---- Etiquetas sobre las barras: ic = ícono · ix/iy/iw = su posición y ancho · tx/ty = texto · l = inicio de la línea ---- */
var CL = {
  neutral:{ lines:['Estado','neutro'], tx:581, ty:590, fs:34, color:'#a0a0a8', l:[558,633,500,708] },
  dead:   { ic:IC.skull, ix:545, iy:570, iw:75, lines:['Muerto'], tx:645, ty:584, fs:52, color:'#e0231f', l:[528,645,465,712] },
  alive:  { ic:IC.plus,  ix:580, iy:580, iw:70, lines:['Vivo'],   tx:675, ty:584, fs:52, color:'#4ea844', l:[652,657,715,722] }
};
var DL = [
  { lines:['Estado','neutro'], tx:527, ty:595, fs:34, color:'#a0a0a8', l:[505,642,445,707] },
  { ic:IC.kit,    ix:400, iy:566, iw:68, lines:['Se cura','o muere'],           tx:490, ty:566, fs:34, color:'#e0231f', l:[375,640] },
  { ic:IC.shield, ix:645, iy:541, iw:62, lines:['Toma distancia','y se cubre'], tx:727, ty:541, fs:34, color:'#e0b040', l:[652,615] },
  { ic:IC.sword,  ix:795, iy:555, iw:66, lines:['Ataca y','persigue'],          tx:874, ty:548, fs:34, color:'#4ea844', l:[848,637] }
];

(function(){
  var NS='http://www.w3.org/2000/svg';
  var $=function(id){ return document.getElementById(id); };
  var cores=$('cores'), scene=$('conciencia'), cv=$('cNpc'), sr=$('cSr'),
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var slides=[].slice.call(scene.querySelectorAll('.c-slide')).map(function(el){ return { el:el, on:el.dataset.on.split(' ').map(Number) }; });
  var btns=[].slice.call(scene.querySelectorAll('.c-sense'));
  var i=0, active=false, ready=false, built=false, done=false, typing=false, timer=null, finishNow=null;
  var cardOpen={g:false,t:false}, flipping={g:false,t:false};   // g = IA generativa (derecha) · t = IA tradicional (izquierda)
  var cfoc='t';   // carta/botón marcado en 3.2: 't' izquierda · 'g' derecha · 'n' Siguiente
  var sense=-1, focus=0, visited=[false,false,false,false], allOn=false;
  var clv=null, claSeen=[false,false];                  // lógica clásica: null = neutro · 0 = muerto · 1 = vivo
  var dn=0, difSeen=[true,false,false,false];           // lógica difusa: 0 = neutro · 1…9 = pasos
  var sk=0, kItems=[];                                  // habilidad elegida (índice en SK) y los elementos del carrusel
  var choice={}, pname='Nombre', extrasOn=false, extras=[], extrasShow=true;
  var seg6=[], seg7=[];

  document.addEventListener('npclab:hairchosen',function(e){ choice.hair=e.detail.id; });
  document.addEventListener('npclab:outfit',function(e){ choice.outfit=e.detail&&e.detail.id; });
  document.addEventListener('npclab:nombre',function(e){ pname=e.detail.name; });

  function el(tag,attrs,parent){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(parent) parent.appendChild(e); return e; }

  /* ---------- 3.2 · Cartas: frente (texto), adornos oscuros del dorso y signos de pregunta en píxeles ---------- */
  function buildCards(){
    [].forEach.call(scene.querySelectorAll('.c-card'),function(c){
      var D=CARDS[c.dataset.k], h='<h3>'+D.t+'</h3>';
      for(var k=0;k<3;k++) h+='<svg class="ic" viewBox="0 0 100 100" style="--y:'+(IY[k]-56)+'" aria-hidden="true">'+D.ic[k]+'</svg><p style="--y:'+(TY[k]-17)+'">'+D.tx[k]+'</p>';
      c.querySelector('.front').innerHTML=h;
    });
    var art=$('cArt'), dk='#26262e', dk2='#34343e';
    var ag=el('g',{id:'cArtG',transform:'translate(805 0)'},art);    // burbujas y estrellas (IA generativa) → carta de la derecha
    var at=el('g',{id:'cArtT',transform:'translate(-805 0)'},art);   // engranajes (IA tradicional) → carta de la izquierda
    function bubble(x,y,rx,ry,glyph){
      var dir=x<558?1:-1;
      el('path',{d:'M'+(x+dir*rx*.35)+' '+(y+ry*.8)+'L'+(x+dir*rx*.95)+' '+(y+ry*1.35)+'L'+(x+dir*rx*.8)+' '+(y+ry*.35)+'Z',fill:dk},ag);
      el('ellipse',{cx:x,cy:y,rx:rx,ry:ry,fill:dk},ag);
      if(glyph){ var t=el('text',{x:x,y:y,'text-anchor':'middle','dominant-baseline':'central','font-weight':700,'font-size':ry*1.2,'font-family':'Montserrat,Arial,sans-serif',fill:dk2},ag); t.textContent=glyph; }
    }
    [[430,413,32,30,'!'],[692,410,32,30,'?'],[374,465,28,21,''],[435,490,29,27,'?'],[690,490,29,27,'?'],[754,465,28,21,''],
     [378,540,32,25,'#'],[755,540,32,25,'#'],[410,606,29,24,'!'],[717,606,29,24,'!'],[455,663,28,26,'#'],[671,663,28,26,'#']].forEach(function(b){ bubble.apply(null,b); });
    function star(x,y,r){ var q=.24, d=''; [[0,-1],[q,-q],[1,0],[q,q],[0,1],[-q,q],[-1,0],[-q,-q]].forEach(function(p,j){ d+=(j?'L':'M')+(x+p[0]*r)+' '+(y+p[1]*r); }); el('path',{d:d+'Z',fill:dk2},ag); }
    [[480,320,22],[605,293,22],[630,327,16],[550,318,18],[500,342,12],[580,340,10],[520,296,10]].forEach(function(s){ star(s[0],s[1],s[2]); });
    function gearPath(cx,cy,ro,ri,n,hole,rot){
      var d='', st=2*Math.PI/n;
      for(var k=0;k<n;k++){ var a=rot+k*st; [[ri,-.30],[ro,-.17],[ro,.17],[ri,.30]].forEach(function(p,j){ d+=(k+j?'L':'M')+(cx+Math.cos(a+p[1]*st)*p[0]).toFixed(1)+' '+(cy+Math.sin(a+p[1]*st)*p[0]).toFixed(1); }); }
      return d+'Z M'+(cx+hole)+' '+cy+'A'+hole+' '+hole+' 0 1 0 '+(cx-hole)+' '+cy+'A'+hole+' '+hole+' 0 1 0 '+(cx+hole)+' '+cy+'Z';
    }
    [[1185,330,44,34,9,12,0],[1135,395,34,26,8,9,.3],[1545,705,58,46,10,16,.2],[1590,640,40,32,9,11,.5]].forEach(function(g){
      el('path',{d:gearPath(g[0],g[1],g[2],g[3],g[4],g[5],g[6]),'fill-rule':'evenodd',fill:dk},at); });
    function q(x,y,color,k){                                  // signo de pregunta en píxeles (celdas de 40 px)
      var g=el('g',{fill:color,class:'c-q','data-k':k},$('cQ'));
      ['.XX.','X..X','...X','..X.','.X..','....','.X..'].forEach(function(row,r){ for(var c=0;c<4;c++) if(row[c]==='X') el('rect',{x:x+c*40,y:y+r*40,width:40,height:40},g); });
    }
    q(480,483,'rgba(241,10,245,.9)','t'); q(1288,483,'rgba(40,240,205,.88)','g');   // izquierda = tradicional (magenta) · derecha = generativa (cian)
  }

  /* ---------- Estado de las cartas: cada una se abre por separado y queda abierta ---------- */
  function applyCards(){
    var both=cardOpen.g&&cardOpen.t;
    [].forEach.call($('cs1').querySelectorAll('.c-card'),function(c){
      c.classList.toggle('open',!!cardOpen[c.dataset.k]);
      c.classList.toggle('foc',i===1&&cfoc===c.dataset.k);
    });
    $('cArtG').style.visibility=cardOpen.g?'hidden':'visible';
    $('cArtT').style.visibility=cardOpen.t?'hidden':'visible';
    [].forEach.call($('cQ').querySelectorAll('.c-q'),function(g){ g.style.visibility=cardOpen[g.dataset.k]?'hidden':'visible'; });
    $('cBtn1').classList.toggle('hide',!(i===1&&both));
    $('cBtn1').classList.toggle('foc',i===1&&cfoc==='n');
    syncNpc();
  }
  function flipCard(k){
    if(i!==1||flipping[k]) return;
    flipping[k]=true; cfoc=k;
    var c=scene.querySelector('.c-card[data-k="'+k+'"]');
    function swap(){
      cardOpen[k]=!cardOpen[k]; flipping[k]=false;
      if(cardOpen.g&&cardOpen.t) cfoc='n';                       // con las dos abiertas, el foco pasa a Siguiente
      applyCards();
      sr.textContent=cardOpen[k]?CARDS[k].t+': '+CARDS[k].tx.join(', ')+'.'+((cardOpen.g&&cardOpen.t)?' Enter para continuar.':''):CARDS[k].t+' boca abajo.';
    }
    if(reduce){ swap(); return; }
    c.classList.add('fl');
    setTimeout(function(){ swap(); c.offsetWidth; c.classList.remove('fl'); },240);
  }

  /* ---------- Medidores (3.7 y 3.8) ---------- */
  function mkSegs(parent,list,arr,onpick){
    list.forEach(function(s,k){
      var b=document.createElement('i'); b.className='c-seg';
      b.style.cssText='--x:'+s[0]+';--y:'+s[1]+';--w:'+s[2]+';--h:130';
      b.addEventListener('click',function(e){ e.stopPropagation(); onpick(k); });
      parent.appendChild(b); arr.push(b);
    });
  }
  function buildMeters(){
    mkSegs($('cM6'),[[71,16,340],[431,16,340]],seg6,function(k){ claSet(k); });
    var l=[]; for(var k=0;k<9;k++) l.push([83+80*k,22,60]);
    mkSegs($('cM7'),l,seg7,function(k){ difSet(Math.ceil((k+1)/3)*3); });
  }

  /* ---------- 3.9 · Carrusel de habilidades: se arma desde SK ---------- */
  function buildSkills(){
    var box=$('kList');
    SK.forEach(function(s,k){
      var it=document.createElement('div'); it.className='k-it'; it.dataset.i=k;
      it.innerHTML='<span class="k-tile"><img alt=""></span><span class="k-lab">'+s.n+'</span>';
      var im=it.querySelector('img'); im.onerror=function(){ im.style.visibility='hidden'; }; im.src=s.img;
      box.appendChild(it); kItems.push(it);
    });
  }
  /* Cada elemento ocupa un lugar: -1 arriba · 0 centro (elegido, con su descripción) · 1 abajo.
     Con 3 habilidades el carrusel es circular: el que sale por arriba aparece por abajo (y al revés). */
  function renderSkill(animate){
    var n=SK.length;
    kItems.forEach(function(it,k){
      var s=((k-sk+1)%n+n)%n-1, old=+it.dataset.s;
      var wrap=animate&&!reduce&&!isNaN(old)&&Math.abs(s-old)>1;          // el que da la vuelta no cruza el centro: reaparece del otro lado
      if(wrap){ it.style.transition='none'; it.style.opacity='0'; }
      it.style.setProperty('--s',s); it.dataset.s=s; it.classList.toggle('sel',s===0);
      if(wrap){ it.offsetWidth; it.style.transition=''; it.style.opacity=''; }
    });
    $('kPanT').textContent=SK[sk].n; $('kPanP').innerHTML=SK[sk].html;
    sr.textContent='Elige una habilidad. '+SK[sk].n+': '+$('kPanP').textContent+' Flechas arriba y abajo para cambiar, Enter para elegir.';
  }
  function skillSet(k){ sk=(k+SK.length)%SK.length; renderSkill(true); }

  /* ---------- 3.10 · Resultado de la clase elegida ---------- */
  function renderResult(){
    var C=SK[sk].r, t=$('cCls');
    $('cName').textContent=pname;
    t.textContent=C.n; t.style.color=C.color;
    $('cDd').innerHTML='<span>'+C.desc+'</span>';
    $('cLs').innerHTML=C.ls.map(function(x){ return '<li>'+x+'</li>'; }).join('');
    var im=$('cIc'); im.style.visibility='visible'; im.onerror=function(){ im.style.visibility='hidden'; }; im.src=SK[sk].img;
    sr.textContent='Resultados de '+pname+'. '+C.n+'. '+$('cDd').textContent+' '+C.ls.join(', ')+'.';
  }

  /* ---------- Globos del científico ---------- */
  function bubbleD(w,h,t){
    var s='M20.5 3.5H'+(w-20.5)+'Q'+(w-3.5)+' 3.5 '+(w-3.5)+' 20.5';
    if(t==='l') return s+'V'+(h-20.5)+'Q'+(w-3.5)+' '+(h-3.5)+' '+(w-20.5)+' '+(h-3.5)+'H32L0 '+(h+5)+'Q-7 '+(h+8)+' -6 '+(h+2)+'Q-2 '+(h-13)+' 3.5 '+(h-30)+'V20.5Q3.5 3.5 20.5 3.5Z';
    return s+'V'+(h-30)+'Q'+(w+2)+' '+(h-13)+' '+(w+6)+' '+(h+2)+'Q'+(w+7)+' '+(h+8)+' '+w+' '+(h+5)+'L'+(w-32)+' '+(h-3.5)+'H20.5Q3.5 '+(h-3.5)+' 3.5 '+(h-20.5)+'V20.5Q3.5 3.5 20.5 3.5Z';
  }
  function drawBub(b){
    var w=parseFloat(b.style.getPropertyValue('--w')), h=parseFloat(b.style.getPropertyValue('--h')), svg=b.querySelector('svg');
    svg.setAttribute('viewBox','0 0 '+w+' '+h); svg.firstElementChild.setAttribute('d',bubbleD(w,h,b.dataset.tail));
  }
  function typeBubble(b,html){
    var g=b.querySelector('.g'), t=b.querySelector('.t'), nx=b.querySelector('.cnext');
    g.innerHTML=html; t.innerHTML=html; nx.classList.add('hide'); sr.textContent='';
    var nodes=[], w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);
    while(w.nextNode()) nodes.push(w.currentNode);
    var full=nodes.map(function(x){ return x.nodeValue; }), total=full.join('').length, c=0;
    function paint(){ var left=c; nodes.forEach(function(nd,k){ var take=Math.max(0,Math.min(full[k].length,left)); nd.nodeValue=full[k].slice(0,take); left-=take; }); }
    finishNow=function(){ clearInterval(timer); typing=false; c=total; paint(); sr.textContent=g.textContent; nx.classList.remove('hide'); };
    if(reduce){ finishNow(); return; }
    typing=true; paint();
    timer=setInterval(function(){ c++; paint(); if(c>=total) finishNow(); },22);
  }

  /* ---------- Three.js: los NPC (tu TALLER.obj) con poses hechas por código (rig.js) ---------- */
  var R=null, S=null, cam=null, K=0, src=null, slots={}, want={}, last=performance.now();
  var SLOT_DEF = { gen:{tint:.2}, trad:{tint:.2}, sens:{}, logic:{}, res:{} };

  function initThree(){
    R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true}); R.setClearColor(0x000000,0);
    S=new THREE.Scene(); cam=new THREE.PerspectiveCamera(30,16/9,.1,60); cam.position.set(0,0,10);
    K=2*10*Math.tan(THREE.MathUtils.degToRad(15))/1080;                  // unidades 3D por px del diseño
    S.add(new THREE.HemisphereLight(0xffffff,0x8a7fc8,1.0));
    var key=new THREE.DirectionalLight(0xffffff,1.8); key.position.set(-2.5,3,5); S.add(key);
    var rim=new THREE.DirectionalLight(0x66a8ff,.7); rim.position.set(3,1,-3); S.add(rim);

    new OBJLoader().load(NPC_URL,function(obj){
      obj.traverse(function(m){
        if(!m.isMesh) return;
        var list=Array.isArray(m.material)?m.material:[m.material];
        var out=list.map(function(old){ return new THREE.MeshStandardMaterial({color:NPC_COLORS[old.name]!==undefined?NPC_COLORS[old.name]:0xe8e8e8,roughness:.85}); });
        m.material=Array.isArray(m.material)?out:out[0];
      });
      src=obj;
      Object.keys(SLOT_DEF).forEach(function(k){ makeSlot(k,SLOT_DEF[k]); });
      syncNpc();
      try{ vestir(); }catch(err){ console.error('Ropa:',err); }
      try{ peinar(); }catch(err){ console.error('Pelo:',err); }
    },undefined,function(err){ console.error('Falló la carga o el armado del NPC:',err); });

    new ResizeObserver(function(){
      var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return;
      R.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); R.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();
    }).observe(cv);

    (function loop(now){
      requestAnimationFrame(loop);
      if(scene.hidden||!R) return;
      var dt=Math.min(.05,(now-last)/1000); last=now;
      Object.keys(slots).forEach(function(k){
        var s=slots[k]; if(!s.holder.visible) return;
        var moving=false;
        Object.keys(s.tgt).forEach(function(p){ var d=s.tgt[p]-s.cur[p]; if(Math.abs(d)>.002){ s.cur[p]+=d*(1-Math.exp(-dt*11)); moving=true; } else s.cur[p]=s.tgt[p]; });
        var wave=s.cfg&&s.cfg.pose==='wave'&&!reduce, P=s.cur;
        if(wave){ P=Object.assign({},s.cur); P.leb+=Math.sin(now/1000*7)*.28; }
        if(moving||s.dirty||wave){ s.rig.apply(P); updateProps(s,P); s.dirty=false; }
      });
      R.render(S,cam);
    })(last);
  }

  var peinado=false;
  function peinar(){                                   // el pelo elegido va pegado a la cabeza de todos los NPC
    var cfg=HAIR_MODELS[choice.hair];
    if(peinado||!cfg) return;
    peinado=true;
    new OBJLoader().load(cfg.url,function(o){
      try{
        o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.85,side:THREE.DoubleSide}); });
        Object.keys(slots).forEach(function(k){ slots[k].rig.hair(o); });
      }catch(err){ console.error('Pelo:',err); }
    },undefined,function(err){ peinado=false; console.error('No se pudo cargar '+cfg.url,err); });
  }

  function vestir(){                                   // el atuendo elegido sigue las poses del cuerpo
    if(!choice.outfit) return;
    cargarAtuendo(choice.outfit,function(o){
      if(!o) return;
      Object.keys(slots).forEach(function(k){ slots[k].rig.dress(o); });
    });
  }

  function makeSlot(name,def){
    var rig=makeRig(src,def.tint), holder=new THREE.Group(), tilt=new THREE.Group(), pivot=new THREE.Group();
    var c=rig.bb.getCenter(new THREE.Vector3());
    rig.obj.position.set(-c.x,-rig.bb.min.y,-c.z);                       // centrado y apoyado en el piso
    pivot.rotation.y=NPC_FACING; pivot.add(rig.obj); tilt.add(pivot); holder.add(tilt); holder.visible=false; S.add(holder);
    var t=def.tint===undefined?1:def.tint;
    var sword=new THREE.Group();
    sword.add(new THREE.Mesh(new THREE.BoxGeometry(.14,1.7,.04),new THREE.MeshStandardMaterial({color:new THREE.Color(0xdedee6).multiplyScalar(t),roughness:.4})));
    sword.children[0].position.y=1.05;
    var gd=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.5),new THREE.MeshStandardMaterial({color:0x2a2a30})); gd.position.y=.2; sword.add(gd);
    var gp=new THREE.Mesh(new THREE.BoxGeometry(.1,.45,.1),new THREE.MeshStandardMaterial({color:0x1c1c22})); gp.position.y=-.05; sword.add(gp);
    var sh=new THREE.Shape(); sh.moveTo(-.6,.8); sh.lineTo(.6,.8); sh.lineTo(.6,-.1); sh.quadraticCurveTo(.5,-.6,0,-.85); sh.quadraticCurveTo(-.5,-.6,-.6,-.1); sh.lineTo(-.6,.8);
    var shield=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:0x8c8c96,roughness:.6}));
    var paper=new THREE.Mesh(new THREE.BoxGeometry(.04,.62,.46),new THREE.MeshStandardMaterial({color:new THREE.Color(0xe6e6ea).multiplyScalar(t),roughness:.8}));
    /* Botiquín del healer: caja gris con asa y cruz roja de frente (la cara grande mira hacia +X, igual que el NPC) */
    var kit=new THREE.Group();
    var kb=new THREE.Mesh(new THREE.BoxGeometry(.16,.34,.5),new THREE.MeshStandardMaterial({color:0xd4d4d8,roughness:.6})); kit.add(kb);
    var kh=new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.22),new THREE.MeshStandardMaterial({color:0x7c7c84,roughness:.6})); kh.position.y=.2; kit.add(kh);
    var kr=new THREE.MeshStandardMaterial({color:0xe01010,roughness:.5});
    var k1=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.07),kr); k1.position.x=.085; kit.add(k1);
    var k2=new THREE.Mesh(new THREE.BoxGeometry(.02,.07,.2),kr); k2.position.x=.085; kit.add(k2);
    [sword,shield,paper,kit].forEach(function(m){ m.visible=false; m.scale.setScalar(JOINTS.k); rig.obj.add(m); });   // accesorios hechos para el modelo viejo (el doble de grande)
    slots[name]={ name:name, rig:rig, holder:holder, tilt:tilt, pivot:pivot, cur:Object.assign({},POSES.rest), tgt:Object.assign({},POSES.rest), cfg:null, dirty:true, props:{sword:sword,shield:shield,paper:paper,kit:kit}, kind:null };
  }
  function place(s,cfg){
    var first=!s.holder.visible; s.cfg=cfg; s.holder.visible=true;
    s.holder.scale.setScalar(cfg.h*K/s.rig.H);
    s.holder.position.set((cfg.x-960)*K,(540-cfg.y)*K,0);
    s.tilt.rotation.z=cfg.rz||0; s.pivot.rotation.y=NPC_FACING+(cfg.ry||0);
    var c=s.rig.bb.getCenter(new THREE.Vector3());
    s.tgt=Object.assign({},POSES[cfg.pose||'idle']);
    if(first||reduce) s.cur=Object.assign({},s.tgt);
    var off=-s.rig.bb.min.y;                                              // por defecto: los pies en y
    if(cfg.feet!==undefined||cfg.mid!==undefined){                        // con la pose puesta se mide el cuerpo y se lo ubica
      s.rig.apply(s.tgt); var b=s.rig.bounds(), px=cfg.h/s.rig.H;         // px = píxeles del diseño por unidad del modelo
      off=cfg.feet!==undefined?(cfg.y-cfg.feet)/px-b.minY:(cfg.y-cfg.mid)/px-(b.minY+b.maxY)/2;
    }
    s.rig.obj.position.set(-c.x,off,-c.z);
    s.rig.setFace(cfg.face||'none'); s.kind=cfg.prop||null; s.dirty=true;
  }
  function updateProps(s,P){
    var pr=s.props, k=s.kind, q=JOINTS.k;
    pr.sword.visible=k==='sword'; pr.shield.visible=k==='shield'; pr.paper.visible=k==='paper'; pr.kit.visible=k==='kit';
    if(k==='sword'){ var a=s.rig.armPoint(1,1.15,P); pr.sword.position.copy(a); pr.sword.rotation.set(0,0,-.55); }
    else if(k==='shield'){ var h=s.rig.armPoint(1,1.15,P); pr.shield.scale.setScalar(q*.5); pr.shield.position.set(h.x+.2*q,h.y+.05*q,h.z); pr.shield.rotation.set(0,Math.PI/2,0); }
    else if(k==='paper'){ var p=s.rig.armPoint(-1,1.15,P); pr.paper.position.set(p.x+.1*q,p.y+.12*q,p.z); pr.paper.rotation.set(0,0,.2); }
    else if(k==='kit'){ var m=s.rig.armPoint(-1,1.15,P); pr.kit.position.set(m.x,m.y-.2*q,m.z); pr.kit.rotation.set(0,0,0); }   // cuelga de la mano derecha
  }
  function cfgFor(n){
    function m(o,add){ return Object.assign({},o,add); }
    if(n===1){                                                            // cada NPC se ve solo mientras su carta está cerrada
      var o={};
      if(!cardOpen.g) o.gen={x:1363,y:822,h:468,pose:'open'};                                   // IA generativa → derecha
      if(!cardOpen.t) o.trad={x:558,y:812,h:468,pose:'paper',prop:'paper',ry:.2};               // IA tradicional → izquierda
      return o;
    }
    if(n===3) return { sens:{x:1157,y:1675,h:1500,pose:'idle'} };
    if(n===4||n===5) return { sens:{x:961,y:1675,h:1500,pose:(n===4&&sense===3)?'touch':'idle',face:(n===5||sense>=0)?'eyes':'none'} };
    if(n===6) return { logic:m(BASE,LST[clv===null?'neutral':clv===0?'dead':'alive']) };
    if(n===7){ var st=difState(); return { logic:m(BASE,LST[['neutral','sit','shield','attack'][st]]) }; }
    if(n===8) return { res:{x:424,y:868,h:612,pose:'rest'} };                              // Elige una habilidad: en pose original (calza con peinado y ropa)
    if(n===9) return { res:m({x:362,y:868,h:640},SK[sk].r.npc) };                            // Resultados: con la pose y el accesorio de la clase
    return {};
  }
  function syncNpc(){
    if(!src) return;
    want=cfgFor(i);
    Object.keys(slots).forEach(function(k){ if(want[k]) place(slots[k],want[k]); else slots[k].holder.visible=false; });
  }
  /* Peinado y atuendo que elegiste (si los modelos existen). Siguen la pose original: en los resultados, con otra pose, se ocultan */
  function mountExtras(){
    if(extrasOn||!slots.res) return; extrasOn=true;
    function add(cfg){ if(!cfg) return;
      new OBJLoader().load(cfg.url,function(o){
        o.traverse(function(m){ if(m.isMesh) m.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.85,side:THREE.DoubleSide}); });
        o.visible=extrasShow; extras.push(o);
        slots.res.rig.obj.add(o);
      },undefined,function(){});
    }
  }
  function showExtras(v){ extrasShow=v; extras.forEach(function(o){ o.visible=v; }); }

  /* ---------- Etiquetas y líneas ---------- */
  function setLab(box,ln,L,x2,y2){
    var h='';
    if(L.ic) h+='<svg class="lic" viewBox="0 0 70 70" style="--x:'+L.ix+';--y:'+L.iy+';--w:'+L.iw+'" aria-hidden="true">'+L.ic+'</svg>';
    h+='<p class="ltx" style="--x:'+L.tx+';--y:'+L.ty+';--fs:'+L.fs+'">'+L.lines.join('<br>')+'</p>';
    box.innerHTML=h;
    ln.setAttribute('x1',L.l[0]); ln.setAttribute('y1',L.l[1]);
    ln.setAttribute('x2',x2!==undefined?x2:L.l[2]); ln.setAttribute('y2',y2!==undefined?y2:L.l[3]); ln.setAttribute('stroke',L.color);
  }

  /* ---------- 3.5 · Sentidos ---------- */
    function renderSense(){
    var d=(i===4&&sense>=0)?1:0; scene.dataset.d=d;
    var all=!!(d&&visited.every(Boolean));
    scene.classList.toggle('all-on',allOn);                  // todos los sentidos en verde
    $('cAgT').textContent=all?'Tocá el botón para aplicar todos los sentidos':'Completá los 4 sentidos en violeta y después tocá el botón';
    btns.forEach(function(b,k){
      b.classList.toggle('vis',visited[k]&&!(d&&k===sense));
      b.classList.toggle('cur',d===1&&k===sense);
      b.classList.toggle('foc',i===4&&k===focus&&!(d&&k===sense));
    });
    if(d){
      var D=SENSES[sense], img=$('cPic');
      $('cInT').textContent=D.n; $('cInP').innerHTML=D.html;
      img.style.visibility='visible'; img.onerror=function(){ img.style.visibility='hidden'; }; img.src=D.img; img.alt=D.n;
      fitInto($('cInP'),$('cInfo'),16,.6);
      sr.textContent=D.n+'. '+$('cInP').textContent;
    } else if(i===4) sr.textContent='Sentidos de usuario. Elegí un sentido con las flechas y Enter.';
  }
  function openSense(k){
    sense=k; visited[k]=true;
    focus=nextUnvisited();                                  // el foco ya queda en el próximo sentido sin ver
    renderSense(); syncNpc();
  }

  /* ---------- 3.7 · Lógica clásica ---------- */
  function claSet(v){ clv=v; claSeen[v]=true; renderCla(); }
  function renderCla(){
    var st=clv===null?'neutral':clv===0?'dead':'alive';
    var cols=clv===null?['#a9a9a9','#a9a9a9']:clv===0?['#e31313','#10308f']:['#10308f','#4fa844'];
    seg6.forEach(function(b,k){ b.style.background=cols[k]; });
    $('cFr6').className='c-fr '+st;
    setLab($('cLab6'),$('cLn6'),CL[st]);
    $('cBtn6').classList.toggle('hide',!(claSeen[0]&&claSeen[1]));
    syncNpc();
    sr.textContent='Lógica clásica: '+(clv===null?'estado neutro':clv===0?'muerto (0)':'vivo (1)');
  }
  /* ---------- 3.8 · Lógica difusa ---------- */
  function difState(){ return dn===0?0:dn<=3?1:dn<=6?2:3; }
  function difSet(v){ dn=Math.max(0,Math.min(9,Math.round(v/3)*3)); difSeen[difState()]=true; renderDif(); }   // 0 · 3 · 6 · 9
  function renderDif(){
    var st=difState();
    seg7.forEach(function(b,k){ b.style.background=k<dn?DCOL[k]:(dn===0?'#a9a9a9':'#10308f'); });
    $('cFr7').className='c-fr '+['','dead','','alive'][st];
    setLab($('cLab7'),$('cLn7'),DL[st],dn?326+(dn-2)*80:undefined,dn?716:undefined);
    $('cBtn7').classList.toggle('hide',!(difSeen[1]&&difSeen[2]&&difSeen[3]));
    syncNpc();
    sr.textContent='Lógica difusa: '+dn+' de 9. '+DL[st].lines.join(' ');
  }

  /* ---------- 3.1 · los textos de las cajas se achican si no entran ---------- */
  function fitBoxes(){
    [].forEach.call(scene.querySelectorAll('.c-box'),function(b){
      fitInto(b.querySelector('h3'),b,14,.6);
      fitInto(b.querySelector('p'),b,16,.6);
    });
  }
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(!scene.hidden&&i===0) fitBoxes(); });

  /* Barra de progreso: casi completa en "Elige una habilidad" (90%) · la de Resultados no la muestra */
  var progEl=$('cProg');
  function prog(n){
    var p=n>=9?1:.9*n/8;
    progEl.style.setProperty('--p',p.toFixed(3));
    progEl.setAttribute('aria-label','Progreso: '+Math.round(p*100)+'%');
  }

  /* ---------- Pantallas ---------- */
  function hostOf(n){ for(var k=0;k<slides.length;k++) if(slides[k].on.indexOf(n)>=0) return slides[k].el; }
  function show(n){
    i=n; scene.dataset.s=n; prog(n); clearInterval(timer); typing=false;
    slides.forEach(function(s){ s.el.classList.toggle('on',s.on.indexOf(n)>=0); });
    hostOf(n).appendChild(cv);
    if(n===1) cfoc=(cardOpen.g&&cardOpen.t)?'n':null;                    // ninguna marcada: se elige con las flechas
    if(n===1||n===2) applyCards();                                        // cartas abiertas o cerradas según lo que ya diste vuelta
    scene.dataset.d=0;
    if(n===0) fitBoxes();
    if(n>=3&&n<=5){
      var nm=(document.getElementById('nText')||{}).textContent;
      if(nm&&nm.trim()) pname=nm.trim();
      $('cSenT').textContent='Sentidos de '+pname;
    }
    if(n===0) sr.textContent='Diferencias en la IA. Antes: comportamientos predefinidos. Ahora: interconexiones generativas.';
    if(n===1) sr.textContent='Dos cartas boca abajo. Flechas para elegir, Enter para darla vuelta.';
    if(n===2) typeBubble($('cBubA'),TXT_A);
    if(n===3) typeBubble($('cBubB'),TXT_B);
    if(n===4||n===5){ renderSense(); if(n===5){ sr.textContent='Sentidos completados.'; setTimeout(function(){ if(i===5&&active) pixelWipe(function(){ show(6); }); },1600); } }
    if(n===6) renderCla();
    else if(n===7) renderDif();
    else if(n===8){ renderSkill(false); mountExtras(); showExtras(true); }
    else if(n===9){ renderResult(); mountExtras(); showExtras(false); }
    if(n!==6&&n!==7) syncNpc();
  }
  function finish(){
    if(done) return; done=true; active=false;                         // Resultados queda detrás de la despedida del científico
    window.NPCLAB=window.NPCLAB||{};
window.NPCLAB.skill={ clase:SK[sk].r.n, img:SK[sk].img, prop:SK[sk].r.npc.prop };
    document.dispatchEvent(new CustomEvent('npclab:conciencia',{detail:{habilidad:SK[sk].r.n}}));
    document.dispatchEvent(new CustomEvent('npclab:outro',{detail:{id:'conciencia',clase:SK[sk].r.n,img:SK[sk].img}}));
  }

  /* ---------- Transición de 8 bits: bloques que cubren la pantalla, cambian de slide y se retiran ---------- */
  function pixelWipe(mid){
    if(reduce){ mid(); return; }
    ready=false;
    var NX=48, NY=27, T=650, cv2=document.createElement('canvas'), PAL=['#0027ff','#1d4bff','#01CBE4','#ffffff','#04021a','#e50efa'], cells=[], x, y;
    cv2.width=NX; cv2.height=NY; cv2.className='start-fx'; cv2.setAttribute('aria-hidden','true');
    $('stage').appendChild(cv2);
    var ctx=cv2.getContext('2d');
    for(y=0;y<NY;y++) for(x=0;x<NX;x++) cells.push({ x:x, y:y, d:(x/NX)*.55+Math.random()*.45, c:PAL[Math.floor(Math.random()*PAL.length)] });
    function run(cover,fin){
      var t0=performance.now();
      (function frame(now){
        var p=Math.min(1,(now-t0)/T);
        ctx.clearRect(0,0,NX,NY);
        cells.forEach(function(c){
          var on=cover?p>=c.d:p<c.d;                          // cubrir: aparece al llegar su turno · descubrir: desaparece
          if(on){ ctx.fillStyle=c.c; ctx.fillRect(c.x,c.y,1,1); }
        });
        if(p<1) requestAnimationFrame(frame); else fin();
      })(t0);
    }
    run(true,function(){
      mid();                                                  // todo cubierto: se cambia de pantalla por detrás
      requestAnimationFrame(function(){ run(false,function(){ cv2.remove(); ready=true; }); });   // descubre enseguida, sin pausa negra
    });
  }

  /* ---------- Teclado ---------- */
  function nextUnvisited(){ var k=(sense+1)%4, c=0; while(visited[k]&&c<4){ k=(k+1)%4; c++; } return k; }
  function onEnter(){
    if(typing){ finishNow(); return; }
    switch(i){
      case 0: show(1); break;
      case 1:
  if(cfoc==='n'){ if(cardOpen.g&&cardOpen.t) show(2); }
  else if(cfoc) flipCard(cfoc);                              // sin carta marcada, Enter no hace nada
  break;
      case 2: show(3); break;
      case 3: show(4); break;
      case 4:
        if(allOn) break;                                        // ya se está aplicando
        if(sense<0) openSense(focus);
        else if(visited.every(Boolean)){                        // ya viste los 4: se ponen todos en verde y recién ahí "completados"
          allOn=true; renderSense();
          setTimeout(function(){ if(i===4&&allOn) show(5); },900);   // pantalla "Sentidos completados"
        }
        else openSense(focus);                                  // abre el siguiente directo
        break;
        case 5: break;                                          // avanza sola
      case 6: if(claSeen[0]&&claSeen[1]) show(7); break;
      case 7: if(difSeen[1]&&difSeen[2]&&difSeen[3]) show(8); break;
      case 8: show(9); break;                                            // elige la habilidad marcada
      case 9: finish(); break;
    }
  }
  function onArrow(d){
    if(i===1){ cfoc=d<0?'t':'g'; applyCards(); return; }       // las flechas solo marcan
    if(i===4){ focus=(focus+d+4)%4; renderSense(); }
    else if(i===6){ claSet(d>0?1:0); }
    else if(i===7){ difSet(dn+d*3); }
    else if(d<0){ if(i===2) show(1); else if(i===3) show(2); else if(i===5) show(4); else if(i===8) show(7); else if(i===9) show(8); }
    else if(i===2||i===3||i===5||i===8) onEnter();
  }

  function onBack(){
    allOn=false;
    if(i<=0||i>=9) return;
    if(i===6){ sense=-1; visited=[false,false,false,false]; focus=0; show(3); renderSense(); return; }
    if(i===4&&sense>=0){ sense=-1; renderSense(); syncNpc(); return; }   // cierra el detalle del sentido
    if(i===5) sense=-1;
    show(i===3?1:i-1);                                                   // desde los sentidos vuelve a las cartas
  }

  function onVert(d){
    if(i===8) skillSet(sk+d);
    else if(i===1){
      if(d>0&&cardOpen.g&&cardOpen.t) cfoc='n';
      else if(d<0&&cfoc==='n') cfoc='g';
      applyCards();
    }
  }

  document.addEventListener('npclab:core',function(e){
    if(e.detail.id!=='conciencia') return;
    cores.hidden=true; scene.hidden=false; active=true; done=false; ready=false;
    setTimeout(function(){ ready=true; },400);                           // el mismo Enter no avanza
    if(!built){
      built=true; buildCards(); buildMeters(); buildSkills();
      [].forEach.call(scene.querySelectorAll('.c-bub'),drawBub);
      initThree();
    }
    cardOpen={g:false,t:false}; flipping={g:false,t:false}; sense=-1; focus=0; visited=[false,false,false,false]; allOn=false;
    clv=null; claSeen=[false,false]; dn=0; difSeen=[true,false,false,false]; sk=0;
    show(0);
  });

  btns.forEach(function(b,k){ b.addEventListener('click',function(e){ e.stopPropagation(); if(active&&ready&&i===4) openSense(k); }); });
  scene.addEventListener('pointerdown',function(e){
    if(!active||!ready) return;
    var t=e.target.closest?e.target:null; if(!t) return;
    if(t.closest('.bk')){ onBack(); return; }
    if(t.closest('.c-sense,.c-seg')) return;                             // esos tienen su propio clic
    var cd=t.closest('.c-card');                                         // un clic sobre una carta la da vuelta
    if(cd){ if(i===1) flipCard(cd.dataset.k); return; }
    if(i===0){ if(t.closest('.mv-btn')) onEnter(); return; }            // primera pantalla: solo avanza el botón Siguiente
    if(i===8){                 
      var it=t.closest('.k-it');                                         // clic en otra habilidad: la trae al centro · en la del centro: la elige
      if(it&&+it.dataset.i!==sk){ skillSet(+it.dataset.i); return; }
    }
    if(i===1){ if(t.closest('#cBtn1')&&cardOpen.g&&cardOpen.t) show(2); return; }
    onEnter();
  });
  document.addEventListener('keydown',function(e){
    if(!active||!ready) return;
    var k=e.key;
    if(k==='Enter'||k===' '){ e.preventDefault(); if(!e.repeat) onEnter(); }
    else if(k==='ArrowRight'){ e.preventDefault(); onArrow(1); }
    else if(k==='ArrowLeft'){ e.preventDefault(); onArrow(-1); }
    else if(k==='ArrowDown'){ e.preventDefault(); onVert(1); }
    else if(k==='ArrowUp'){ e.preventDefault(); onVert(-1); }
    else if(k==='Backspace'||k==='Escape'){ e.preventDefault(); onBack(); }
  });
})();
