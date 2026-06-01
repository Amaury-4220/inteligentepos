// ================================================================
// VANIA AGENTES — Vania POS v3.0
// Bridge entre el POS y los agentes IA (Nova, Mercadito, Stocky, etc)
// Requiere: window._fantasmaCall definido en el index
// ================================================================

// Agente Nova — IA general del negocio
window.VaniaAgentes = {
  version: '3.0',
  activos: ['Nova','Mercadito','Stocky','Vendito','Alertix','DonErnesto']
};

// Nova — consultas generales
function novaMensaje(system, messages, onResp, onErr) {
  if(typeof window._fantasmaCall !== 'function') {
    if(onErr) onErr('Agente no disponible');
    return;
  }
  window._fantasmaCall('nova_ia', system, messages, onResp, onErr);
}

// Mercadito — marketing y promociones
function mercaditoCall(messages, onResp, onErr) {
  var system = 'Eres Mercadito, experto en marketing para tiendas chilenas. '
    + 'Generas mensajes de oferta persuasivos y cortos para WhatsApp. '
    + 'Usas lenguaje chileno informal con emojis. Máximo 5 líneas.';
  novaMensaje(system, messages, onResp, onErr);
}

// Stocky — inventario y reposición
function stockyCall(messages, onResp, onErr) {
  var system = 'Eres Stocky, experto en gestión de inventario para tiendas. '
    + 'Analizas stock, detectas productos con baja rotación y recomiendas reposición. '
    + 'Responde en español chileno, conciso y práctico.';
  novaMensaje(system, messages, onResp, onErr);
}

// Vendito — análisis de ventas
function venditoCall(messages, onResp, onErr) {
  var system = 'Eres Vendito, analista de ventas para tiendas locales chilenas. '
    + 'Identificas tendencias, productos estrella y oportunidades de venta. '
    + 'Responde en español chileno, con datos concretos.';
  novaMensaje(system, messages, onResp, onErr);
}

// Alertix — alertas y notificaciones
function alertixCall(tipo, datos) {
  var alertas = {
    stockBajo: function(prods) {
      if(!prods.length) return;
      var msg = '⚠️ ' + prods.length + ' producto(s) con stock bajo:\n';
      prods.slice(0,5).forEach(function(p) {
        msg += '• ' + p.desc + ': ' + p.stock + ' (mín ' + (p.minimo||5) + ')\n';
      });
      console.warn('[Alertix]', msg);
    },
    deudasAltas: function(clis) {
      if(!clis.length) return;
      console.warn('[Alertix] ' + clis.length + ' clientes con deuda pendiente');
    }
  };
  if(alertas[tipo]) alertas[tipo](datos);
}

// Don Ernesto — consejero financiero
function donErnestoCall(messages, onResp, onErr) {
  var system = 'Eres Don Ernesto, consejero financiero para pequeños negocios chilenos. '
    + 'Das consejos prácticos sobre flujo de caja, gastos y rentabilidad. '
    + 'Usas lenguaje simple y ejemplos concretos.';
  novaMensaje(system, messages, onResp, onErr);
}

// Inicializar alertas automáticas
setTimeout(function() {
  try {
    if(typeof S !== 'undefined' && S.prods) {
      var bajo = S.prods.filter(function(p) { return p.stock <= (p.minimo||5); });
      if(bajo.length) alertixCall('stockBajo', bajo);
    }
    if(typeof S !== 'undefined' && S.clis) {
      var deudores = S.clis.filter(function(c) { return c.deuda > 0; });
      if(deudores.length) alertixCall('deudasAltas', deudores);
    }
  } catch(e) {}
}, 5000);

console.log('[VaniaAgentes] cargado ✅ — Agentes: ' + window.VaniaAgentes.activos.join(', '));
