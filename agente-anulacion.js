// ================================================================
// AGENTE ANULACIÓN — Vania POS v3.0
// Anulación de ventas, repardo, devoluciones
// Funciones: abrirRepardo, filtrarRepardo, abrirAnulacion, verificarClaveAnulacion, renderTablaAnulacion, ejecutarAnulacion
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function abrirRepardo(){el('rep-buscar').value='';el('rep-fecha-filtro').value='hoy';filtrarRepardo();show('m-repardo');}

function filtrarRepardo(){
  var q=(el('rep-buscar').value||'').toLowerCase(),filtro=el('rep-fecha-filtro').value;
  var ventas=S.hist.filter(function(v){
    if(filtro==='hoy')return v.fecha===hoy();
    if(filtro==='semana')return Date.now()-new Date(v.fecha.split('/').reverse().join('-')).getTime()<7*86400000;
    return true;
  }).filter(function(v){if(!q)return true;return ('#'+v.folio).includes(q)||(v.user||'').toLowerCase().includes(q)||v.items.some(function(it){return it.desc.toLowerCase().includes(q);});}).slice().reverse();
  var tot=ventas.filter(function(v){return !v.anulada;}).reduce(function(a,v){return a+v.total;},0);
  var nTx=ventas.filter(function(v){return !v.anulada;}).length;
  var nAn=ventas.filter(function(v){return v.anulada;}).length;
  el('rep-resumen').innerHTML=[['💰 '+fmt(tot),'Total','#10b981'],['🧾 '+nTx,'Ventas','#3b82f6'],['❌ '+nAn,'Anuladas','#ef4444']].map(function(x){return '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:var(--muted)">'+x[1]+'</div><div style="font-size:16px;font-weight:900;color:'+x[2]+'">'+x[0]+'</div></div>';}).join('');
  el('t-repardo').innerHTML=ventas.map(function(v){
    var an=v.anulada,st=an?'<span style="background:#ef4444;color:#fff;border-radius:4px;padding:1px 5px;font-size:10px">Anulada</span>':'<span style="background:#10b981;color:#fff;border-radius:4px;padding:1px 5px;font-size:10px">OK</span>';
return '<tr style="'+(an?'opacity:.5;text-decoration:line-through':'')+'"><td style="font-size:11px">'+v.hora+'</td><td><b>#'+v.folio+'</b></td><td>'+v.items.length+'</td><td><b>'+fmt(v.total)+'</b></td><td style="font-size:11px">'+v.pago+'</td><td style="font-size:11px">'+(v.user||'-')+'</td><td>'+st+'</td><td><div style="display:flex;gap:3px"><button class="btn" style="padding:2px 6px;font-size:10px" data-ticket-folio="'+v.folio+'">🧾</button>'+(an?'':'<button class="btn bd" style="padding:2px 6px;font-size:10px" data-anular-folio="'+v.folio+'">❌</button>')+'<button class="btn" style="padding:2px 6px;font-size:10px;background:#f59e0b;color:#fff;border-color:#f59e0b" data-dev-folio="'+v.folio+'">↩️</button></div></td></tr>';
  }).join('')||'<tr><td colspan="8" style="text-align:center;color:var(--muted)">Sin ventas</td></tr>';
  el('t-repardo').onclick=function(e){
    var t=e.target.closest('[data-ticket-folio]');if(t){hide('m-repardo');abrirTicketVenta(parseInt(t.getAttribute('data-ticket-folio')));return;}
    var a=e.target.closest('[data-anular-folio]');
    if(a){hide('m-repardo');_anulFolioSel=parseInt(a.getAttribute('data-anular-folio'));el('anul-step1').style.display='block';el('anul-step2').style.display='none';el('anul-detalle').style.display='none';el('anul-clave').value='';el('anul-err').textContent='';show('m-anulacion');setTimeout(function(){el('anul-clave').focus();el('anul-clave').onkeydown=function(e2){if(e2.key==='Enter')verificarClaveAnulacion();};},80);}
    var d=e.target.closest('[data-dev-folio]');
    if(d){hide('m-repardo');abrirDevolucion(parseInt(d.getAttribute('data-dev-folio')));}
  };
}

