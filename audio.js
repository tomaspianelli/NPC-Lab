/* ===== NPC LAB · audio 8 bits generado por código (sin archivos, sin copyright) ===== */
(function(){
    var AC=null, master, bgmG, sfxG, bgm=null, started=false, NB=null;
    var $=function(id){ return document.getElementById(id); };
    function init(){
      if(AC){ if(AC.state==='suspended') AC.resume(); return; }
      AC=new (window.AudioContext||window.webkitAudioContext)();
      master=AC.createGain(); master.gain.value=.8; master.connect(AC.destination);
      bgmG=AC.createGain(); bgmG.gain.value=.12; bgmG.connect(master);   // volumen de la música de fondo
      sfxG=AC.createGain(); sfxG.gain.value=.5; sfxG.connect(master);    // volumen de los efectos
    }
    function fq(m){ return 440*Math.pow(2,(m-69)/12); }
    function tone(f,t,d,type,vol,dest,f2){
      var o=AC.createOscillator(), g=AC.createGain();
      o.type=type||'square'; o.frequency.setValueAtTime(f,t);
      if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(g); g.connect(dest||sfxG); o.start(t); o.stop(t+d+.02);
    }
    function rise(f,f2,t,d,vol,type){
      var o=AC.createOscillator(), g=AC.createGain();
      o.type=type||'square'; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol,t+d*.95); g.gain.linearRampToValueAtTime(0,t+d);
      o.connect(g); g.connect(sfxG); o.start(t); o.stop(t+d+.02);
    }
    function noise(t,d,vol,f1,f2,type){
      if(!NB){ NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate); var a=NB.getChannelData(0); for(var i=0;i<a.length;i++) a[i]=Math.random()*2-1; }
      var s=AC.createBufferSource(), fl=AC.createBiquadFilter(), g=AC.createGain();
      s.buffer=NB; s.loop=true; fl.type=type||'bandpass'; fl.frequency.setValueAtTime(f1,t);
      if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
      s.connect(fl); fl.connect(g); g.connect(sfxG); s.start(t); s.stop(t+d+.02);
    }
  
    /* ---------- Efectos ---------- */
    function matrix(){                                   // inicio: lluvia digital
      var t=AC.currentTime;
      for(var i=0;i<60;i++) if(Math.random()<.4+i/100) tone(500+Math.floor(Math.random()*10)*180,t+i*.043,.035,'square',.05);
      noise(t+1.7,.9,.25,400,9000,'highpass');
    }
    function zap(base,t,n){                              // electricidad: n chispazos (por defecto 28 = 1,2 s) y "pop" final
        t=t||AC.currentTime; n=n||28;
        for(var i=0;i<n;i++){
          var tt=t+i*.042; tone(base*(1+Math.random()*3),tt,.035,'sawtooth',.09);
          if(i%3===0) noise(tt,.05,.12,3000+Math.random()*3000,null,'highpass');
        }
        var e=t+n*.042;
        tone(base*3,e,.18,'square',.18,null,base*9); noise(e,.2,.2,6000,null,'highpass');
      }
    function charge(){                                   // conexión final: los 3 cables a la vez
      var t=AC.currentTime;
      [130,220,440].forEach(function(b){ rise(b,b*4,t,1.25,.09,'sawtooth'); });
      for(var i=0;i<25;i++) noise(t+i*.05,.04,.1,2000+i*200,null,'highpass');
      tone(70,t+1.2,.6,'square',.3,null,30); noise(t+1.2,.6,.35,3000,200,'lowpass');
    }
    function buzz(t,d){                                  // electricidad fuerte: zumbido + chispas + pop final
        d=d||1;
        var o=AC.createOscillator(), g=AC.createGain();
        o.type='sawtooth'; o.frequency.setValueAtTime(55,t); o.frequency.linearRampToValueAtTime(110,t+d);
        g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(.35,t+.05); g.gain.linearRampToValueAtTime(0,t+d);
        o.connect(g); g.connect(sfxG); o.start(t); o.stop(t+d+.02);
        for(var i=0;i<d/.035;i++){
          var tt=t+i*.035;
          tone(300+Math.random()*2500,tt,.03,'sawtooth',.2);
          noise(tt,.04,.3,2500+Math.random()*4000,null,'highpass');
        }
        tone(800,t+d,.2,'square',.3,null,2400); noise(t+d,.25,.35,6000,null,'highpass');
      }
      function lever(){                                    // 1) palanca electrónica larga (1,2 s)  2) electricidad  3) jingle de completado
        var t=AC.currentTime;
        tone(1400,t,.1,'square',.15,null,300);             // clic inicial
        rise(120,700,t+.08,.7,.14,'sawtooth');             // barrido lento: la palanca va bajando
        for(var i=0;i<8;i++) tone(500+i*60,t+.1+i*.08,.04,'square',.07);   // trabas mecánicas del recorrido
        tone(55,t+.85,.25,'square',.35,null,30);           // golpe grave al llegar abajo
        noise(t+.85,.12,.25,900,null,'lowpass');
        tone(1800,t+1.05,.12,'square',.1,null,500);        // clic de enganche
        buzz(t+1.2,.8);                                    // electricidad
      }
      function leverShort(){                               // palanca del tutorial: corta (0,6 s)
        var t=AC.currentTime;
        tone(1200,t,.07,'square',.15,null,300);
        rise(200,900,t+.05,.14,.14,'sawtooth');
        tone(60,t+.18,.1,'square',.3,null,35);
        buzz(t+.28,.3);
      }
      function redBtn(){                                   // botón rojo: golpe grave + alarma de dos tonos
        var t=AC.currentTime;
        tone(70,t,.22,'sawtooth',.35,null,32); noise(t,.1,.3,300,null,'lowpass');
        tone(220,t+.12,.12,'square',.14); tone(150,t+.26,.2,'square',.14);
      }
      function stageClear(){
        var t=AC.currentTime+.02;
        [72,76,79,84,88].forEach(function(m,i){ tone(fq(m),t+i*.09,i===4?.5:.1,'square',.14); });
      }
    function fanfare(){
      var t=AC.currentTime+.1;
      [[72,0,.12],[72,.14,.12],[72,.28,.12],[76,.42,.2],[79,.66,.12],[76,.8,.12],[79,.94,.6]].forEach(function(n){
        tone(fq(n[0]),t+n[1],n[2],'square',.16); tone(fq(n[0]-12),t+n[1],n[2],'triangle',.3); });
    }
    function gameOver(){                                 // botón rojo + TV apagándose
      var t=AC.currentTime;
      tone(150,t,.1,'square',.3,null,60);
      [67,64,60,55].forEach(function(m,i){ tone(fq(m),t+.15+i*.16,.15,'square',.12); });
      tone(900,t+.8,.5,'sawtooth',.12,null,40); noise(t+1.1,.2,.3,8000,null,'highpass');
    }
    function blip(){ tone(880,AC.currentTime,.05,'square',.07); }
    function ok(){ var t=AC.currentTime; tone(660,t,.05,'square',.08); tone(990,t+.05,.08,'square',.08); }
    function flip(){ var t=AC.currentTime; noise(t,.08,.15,2000,500,'bandpass'); tone(300,t,.12,'square',.07,null,700); }
  
    /* ---------- Música de fondo (chiptune en loop) ---------- */
    var MENU={dt:60/108/4, ch:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]], win:0};      // Am · F · C · G
    var WIN ={dt:60/132/4, ch:[[60,64,67],[55,59,62],[57,60,64],[53,57,60]], win:1};      // C · G · Am · F (más brillante)
    function sched(c,s,t){
      var ch=c.ch[Math.floor(s/16)%4], i=s%16;
      if(i%4===0) tone(fq(ch[0]-12),t,c.dt*3.5,'triangle',.5,bgmG);
      tone(fq(ch[i%3]+12*(i%6>2?1:0)+(c.win?12:0)),t,c.dt*.9,'square',.13,bgmG);
      if(c.win&&i%4===2) tone(fq(ch[(i>>2)%3]+24),t,c.dt*1.8,'square',.1,bgmG);
    }
    function stopBgm(){ if(bgm){ clearInterval(bgm); bgm=null; } }
    function playBgm(c){
      stopBgm(); var s=0, next=AC.currentTime+.1;
      bgm=setInterval(function(){ while(next<AC.currentTime+.3){ sched(c,s,next); next+=c.dt; s++; } },80);
    }
  
    /* ---------- Conexión con tu juego ---------- */
    document.addEventListener('keydown',function(e){
      if(e.repeat) return; init();
      if(e.key==='+'){
        if(!started){ started=true; matrix(); }
        else{
          var tu=$('tutorial2'), t1=$('tutorial');
          if((tu&&!tu.hidden)||(t1&&!t1.hidden)) leverShort(); else lever();
        }
        return;
      }
      if(!started) return;
      if(e.key.indexOf('Arrow')===0) blip();
      else if(e.key==='Enter'||e.key===' ') ok();
    },true);
    document.addEventListener('pointerdown',init,true);
  
    document.addEventListener('npclab:start',function(){ if(AC) playBgm(MENU); });
    document.addEventListener('npclab:backtocores',function(){ if(AC) stageClear(); });
    document.addEventListener('npclab:allcores',function(){ if(AC){ fanfare(); playBgm(WIN); } });
  
    // Efectos que siguen a tus animaciones (por las clases que ya usan)
    var BASE={personalidad:130, movimiento:220, conciencia:440};     // grave · medio · agudo
    new MutationObserver(function(ms){
      if(!AC) return;
      var nuevos=[], over=false;
      ms.forEach(function(m){
        var el=m.target, cl=el.classList;
        if(cl.contains('t9btn')&&cl.contains('hit')&&!el._r){ el._r=1; redBtn(); }
        if(cl.contains('t9btn')&&!cl.contains('hit')) el._r=0;
        if(cl.contains('core')){
          if(cl.contains('zap')){ if(!el._z){ el._z=1; nuevos.push(el); } } else el._z=0;
        }
        if(cl.contains('c-card')&&cl.contains('fl')&&!el._f){ el._f=1; flip(); }
        if(cl.contains('c-card')&&!cl.contains('fl')) el._f=0;
        if(el.id==='stage'&&cl.contains('rs-off')) over=true;
      });
      if(nuevos.length>=3) charge();
      else nuevos.forEach(function(el){ zap(BASE[el.dataset.core]||200); });
      if(over) gameOver();
    }).observe($('stage'),{subtree:true,attributes:true,attributeFilter:['class']});
    var sg=$('seguro');
    if(sg) new MutationObserver(function(){
      if(AC&&!sg.hidden) redBtn();
    }).observe(sg,{attributes:true,attributeFilter:['hidden']});
  })();