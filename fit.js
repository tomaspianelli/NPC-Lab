/* ===== Ajuste de textos =====
   Achica un texto (tamaño de letra e interlineado) lo justo para que entre dentro de su marco.
   Sirve cuando la tipografía real ocupa más lugar que la del diseño: así nada se sale del cuadro. */

// Rectángulo en coordenadas del diseño (1920×1080), por si el marco no es un elemento
export function designBox(x,y,w,h){
  return { getBoundingClientRect:function(){
    var r=document.getElementById('screen').getBoundingClientRect(), k=r.width/1920;
    return { left:r.left+x*k, top:r.top+y*k, right:r.left+(x+w)*k, bottom:r.top+(y+h)*k };
  } };
}

// Hasta dónde llega realmente el texto (no la caja que lo contiene): así un párrafo corto en una caja ancha no se achica de más
function extension(el){
  var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), rg=document.createRange(), right=-Infinity, bottom=-Infinity;
  while(w.nextNode()){
    var n=w.currentNode; if(!n.nodeValue.trim()) continue;
    rg.selectNodeContents(n);
    var rs=rg.getClientRects();
    for(var i=0;i<rs.length;i++){ right=Math.max(right,rs[i].right); bottom=Math.max(bottom,rs[i].bottom); }
  }
  return {right:right,bottom:bottom};
}

// el: texto a ajustar · frame: elemento (o designBox) que lo contiene · pad: margen interno en px del diseño · min: escala mínima
export function fitInto(el,frame,pad,min){
  var scr=document.getElementById('screen'), k=scr.clientWidth/1920;
  if(!k||!el||!el.offsetParent) return;                       // oculto: no se puede medir
  el.style.fontSize=''; el.style.lineHeight='';               // vuelve al tamaño original antes de medir
  var cs=getComputedStyle(el), fs=parseFloat(cs.fontSize)/k, lh=parseFloat(cs.lineHeight)/k;   // en px del diseño
  var fr=frame.getBoundingClientRect(), p=(pad||14)*k;
  function entra(){ var e=extension(el); return e.right<=fr.right-p+1 && e.bottom<=fr.bottom-p+1; }
  for(var s=1; s>=(min||.6) && !entra(); s-=.04){             // solo se achica lo necesario
    el.style.fontSize='calc('+(fs*s).toFixed(2)+' * var(--u))';
    if(!isNaN(lh)) el.style.lineHeight='calc('+(lh*s).toFixed(2)+' * var(--u))';
  }
}