function abrirAnulacion(){el('anul-clave').value='';el('anul-err').textContent='';el('anul-step1').style.display='block';el('anul-step2').style.display='none';el('anul-detalle').style.display='none';_anulFolioSel=null;show('m-anulacion');setTimeout(function(){el('anul-clave').focus();el('anul-clave').onkeydown=function(e){if(e.key==='Enter')verificarClaveAnulacion();};},80);}

function verificarClaveAnulacion(){
  var clave=el('anul-clave').value,ok=false;
  if(clave===CLAVE_ANULACION)ok=true;
  S.users.forEach(function(u){if((u.rol==='supervisor'||u.rol==='admin')&&u.p===clave)ok=true;});
  if(!ok){el('anul-err').textContent='Clave incorrecta';return;}
  el('anul-step1').style.display='none';el('anul-step2').style.display='block';renderTablaAnulacion();
}

function renderTablaAnulacion(){
  var ventas=S.hist.filter(function(v){return !v.anulada;}).slice().reverse().slice(0,50);
  el('tanulacion').innerHTML=ventas.map(function(v){return '<tr><td>'+v.hora+'</td><td><b>#'+v.folio+'</b></td><td>'+fmt(v.total)+'</td><td>'+v.pago+'</td><td><button class="btn bd" style="padding:2px 8px;font-size:11px" data-anulfolio="'+v.folio+'">Anular</button></td></tr>';}).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--muted)">Sin ventas</td></tr>';
  el('tanulacion').onclick=function(e){
    var btn=e.target.closest('[data-anulfolio]');if(!btn)return;
    var folio=parseInt(btn.getAttribute('data-anulfolio')),v=S.hist.find(function(x){return x.folio===folio;});if(!v)return;
    _anulFolioSel=folio;
    el('anul-items').innerHTML=v.items.map(function(it){return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span>'+escH(it.desc)+' x'+it.qty+'</span><span>'+fmt(it.precio*it.qty)+'</span></div>';}).join('')+'<div style="display:flex;justify-content:space-between;font-weight:700;padding-top:4px"><span>TOTAL</span><span>'+fmt(v.total)+'</span></div>';
    el('anul-detalle').style.display='block';
    el('anul-confirmar').onclick=function(){ejecutarAnulacion(folio);};
  };
}

function ejecutarAnulacion(folio){
  var v=S.hist.find(function(x){return x.folio===folio;}); if(!v)return;
  if(!confirm('¿Anular venta #'+folio+' por '+fmt(v.total)+'?'))return;
  // Reponer stock
  v.items.forEach(function(it){
    var p=S.prods.find(function(x){return x.cod===it.cod;});
    if(p&&!it.granel){p.stock+=it.qty;p.vendido=Math.max(0,(p.vendido||0)-it.qty);}
    else if(p&&it.granel&&it.gramos>0){p.stock+=it.gramos;}
  });
  v.anulada=true; v.anuladaBy=S.user; v.anuladaHora=ahora_();
  // Solo restar de caja si NO es crédito
  if(v.fecha===hoy()){
    if(v.pago!=='credito'){
      S.vdia[v.pago]=Math.max(0,(S.vdia[v.pago]||0)-v.total);
      S.gdia=Math.max(0,S.gdia-v.total);
    } else {
      // Si era crédito, reducir deuda del cliente
      if(v.clienteId){
        var cli=S.clis.find(function(c){return c.id===v.clienteId;});
        if(cli)cli.deuda=Math.max(0,cli.deuda-v.total);
      }
      v.pendiente=false;
    }
    S.trans=Math.max(0,S.trans-1);
  }
  save(); renderReportes(); renderVentas(); hide('m-anulacion');
  alert('Venta #'+folio+' anulada.');
}

