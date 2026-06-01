// ================================================================
// AGENTE PRODUCTOS — Vania POS v3.0
// CRUD productos, imágenes, código de barras, etiquetas
// Funciones: renderProductos, abrirProd, calcMargen, aplicarMargen, generarCodigoBarrasInterno, imprimirEtiqueta, guardarProd, eliminarProd, previsualizarImg, buscarImagenProducto, abrirGoogleImagenes, setImagenProducto, quitarImagenProducto
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function renderProductos(q) {
  q=(q||'').toLowerCase();
  var lista=q?S.prods.filter(function(p){return p.desc.toLowerCase().indexOf(q)>=0||p.cod.indexOf(q)>=0;}):S.prods;
  var html=lista.map(function(p){
    var est=p.stock>(p.minimo||5)?'<span class="bdg bok">OK</span>':p.stock>0?'<span class="bdg bwn">Bajo</span>':'<span class="bdg ber">Agotado</span>';
    var gr=p.granel?'<span class="bdg" style="background:#fef3c7;color:#92400e">$/kg</span> ':'';
    return '<tr><td style="font-size:11px;font-family:monospace">'+escH(p.cod)+'</td><td><b>'+escH(p.desc)+'</b></td><td>'+escH(p.depto)+'</td><td>'+fmt(p.costo)+'</td><td>'+fmt(p.venta)+(p.granel?'/kg':'')+'</td><td>'+p.stock+'</td><td>'+gr+est+'</td><td><button class="btn" style="padding:3px 8px;font-size:11px" data-editprod="'+escH(p.cod)+'">Editar</button></td></tr>';
  }).join('');
  el('tprod').innerHTML=html||'<tr><td colspan="8" style="text-align:center;color:var(--muted)">Sin resultados</td></tr>';
  el('tprod').onclick=function(e){var b=e.target.closest('[data-editprod]');if(b)abrirProd(b.getAttribute('data-editprod'));};
}

function abrirProd(cod) {
  prodEditCod=cod;
  el('m-prod-tit').textContent=cod?'Editar Producto':'Nuevo Producto';
  el('bdelprod').style.display=cod?'inline-flex':'none';
  var dep=el('mp-dep');
  dep.innerHTML=(S.deptos||[]).map(function(d){return '<option>'+escH(d)+'</option>';}).join('');
  var p=cod?S.prods.find(function(x){return x.cod===cod;}):{}; p=p||{};
  el('mp-cod').value=p.cod||''; el('mp-nom').value=p.desc||'';
  el('mp-cos').value=p.costo||0; el('mp-ven').value=p.venta||0; el('mp-may').value=p.mayoreo||0;
  el('mp-stk').value=p.stock||0; el('mp-min').value=p.minimo||5;
  el('mp-granel').checked=p.granel||false;
  el('mp-granel-hint').style.display=p.granel?'block':'none';
  if(p.depto) dep.value=p.depto;
  if(p.tipo) el('mp-tip').value=p.tipo;
  el('mp-err').textContent='';
  if(el('mp-img')){el('mp-img').value=p.img||'';if(p.img){el('mp-img-tag').src=p.img;el('mp-img-preview').style.display='flex';}else{el('mp-img-preview').style.display='none';}}
  if(el('mp-img-url'))el('mp-img-url').value='';
  show('m-prod'); setTimeout(function(){el('mp-cod').focus();},80);
}

function calcMargen(){
  var costo=parseFloat(el('mp-cos').value)||0;
  var margen=parseFloat(el('mp-margen')&&el('mp-margen').value)||0;
  if(costo>0&&margen>0){
    var venta=Math.round(costo*(1+margen/100));
    if(el('mp-ven-calc'))el('mp-ven-calc').value='$'+venta.toLocaleString('es-CL');
  } else {
    if(el('mp-ven-calc'))el('mp-ven-calc').value='';
  }
}

function aplicarMargen(){
  var costo=parseFloat(el('mp-cos').value)||0;
  var margen=parseFloat(el('mp-margen')&&el('mp-margen').value)||0;
  if(!costo||!margen){alert('Ingresa costo y % de margen primero');return;}
  var venta=Math.round(costo*(1+margen/100));
  var mayoreo=Math.round(venta*0.85);
  el('mp-ven').value=venta;
  el('mp-may').value=mayoreo;
  if(el('mp-ven-calc'))el('mp-ven-calc').value='$'+venta.toLocaleString('es-CL');
}

function generarCodigoBarrasInterno() {
  var cod = el('mp-cod').value.trim();
  var nom = el('mp-nom').value.trim();
  if(!nom){alert('Ingresa el nombre del producto primero');return;}
  // Generar código interno si no tiene uno
  if(!cod || cod.length < 4){
    cod = '7700' + Date.now().toString().slice(-8);
    el('mp-cod').value = cod;
  }
  // Renderizar código de barras
  var preview = el('barcode-preview');
  try {
    JsBarcode('#barcode-svg', cod, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 10,
      background: '#ffffff',
      lineColor: '#000000'
    });
    preview.style.display = 'block';
    // Guardar en producto
    var p = S.prods.find(function(x){ return x.cod === cod; });
    if(p){ p.barcode = cod; save(); }
  } catch(e){ alert('Error al generar código: '+e.message); }
}

