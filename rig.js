import * as THREE from 'three';

/* ===== Rig por código para models/TALLER.obj =====
   El OBJ no tiene esqueleto. Está en POSE A (brazos algo separados, caídos), mide ~1,5 de alto y mira hacia +X.
   Cada parte del cuerpo se mueve rotando grupos de vértices.

   Brazo (l = el de la izquierda de la pantalla, r = el de la derecha):
     th  = ángulo del brazo respecto de "colgando" (0 = cae al costado · 1.57 = horizontal · 3.14 = vertical hacia arriba)
     eb  = cuánto se dobla el codo
     ep  = hacia dónde se dobla el antebrazo (0 = hacia adelante · 1.57 = hacia arriba/afuera · negativo = hacia adentro/abajo)
     fl  = balanceo del hombro hacia adelante (con el brazo colgando)
   Piernas: hl/hr = cadera (+ = hacia adelante) · kl/kr = rodilla (+ = se dobla)
   lean = inclinación del torso hacia adelante

   Las medidas del cuerpo están todas en JOINTS (medidas sobre TALLER.obj). Si cambiás el modelo, cambiá solo eso.
   POSES.rest = th0 = la pose original del OBJ (calza con peinados y ropa). */

export var JOINTS = {
  sz:.14, sy:1.06,        // hombro (distancia al eje y altura)
  th0:.49,                // ángulo con el que el brazo viene en el OBJ (pose A)
  armL:.52,               // largo hombro → mano
  upper:.26,              // largo hombro → codo
  hip:.68,                // altura de la cadera
  knee:.42,               // altura de la rodilla
  ramp0:.02, ramp:.20,    // cuán gradual es la unión del brazo con el hombro (más grande = axila más suave)
  k:.5                    // escala respecto del modelo anterior (para accesorios: espada, escudo, hoja)
};
var J = JOINTS;
var HEAD_FRAC = .27;                    // qué parte de arriba del modelo es la cabeza (para ubicar la cara)
var CLOTH_PAD = .008;   // cuánto se agranda la ropa respecto del cuerpo (subilo si todavía se pierde, bajalo si se ve inflada)
var RX=0, RY=0, OX=0, OY=0, OZ=0;
function rot(x,y,px,py,a){ var dx=x-px, dy=y-py, c=Math.cos(a), s=Math.sin(a); RX=px+dx*c-dy*s; RY=py+dx*s+dy*c; }
function sm(x){ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); }

export function pose(o){
  return Object.assign({ lth:.3,leb:.12,lep:0,lfl:0, rth:.3,reb:.12,rep:0,rfl:0, hl:0,hr:0,kl:0,kr:0, lean:0 }, o||{});
}
export var POSES = {
  rest:   pose({ lth:J.th0,leb:0,rth:J.th0,reb:0 }),                                                      // pose original del OBJ (sin deformar)
  idle:   pose(),                                                                                         // parado, brazos al costado
  open:   pose({ lth:1.95,leb:1.1,lep:1.57, rth:1.95,reb:1.1,rep:1.57 }),                                 // IA generativa: brazos abiertos
  paper:  pose({ lth:.3,leb:.15, rth:.55,reb:1.55,rep:0 }),                                               // IA tradicional: sostiene una hoja
  wave:   pose({ lth:2.0,leb:1.25,lep:1.57, rth:.8,reb:2.0,rep:-.9, lean:.02 }),                          // vivo: saluda y apoya la mano en la cadera
  dead:   pose({ lth:.9,leb:.2, rth:1.2,reb:.25, hl:-.45,hr:.35,kl:.3,kr:.5, lean:-.18 }),                // muerto: cae hacia atrás
  sit:    pose({ lth:.55,leb:.2, rth:.28,reb:1.6,rep:0, hl:1.45,hr:1.45,kl:.3,kr:.5, lean:-.12 }),        // aturdido: sentado con la mano en la panza
  shield: pose({ lth:.85,leb:1.5, rth:.6,reb:.7, hl:.65,hr:-.15,kl:.95,kr:.6, lean:.25 }),                // se agacha tras el escudo
  attack: pose({ lth:.8,leb:1.35, rth:.95,reb:1.45, hl:.7,hr:-.5,kl:.7,kr:.35, lean:.18 }),               // ataca con la espada
  touch:  pose({ lth:.75,leb:1.9,lep:.15 })                                                               // tacto: mano abierta hacia la cámara
};

