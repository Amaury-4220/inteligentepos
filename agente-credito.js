// ================================================================
// AGENTE CRÉDITO — Vania POS v3.0
// Fiado, abonos, historial, comprobantes, WhatsApp
// Funciones: pagarDeuda, _abrirModalCredito, _confirmarAbono, _pagarTotalCredito, _mostrarReciboAbono, _imprimirHTML, _compartirWACredito, _imprimirEstadoCuenta
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function pagarDeuda(id){
  var cli=S.clis.find(function(x){return x.id===id;}); if(!cli)return;
  _abrirModalCredito(cli);
}

function _abrirModalCredito(cli){
  var ex=document.getElementById('m-credito-cli'); if(ex)ex.remove();
  var deuda=cli.deuda||0;
  var movs=(cli.movimientos||[]).slice().reverse();
  var histHTML=movs.length?'<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:200px;overflow-y:auto;margin-bottom:14px">'+movs.map(function(m,i){
    var cargo=m.tipo==='cargo';
    return '<div style="padding:9px 12px;'+(i>0?'border-top:1px solid var(--border)':'')+';background:'+(i%2===0?'var(--bg)':'var(--card)')+'">'
      +'<div style="display:flex;justify-content:space-between">'
      +'<div><div style="font-size:12px;font-weight:700;color:'+(cargo?'#dc2626':'#16a34a')+'">'+(cargo?'🔴 Cargo':'🟢 Abono')+' — '+escH(m.cajero||'-')+'</div>'
      +'<div style="font-size:10px;color:var(--muted)">'+m.fecha+' '+m.hora+(m.productos?'<br><i>'+escH(m.productos)+'</i>':'')+(m.forma?' · '+m.forma:'')+'</div></div>'
      +'<div style="font-size:14px;font-weight:900;color:'+(cargo?'#dc2626':'#16a34a')+'">'+(cargo?'-':'+')+''+fmt(m.monto)+'</div>'
      +'</div>'+(m.folio?'<div style="font-size:10px;color:var(--muted)">Folio #'+m.folio+'</div>':'')+'</div>';
  }).join('')+'</div>':'<div style="text-align:center;color:var(--muted);font-size:12px;padding:12px;margin-bottom:14px">Sin movimientos</div>';

  var modal=document.createElement('div');
  modal.id='m-credito-cli'; modal.className='mbg on';
  modal.innerHTML='<div class="mbox" style="max-width:480px;max-height:90vh;overflow-y:auto">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    +'<div><div style="font-size:16px;font-weight:900;color:var(--hdr)">💳 Cuenta de Crédito</div>'
    +'<div style="font-size:12px;color:var(--muted)"><b>'+escH(cli.nom)+'</b>'+(cli.tel?' · 📱 '+escH(cli.tel):'')+'</div></div>'
    +'<button onclick="document.getElementById(\'m-credito-cli\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted)">✕</button></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    +'<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:12px;text-align:center">'
    +'<div style="font-size:10px;color:#991b1b;font-weight:700;margin-bottom:4px">DEUDA TOTAL</div>'
    +'<div style="font-size:22px;font-weight:900;color:#dc2626">'+fmt(deuda)+'</div></div>'
    +'<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px;text-align:center">'
    +'<div style="font-size:10px;color:#166534;font-weight:700;margin-bottom:4px">LÍMITE</div>'
    +'<div style="font-size:22px;font-weight:900;color:#16a34a">'+fmt(cli.lim||0)+'</div></div></div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--hdr);margin-bottom:6px;text-transform:uppercase">📋 Historial</div>'
    +histHTML
    +'<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:14px;margin-bottom:12px">'
    +'<div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:10px">💵 Registrar pago</div>'
    +'<input id="abono-monto" type="number" min="1" placeholder="Monto a abonar" style="width:100%;font-size:20px;font-weight:700;text-align:center;border:2px solid #86efac;border-radius:8px;padding:10px;color:#166534;background:#fff;box-sizing:border-box;margin-bottom:8px">'
    +'<div style="display:flex;gap:6px;margin-bottom:8px">'
    +[Math.round(deuda*0.25),Math.round(deuda*0.5),Math.round(deuda*0.75),deuda].filter(function(v){return v>0;}).map(function(v,i){
      return '<button onclick="document.getElementById(\'abono-monto\').value='+v+'" style="flex:1;background:#fff;border:1px solid #86efac;border-radius:6px;padding:6px 4px;font-size:11px;font-weight:700;cursor:pointer;color:#166534">'+['25%','50%','75%','Total'][i]+'<br><small>'+fmt(v)+'</small></button>';
    }).join('')+'</div>'
    +'<select id="abono-forma" style="width:100%;padding:8px;border:2px solid #86efac;border-radius:8px;font-size:13px;background:#fff;box-sizing:border-box;margin-bottom:10px">'
    +'<option value="efectivo">💵 Efectivo</option><option value="transferencia">📱 Transferencia</option><option value="tarjeta">💳 Tarjeta</option></select>'
    +'<div id="abono-err" style="font-size:12px;color:var(--red);min-height:14px;margin-bottom:6px"></div>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="_confirmarAbono('+cli.id+')" style="flex:1;background:linear-gradient(135deg,#16a34a,#22c55e);border:none;border-radius:8px;padding:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer">✅ Abonar</button>'
    +'<button onclick="_pagarTotalCredito('+cli.id+')" style="flex:1;background:linear-gradient(135deg,#1e3a5f,#2563eb);border:none;border-radius:8px;padding:12px;color:#fff;font-size:13px;font-weight:900;cursor:pointer">💯 Pagar total</button>'
    +'</div></div>'
    +(cli.tel?'<div style="display:flex;gap:8px">'
      +'<button onclick="_compartirWACredito('+cli.id+')" style="flex:1;background:#25d366;border:none;border-radius:8px;padding:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">📱 WhatsApp</button>'
      +'<button onclick="_imprimirEstadoCuenta('+cli.id+')" style="flex:1;background:#374151;border:none;border-radius:8px;padding:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer">🖨 Estado cuenta</button>'
      +'</div>':'')
    +'</div>';

  document.body.appendChild(modal);
  modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
  setTimeout(function(){var m=document.getElementById('abono-monto');if(m)m.focus();},80);
}

