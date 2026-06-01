// ================================================================
// AGENTE STOCK — Vania POS v3.0
// Granel, inventario, alertas stock bajo, trazabilidad
// Funciones: abrirGranel, confirmarGranel, abrirIngresoGranel, _igActualizarResumen, confirmarIngresoGranel, renderInvBajo, renderInvRep, renderMovs, _resumenGranelHoy
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function abrirGranel(cod) {
  granelProd = S.prods.find(function(x){ return x.cod===cod; });
  if (!granelProd) return;
  // Bloquear si no hay stock (igual que productos normales)
  if (granelProd.stock <= 0) {
    sonidoError();
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 4px 14px rgba(239,68,68,.5)';
    t.textContent = '⚠️ Sin stock: ' + granelProd.desc;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2500);
    granelProd = null;
    return;
  }
  el('granel-paso1').style.display = 'none';
  el('granel-paso2').style.display = 'block';
  el('granel-nom').textContent = granelProd.desc;
  el('granel-precio-kg').textContent = fmt(granelProd.venta);
  el('granel-gramos').value = '';
  el('granel-precio-final').value = '';
  el('granel-formula').textContent = '0g ÷ 1000 × '+fmt(granelProd.venta)+'/kg = $0';
  if (!el('m-granel').classList.contains('on')) show('m-granel');
  setTimeout(function(){ el('granel-gramos').focus(); }, 80);
}

function confirmarGranel() {
  if (!granelProd) return;
  var gr = parseFloat(el('granel-gramos').value)||0;
  var precio = parseFloat(el('granel-precio-final').value)||0;
  if (precio<=0) { el('granel-precio-final').focus(); el('granel-precio-final').style.borderColor='var(--red)'; return; }
  // Validar que los gramos no superen el stock disponible
  if (gr > granelProd.stock) {
    var stockDisp = (granelProd.stock/1000).toFixed(2);
    var inp = el('granel-gramos');
    inp.style.borderColor = 'var(--red)';
    inp.title = 'Máx: '+granelProd.stock+'g';
    setTimeout(function(){ inp.style.borderColor=''; }, 2000);
    // Mostrar aviso debajo de la fórmula
    el('granel-formula').innerHTML = '<span style="color:var(--red);font-weight:700">⚠️ Stock insuficiente — solo hay '+stockDisp+' kg ('+granelProd.stock+'g)</span>';
    return;
  }
  var etiq = gr>0 ? ' ('+gr+'g)' : '';
  // Agregar al ticket activo
  syncTicket();
  S.ticket.push({cod:granelProd.cod, desc:granelProd.desc+etiq, precio:precio, qty:1, granel:true, gramos:gr});
  renderTicket();
  hide('m-granel');
  granelProd = null;
}

function abrirIngresoGranel() {
  var sel = document.getElementById('ig-prod');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar —</option>';
  S.prods.filter(function(p){ return p.granel; }).forEach(function(p){
    var opt = document.createElement('option');
    opt.value = p.cod;
    opt.textContent = p.desc + ' — stock: ' + (p.stock/1000).toFixed(2) + ' kg';
    sel.appendChild(opt);
  });
  // Conectar listeners cada vez que se abre el modal
  var kgEl    = document.getElementById('ig-kg');
  var costoEl = document.getElementById('ig-costo');
  var obsEl   = document.getElementById('ig-obs');
  if (kgEl) {
    kgEl.value = '';
    kgEl.oninput = _igActualizarResumen;
    kgEl.onkeydown = function(e){
      if (e.key === 'Enter') { e.preventDefault(); if(costoEl) costoEl.focus(); }
      if (e.key === ',')     { e.preventDefault(); this.value += '.'; }
    };
  }
  if (costoEl) {
    costoEl.value = '';
    costoEl.oninput = _igActualizarResumen;
    costoEl.onkeydown = function(e){
      if (e.key === 'Enter') { e.preventDefault(); confirmarIngresoGranel(); }
    };
  }
  if (obsEl) obsEl.value = '';
  var res = document.getElementById('ig-resumen');
  if (res) res.style.display = 'none';
  show('m-ingreso-granel');
  setTimeout(function(){ if(sel) sel.focus(); }, 80);
}

