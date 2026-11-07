import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OUTFIT_MODELS } from './modelos.js';

var cache = {};
export function cargarAtuendo(id, cb) {
  var cfg = OUTFIT_MODELS[id];
  if (!cfg) { cb(null); return; }
  var c = cache[id] || (cache[id] = { obj: undefined, cbs: [] });
  if (c.obj !== undefined) { cb(c.obj); return; }
  c.cbs.push(cb);
  if (c.cbs.length > 1) return;                       // ya se está cargando
  function listo(o) { c.obj = o; c.cbs.forEach(function (f) { f(o); }); c.cbs = []; }
  new OBJLoader().load(cfg.url, function (o) {
    o.traverse(function (m) {
      if (!m.isMesh) return;
      var list = Array.isArray(m.material) ? m.material : [m.material];
      var out = list.map(function (old) {
        var col = (cfg.colors && cfg.colors[old.name] !== undefined) ? cfg.colors[old.name] : cfg.color;
        return new THREE.MeshStandardMaterial({ color: col, roughness: .85, side: THREE.DoubleSide });
      });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
    listo(o);
  }, undefined, function () { listo(null); });
}