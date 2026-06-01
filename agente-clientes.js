// ================================================================
// AGENTE CLIENTES — Vania POS v3.0
// CRUD clientes, búsqueda, barra crédito
// Funciones: renderClientes, abrirCli, guardarCli, eliminarCli
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function renderClientes(q) {
  q=(q||'').toLowerCase();
  var lista=q?S.clis.filter(function(c){return c.nom.toLowerCase().indexOf(q)>=0;}):S.clis;
  el('tcli').innerHTML=lista.map(function(c){
    var pct=c.lim>0?Math.min(100,Math.round(c.deuda/c.lim*100)):0;
    var barCol=pct<60?'#22c55e':pct<85?'#f59e0b':'#ef4444';
    return '<tr>'
      +'<td><b>'+escH(c.nom)+'</b>'+(c.tel?'<br><span style="font-size:10px;color:var(--muted)">'+escH(c.tel)+'</span>':'')+'</td>'
      +'<td style="color:'+(c.deuda>0?'var(--red)':'var(--green)')+';font-weight:900;font-size:14px">'+fmt(c.deuda)
      +(c.lim>0?'<div style="background:#e5e7eb;border-radius:3px;height:4px;margin-top:3px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+barCol+'"></div></div>':'')+'</td>'
      +'<td style="font-size:11px;color:var(--muted)">'+fmt(c.lim||0)+'</td>'
      +'<td><span class="bdg '+(c.deuda>0?'ber':'bok')+'">'+(c.deuda>0?'Debe':'Al día')+'</span></td>'
      +'<td style="white-space:nowrap">'
      +'<button class="btn" style="padding:3px 8px;font-size:11px" data-editcli="'+c.id+'">✏️</button>'
      +(c.deuda>0?'<button class="btn" style="padding:3px 8px;font-size:11px;margin-left:3px;background:#16a34a;color:#fff;border-color:#16a34a" data-pagacli="'+c.id+'">💵 Cobrar</button>':'')
      +(c.tel?'<button class="btn" style="padding:3px 6px;font-size:11px;margin-left:3px;background:#25d366;color:#fff;border-color:#25d366" onclick="_compartirWACredito('+c.id+')">📱</button>':'')
      +'</td></tr>';
  }).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--muted)">No hay clientes</td></tr>';
  el('tcli').onclick=function(e){
    var be=e.target.closest('[data-editcli]'); if(be) abrirCli(parseInt(be.getAttribute('data-editcli')));
    var bp=e.target.closest('[data-pagacli]'); if(bp) pagarDeuda(parseInt(bp.getAttribute('data-pagacli')));
  };
}

function abrirCli(id) {
  cliEditId=id; el('m-cli-tit').textContent=id?'Editar Cliente':'Nuevo Cliente';
  el('bdelcli').style.display=id?'inline-flex':'none';
  var c=id?S.clis.find(function(x){return x.id===id;}):{}; c=c||{};
  el('mc-nom').value=c.nom||''; el('mc-tel').value=c.tel||''; el('mc-lim').value=c.lim||50000;
  el('mc-err').textContent='';
  show('m-cli'); setTimeout(function(){el('mc-nom').focus();},80);
}

function guardarCli() {
  var nom=el('mc-nom').value.trim(); if(!nom){el('mc-err').textContent='El nombre es obligatorio';return;}
  var data={nom:nom,tel:el('mc-tel').value.trim(),lim:parseFloat(el('mc-lim').value)||50000};
  if(!cliEditId){data.id=Date.now();data.deuda=0;S.clis.push(data);}
  else{var c=S.clis.find(function(x){return x.id===cliEditId;});if(c){c.nom=data.nom;c.tel=data.tel;c.lim=data.lim;}}
  save();hide('m-cli');renderClientes('');
}

function eliminarCli(){if(!confirm('¿Eliminar?'))return;S.clis=S.clis.filter(function(x){return x.id!==cliEditId;});save();hide('m-cli');renderClientes('');}

