/* ===== Botón rojo: "¿Estás seguro?" y reinicio =====
   El botón rojo (tecla 'b') se prueba una vez en el tutorial. Desde ahí, cada vez que se vuelve a tocar
   aparece "¿Estás seguro?". Ahí: botón rojo = animación y reinicia todo · ← / Regresar = vuelve a donde estaba. */
   (function(){
    var $=function(id){ return document.getElementById(id); };
    var scene=$('seguro'), stage=$('stage'), screen=$('screen'), sr=$('rsSr'),
        reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    var touched=false, open=false, ready=false, going=false;
    if(scene.parentNode!==stage) stage.appendChild(scene);      // la saca de cualquier pantalla donde haya quedado pegada
  
    document.addEventListener('npclab:redtouched',function(){ touched=true; });   // lo emite tutorial2.js al probar el botón
  
    function abrir(){
      open=true; ready=false; scene.hidden=false;
      sr.textContent='¿Estás seguro? Todo avance será eliminado. Botón rojo para confirmar, flecha izquierda para regresar.';
      setTimeout(function(){ ready=true; },400);                 // el mismo toque no confirma
    }
    function cerrar(){ open=false; scene.hidden=true; }
    function animacion(){                                        // la animación de CSS (queda de respaldo si el video no carga)
        if(!reduce){
          var fl=document.createElement('div'); fl.className='rs-flash'; screen.appendChild(fl);
          stage.classList.add('rs-off');
        }
        setTimeout(function(){ location.reload(); },reduce?200:1500);
      }
      function reiniciar(){
        if(going) return; going=true;
        sr.textContent='Reiniciando.';
        var v=$('rsVid');
        if(!v){ animacion(); return; }
        function fin(){ location.reload(); }
        v.hidden=false; v.currentTime=0; scene.classList.add('playing');      // el video tapa todo lo demás
        v.addEventListener('ended',fin,{once:true});               // cuando termina el video, reinicia
        v.addEventListener('error',function(){ v.hidden=true; scene.classList.remove('playing'); animacion(); },{once:true});
        v.addEventListener('loadedmetadata',function(){ setTimeout(fin,(v.duration+2)*1000); },{once:true});   // por si 'ended' nunca llega
        var p=v.play();
        if(p&&p.catch) p.catch(function(){ v.muted=true; v.play().catch(function(){ v.hidden=true; animacion(); }); });   // si el navegador bloquea el sonido, va sin sonido
      }
  
      function habilitado(e){
        var nb=$('nombre');                                  // escribiendo el nombre con teclado real, la B es una letra
        return touched&&!(nb&&!nb.hidden&&e.isTrusted);      // (el botón rojo del Arduino llega como tecla sintética y sigue funcionando)
      }

    // En captura: mientras está abierta, ninguna otra pantalla recibe teclas
    document.addEventListener('keydown',function(e){
      if(going){ e.stopImmediatePropagation(); e.preventDefault(); return; }
      var rojo=(e.key==='b'||e.key==='B');
      if(open){
        e.stopImmediatePropagation(); e.preventDefault();
        if(!ready||e.repeat) return;
        if(rojo) reiniciar();
        else if(e.key==='Enter'||e.key===' '||e.key==='Backspace'||e.key==='Escape') cerrar();
        return;
      }
      if(habilitado(e)&&rojo&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        e.stopImmediatePropagation(); e.preventDefault(); abrir();
      }
    },true);
  
    $('rsBack').addEventListener('click',function(){ if(open&&ready) cerrar(); });
    $('rsRed').addEventListener('click',function(){ if(open&&ready) reiniciar(); });
  })();