function _confirmarAbono(cliId){
  var cli=S.clis.find(function(x){return x.id===cliId;}); if(!cli)return;
  var monto=parseFloat(document.getElementById('abono-monto').value)||0;
  var forma=document.getElementById('abono-forma').value;
  var err=document.getElementById('abono-err');
  if(!monto||monto<=0){err.textContent='Ingresa un monto válido';return;}
  if(monto>cli.deuda){err.textContent='El monto supera la deuda ('+fmt(cli.deuda)+')';return;}
  var saldoAntes=cli.deuda;
  cli.deuda=Math.max(0,cli.deuda-monto);
  if(!cli.movimientos)cli.movimientos=[];
  cli.movimientos.push({tipo:'abono',fecha:hoy(),hora:ahora_(),monto:monto,forma:forma,cajero:S.user,saldoAntes:saldoAntes,saldoDespues:cli.deuda});
  S.vdia[forma]=(S.vdia[forma]||0)+monto;
  S.gdia+=monto;
  var restante=monto;
  S.hist.filter(function(v){return v.pago==='credito'&&v.clienteId===cliId&&v.pendiente;}).forEach(function(v){
    if(restante<=0)return;
    if(restante>=v.total){v.pendiente=false;v.pagadaEn=hoy()+' '+ahora_();restante-=v.total;}
    else{v.abonoParcial=(v.abonoParcial||0)+restante;restante=0;}
  });
  save(); renderClientes('');
  if(typeof renderReportes==='function')renderReportes();
  document.getElementById('m-credito-cli').remove();
  _mostrarReciboAbono(cli,monto,forma,saldoAntes);
}

function _pagarTotalCredito(cliId){
  var cli=S.clis.find(function(x){return x.id===cliId;}); if(!cli||cli.deuda<=0)return;
  document.getElementById('abono-monto').value=cli.deuda;
  _confirmarAbono(cliId);
}

function _mostrarReciboAbono(cli,monto,forma,saldoAntes){
  var formaLabel={'efectivo':'Efectivo','transferencia':'Transferencia','tarjeta':'Tarjeta'}[forma]||forma;
  var html='<div style="font-family:\'Courier New\',monospace;font-size:13px;line-height:1.7;color:#000;max-width:300px;margin:0 auto;padding:8px">'
    +'<div style="text-align:center;border-bottom:2px dashed #333;padding-bottom:8px;margin-bottom:8px">'
    +'<div style="font-size:15px;font-weight:900">'+escH(S.cfg.nom)+'</div>'
    +'<div style="font-size:13px;font-weight:700;color:#16a34a">✅ COMPROBANTE DE PAGO</div></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Cliente:</span><b>'+escH(cli.nom)+'</b></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Fecha:</span><span>'+hoy()+' '+ahora_()+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Cajero:</span><span>'+escH(S.user)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Forma pago:</span><span>'+escH(formaLabel)+'</span></div>'
    +'<div style="border-top:2px dashed #333;margin:8px 0;padding-top:6px">'
    +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>Saldo anterior:</span><span style="color:#dc2626">'+fmt(saldoAntes)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:3px"><span>Monto abonado:</span><span style="color:#16a34a">'+fmt(monto)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900"><span>Saldo restante:</span><span style="color:'+(cli.deuda>0?'#dc2626':'#16a34a')+'">'+fmt(cli.deuda)+'</span></div></div>'
    +(cli.deuda<=0?'<div style="text-align:center;font-weight:700;color:#16a34a;border:2px solid #16a34a;border-radius:6px;padding:6px;margin:8px 0">🎉 DEUDA CANCELADA</div>':'')
    +'<div style="text-align:center;border-top:2px dashed #333;padding-top:8px;margin-top:8px;font-size:11px;color:#555">'+escH(S.cfg.msg||'Gracias por su pago')+'</div></div>';
  var rm=document.createElement('div'); rm.className='mbg on';
  rm.innerHTML='<div class="mbox" style="max-width:360px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +'<h3 style="margin:0">🧾 Comprobante</h3>'
    +'<button onclick="this.closest(\'.mbg\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer">✕</button></div>'
    +'<div style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">'+html+'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="_imprimirHTML(this)" data-html="'+escH(html)+'" style="flex:1;background:#000;color:#fff;border:none;border-radius:8px;padding:11px;cursor:pointer;font-weight:700">🖨 Imprimir</button>'
    +'<button onclick="this.closest(\'.mbg\').remove()" class="btn" style="flex:1;padding:11px">Cerrar</button>'
    +'</div></div>';
  document.body.appendChild(rm);
  rm.addEventListener('click',function(e){if(e.target===rm)rm.remove();});
}

