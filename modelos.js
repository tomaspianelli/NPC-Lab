/* ===== Modelos 3D compartidos =====
   Un solo lugar para las rutas de los modelos: cuando tengas los tuyos, cambialas acá
   y se actualizan en el núcleo 1 (Personalidad) y en el núcleo 2 (Movimiento).
   Peinados y atuendos deben exportarse desde el mismo archivo de Blender que el NPC (mismo origen y escala) para que calcen solos. */

export const NPC_URL    = 'models/TALLER.obj';
export const NPC_FACING = -Math.PI / 2;      // TALLER mira hacia +X; este giro lo pone de frente a la cámara

export const HAIR_MODELS = {
  largo:   { url: 'models/pelo-largo.obj',   color: 0xDDB882 },
  capucha: { url: 'models/pelo-capucha.obj', color: 0x8079A2 },
  corto:   { url: 'models/pelo-corto.obj',   color: 0xA38344 }
};
export const OUTFIT_MODELS = {
  'ropa-1': { url: 'models/ropa-1.obj', color: 0x6A8EB2, colors: { 'Material.002': 0x6A8EB2, 'Material.003': 0xB39F7E } },   // remera · pantalón
  'ropa-2': { url: 'models/ropa-2.obj', color: 0x9B7D4F, colors: { 'Material.001': 0xCFC3B7, 'Material.004': 0x9B7D4F, 'Material.005': 0xBCAC93, 'Material.003': 0x31363A } },   // remera · campera · bordes · pantalón
  'ropa-3': { url: 'models/ropa-3.obj', color: 0xAEACB7, colors: { 'Material.004': 0xAEACB7, 'Material.003': 0x7F9D81 } },   // buzo · pantalón
};