/* Pose de carrera según la fase del ciclo (0..1) y el estilo (ver runStyle en movimiento.js) */
export function runPose(ph,P){
  var T=Math.PI*2, s=Math.sin(ph*T), c=Math.cos(ph*T), aL=P.leg*s, aR=-aL, k=P.swing/P.leg;
  return pose({ lth:.32,rth:.32, leb:P.elbow,reb:P.elbow, lfl:-aL*k,rfl:-aR*k,
                hl:aL,hr:aR, kl:P.knee*Math.max(0,c), kr:P.knee*Math.max(0,-c), lean:P.lean });
}

/* Pesos por vértice: qué parte del cuerpo es cada punto.
   Los brazos se reconocen por su posición respecto del EJE del brazo (no por |z|), porque en pose A se pegan al cuerpo. */
var AS=Math.sin(J.th0), AC=Math.cos(J.th0), C0=AS, S0=AC;     // dirección del brazo en reposo y rotación que lo lleva a horizontal
function weights(b){
  var n=b.length/3, W={wl:new Float32Array(n),wk:new Float32Array(n),sd:new Float32Array(n),wa:new Float32Array(n),wf:new Float32Array(n),sg:new Float32Array(n)};
  for(var i=0;i<n;i++){
    var y=b[3*i+1], z=b[3*i+2], az=Math.abs(z), dz=az-J.sz, dy=y-J.sy;
    var al=dz*AS-dy*AC, pp=Math.abs(dz*AC+dy*AS);              // al = distancia a lo largo del brazo · pp = distancia al eje
    var wa=sm((al+J.ramp0)/J.ramp)*(1-sm((pp-.10)/.05))*(1-sm((al-J.armL-.1)/.05));
    W.wa[i]=wa;
    W.wf[i]=wa*sm((al-J.upper)/.06);                           // antebrazo
    W.wl[i]=(1-sm((y-(J.hip-.06))/.14))*(1-wa);                // piernas (las manos, aunque estén a la altura de la cadera, no)
    W.wk[i]=sm((J.knee+.06-y)/.12);
    W.sd[i]=Math.max(-1,Math.min(1,z/.05));
    W.sg[i]=z>=0?1:-1;
  }
  return W;
}

function clothWeights(b,body){
  var n=b.length/3, W={wl:new Float32Array(n),wk:new Float32Array(n),sd:new Float32Array(n),wa:new Float32Array(n),wf:new Float32Array(n),sg:new Float32Array(n)};
  for(var i=0;i<n;i++){
    var x=b[3*i], y=b[3*i+1], z=b[3*i+2], best=1e9, bp=null, bj=0;
    for(var q=0;q<body.length;q++){
      var bb=body[q].base;
      for(var j=0;j<bb.length;j+=3){
        var dx=bb[j]-x, dy=bb[j+1]-y, dz=bb[j+2]-z, d=dx*dx+dy*dy+dz*dz;
        if(d<best){ best=d; bp=body[q]; bj=j/3; }
      }
    }
    if(bp) for(var k in W) W[k][i]=bp.w[k][bj];
  }
  return W;
}