function _igActualizarResumen() {
  var kg = parseFloat(document.getElementById('ig-kg').value) || 0;
  var costo = parseFloat(document.getElementById('ig-costo').value) || 0;
  var res = document.getElementById('ig-resumen');
  if (kg > 0) {
    res.style.display = 'block';
    document.getElementById('ig-resumen-txt').innerHTML =
      '<b>'+kg.toFixed(2)+' kg</b> = '+Math.round(kg*1000)+' g al stock' +
      (costo > 0 ? ' &nbsp;|&nbsp; Inversión: <b>$'+Math.round(kg*costo).toLocaleString('es-CL')+'</b>' : '');
  } else {
    res.style.display = 'none';
  }
}

function confirmarIngresoGranel() {
  var cod = document.getElementById('ig-prod').value;
  var kg = parseFloat(document.getElementById('ig-kg').value);
  var costo = parseFloat(document.getElementById('ig-costo').value) || 0;
  var obs = document.getElementById('ig-obs').value.trim();
  if (!cod) { alert('Selecciona un producto granel.'); return; }
  if (!kg || kg <= 0) { alert('Ingresa los kilos recibidos.'); return; }
  var p = S.prods.find(function(x){ return x.cod === cod; });
  if (!p) return;
  var gramos = Math.round(kg * 1000);
  var stockAntes = p.stock || 0;
  p.stock = stockAntes + gramos;
  if (costo > 0) p.costo = costo;
  if (!S.lotesGranel) S.lotesGranel = [];
  S.lotesGranel.push({
    id: Date.now(),
    fecha: hoy(),
    hora: ahora_(),
    cajero: S.user || 'Sistema',
    cod: cod,
    desc: p.desc,
    gramos: gramos,
    kg: kg,
    costo: costo,
    inversion: Math.round(kg * costo),
    obs: obs,
    stockAntes: stockAntes,
    stockDespues: p.stock
  });
  save();
  hide('m-ingreso-granel');
  if (typeof renderVentas === 'function') renderVentas();
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  t.textContent = '✅ ' + p.desc + ': +' + kg.toFixed(2) + ' kg → Stock: ' + (p.stock/1000).toFixed(2) + ' kg';
  document.body.appendChild(t);
  setTimeout(function(){ t.remove(); }, 3500);
}

function renderInvBajo(){
  el('tbajo').innerHTML=S.prods.filter(function(p){
    // granel: stock en gramos, minimo en kg → convertir para comparar
    var stockCmp = p.granel ? p.stock/1000 : p.stock;
    return stockCmp <= (p.minimo||5);
  }).map(function(p){
    var stockCmp   = p.granel ? p.stock/1000 : p.stock;
    var stockLabel = p.granel ? stockCmp.toFixed(2)+' kg' : stockCmp;
    var minLabel   = p.granel ? (p.minimo||5)+' kg' : (p.minimo||5);
    var reponer    = Math.max(0,(p.minimo||5)*2 - stockCmp);
    var repoLabel  = p.granel ? reponer.toFixed(2)+' kg' : reponer;
    return '<tr><td>'+escH(p.desc)+'</td><td>'+escH(p.depto)+'</td>'
      +'<td style="color:var(--red);font-weight:700">'+stockLabel+'</td>'
      +'<td>'+minLabel+'</td>'
      +'<td>'+repoLabel+'</td></tr>';
  }).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--green)">Todo bien</td></tr>';
}

