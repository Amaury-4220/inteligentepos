// ============================================================
// ORQUESTADOR VANIA POS — v1.0
// Monitorea agentes, detecta errores, notifica al dueño
// ============================================================

window.VaniaOrq = (function(){

  var AGENTES = ['stock','ticket','credito','imagen'];
  var _errores = [];
  var _intervalo = null;
  var CFG_WA = null; // se carga desde S.cfg

  // ---- REGISTRO DE ERRORES ----
  function registrarError(agente, fn, msg){
    var entry = {
      agente: agente,
      fn: fn,
      msg: String(msg),
      fecha: new Date().toLocaleString('es-CL'),
      ts: Date.now()
    };
    _errores.push(entry);
    if(_errores.length > 100) _errores.shift();
    console.warn('[ORQUESTADOR] Error en ' + agente + '.' + fn + ':', msg);
    _mostrarBadgeError();
  }

  // ---- BADGE VISUAL EN UI ----
  function _mostrarBadgeError(){
    var badge = document.getElementById('_orq_badge');
    if(!badge){
      badge = document.createElement('div');
      badge.id = '_orq_badge';
      badge.style.cssText = 'position:fixed;bottom:72px;right:16px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;'
        +'padding:6px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;'
        +'z-index:99999;box-shadow:0 4px 16px rgba(220,38,38,.4);border:1px solid rgba(255,255,255,.2)';
      badge.onclick = function(){ VaniaOrq.verLog(); };
      document.body.appendChild(badge);
    }
    var n = _errores.length;
    badge.textContent = '⚠️ ' + n + ' error' + (n!==1?'s':'') + ' — Ver log';
    badge.style.display = 'block';
  }

  // ---- MONITOREO PERIÓDICO ----
  function _chequear(){
    // Verificar que funciones críticas existen
    var criticas = [
      ['confirmarCobro','core'],
      ['renderVentas','core'],
      ['generarHTMLTicket','ticket'],
      ['_abrirModalCredito','credito'],
      ['confirmarGranel','stock'],
    ];
    criticas.forEach(function(par){
      if(typeof window[par[0]] !== 'function'){
        registrarError(par[1], par[0], 'Función no disponible');
      }
    });

    // Verificar S cargado
    if(typeof S === 'undefined' || !S){
      registrarError('core','S','Estado global no cargado');
    }
  }

  // ---- VER LOG EN MODAL ----
  function verLog(){
    var ex = document.getElementById('_orq_modal');
    if(ex) ex.remove();
    var modal = document.createElement('div');
    modal.id = '_orq_modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999;display:flex;align-items:center;justify-content:center';
    var rows = _errores.slice().reverse().map(function(e){
      return '<tr><td style="padding:4px 8px;font-size:11px;color:#dc2626;font-weight:700">['+e.agente+']</td>'
        +'<td style="padding:4px 8px;font-size:11px">'+e.fn+'</td>'
        +'<td style="padding:4px 8px;font-size:11px;max-width:200px">'+e.msg+'</td>'
        +'<td style="padding:4px 8px;font-size:10px;color:#6b7280">'+e.fecha+'</td></tr>';
    }).join('');
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px;max-width:600px;width:95%;max-height:80vh;overflow-y:auto">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
      +'<div style="font-size:16px;font-weight:900;color:#111">🛡 Log del Orquestador</div>'
      +'<button onclick="document.getElementById(\'_orq_modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer">✕</button>'
      +'</div>'
      +(_errores.length===0
        ?'<div style="text-align:center;color:#16a34a;font-size:14px;padding:20px">✅ Sin errores registrados</div>'
        :'<table style="width:100%;border-collapse:collapse"><thead><tr>'
          +'<th style="text-align:left;padding:4px 8px;font-size:11px;color:#6b7280">Agente</th>'
          +'<th style="text-align:left;padding:4px 8px;font-size:11px;color:#6b7280">Función</th>'
          +'<th style="text-align:left;padding:4px 8px;font-size:11px;color:#6b7280">Error</th>'
          +'<th style="text-align:left;padding:4px 8px;font-size:11px;color:#6b7280">Fecha</th>'
          +'</tr></thead><tbody>'+rows+'</tbody></table>')
      +'<div style="display:flex;gap:8px;margin-top:14px">'
      +'<button onclick="VaniaOrq.limpiarLog()" class="btn" style="flex:1;padding:10px">🗑 Limpiar log</button>'
      +'<button onclick="VaniaOrq.notificarWA()" style="flex:1;background:#25d366;border:none;border-radius:8px;padding:10px;color:#fff;font-weight:700;cursor:pointer">📱 Enviar a WhatsApp</button>'
      +'</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){ if(e.target===modal) modal.remove(); });
  }

  // ---- NOTIFICAR POR WHATSAPP ----
  function notificarWA(){
    var tel = (typeof S!=='undefined'&&S.cfg&&S.cfg.tel)||'';
    tel = tel.replace(/[^0-9]/g,'');
    if(!tel.startsWith('56')) tel = '56'+tel;
    if(!tel||tel.length<10){ alert('Configura el teléfono del negocio en Config para recibir alertas WA'); return; }
    var txt = '*🚨 ALERTA VANIA POS*\n'
      +(typeof S!=='undefined'&&S.cfg?'*Local: '+S.cfg.nom+'*\n':'')
      +'Fecha: '+new Date().toLocaleString('es-CL')+'\n'
      +'Errores detectados: '+_errores.length+'\n\n'
      +_errores.slice(-5).map(function(e){ return '• ['+e.agente+'] '+e.fn+': '+e.msg; }).join('\n');
    window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(txt),'_blank');
  }

  function limpiarLog(){
    _errores = [];
    var badge = document.getElementById('_orq_badge');
    if(badge) badge.style.display = 'none';
    var modal = document.getElementById('_orq_modal');
    if(modal) modal.remove();
  }

  // ---- WRAPPER SEGURO ----
  // Envuelve cualquier función para capturar errores automáticamente
  function wrap(agente, nombre, fn){
    return function(){
      try{
        return fn.apply(this, arguments);
      } catch(e){
        registrarError(agente, nombre, e.message||String(e));
      }
    };
  }

  // ---- INIT ----
  function init(){
    console.log('[ORQUESTADOR] Iniciando monitoreo Vania POS...');
    // Chequeo inmediato
    setTimeout(_chequear, 2000);
    // Chequeo cada 5 minutos
    _intervalo = setInterval(_chequear, 5 * 60 * 1000);
    // Capturar errores globales
    window.addEventListener('error', function(e){
      var msg = e.message||'';
      // Ignorar errores menores conocidos — no críticos para el POS
      var ignorar = ["classList","Cannot set properties of null","Cannot read properties of null","favicon","logo-192","ResizeObserver"];
      for(var i=0;i<ignorar.length;i++){ if(msg.indexOf(ignorar[i])>=0) return; }
      registrarError('global', e.filename||'script', msg);
    });
    console.log('[ORQUESTADOR] ✅ Activo — monitoreando 24/7');
  }

  // Auto-init cuando el DOM esté listo
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }

  return {
    verLog: verLog,
    limpiarLog: limpiarLog,
    notificarWA: notificarWA,
    registrarError: registrarError,
    wrap: wrap,
    getErrores: function(){ return _errores.slice(); }
  };

})();