/* Agranda la ropa en reposo: cada parte se aleja de su eje (torso, pierna o brazo) */
function inflate(b,W){
  var n=b.length/3, P=CLOTH_PAD;
  for(var i=0;i<n;i++){
    var x=b[3*i], y=b[3*i+1], z=b[3*i+2], sg=W.sg[i], wa=W.wa[i], wl=W.wl[i], az=Math.abs(z);
    var tw=(1-wa)*(1-wl), lw=(1-wa)*wl;
    var r1=Math.hypot(x,z)||1;                                   // torso
    var lz=z-sg*.07, r2=Math.hypot(x,lz)||1;                     // pierna
    var dz=az-J.sz, dy=y-J.sy, pp=dz*AC+dy*AS, r3=Math.hypot(x,pp)||1, up=pp/r3;   // brazo
    b[3*i]  =x+P*(wa*x/r3+tw*x/r1+lw*x/r2);
    b[3*i+1]=y+P*wa*up*AS;
    b[3*i+2]=z+P*(wa*sg*up*AC+tw*z/r1+lw*lz/r2);
  }
}

/* Datos de un brazo para una pose: eje del codo ya calculado */
function mkArm(th,eb,ep,fl,sg){
  var phi=Math.PI/2-th, cs=Math.cos(phi), sn=Math.sin(phi);
  var dy=-sn, dz=sg*cs;                                              // dirección del brazo
  var ux=Math.cos(ep), uy=Math.sin(ep)*cs, uz=Math.sin(ep)*sg*sn;    // hacia dónde se dobla el antebrazo
  var kx=dy*uz-dz*uy, ky=dz*ux, kz=-dy*ux, kl=Math.sqrt(kx*kx+ky*ky+kz*kz)||1;
  return { cs:cs, sn:sn, eb:eb, fl:fl, kx:kx/kl, ky:ky/kl, kz:kz/kl };
}
function armXf(x,y,z,wa,wf,sg,A){
  var dz0=Math.abs(z)-J.sz, dy0=y-J.sy;
  var a=dz0*C0-dy0*S0, c=dz0*S0+dy0*C0;                                     // 0 · el brazo del OBJ (pose A) se lleva a horizontal (T)
  var nx=x, ny=J.sy-a*A.sn+c*A.cs, nz=sg*(J.sz+a*A.cs+c*A.sn);              // 1 · y de ahí al ángulo th pedido, alrededor del hombro
  if(A.eb&&wf>0){                                                            // 2 · el antebrazo se dobla en el codo (rotación de Rodrigues)
    var ex=0, ey=J.sy-J.upper*A.sn, ez=sg*(J.sz+J.upper*A.cs);
    var px=nx-ex, py=ny-ey, pz=nz-ez, ang=A.eb*wf, cb=Math.cos(ang), sb=Math.sin(ang), kd=A.kx*px+A.ky*py+A.kz*pz;
    var cx=A.ky*pz-A.kz*py, cy=A.kz*px-A.kx*pz, cz=A.kx*py-A.ky*px;
    nx=ex+px*cb+cx*sb+A.kx*kd*(1-cb); ny=ey+py*cb+cy*sb+A.ky*kd*(1-cb); nz=ez+pz*cb+cz*sb+A.kz*kd*(1-cb);
  }
  if(A.fl){ rot(nx,ny,0,J.sy,A.fl*wa); nx=RX; ny=RY; }                       // 3 · balanceo del hombro
  OX=nx; OY=ny; OZ=nz;
}

