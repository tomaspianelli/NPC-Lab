// arduino.js · Web Serial → teclas del juego
const MAP = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  CENTER: 'Enter',
  RED: 'b',
  LEVEL1: 'i',
  LEVEL2: 'w',
  LEVEL3: 'u',
};
const ALIAS = { B:'RED', ROJO:'RED', PIN7:'RED', '7':'RED' };
const BAUD = 9600;
const btn = document.getElementById('arduinoBtn');
let activo = false;

function press(raw){
  const name = raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
  const id = ALIAS[name] || name;
  const key = MAP[id];
  if(!key){ if(!/^(PIN|SKETCH)/.test(name)) console.warn('Arduino: línea sin mapear →', JSON.stringify(raw)); return; }
  const opts = { key, bubbles:true, cancelable:true };
  document.dispatchEvent(new KeyboardEvent('keydown', opts));
  document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles:true }));
  if(id === 'RED') document.dispatchEvent(new CustomEvent('npclab:red'));   // por si reset.js prefiere escuchar esto
}

async function leer(port){
  const dec = new TextDecoder(); let buf = '';
  while(port.readable){
    const reader = port.readable.getReader();
    try{
      while(true){
        const {value,done} = await reader.read();
        if(done) break;
        buf += dec.decode(value,{stream:true});
        let i;
        while((i = buf.indexOf('\n')) >= 0){
          const linea = buf.slice(0,i).trim(); buf = buf.slice(i+1);
          if(linea){ console.log('Arduino:',linea); press(linea); }
        }
      }
    }catch(e){ console.warn('Serial:',e); }
    finally{ reader.releaseLock(); }
  }
}

async function abrir(port){
  await port.open({baudRate:BAUD});
  activo = true; btn.hidden = true;
  leer(port);
}

async function elegir(){
  if(activo) return;
  if(!('serial' in navigator)){ btn.textContent = 'Usá Chrome en localhost/https'; return; }
  try{ await abrir(await navigator.serial.requestPort()); }
  catch(e){ console.warn(e); btn.textContent = 'Error: '+e.message; }
}

btn.addEventListener('click',elegir);
document.addEventListener('keydown',e=>{
  if((e.key==='c'||e.key==='C') && e.isTrusted && !e.repeat && !document.body.dataset.typing) elegir();
});

if('serial' in navigator){
  // reconecta solo si ya diste permiso antes (sirve después de la R)
  navigator.serial.getPorts().then(ps=>{ if(ps[0]) abrir(ps[0]).catch(console.warn); });
  navigator.serial.addEventListener('disconnect',()=>{ activo=false; btn.hidden=false; btn.textContent='Conectar Arduino (C)'; });
}