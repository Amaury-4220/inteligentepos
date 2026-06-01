// ================================================================
// AGENTE INSPECTOR — Vania POS v3.0
// Inspector visual de fallos para desarrollo en Vercel
// Solo activo en inteligentepos.vercel.app (NO en vaniapos.cl)
// ================================================================

(function() {
  'use strict';

  // ── Solo activo en Vercel (desarrollo) ──────────────────────
  var esVercel = window.location.hostname.indexOf('vercel.app') >= 0
               || window.location.hostname === 'localhost'
               || window.location.hostname === '127.0.0.1';

  if (!esVercel) return; // En producción no hace nada

  // ── Estado del inspector ─────────────────────────────────────
  var _errores = [];
  var _warnings = [];
  var _panel = null;
  var _badge = null;
  var _visible = false;
  var _maximizado = false;

  // ── Interceptar console.error y console.warn ─────────────────
  var _origError = console.error.bind(console);
  var _origWarn  = console.warn.bind(console);
  var _origLog   = console.log.bind(console);

  console.error = function() {
    _origError.apply(console, arguments);
    var msg = Array.from(arguments).map(function(a) {
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    _registrar('error', msg);
  };

  console.warn = function() {
    _origWarn.apply(console, arguments);
    var msg = Array.from(arguments).map(function(a) {
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    // Ignorar warnings menores conocidos
    var ignorar = ['classList', 'favicon', 'logo-192', 'manifest', 'apple-mobile-web-app',
                   'webrtc', 'srcdoc', 'prosemirror', 'ScriptProcessor'];
    for (var i = 0; i < ignorar.length; i++) {
      if (msg.indexOf(ignorar[i]) >= 0) return;
    }
    _registrar('warn', msg);
  };

  // ── Capturar errores globales ────────────────────────────────
  window.addEventListener('error', function(e) {
    var msg = e.message || 'Error desconocido';
    var src = e.filename ? e.filename.split('/').pop() : 'script';
    var ln  = e.lineno ? ' L' + e.lineno : '';
    _registrar('error', '[' + src + ln + '] ' + msg);
  });

  window.addEventListener('unhandledrejection', function(e) {
    var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Promise rechazada';
    _registrar('error', '[Promise] ' + msg);
  });

  // ── Capturar recursos 404 ────────────────────────────────────
  window.addEventListener('error', function(e) {
    var el = e.target;
    if (el && (el.tagName === 'SCRIPT' || el.tagName === 'LINK' || el.tagName === 'IMG')) {
      var src = el.src || el.href || '?';
      var nombre = src.split('/').pop().split('?')[0];
      // Ignorar recursos decorativos
      var ignorar = ['favicon', 'logo-192', 'logo-512'];
      for (var i = 0; i < ignorar.length; i++) {
        if (nombre.indexOf(ignorar[i]) >= 0) return;
      }
      _registrar('error', '[404] No encontrado: ' + nombre);
    }
  }, true);

  // ── Registrar un error/warning ───────────────────────────────
  function _registrar(tipo, msg) {
    // Deduplicar
    var lista = tipo === 'error' ? _errores : _warnings;
    var ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.msg === msg) {
      ultimo.count = (ultimo.count || 1) + 1;
      _renderPanel();
      return;
    }

    var entry = {
      tipo: tipo,
      msg: msg.substring(0, 300),
      hora: new Date().toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
      count: 1
    };

    if (tipo === 'error') {
      _errores.unshift(entry);
      if (_errores.length > 50) _errores.pop();
    } else {
      _warnings.unshift(entry);
      if (_warnings.length > 30) _warnings.pop();
    }

    _actualizarBadge();
    _renderPanel();

    // Auto-abrir si es error crítico
    if (tipo === 'error' && !_visible) {
      _mostrarBadgeAlerta();
    }
  }

  // ── Crear UI ─────────────────────────────────────────────────
  function _init() {
    // Badge flotante
    _badge = document.createElement('div');
    _badge.id = '_inspector_badge';
    _badge.style.cssText = [
      'position:fixed',
      'bottom:80px',
      'left:16px',
      'z-index:999999',
      'background:#1e293b',
      'color:#fff',
      'border-radius:20px',
      'padding:6px 12px',
      'font-size:11px',
      'font-weight:700',
      'cursor:pointer',
      'box-shadow:0 4px 16px rgba(0,0,0,.4)',
      'border:1px solid rgba(255,255,255,.1)',
      'font-family:monospace',
      'display:flex',
      'align-items:center',
      'gap:6px',
      'transition:all .2s',
      'user-select:none'
    ].join(';');
    _badge.innerHTML = '🔍 Inspector <span id="_insp_cnt" style="background:#ef4444;border-radius:8px;padding:1px 6px;font-size:10px">0</span>';
    _badge.onclick = _togglePanel;
    document.body.appendChild(_badge);

    // Panel principal
    _panel = document.createElement('div');
    _panel.id = '_inspector_panel';
    _panel.style.cssText = [
      'position:fixed',
      'bottom:120px',
      'left:16px',
      'width:420px',
      'max-height:60vh',
      'z-index:999998',
      'background:#0f172a',
      'border:1px solid #334155',
      'border-radius:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,.6)',
      'font-family:monospace',
      'font-size:11px',
      'display:none',
      'flex-direction:column',
      'overflow:hidden'
    ].join(';');

    _panel.innerHTML = [
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0">',
        '<div style="font-weight:700;color:#f1f5f9;font-size:12px">🔍 Inspector de Fallos <span style="font-size:9px;color:#64748b;font-weight:400">VERCEL DEV</span></div>',
        '<div style="display:flex;gap:6px;align-items:center">',
          '<button id="_insp_clear" style="background:#334155;border:none;color:#94a3b8;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:10px">🗑 Limpiar</button>',
          '<button id="_insp_copy" style="background:#334155;border:none;color:#94a3b8;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:10px">📋 Copiar</button>',
          '<button id="_insp_close" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;line-height:1;padding:0 2px">✕</button>',
        '</div>',
      '</div>',
      '<div style="display:flex;gap:1px;background:#334155;flex-shrink:0">',
        '<button id="_insp_tab_err" style="flex:1;background:#0f172a;border:none;color:#ef4444;padding:7px;cursor:pointer;font-size:11px;font-weight:700">❌ Errores <span id="_insp_n_err">0</span></button>',
        '<button id="_insp_tab_warn" style="flex:1;background:#1e293b;border:none;color:#f59e0b;padding:7px;cursor:pointer;font-size:11px">⚠️ Warnings <span id="_insp_n_warn">0</span></button>',
        '<button id="_insp_tab_info" style="flex:1;background:#1e293b;border:none;color:#38bdf8;padding:7px;cursor:pointer;font-size:11px">ℹ️ Sistema</button>',
      '</div>',
      '<div id="_insp_body" style="overflow-y:auto;flex:1;padding:8px"></div>'
    ].join('');

    document.body.appendChild(_panel);

    // Eventos
    document.getElementById('_insp_close').onclick = _togglePanel;
    document.getElementById('_insp_clear').onclick = _limpiar;
    document.getElementById('_insp_copy').onclick = _copiar;
    document.getElementById('_insp_tab_err').onclick = function() { _setTab('err'); };
    document.getElementById('_insp_tab_warn').onclick = function() { _setTab('warn'); };
    document.getElementById('_insp_tab_info').onclick = function() { _setTab('info'); };

    _tabActual = 'err';
    _renderPanel();
  }

  var _tabActual = 'err';

  function _setTab(tab) {
    _tabActual = tab;
    var tabs = ['err', 'warn', 'info'];
    tabs.forEach(function(t) {
      var btn = document.getElementById('_insp_tab_' + t);
      if (btn) btn.style.background = t === tab ? '#0f172a' : '#1e293b';
    });
    _renderPanel();
  }

  function _renderPanel() {
    if (!_panel) return;
    var body = document.getElementById('_insp_body');
    var nErr  = document.getElementById('_insp_n_err');
    var nWarn = document.getElementById('_insp_n_warn');
    if (nErr)  nErr.textContent  = _errores.length;
    if (nWarn) nWarn.textContent = _warnings.length;

    if (!body) return;

    if (_tabActual === 'err') {
      if (!_errores.length) {
        body.innerHTML = '<div style="text-align:center;color:#10b981;padding:20px;font-size:13px">✅ Sin errores</div>';
      } else {
        body.innerHTML = _errores.map(function(e) {
          return _renderEntry(e, '#ef4444', '#fef2f2');
        }).join('');
      }
    } else if (_tabActual === 'warn') {
      if (!_warnings.length) {
        body.innerHTML = '<div style="text-align:center;color:#10b981;padding:20px;font-size:13px">✅ Sin warnings</div>';
      } else {
        body.innerHTML = _warnings.map(function(e) {
          return _renderEntry(e, '#f59e0b', '#fffbeb');
        }).join('');
      }
    } else {
      // Tab info — estado del sistema
      body.innerHTML = _renderInfo();
    }
  }

  function _renderEntry(e, color, bg) {
    return [
      '<div style="border-left:3px solid ' + color + ';margin-bottom:6px;padding:6px 8px;background:#1e293b;border-radius:0 6px 6px 0">',
        '<div style="display:flex;justify-content:space-between;margin-bottom:3px">',
          '<span style="color:' + color + ';font-weight:700;font-size:10px">' + e.hora + (e.count > 1 ? ' ×' + e.count : '') + '</span>',
        '</div>',
        '<div style="color:#e2e8f0;word-break:break-all;line-height:1.5">' + _escHTML(e.msg) + '</div>',
      '</div>'
    ].join('');
  }

  function _renderInfo() {
    var agentes = ['orquestador.js','agente-ticket.js','agente-credito.js','agente-stock.js',
                   'agente-productos.js','agente-clientes.js','agente-reportes.js',
                   'agente-anulacion.js','agente-proveedores.js','agente-marketing.js',
                   'reporte-diario.js','vania-agentes.js'];

    var lineas = [
      '<div style="color:#38bdf8;font-weight:700;margin-bottom:8px">📦 Agentes cargados</div>'
    ];

    agentes.forEach(function(a) {
      var fn = a.replace('.js','').replace(/-/g,'_');
      // Intentar detectar si el agente está activo buscando funciones conocidas
      var cargado = _verificarAgente(a);
      lineas.push(
        '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e293b">' +
          '<span style="color:#94a3b8">' + a + '</span>' +
          '<span style="color:' + (cargado ? '#10b981' : '#ef4444') + ';font-weight:700">' +
            (cargado ? '✅' : '❌ 404') +
          '</span>' +
        '</div>'
      );
    });

    // Info Firebase
    lineas.push('<div style="color:#38bdf8;font-weight:700;margin:10px 0 6px">🔥 Firebase</div>');
    try {
      var fb = typeof db !== 'undefined' && db ? '✅ Conectado' : '❌ Sin conexión';
      var mode = typeof FB_MODE !== 'undefined' ? FB_MODE : '?';
      lineas.push('<div style="color:#94a3b8">Modo: <span style="color:#f1f5f9">' + mode + '</span> ' + fb + '</div>');
    } catch(e) {
      lineas.push('<div style="color:#ef4444">No disponible</div>');
    }

    // Info S (estado)
    lineas.push('<div style="color:#38bdf8;font-weight:700;margin:10px 0 6px">💾 Estado POS</div>');
    try {
      var info = [
        'Productos: ' + (typeof S !== 'undefined' ? S.prods.length : '?'),
        'Clientes: '  + (typeof S !== 'undefined' ? S.clis.length : '?'),
        'Historial: ' + (typeof S !== 'undefined' ? S.hist.length : '?'),
        'Usuario: '   + (typeof S !== 'undefined' ? (S.user || 'sin sesión') : '?'),
      ];
      lineas.push('<div style="color:#94a3b8;line-height:2">' + info.join('<br>') + '</div>');
    } catch(e) {
      lineas.push('<div style="color:#ef4444">No disponible</div>');
    }

    return lineas.join('');
  }

  // Verificar si un agente cargó revisando sus funciones
  var _agentesFns = {
    'agente-ticket.js':      'generarHTMLTicket',
    'agente-credito.js':     '_abrirModalCredito',
    'agente-stock.js':       'renderInvBajo',
    'agente-productos.js':   'guardarProd',
    'agente-clientes.js':    'guardarCli',
    'agente-reportes.js':    'renderReportes',
    'agente-anulacion.js':   'ejecutarAnulacion',
    'agente-proveedores.js': 'guardarProveedor',
    'agente-marketing.js':   'renderMarketingStats',
    'orquestador.js':        'VaniaOrq',
    'reporte-diario.js':     'vaniaMostrarReporteDiario',
    'vania-agentes.js':      'VaniaAgentes',
  };

  function _verificarAgente(nombre) {
    var fn = _agentesFns[nombre];
    if (!fn) return true;
    try {
      if (fn === 'vaniaMostrarReporteDiario') return typeof window.vaniaMostrarReporteDiario === 'function';
      if (fn === 'VaniaAgentes') return typeof window.VaniaAgentes === 'object';
      if (fn === 'VaniaOrq') return typeof window.VaniaOrq === 'object' || typeof window._orqLogs !== 'undefined';
      return typeof window[fn] === 'function';
    } catch(e) { return false; }
  }

  function _togglePanel() {
    _visible = !_visible;
    if (_panel) _panel.style.display = _visible ? 'flex' : 'none';
    if (_badge) _badge.style.borderColor = _visible ? '#3b82f6' : 'rgba(255,255,255,.1)';
  }

  function _actualizarBadge() {
    var cnt = document.getElementById('_insp_cnt');
    if (!cnt) return;
    var n = _errores.length;
    cnt.textContent = n;
    cnt.style.background = n > 0 ? '#ef4444' : '#10b981';
    if (_badge) {
      _badge.style.borderColor = n > 0 ? '#ef4444' : 'rgba(255,255,255,.1)';
    }
  }

  function _mostrarBadgeAlerta() {
    if (!_badge) return;
    _badge.style.transform = 'scale(1.15)';
    setTimeout(function() {
      if (_badge) _badge.style.transform = 'scale(1)';
    }, 400);
  }

  function _limpiar() {
    _errores = [];
    _warnings = [];
    _actualizarBadge();
    _renderPanel();
  }

  function _copiar() {
    var txt = '=== ERRORES ===\n' +
      _errores.map(function(e) { return '[' + e.hora + '] ' + e.msg; }).join('\n') +
      '\n\n=== WARNINGS ===\n' +
      _warnings.map(function(e) { return '[' + e.hora + '] ' + e.msg; }).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(function() {
        var btn = document.getElementById('_insp_copy');
        if (btn) { btn.textContent = '✅ Copiado'; setTimeout(function() { btn.textContent = '📋 Copiar'; }, 1500); }
      });
    }
  }

  function _escHTML(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Iniciar cuando el DOM esté listo ────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    setTimeout(_init, 500);
  }

  // Actualizar tab info cada 5 segundos
  setInterval(function() {
    if (_visible && _tabActual === 'info') _renderPanel();
  }, 5000);

  console.log('[Inspector] cargado ✅ — Solo activo en Vercel');

})();
