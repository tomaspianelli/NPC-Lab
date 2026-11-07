/* ===== Despedida del científico (después de "Resultados" de cada núcleo) =====
   Cada núcleo, al dar Siguiente en Resultados, avisa con 'npclab:outro' {id, ...} en vez de volver al menú.
   Acá aparece el científico sobre los Resultados oscurecidos, con un globo del color del núcleo:
     personalidad → te da la ropa (y el pelo) que elegiste, flotando en su mano
     movimiento   → solo te señala
     conciencia   → te da el objeto de la habilidad que elegiste (espada, escudo o botiquín)
   Enter / Espacio / clic: completa el texto y, con otro, cierra la pantalla y vuelve al menú ('npclab:backtocores').
   Todo lo que se puede ajustar a ojo (posiciones, tamaños, textos) está en los bloques de abajo, en px del diseño 1920×1080. */

(function(){
  var $=function(id){ return document.getElementById(id); };

  /* ---- Textos ---- */
  var TXT_PERS = '¡Bien ahí, Doc! Su NPC ya tiene personalidad. ¡Agarre la ropa y vamos al siguiente nivel!';
  var FRASE_MOV = {                                           // nivel de movimiento.js → cómo lo describe el científico
    'Energético':'es rapidísimo',
    'Semienergético':'es rapidísimo',
    'Equilibrado':'va a un trote parejo',
    'Semilento':'es lento',
    'Lento':'es lento'
  };
  var CLASES = {                                              // nombre de la clase (conciencia.js) → qué dice el científico
    Healer:{ q:'curación', obj:'este botiquín' },
    DPS:   { q:'ataque',   obj:'esta espada' },
    Tanque:{ q:'defensa',  obj:'este escudo' }
  };
  function textFor(id,d){
    if(id==='personalidad') return TXT_PERS;
    if(id==='movimiento')   return 'Doc, su NPC '+(FRASE_MOV[d.nivel]||'va a un trote parejo')+', sigamos con el siguiente nivel para aumentarle sus habilidades';
    var c=CLASES[d.clase]||CLASES.DPS;
    return 'Doc, su NPC aprendió habilidades de '+c.q+'. Le doy '+c.obj+' para que practique, ¡Sigamos!';
  }

  /* ---- Colores del globo (el color de cada núcleo) y pantalla de Resultados que queda detrás ---- */
  var COLOR = { personalidad:'#1bff00', movimiento:'#e50efa', conciencia:'#0027ff' };
  var SCENE_OF = { personalidad:'pfinal', movimiento:'movimiento', conciencia:'conciencia' };

  /* ---- Posiciones (px del diseño) ----
     bub  = globo: x, y, w, h (la colita sale del medio, hacia abajo)
     sci  = científico (img/cientifico.gif): cx = centro horizontal, top = arriba, h = alto
     hand = mano en PNG: x, y, w (el alto sale solo) */
  var OPEN = { img:'img/mano-abierta.png', x:660, y:780, w:420 };
  var LAYOUT = {
    personalidad:{ bub:{x:537,y:148,w:863,h:271}, sci:{cx:975,top:515,h:490},  hand:OPEN },
    conciencia:  { bub:{x:537,y:148,w:863,h:271}, sci:{cx:975,top:515,h:490},  hand:OPEN },
    movimiento:  { bub:{x:605,y:170,w:862,h:267}, sci:{cx:1043,top:545,h:485}, hand:{ img:'img/mano-senala.png', x:822, y:775, w:215 } }
  };

  /* ---- Lo que flota sobre la mano (cx, cy = centro · w = ancho) ---- */
  var HAIR_IMG = { largo:'img/pelo-3.png', capucha:'img/pelo-1.png', corto:'img/pelo-2.png' };      // los mismos íconos de la pantalla de peinados
  var POS = {
    hair:  { cx:898, cy:620, w:100 },
    outfit:{ cx:898, cy:810, w:140 },
    skill: { cx:835, cy:765, w:250 }
  };
  function itemsFor(id,d){
    if(id==='personalidad'){
      var l=[];
      if(HAIR_IMG[d.hair]) l.push({ img:HAIR_IMG[d.hair], p:POS.hair });
      if(d.outfit)         l.push({ img:'img/'+d.outfit+'.png', p:POS.outfit });        // ropa-1 · ropa-2 · ropa-3
      return l;
    }
    if(id==='conciencia'&&d.img){
      var sword=d.clase==='DPS';                                                        // la espada del ícono mira al otro lado: se espeja
      return [{ img:d.img, p:{ cx:POS.skill.cx, cy:POS.skill.cy, w:sword?270:POS.skill.w }, flip:sword, px:true }];
    }
    return [];
  }

  /* ---------- Código ---------- */
  var scene=$('despedida'), bub=$('dpBub'), svg=bub.querySelector('svg'), pathEl=svg.querySelector('path'),
      gEl=$('dpG'), tEl=$('dpT'), nx=$('dpNext'), sci=$('dpSci'), hand=$('dpHand'), box=$('dpItems'), sr=$('dpSr'),
      reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
      var cur=null, active=false, ready=false, typing=false, timer=null, full='', pulling=false;

      // Palanca (copia la del tutorial) a la derecha: es lo único que cierra esta pantalla
      var lever=document.querySelector('#tutorial2 .t2l').cloneNode(true);
      lever.classList.remove('hit'); lever.classList.add('dp-lever','ok','hide');
      vars(lever,{ x:1540, y:690, w:237, h:192 });
      scene.appendChild(lever);
  

  function vars(el,o){ for(var k in o) el.style.setProperty('--'+k,o[k]); }

  // Globo con la colita hacia abajo, en el medio
  function bubD(w,h){
    var tx=w/2, b=h-3.5;
    return 'M20.5 3.5H'+(w-20.5)+'Q'+(w-3.5)+' 3.5 '+(w-3.5)+' 20.5V'+(h-20.5)+'Q'+(w-3.5)+' '+b+' '+(w-20.5)+' '+b+
      'H'+(tx+40)+'L'+(tx+9)+' '+(h+50)+'Q'+tx+' '+(h+62)+' '+(tx-9)+' '+(h+50)+'L'+(tx-40)+' '+b+
      'H20.5Q3.5 '+b+' 3.5 '+(h-20.5)+'V20.5Q3.5 3.5 20.5 3.5Z';
  }

  // Texto que se escribe solo (el invisible .g reserva el lugar para que las palabras no salten de renglón)
  function finishType(){ clearInterval(timer); typing=false; tEl.textContent=full; nx.classList.remove('hide'); sr.textContent=full;
    lever.classList.remove('hide'); lever.classList.add('wait');   // con el texto completo aparece la palanca
   }
  function startType(txt){
    full=txt; gEl.textContent=txt; tEl.textContent=''; nx.classList.add('hide'); sr.textContent='';
    if(reduce){ finishType(); return; }
    typing=true; var c=0;
    timer=setInterval(function(){ c++; tEl.textContent=txt.slice(0,c); if(c>=txt.length) finishType(); },24);
    lever.classList.add('hide'); lever.classList.remove('wait','hit');
  }

  function addItem(it){
    var d=document.createElement('div'); d.className='dp-it'+(it.px?' px':'');
    vars(d,{ cx:it.p.cx, cy:it.p.cy, w:it.p.w, fx:it.flip?-1:1 });
    var im=document.createElement('img'); im.alt=''; im.onerror=function(){ im.style.visibility='hidden'; }; im.src=it.img;
    d.appendChild(im); box.appendChild(d);
  }

  document.addEventListener('npclab:outro',function(e){
    var d=e.detail||{}, id=d.id, L=LAYOUT[id]; if(!L) return;
    cur=id; active=true; ready=false; pulling=false; setTimeout(function(){ ready=true; },400);
    scene.style.setProperty('--dc',COLOR[id]);
    vars(bub,L.bub); svg.setAttribute('viewBox','0 0 '+L.bub.w+' '+L.bub.h); pathEl.setAttribute('d',bubD(L.bub.w,L.bub.h));
    vars(sci,L.sci);
    hand.style.visibility='visible'; hand.onerror=function(){ hand.style.visibility='hidden'; }; hand.src=L.hand.img; vars(hand,{ x:L.hand.x, y:L.hand.y, w:L.hand.w });
    box.innerHTML=''; itemsFor(id,d).forEach(addItem);
    scene.hidden=false;
    startType(textFor(id,d));
  });

  /* ---------- Descarga eléctrica de 8 bits: rayos desde la palanca, destello y "COMPLETADO" ---------- */
  function electricidad(color,fin){
    if(reduce){ fin(); return; }
    var W=128, H=72, S=1920/W, cv=document.createElement('canvas'), ctx, t0=performance.now(), lastGen=-999, bolts=[], salio=false;
    cv.width=W; cv.height=H; cv.className='start-fx'; cv.setAttribute('aria-hidden','true');
    $('stage').appendChild(cv); ctx=cv.getContext('2d');
    var ox=Math.round(1658/S), oy=Math.round(786/S);                 // la palanca

    function px(x,y,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),1,1); }
    function line(a,b,c,d,col,thick){
      var n=Math.max(Math.abs(c-a),Math.abs(d-b))||1;
      for(var i=0;i<=n;i++){ var x=a+(c-a)*i/n, y=b+(d-b)*i/n; px(x,y,col); if(thick){ px(x+1,y,col); px(x,y+1,col); } }
    }
    function bolt(x1,y1,x2,y2,depth){                                // rayo quebrado (con ramas)
      var pts=[[x1,y1]], n=12, dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
      for(var i=1;i<n;i++){ var j=(Math.random()-.5)*14; pts.push([x1+dx*i/n+nx*j, y1+dy*i/n+ny*j]); }
      pts.push([x2,y2]);
      var b={pts:pts,br:[]};
      if(depth<1) for(var k=2;k<n-2;k++) if(Math.random()<.12){
        var p=pts[k], a=Math.atan2(dy,dx)+(Math.random()-.5)*1.8, l=10+Math.random()*22;
        b.br.push(bolt(p[0],p[1],p[0]+Math.cos(a)*l,p[1]+Math.sin(a)*l,depth+1));
      }
      return b;
    }
    function drawBolt(b,thick){
      for(var i=0;i<b.pts.length-1;i++){
        var p=b.pts[i], q=b.pts[i+1];
        line(p[0],p[1],q[0],q[1],color,thick);
        line(p[0],p[1],q[0],q[1],'#ffffff',false);
      }
      b.br.forEach(function(r){ drawBolt(r,false); });
    }
    function gen(){
      bolts=[];
      var k, x, y;
      for(k=0;k<6;k++){                                              // descargas que cruzan de arriba a abajo
        x=Math.random()*W;
        bolts.push(bolt(x,0,Math.max(0,Math.min(W-1,x+(Math.random()-.5)*50)),H-1,0));
      }
      for(k=0;k<4;k++){                                              // descargas que cruzan de lado a lado
        y=Math.random()*H;
        bolts.push(bolt(0,y,W-1,Math.max(0,Math.min(H-1,y+(Math.random()-.5)*30)),0));
      }
      for(k=0;k<5;k++){                                              // rayos que salen de la palanca hacia cualquier lado
        var a=Math.random()*Math.PI*2;
        bolts.push(bolt(ox,oy,Math.max(0,Math.min(W-1,ox+Math.cos(a)*W)),Math.max(0,Math.min(H-1,oy+Math.sin(a)*H)),0));
      }
    }
    var lastDraw=0;
    (function frame(now){
      if(now-lastDraw<33){ requestAnimationFrame(frame); return; }      // ~30 cuadros por segundo
      lastDraw=now;
      var t=now-t0;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='rgba(0,0,16,'+Math.min(.55,t/400).toFixed(2)+')'; ctx.fillRect(0,0,W,H);
      if(t<1250){
        if(t-lastGen>90){ gen(); lastGen=t; }                         // los rayos cambian de forma como una descarga
        bolts.forEach(function(b){ drawBolt(b,true); });
        for(var s=0;s<30;s++) px(Math.random()*W,Math.random()*H,Math.random()<.5?color:'#ffffff');   // chispas por toda la pantalla
      }
      if(t>=1250){                                                    // destello y cartel
        var f=Math.min(1,(t-1250)/200);
        ctx.fillStyle=color; ctx.globalAlpha=f; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
        if(t>1450){ ctx.fillStyle='rgba(255,255,255,'+Math.min(1,(t-1450)/150).toFixed(2)+')'; ctx.fillRect(0,0,W,H); }
        if(!salio&&t>1650){ salio=true; fin(); }                      // todo cubierto: se cambia de pantalla por detrás
      }
      if(t>1650){
        var o=Math.max(0,1-(t-1650)/700);
        ctx.fillStyle='rgba(2,1,12,'+(1-o).toFixed(2)+')'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle=color; ctx.font='8px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.globalAlpha=Math.min(1,(t-1650)/200); ctx.fillText('COMPLETADO',W/2,H/2); ctx.globalAlpha=1;
      }
      if(t<2500){ requestAnimationFrame(frame); return; }
      cv.style.opacity='0'; setTimeout(function(){ cv.remove(); },400);
    })(t0);
  }

  function salir(){
    active=false; scene.hidden=true;
    var res=$(SCENE_OF[cur]); if(res) res.hidden=true;                                 // recién ahora se va la pantalla de Resultados
    document.dispatchEvent(new CustomEvent('npclab:backtocores',{detail:{done:cur}})); // vuelve al menú de núcleos
  }
  function pull(){
    if(!active||!ready||pulling) return;
    if(typing){ finishType(); return; }                   // si todavía escribe, completa el texto
    pulling=true; lever.classList.remove('wait','hit'); void lever.getBoundingClientRect(); lever.classList.add('hit');
    sr.textContent='Palanca bajada.';
    setTimeout(function(){ electricidad(COLOR[cur],salir); },reduce?0:1000);   // baja la palanca, descarga eléctrica y recién sale
  }

  scene.addEventListener('pointerdown',function(e){
    if(e.target.closest&&e.target.closest('.dp-lever')) pull();      // con mouse o toque, solo la palanca
    else if(typing&&ready) finishType();
  });
  document.addEventListener('keydown',function(e){
    if(!active||!ready||e.repeat) return;
    if(e.key==='+'){ e.preventDefault(); pull(); }          // solo la palanca (si todavía escribe, la primera completa el texto)
  });;
})();