/* Caras dibujadas en un canvas (se pegan en un plano delante de la cabeza) */
var TEX={};
function faceTex(type){
  if(TEX[type]) return TEX[type];
  var c=document.createElement('canvas'); c.width=512; c.height=256; var g=c.getContext('2d'), ink='#17171d';
  g.fillStyle=ink; g.strokeStyle=ink; g.lineCap='round'; g.lineJoin='round';
  function brow(x1,y1,cx,cy,x2,y2){ g.lineWidth=11; g.beginPath(); g.moveTo(x1,y1); g.quadraticCurveTo(cx,cy,x2,y2); g.stroke(); }
  if(type==='eyes'){
    [150,362].forEach(function(x){
      g.fillStyle=ink; g.beginPath(); g.ellipse(x,140,44,54,0,0,6.3); g.fill();
      g.fillStyle='#fff'; g.beginPath(); g.arc(x+15,118,14,0,6.3); g.fill(); g.beginPath(); g.arc(x-13,162,6,0,6.3); g.fill();
    });
    brow(92,62,150,34,208,52); brow(304,52,362,34,420,62);
  } else if(type==='x'){
    g.lineWidth=14;
    [150,362].forEach(function(x){ g.beginPath(); g.moveTo(x-34,106); g.lineTo(x+34,174); g.moveTo(x+34,106); g.lineTo(x-34,174); g.stroke(); });
    g.lineWidth=9; g.beginPath(); g.moveTo(226,214); g.lineTo(286,214); g.stroke();
  } else if(type==='spiral'){
    g.lineWidth=7;
    [150,362].forEach(function(x){ g.beginPath(); for(var t=0;t<18;t+=.25){ var r=2+t*2.4, px=x+Math.cos(t)*r, py=140+Math.sin(t)*r; if(t) g.lineTo(px,py); else g.moveTo(px,py); } g.stroke(); });
    brow(96,70,150,36,206,52); brow(306,52,362,36,416,70);
    g.lineWidth=9; g.beginPath(); g.moveTo(215,222); g.quadraticCurveTo(256,196,297,222); g.stroke();
  }
  var tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; return (TEX[type]=tx);
}

