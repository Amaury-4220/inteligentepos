// ================================================================
// REPORTE DIARIO — Vania POS v3.0
// Muestra resumen del día anterior al abrir el sistema
// ================================================================

window.vaniaMostrarReporteDiario = function(neg, pd) {
  try {
    if(!pd || !pd.hist) return;
    var ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    var ayerStr = ayer.toLocaleDateString('es-CL');

    var ventasAyer = (pd.hist || []).filter(function(v) {
      return v.fecha === ayerStr && !v.anulada;
    });

    if(!ventasAyer.length) return;

    var totalAyer = ventasAyer.reduce(function(a, v) { return a + (v.total || 0); }, 0);
    var gastoAyer = (pd.gastos || []).filter(function(g) {
      return g.fecha === ayerStr;
    }).reduce(function(a, g) { return a + (g.monto || 0); }, 0);

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:70px;right:16px;z-index:9998;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border-radius:14px;padding:16px 20px;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:280px;font-size:13px';
    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<div style="font-weight:900;font-size:14px">📊 Resumen de ayer</div>'
      + '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;padding:0">✕</button>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="opacity:.8">📅 ' + ayerStr + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Ventas</span><b>' + ventasAyer.length + '</b></div>'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Total cobrado</span><b>$' + totalAyer.toLocaleString('es-CL') + '</b></div>'
      + (gastoAyer > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Gastos</span><b style="color:#fca5a5">$' + gastoAyer.toLocaleString('es-CL') + '</b></div>' : '')
      + '<div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.2);padding-top:6px;margin-top:6px"><span>Resultado</span><b style="color:#86efac">$' + (totalAyer - gastoAyer).toLocaleString('es-CL') + '</b></div>';

    document.body.appendChild(modal);
    setTimeout(function() {
      if(modal.parentElement) {
        modal.style.transition = 'opacity .5s';
        modal.style.opacity = '0';
        setTimeout(function() { if(modal.parentElement) modal.remove(); }, 500);
      }
    }, 8000);

  } catch(e) {
    console.warn('[ReporteDiario] Error:', e.message);
  }
};

console.log('[ReporteDiario] cargado ✅');