function imprimirEtiqueta() {
  var cod = el('mp-cod').value.trim();
  var nom = el('mp-nom').value.trim();
  var precio = el('mp-ven').value;
  if(!cod || !el('barcode-preview').style.display || el('barcode-preview').style.display==='none'){
    alert('Genera el código primero'); return;
  }
  var svgContent = el('barcode-svg').outerHTML;
  var w = window.open('','_blank','width=400,height=300');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiqueta</title>'
    +'<style>body{font-family:monospace;text-align:center;padding:10px;margin:0}'
    +'@media print{body{margin:0;padding:4px}}'
    +'</style></head><body>'
    +'<div style="font-size:13px;font-weight:700;margin-bottom:4px">'+escH(nom)+'</div>'
    +svgContent
    +'<div style="font-size:16px;font-weight:900;margin-top:4px">$'+Math.round(precio||0).toLocaleString('es-CL')+'</div>'
    +'<div id="np" style="text-align:center;margin-top:8px">'
    +'<button onclick="window.print()" style="padding:6px 16px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer">🖨️ Imprimir</button>'
    +'</div></body></html>');
  w.document.close();
}

function guardarProd() {
  function previsualizarImg(){
  var url=el('mp-img').value.trim();
  var prev=el('mp-img-prev');
  var thumb=el('mp-img-thumb');
  if(url){thumb.src=url;prev.style.display='block';}
  else{prev.style.display='none';}
}
  var cod=el('mp-cod').value.trim(), nom=el('mp-nom').value.trim();
  if(!cod||!nom){el('mp-err').textContent='Código y nombre obligatorios';return;}
  var imgVal = el('mp-img') ? el('mp-img').value||'' : '';
  var data={
    cod:cod, desc:nom,
    costo:parseFloat(el('mp-cos').value)||0,
    venta:parseFloat(el('mp-ven').value)||0,
    mayoreo:parseFloat(el('mp-may').value)||0,
    stock:parseInt(el('mp-stk').value)||0,
    minimo:parseInt(el('mp-min').value)||5,
    depto:el('mp-dep').value,
    tipo:el('mp-tip').value,
    img:imgVal,
    granel:el('mp-granel').checked,
    vendido:0
  };
  if(!prodEditCod){
    if(S.prods.find(function(x){return x.cod===cod;})){
      el('mp-err').textContent='Ese código ya existe'; return;
    }
    S.prods.push(data);
  } else {
    var p=S.prods.find(function(x){return x.cod===prodEditCod;});
    if(p){ var v=p.vendido||0; Object.assign(p,data); p.vendido=v; }
  }
  save();
  hide('m-prod');
  renderProductos(el('sbusprod').value);
  renderVentas();
}

function eliminarProd(){
  if(!prodEditCod)return;
  if(!confirm('¿Eliminar el producto "'+(S.prods.find(function(x){return x.cod===prodEditCod;})||{}).desc+'"? Esta acción no se puede deshacer.'))return;
  S.prods=S.prods.filter(function(x){return x.cod!==prodEditCod;});
  save();
  hide('m-prod');
  renderProductos(el('sbusprod').value);
  renderVentas();
}

function previsualizarImg(){
  var url=el('mp-img').value.trim();
  var prev=el('mp-img-prev');
  var thumb=el('mp-img-thumb');
  if(url){thumb.src=url;prev.style.display='block';}
  else{prev.style.display='none';}
}

function buscarImagenProducto(){
  var cod=el('mp-cod').value.trim();
  var nom=el('mp-nom').value.trim();
  if(cod){
    fetch('https://world.openfoodfacts.org/api/v0/product/'+cod+'.json')
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.status===1 && d.product.image_url){
        setImagenProducto(d.product.image_url);
      } else if(nom){
        abrirGoogleImagenes();
      } else {
        alert('Producto no encontrado en Open Food Facts. Usa "Buscar en Google".');
      }
    }).catch(function(){
      if(nom) abrirGoogleImagenes();
    });
  } else if(nom){
    abrirGoogleImagenes();
  } else {
    alert('Ingresa el código o nombre del producto primero.');
  }
}

function abrirGoogleImagenes(){
  var nom=el('mp-nom').value.trim();
  if(!nom){alert('Ingresa el nombre del producto primero.');return;}
  window.open('https://www.google.com/search?tbm=isch&q='+encodeURIComponent(nom),'_blank');
  setTimeout(function(){
    var url=prompt('Copia la URL de la imagen de Google y pégala aquí:');
    if(url && url.startsWith('http')) setImagenProducto(url);
  },2000);
}

function setImagenProducto(url){
  el('mp-img').value=url;
  var prev=el('mp-img-preview');
  var tag=el('mp-img-tag');
  if(prev && tag){tag.src=url;prev.style.display='flex';} 
}

function quitarImagenProducto(){
  el('mp-img').value='';
  var prev=el('mp-img-preview');
  if(prev) prev.style.display='none';
}