/* Crea un NPC posable a partir del OBJ ya cargado (src). tint = oscurece los materiales (1 = normal) */
export function makeRig(src,tint){
  var obj=src.clone(true), parts=[];
  obj.traverse(function(m){
    if(!m.isMesh) return;
    m.geometry=m.geometry.clone();
    var list=Array.isArray(m.material)?m.material:[m.material];
    var out=list.map(function(o){ var c=o.clone(); if(tint!==undefined) c.color.multiplyScalar(tint); return c; });
    m.material=Array.isArray(m.material)?out:out[0];
    var p=m.geometry.attributes.position.array;
    parts.push({ geo:m.geometry, pos:p, base:p.slice(), w:weights(p) });
  });

  var bodyParts=parts.slice();      // solo el cuerpo (sin ropa), para copiarle los pesos a la ropa
  var bb=new THREE.Box3().setFromObject(obj), H=bb.max.y-bb.min.y;

  /* Cabeza: ancho y altura de la cara para ubicar los ojos */
  var hy=bb.max.y-H*HEAD_FRAC, hh=bb.max.y-hy, zmin=1e9, zmax=-1e9;
  parts.forEach(function(pt){ var b=pt.base; for(var k=0;k<b.length;k+=3) if(b[k+1]>hy){ zmin=Math.min(zmin,b[k+2]); zmax=Math.max(zmax,b[k+2]); } });
  var hw=Math.max(.3*J.k,zmax-zmin), fy=hy+hh*.42, fx=-1e9;
  parts.forEach(function(pt){ var b=pt.base; for(var k=0;k<b.length;k+=3) if(Math.abs(b[k+2])<hw*.18&&Math.abs(b[k+1]-fy)<hh*.12) fx=Math.max(fx,b[k]); });
  if(fx<-1e8) fx=bb.max.x;

  var faceGrp=new THREE.Group(); faceGrp.position.set(0,J.hip,0); obj.add(faceGrp);
  var face=new THREE.Mesh(new THREE.PlaneGeometry(hw*.85,hw*.425),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false}));
  face.rotation.y=Math.PI/2; face.position.set(fx+.006,fy-J.hip,0); face.visible=false; faceGrp.add(face);

  
  var last=null;
  function apply(P){
    last=P;
    var aL=mkArm(P.lth,P.leb,P.lep,P.lfl,1), aR=mkArm(P.rth,P.reb,P.rep,P.rfl,-1);
    parts.forEach(function(pt){
      var b=pt.base, p=pt.pos, W=pt.w, n=b.length/3;
      for(var i=0;i<n;i++){
        var x=b[3*i], y=b[3*i+1], z=b[3*i+2], wa=W.wa[i], wl=W.wl[i];
        if(wa>0){ var sg=W.sg[i]; armXf(x,y,z,wa,W.wf[i],sg,sg>0?aL:aR); x+=(OX-x)*wa; y+=(OY-y)*wa; z+=(OZ-z)*wa; }
        if(wl>0){                                                            // pierna: rodilla y cadera
          var f=(W.sd[i]+1)/2, hip=P.hr+(P.hl-P.hr)*f, kn=P.kr+(P.kl-P.kr)*f;
          if(W.wk[i]>0){ rot(x,y,0,J.knee,-kn*W.wk[i]); x=RX; y=RY; }
          rot(x,y,0,J.hip,hip*wl); x=RX; y=RY;
        }
        if(P.lean){ rot(x,y,0,J.hip,-P.lean*(1-wl)); x=RX; y=RY; }           // el torso se inclina
        p[3*i]=x; p[3*i+1]=y; p[3*i+2]=z;
      }
      pt.geo.attributes.position.needsUpdate=true; pt.geo.computeVertexNormals();
    });
    faceGrp.rotation.z=-P.lean;
  }
  // Dónde queda un punto del brazo (sg = 1 izquierda de pantalla, -1 derecha · az = como antes: ~1.15 = la mano)
  function armPoint(sg,az,P){
    var A=sg>0?mkArm(P.lth,P.leb,P.lep,P.lfl,1):mkArm(P.rth,P.reb,P.rep,P.rfl,-1);
    var d=Math.max(0,(az-.3)/.85)*J.armL;                                    // 1.15 → la mano
    armXf(0,J.sy-d*AC,sg*(J.sz+d*AS),1,sm((d-J.upper)/.06),sg,A);
    var x=OX, y=OY, z=OZ; if(P.lean){ rot(x,y,0,J.hip,-P.lean); x=RX; y=RY; }
    return new THREE.Vector3(x,y,z);
  }
  // Altura mínima y máxima del cuerpo con la pose actual (para apoyarlo en el piso o centrarlo)
  function bounds(){
    var lo=1e9, hi=-1e9;
    parts.forEach(function(pt){ var p=pt.pos; for(var k=1;k<p.length;k+=3){ if(p[k]<lo) lo=p[k]; if(p[k]>hi) hi=p[k]; } });
    return { minY:lo, maxY:hi };
  }

  /* Ropa que sigue al cuerpo: se deforma con el mismo rig */
  function dress(src2){
    var o=src2.clone(true);
    o.traverse(function(m){
      if(!m.isMesh) return;
      m.geometry=m.geometry.clone();
      var list=Array.isArray(m.material)?m.material:[m.material];
      var out=list.map(function(x){
        var c=x.clone(); if(tint!==undefined) c.color.multiplyScalar(tint);
        c.polygonOffset=true; c.polygonOffsetFactor=-2; c.polygonOffsetUnits=-2;   // la ropa gana si coincide con el cuerpo
        return c;
      });
      m.material=Array.isArray(m.material)?out:out[0];
      var p=m.geometry.attributes.position.array, W=clothWeights(p,bodyParts);
      inflate(p,W);
      parts.push({ geo:m.geometry, pos:p, base:p.slice(), w:W });
    });
    obj.add(o);
    if(last) apply(last);
    return o; 
  }

  function setFace(type){
    if(!type||type==='none'){ face.visible=false; return; }
    face.material.map=faceTex(type); face.material.needsUpdate=true; face.visible=true;
  }

  /* Pelo: pieza rígida pegada a la cabeza (sigue la inclinación del torso, igual que la cara) */
  function hair(src2){
    var h=src2.clone(true);
    h.traverse(function(m){
      if(!m.isMesh) return;
      var c=m.material.clone(); if(tint!==undefined) c.color.multiplyScalar(tint);
      m.material=c;
    });
    h.position.y=-J.hip;                     // faceGrp está en la cadera: se compensa para quedar en coordenadas del modelo
    faceGrp.add(h);
    return h;
  }

  return { obj:obj, bb:bb, H:H, apply:apply, armPoint:armPoint, setFace:setFace, bounds:bounds, dress:dress, hair:hair };
};

