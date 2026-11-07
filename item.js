import * as THREE from 'three';
import { JOINTS } from './rig.js';

/* Objeto que sostiene el NPC según la habilidad elegida en el núcleo 3: 'sword' · 'shield' · 'kit' */
export function makeItem(kind){
  var g=new THREE.Group();
  function mat(c,r){ return new THREE.MeshStandardMaterial({color:c,roughness:r||.6}); }
  if(kind==='sword'){
    var bl=new THREE.Mesh(new THREE.BoxGeometry(.14,1.7,.04),mat(0xdedee6,.4)); bl.position.y=1.05; g.add(bl);
    var gd=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.5),mat(0x2a2a30)); gd.position.y=.2; g.add(gd);
    var gp=new THREE.Mesh(new THREE.BoxGeometry(.1,.45,.1),mat(0x1c1c22)); gp.position.y=-.05; g.add(gp);
  } else if(kind==='shield'){
    var sh=new THREE.Shape(); sh.moveTo(-.6,.8); sh.lineTo(.6,.8); sh.lineTo(.6,-.1); sh.quadraticCurveTo(.5,-.6,0,-.85); sh.quadraticCurveTo(-.5,-.6,-.6,-.1); sh.lineTo(-.6,.8);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:false}),mat(0x8c8c96)));
  } else if(kind==='kit'){
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.16,.34,.5),mat(0xd4d4d8)));
    var kh=new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.22),mat(0x7c7c84)); kh.position.y=.2; g.add(kh);
    var kr=mat(0xe01010,.5);
    var k1=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.07),kr); k1.position.x=.085; g.add(k1);
    var k2=new THREE.Mesh(new THREE.BoxGeometry(.02,.07,.2),kr); k2.position.x=.085; g.add(k2);
  }
  return g;
}

/* Lo ubica en la mano. rig = el rig del NPC · P = la pose actual */
export function placeItem(g,kind,rig,P){
  var q=JOINTS.k;
  if(kind==='sword'){
    g.scale.setScalar(q); g.position.copy(rig.armPoint(1,1.15,P)); g.rotation.set(0,0,-.55);
  } else if(kind==='shield'){
    var h=rig.armPoint(1,1.15,P);
    g.scale.setScalar(q*.5); g.position.set(h.x+.2*q,h.y+.05*q,h.z); g.rotation.set(0,Math.PI/2,0);
  } else if(kind==='kit'){
    var m=rig.armPoint(-1,1.15,P);
    g.scale.setScalar(q); g.position.set(m.x,m.y-.2*q,m.z); g.rotation.set(0,0,0);
  }
}

/* Para el NPC del núcleo 1, que no tiene rig: la mano en la pose original */
export var restRig={ armPoint:function(sg){
  var d=JOINTS.armL;
  return new THREE.Vector3(0,JOINTS.sy-d*Math.cos(JOINTS.th0),sg*(JOINTS.sz+d*Math.sin(JOINTS.th0)));
} };

/* Guarda qué eligió el usuario en el núcleo 3 (sin depender de conciencia.js) */
var PROP={ DPS:'sword', Tanque:'shield', Healer:'kit' };
window.NPCLAB=window.NPCLAB||{};
document.addEventListener('npclab:outro',function(e){
  var d=e.detail||{};
  if(d.id==='conciencia'&&PROP[d.clase]) window.NPCLAB.skill={ clase:d.clase, prop:PROP[d.clase] };
});