function _imprimirHTML(btn){
  var html=btn.getAttribute('data-html');
  var w=window.open('','_blank','width=340,height=500');
  if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante</title><style>body{margin:0;padding:8px;font-family:monospace}@media print{#np{display:none}}</style></head><body>'+html+'<div id="np" style="text-align:center;margin-top:10px"><button onclick="window.print()" style="padding:8px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir</button></div></body></html>');w.document.close();}
}

function _compartirWACredito(cliId){
  var cli=S.clis.find(function(x){return x.id===cliId;}); if(!cli||!cli.tel)return;
  var tel=(cli.tel||'').replace(/[^0-9]/g,'');
  if(!tel.startsWith('56'))tel='56'+tel;
  var movs=(cli.movimientos||[]).slice(-5).reverse();
  var txt='*Estado de cuenta — '+S.cfg.nom+'*\n'
    +'Cliente: *'+cli.nom+'*\n'
    +'Fecha: '+hoy()+'\n'
    +'━━━━━━━━━━━━━━━━━━━\n'
    +'*Saldo pendiente: '+fmt(cli.deuda)+'*\n'
    +'━━━━━━━━━━━━━━━━━━━\n';
  if(movs.length){txt+='Últimos movimientos:\n';movs.forEach(function(m){txt+=(m.tipo==='cargo'?'🔴':'🟢')+' '+m.fecha+' '+m.hora+' → '+(m.tipo==='cargo'?'-':'+')+''+fmt(m.monto)+(m.productos?' ('+m.productos+')':'')+'\n';});}
  txt+='━━━━━━━━━━━━━━━━━━━\n'+(S.cfg.msg||'Gracias por su preferencia');
  window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(txt),'_blank');
}

function _imprimirEstadoCuenta(cliId){
  var cli=S.clis.find(function(x){return x.id===cliId;}); if(!cli)return;
  var movs=(cli.movimientos||[]).slice().reverse();
  var html='<div style="font-family:\'Courier New\',monospace;font-size:12px;line-height:1.6;max-width:300px;margin:0 auto;padding:8px">'
    +'<div style="text-align:center;border-bottom:2px dashed #333;padding-bottom:8px;margin-bottom:8px">'
    +'<div style="font-size:14px;font-weight:900">'+escH(S.cfg.nom)+'</div>'
    +'<div style="font-size:12px;font-weight:700">ESTADO DE CUENTA</div>'
    +'<div style="font-size:11px">'+escH(cli.nom)+' · '+hoy()+'</div></div>'
    +(movs.length?movs.map(function(m){
      var cargo=m.tipo==='cargo';
      return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #ccc">'
        +'<div><div style="font-size:11px;font-weight:700">'+(cargo?'▼ Cargo':'▲ Abono')+'</div>'
        +'<div style="font-size:10px;color:#555">'+m.fecha+' '+m.hora+(m.cajero?' · '+escH(m.cajero):'')+'</div>'
        +(m.productos?'<div style="font-size:9px;color:#777">'+escH(m.productos)+'</div>':'')+'</div>'
        +'<div style="font-weight:900;color:'+(cargo?'#dc2626':'#16a34a')+'">'+(cargo?'-':'+')+''+fmt(m.monto)+'</div></div>';
    }).join(''):'<div style="text-align:center;color:#999;padding:12px">Sin movimientos</div>')
    +'<div style="border-top:2px dashed #333;margin-top:8px;padding-top:6px;display:flex;justify-content:space-between;font-size:14px;font-weight:900">'
    +'<span>SALDO</span><span style="color:'+(cli.deuda>0?'#dc2626':'#16a34a')+'">'+fmt(cli.deuda)+'</span></div></div>';
  var w=window.open('','_blank','width=340,height=600');
  if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Estado Cuenta</title><style>body{margin:0;padding:8px}@media print{#np{display:none}}</style></head><body>'+html+'<div id="np" style="text-align:center;margin-top:10px"><button onclick="window.print()" style="padding:8px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir</button></div></body></html>');w.document.close();}
}