function renderInvRep(){
  var tu=0,tvc=0,tvv=0,tg=0;
  S.prods.forEach(function(p){
    var stockReal = p.granel ? p.stock/1000 : p.stock; // granel: stock en gramos, precio en kg
    var vc=p.costo*stockReal, vv=p.venta*stockReal;
    tu+=stockReal; tvc+=vc; tvv+=vv; tg+=vv-vc;
  });
  var div=el('inv-totales');
  if(div){div.innerHTML=[['📦 Productos',S.prods.length+' ítems','#2563eb'],['💲 Val. Costo',fmt(tvc),'#f59e0b'],['💰 Val. Venta',fmt(tvv),'#10b981'],['📈 Ganancia',fmt(tg),'#8b5cf6']].map(function(x){return '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;border-left:4px solid '+x[2]+'"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">'+x[0]+'</div><div style="font-size:16px;font-weight:900;color:'+x[2]+'">'+x[1]+'</div></div>';}).join('');}
  el('tinvrep').innerHTML=S.prods.map(function(p){
    var stockReal=p.granel?p.stock/1000:p.stock;
    var vc=p.costo*stockReal,vv=p.venta*stockReal,gan=vv-vc;
    var stockDisplay=p.granel?(stockReal.toFixed(2)+' kg'):p.stock;
    return '<tr><td style="font-size:11px;font-family:monospace">'+escH(p.cod)+'</td><td>'+escH(p.desc)+'</td><td>'+escH(p.depto)+'</td><td>'+fmt(p.costo)+(p.granel?'/kg':'')+'</td><td>'+fmt(p.venta)+(p.granel?'/kg':'')+'</td><td style="text-align:center;font-weight:700">'+stockDisplay+'</td><td>'+fmt(vc)+'</td><td>'+fmt(vv)+'</td><td style="color:'+(gan>=0?'var(--green)':'var(--red)')+';font-weight:700">'+fmt(gan)+'</td></tr>';
  }).join('');
}

function renderMovs(){el('tmovs').innerHTML=S.movs.slice().reverse().slice(0,100).map(function(m){return '<tr><td>'+m.fecha+'</td><td>'+m.hora+'</td><td>'+escH(m.prod)+'</td><td>'+m.tipo+'</td><td>'+m.cant+'</td><td>'+escH(m.user)+'</td></tr>';}).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin movimientos</td></tr>';}

function _resumenGranelHoy() {
  var hoyStr = hoy();
  if (!S.lotesGranel || !S.lotesGranel.length) return '';
  var lotes = S.lotesGranel.filter(function(l){ return l.fecha === hoyStr; });
  if (!lotes.length) return '';
  var porProd = {};
  lotes.forEach(function(l){
    if (!porProd[l.cod]) porProd[l.cod] = { desc: l.desc, gramos: 0, inversion: 0, costo: l.costo };
    porProd[l.cod].gramos += l.gramos;
    porProd[l.cod].inversion += l.inversion;
    porProd[l.cod].costo = l.costo;
  });
  var vendidoPorProd = {};
  (S.hist || []).filter(function(v){ return v.fecha === hoyStr; }).forEach(function(v){
    (v.items || []).forEach(function(it){
      var prod = S.prods.find(function(x){ return x.cod === it.cod; });
      if (prod && prod.granel) {
        if (!vendidoPorProd[it.cod]) vendidoPorProd[it.cod] = 0;
        vendidoPorProd[it.cod] += (it.gramos || 0);
      }
    });
  });
  var html = '<div style="margin-top:12px;border-top:2px solid #f59e0b;padding-top:10px"><div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px">🍞 Trazabilidad Granel Hoy</div>';
  Object.keys(porProd).forEach(function(cod){
    var d = porProd[cod];
    var p = S.prods.find(function(x){ return x.cod === cod; });
    var vendidoG = vendidoPorProd[cod] || 0;
    var stockKg = p ? (p.stock/1000).toFixed(2) : '?';
    var costoVendido = (d.costo > 0 && vendidoG > 0) ? Math.round(vendidoG/1000*d.costo) : 0;
    html += '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px;margin-bottom:6px;font-size:12px">';
    html += '<div style="font-weight:700;margin-bottom:4px">'+escH(d.desc)+'</div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Ingresado hoy:</span><span><b>'+(d.gramos/1000).toFixed(2)+' kg</b></span></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Vendido hoy:</span><span style="color:var(--green)"><b>'+(vendidoG/1000).toFixed(2)+' kg</b></span></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Stock restante:</span><span><b>'+stockKg+' kg</b></span></div>';
    if (d.inversion > 0) {
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px"><span>Inversión total:</span><span style="color:var(--red)">$'+d.inversion.toLocaleString('es-CL')+'</span></div>';
      if (costoVendido > 0) html += '<div style="display:flex;justify-content:space-between"><span>Costo vendido:</span><span style="color:var(--red)">$'+costoVendido.toLocaleString('es-CL')+'</span></div>';
    }
    html += '</div>';
  });
  html += '</div>';
  return html;
}

