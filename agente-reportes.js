// ================================================================
// AGENTE REPORTES — Vania POS v3.0
// Reportes diarios, corte de caja, gastos
// Funciones: renderReportes, buscarVentasPorFecha, renderCorte, renderFormGastos
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function renderReportes(){
var ef=S.vdia.efectivo||0,ta=S.vdia.tarjeta||0,tr=S.vdia.transferencia||0;
  var tot=ef+ta+tr;
  var credHoy=S.hist.filter(function(v){return v.fecha===hoy()&&v.pago==='credito'&&v.pendiente;}).reduce(function(a,v){return a+v.total;},0);
  var nCred=S.hist.filter(function(v){return v.fecha===hoy()&&v.pago==='credito'&&v.pendiente;}).length;
  var deudores=S.clis.filter(function(c){return c.deuda>0;});
  var totalDeuda=deudores.reduce(function(a,c){return a+(c.deuda||0);},0);
  el('sgrid-rep').innerHTML=[
    [fmt(tot),'💰 Cobrado hoy','var(--pri)'],
    [fmt(S.gdia),'📈 Ganancia real','var(--green)'],
    [S.trans,'🧾 Transacciones','var(--hdr)'],
    [fmt(ef),'💵 Efectivo','#10b981'],
    [fmt(ta),'💳 Tarjeta','#3b82f6'],
    [fmt(tr),'📱 Transferencia','#8b5cf6'],
  ].map(function(x){return '<div class="stat" style="border-left:3px solid '+x[2]+'"><div class="sv" style="color:'+x[2]+'">'+x[0]+'</div><div class="sl">'+x[1]+'</div></div>';}).join('')
  +'<div class="stat" style="border-left:3px solid #dc2626;background:#fef2f2;grid-column:1/-1"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="sv" style="color:#dc2626">'+fmt(credHoy)+'</div><div class="sl">🔴 Crédito hoy ('+nCred+' venta'+(nCred!==1?'s':'')+') — NO incluido en caja</div></div><div style="text-align:right"><div style="font-size:11px;color:#dc2626;font-weight:700">TOTAL DEUDAS</div><div style="font-size:16px;font-weight:900;color:#dc2626">'+fmt(totalDeuda)+'</div><div style="font-size:10px;color:var(--muted)">'+deudores.length+' deudores</div></div></div></div>';
  var vh=S.hist.filter(function(v){return v.fecha===hoy();}).slice().reverse();
el('tvhoy').innerHTML=vh.map(function(v){
    var esCred=v.pago==='credito';
   var pendBdg=esCred&&v.pendiente?'<span style="background:#dc2626;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px;font-weight:700">PENDIENTE</span>':'';
    var pagBdg=esCred&&!v.pendiente?'<span style="background:#16a34a;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px;font-weight:700">PAGADO</span>':'';
    var anulBdg=v.anulada?'<span style="background:#6b7280;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;margin-left:4px;font-weight:700">ANULADA</span>':'';
    return '<tr style="'+(v.anulada?'opacity:.4;text-decoration:line-through;background:#f3f4f6':esCred&&v.pendiente?'background:#fef2f2':'')+'">'
      +'<td style="font-size:11px">'+v.hora+'</td>'
      +'<td><b>#'+v.folio+'</b></td>'
      +'<td>'+v.items.length+'</td>'
      +'<td><b style="color:'+(v.anulada?'#6b7280':esCred&&v.pendiente?'#dc2626':'inherit')+'">'+fmt(v.total)+'</b>'
      +(esCred?'<br><span style="font-size:10px;color:var(--muted)">'+escH(v.clienteNom||'-')+'</span>':'')
      +'</td>'
      +'<td><span style="font-weight:700;color:'+(v.anulada?'#6b7280':esCred?'#dc2626':'inherit')+'">'+v.pago+'</span>'
      +pendBdg+pagBdg+anulBdg+'</td>'
      +'<td style="font-size:11px;color:var(--muted)">'+(v.user||'-')+'</td>'
      +'<td>'+(v.anulada?'<span style="font-size:10px;color:#6b7280">'+escH(v.anuladaBy||'-')+'</span>':'<button class="btn" style="padding:2px 6px;font-size:10px" onclick="abrirTicketVenta('+v.folio+')">&#x1F9FE;</button>')+'</td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="7" style="text-align:center;color:var(--muted)">Sin ventas hoy</td></tr>';
}

function buscarVentasPorFecha(fecha){
  var vh=S.hist.filter(function(v){return v.fecha===fecha;}).slice().reverse();
  el('tvhoy').innerHTML=vh.length ? vh.map(function(v){
    return '<tr><td>'+v.hora+'</td><td><b>#'+v.folio+'</b></td><td>'+v.items.length+'</td><td><b>'+fmt(v.total)+'</b></td><td>'+v.pago+'</td><td style="font-size:11px;color:var(--muted)">'+(v.user||'-')+'</td><td><button class="btn" style="padding:2px 6px;font-size:10px" onclick="abrirTicketVenta('+v.folio+')">🧾</button></td></tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted)">Sin ventas para '+fecha+'</td></tr>';
}

function renderCorte(){
  var ef=S.vdia.efectivo||0,ta=S.vdia.tarjeta||0,tr=S.vdia.transferencia||0;
  var credPend=S.hist.filter(function(v){return v.fecha===hoy()&&v.pago==='credito'&&v.pendiente;}).reduce(function(a,v){return a+v.total;},0);
  el('sgrid-cor').innerHTML=[[fmt(ef+ta+tr),'💰 Total cobrado','var(--pri)'],[fmt(ef),'💵 Efectivo','#10b981'],[fmt(ta),'💳 Tarjeta','#3b82f6'],[fmt(tr),'📱 Transferencia','#8b5cf6'],[S.trans,'🧾 Transacciones','var(--hdr)'],[fmt(S.gdia),'📈 Ganancia','var(--green)']].map(function(x){return '<div class="stat" style="border-left:3px solid '+x[2]+'"><div class="sv" style="color:'+x[2]+'">'+x[0]+'</div><div class="sl">'+x[1]+'</div></div>';}).join('')+(credPend>0?'<div class="stat" style="border-left:3px solid #dc2626;background:#fef2f2;grid-column:1/-1"><div class="sv" style="color:#dc2626">'+fmt(credPend)+'</div><div class="sl">🔴 Crédito pendiente — NO en caja</div></div>':'');
  el('tcortes').innerHTML=S.cortes.slice().reverse().map(function(c){return '<tr><td>'+c.fecha+'</td><td>'+fmt(c.ef)+'</td><td>'+fmt(c.ta)+'</td><td>'+fmt(c.tr)+'</td><td>'+fmt(c.cr)+'</td><td><b>'+fmt(c.tot)+'</b></td></tr>';}).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--muted)">Sin cortes</td></tr>';
}

function renderFormGastos(){
  var lista=S.gastos.filter(function(g){return g.fecha===hoy();});
  el('cierre-gastos-lista').innerHTML=lista.length?lista.map(function(g){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px"><span>'+escH(g.desc)+'</span><span style="color:var(--red);font-weight:700">'+fmt(g.monto)+'</span></div>';}).join(''):'<div style="color:var(--muted);font-size:12px">Sin gastos hoy</div>';
  var tg=lista.reduce(function(a,g){return a+g.monto;},0);
 var tv=(S.vdia.efectivo||0)+(S.vdia.tarjeta||0)+(S.vdia.transferencia||0);
  el('cierre-resumen').innerHTML='<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Ventas:</span><span style="color:var(--green);font-weight:700">'+fmt(tv)+'</span></div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>Gastos:</span><span style="color:var(--red);font-weight:700">'+fmt(tg)+'</span></div><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:2px solid var(--border);padding-top:6px;margin-top:4px"><span>Resultado neto:</span><span style="color:'+(tv-tg>=0?'var(--green)':'var(--red)')+'">'+fmt(tv-tg)+'</span></div>';
}

