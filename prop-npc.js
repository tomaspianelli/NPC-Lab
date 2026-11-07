import * as THREE from 'three';
import { JOINTS } from './rig.js';

/* Objeto elegido en el núcleo 3: 'sword' | 'shield' | 'kit' | null */
export function propElegido(){
  var s=window.NPCLAB&&window.NPCLAB.skill;
  return (s&&s.prop)||null;
}

/* Crea los 3 objetos (ocultos) y los cuelga de `parent` (el obj del NPC) */
export function montarProps(parent){
  var q=JOINTS.k;
  function mat(c,r){ return new THREE.MeshStandardMaterial({color:c,roughness:r}); }

  var sword=new THREE.Group();
  var bl=new THREE.Mesh(new THREE.BoxGeometry(.14,1.7,.04),mat(0xdedee6,.4)); bl.position.y=1.05; sword.add(bl);
  var gd=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.5),mat(0x2a2a30,.6)); gd.position.y=.2; sword.add(gd);
  var gp=new THREE.Mesh(new THREE.BoxGeometry(.1,.45,.1),mat(0x1c1c22,.6)); gp.position.y=-.05; sword.add(gp);

  var sh=new THREE.Shape(); sh.moveTo(-.6,.8); sh.lineTo(.6,.8); sh.lineTo(.6,-.1);
  sh.quadraticCurveTo(.5,-.6,0,-.85); sh.quadraticCurveTo(-.5,-.6,-.6,-.1); sh.lineTo(-.6,.8);
  var shield=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:false}),mat(0x8c8c96,.6));

  var kit=new THREE.Group();
  kit.add(new THREE.Mesh(new THREE.BoxGeometry(.16,.34,.5),mat(0xd4d4d8,.6)));
  var kh=new THREE.Mesh(new THREE.BoxGeometry(.1,.07,.22),mat(0x7c7c84,.6)); kh.position.y=.2; kit.add(kh);
  var kr=mat(0xe01010,.5);
  var k1=new THREE.Mesh(new THREE.BoxGeometry(.02,.2,.07),kr); k1.position.x=.085; kit.add(k1);
  var k2=new THREE.Mesh(new THREE.BoxGeometry(.02,.07,.2),kr); k2.position.x=.085; kit.add(k2);

  var pr={sword:sword,shield:shield,kit:kit};
  Object.keys(pr).forEach(function(k){ pr[k].visible=false; pr[k].scale.setScalar(q); parent.add(pr[k]); });
  return pr;
}

/* Muestra el objeto elegido en la mano, según la pose P (llamar después de rig.apply(P)) */
export function ubicarProp(pr,kind,rig,P){
  var q=JOINTS.k;
  pr.sword.visible=kind==='sword'; pr.shield.visible=kind==='shield'; pr.kit.visible=kind==='kit';
  if(kind==='sword'){ pr.sword.position.copy(rig.armPoint(1,1.15,P)); pr.sword.rotation.set(0,0,-.55); }
  else if(kind==='shield'){ var h=rig.armPoint(1,1.15,P); pr.shield.scale.setScalar(q*.5); pr.shield.position.set(h.x+.2*q,h.y+.05*q,h.z); pr.shield.rotation.set(0,Math.PI/2,0); }
  else if(kind==='kit'){ var m=rig.armPoint(-1,1.15,P); pr.kit.position.set(m.x,m.y-.2*q,m.z); pr.kit.rotation.set(0,0,0); }
}