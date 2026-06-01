// ================================================================
// AGENTE MARKETING — Vania POS v3.0
// Campañas WA, análisis inventario, mensajes IA
// Funciones: renderMarketingStats, analizarInventarioMarketing, renderProductosMarketing, agregarProductoMarketing, generarMensajeMarketing, enviarCampanaMarketing
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function renderMarketingStats() {
  var clientesManuales = S.clis ? S.clis.filter(function(c){ return c.tel; }).length : 0;
  var conConsentimiento = S.clis ? S.clis.filter(function(c){ return c.marketingOk; }).length : 0;
  var fidelizados = S._clientesFidelizados ? Object.keys(S._clientesFidelizados).length : 0;

  function _render(fid) {
    el('mkt-stats').innerHTML = [
      [clientesManuales + fid, '👥 Total contactos', '#2563eb'],
      [conConsentimiento + fid, '✅ Con consentimiento WA', '#10b981'],
      [fid, '🎁 Por QR fidelización', '#8b5cf6'],
      [S.prods.filter(function(p){ return p.stock > (p.minimo||5)*3; }).length, '📦 Sobrestock', '#f59e0b']
    ].map(function(x){
      return '<div class="stat" style="border-left:4px solid '+x[2]+'">'
        +'<div class="sv" style="color:'+x[2]+'">'+x[0]+'</div>'
        +'<div class="sl">'+x[1]+'</div></div>';
    }).join('');
  }

  _render(fidelizados);

  if(db && _NEG && !S._clientesFidelizados) {
    db.ref('negocios/'+_NEG.id+'/clientes_fidelizados').once('value').then(function(snap){
      S._clientesFidelizados = snap.val() || {};
      _render(Object.keys(S._clientesFidelizados).length);
    });
  }
}

function analizarInventarioMarketing() {
  renderMarketingStats();
  // Productos con sobrestock o sin rotación
  var sobrestock = S.prods.filter(function(p){ return p.stock > (p.minimo||5)*3; }).slice(0,5);
  var sinRotacion = S.prods.filter(function(p){ return (p.vendido||0)===0 && p.stock>0; }).slice(0,5);
  _mktProductos = [];
  var todos = sobrestock.concat(sinRotacion).filter(function(p,i,arr){
    return arr.findIndex(function(x){ return x.cod===p.cod; })===i;
  }).slice(0,8);
  if(!todos.length){
    el('mkt-productos').innerHTML='<div style="color:var(--green);font-size:12px">✅ Tu inventario está bien balanceado. Puedes agregar productos manualmente.</div>';
    return;
  }
  _mktProductos = todos.map(function(p){
    return {cod:p.cod, desc:p.desc, venta:p.venta, stock:p.stock, seleccionado:true};
  });
  renderProductosMarketing();
}

function renderProductosMarketing() {
  el('mkt-productos').innerHTML = _mktProductos.map(function(p, i){
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px;border-bottom:1px solid var(--border);font-size:12px">'
      +'<input type="checkbox" id="mkt-chk-'+i+'" '+(p.seleccionado?'checked':'')+' onchange="_mktProductos['+i+'].seleccionado=this.checked">'
      +'<div style="flex:1"><b>'+escH(p.desc)+'</b><span style="color:var(--muted);margin-left:6px">Stock: '+p.stock+'</span></div>'
      +'<div style="font-weight:700;color:var(--pri)">'+fmt(p.venta)+'</div>'
      +'<button onclick="_mktProductos.splice('+i+',1);renderProductosMarketing()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">✕</button>'
      +'</div>';
  }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px">Sin productos. Agrega manualmente.</div>';
}

function agregarProductoMarketing() {
  var nom = el('mkt-prod-manual').value.trim();
  var precio = parseFloat(el('mkt-precio-manual').value)||0;
  if(!nom){ alert('Ingresa el nombre del producto'); return; }
  // Buscar en inventario
  var p = S.prods.find(function(x){ return x.desc.toLowerCase().indexOf(nom.toLowerCase())>=0; });
  _mktProductos.push({
    cod: p?p.cod:'manual',
    desc: p?p.desc:nom,
    venta: precio||( p?p.venta:0),
    stock: p?p.stock:0,
    seleccionado: true
  });
  el('mkt-prod-manual').value='';
  el('mkt-precio-manual').value='';
  renderProductosMarketing();
}

function generarMensajeMarketing() {
  var seleccionados = _mktProductos.filter(function(p){ return p.seleccionado; });
  if(!seleccionados.length){ alert('Selecciona al menos un producto'); return; }
  var pct = el('mkt-pct').value||10;
  var minimo = el('mkt-minimo').value||5000;
  var extra = el('mkt-msg-extra').value.trim();
  var jsonProds = JSON.stringify(seleccionados.map(function(p){
    return {nombre:p.desc, precio:p.venta, stock:p.stock};
  }));
  var system = 'Eres un experto en Growth Marketing para tiendas locales chilenas. '
    +'Genera un mensaje de oferta para WhatsApp: persuasivo, corto, con emojis. '
    +'Usa lenguaje chileno informal. Máximo 5 líneas. '
    +'No inventes productos que no estén en la lista. '
    +'El descuento es del '+pct+'%. Compra mínima $'+parseInt(minimo).toLocaleString('es-CL')+'. '
    +(extra?'Incluye este mensaje: '+extra+'. ':'')
    +'Termina con el nombre del negocio: '+S.cfg.nom+'.';
  var userMsg = 'Genera una oferta basándote ESTRICTAMENTE en estos productos con alto stock: '+jsonProds;
  var btn = document.querySelector('#t-marketing .btn.bg');
  el('mkt-mensaje-box').style.display='block';
  el('mkt-mensaje').value='⏳ Nova está generando el mensaje...';
  window._fantasmaCall('nova_ia', system,
    [{role:'user', content:userMsg}],
    function(resp){
      el('mkt-mensaje').value = resp;
    },
    function(){
      el('mkt-mensaje').value = 'Error de conexión. Intenta de nuevo.';
    }
  );
}

function enviarCampanaMarketing() {
  var mensaje = el('mkt-mensaje').value.trim();
  if(!mensaje || mensaje.indexOf('⏳')>=0){ alert('Genera el mensaje primero'); return; }

  // Clientes manuales con consentimiento
  var clientesManuales = S.clis.filter(function(c){ return c.marketingOk && c.tel; });

  // Clientes fidelizados por QR
  var clientesFidelizados = [];
  if(S._clientesFidelizados) {
    Object.values(S._clientesFidelizados).forEach(function(c){
      if(c.telefono && c.consent !== false) {
        clientesFidelizados.push({nom: c.nombre||'Cliente', tel: c.telefono});
      }
    });
  }

  // Unificar y eliminar duplicados por teléfono
  var mapaContactos = {};
  clientesManuales.forEach(function(c){
    var tel = (c.tel||'').replace(/[^0-9]/g,'');
    if(!tel.startsWith('56')) tel = '56'+tel;
    mapaContactos[tel] = {nom: c.nom||'Cliente', tel: tel};
  });
  clientesFidelizados.forEach(function(c){
    var tel = (c.tel||'').replace(/[^0-9]/g,'');
    if(!tel.startsWith('56')) tel = '56'+tel;
    if(!mapaContactos[tel]) mapaContactos[tel] = {nom: c.nom||'Cliente', tel: tel};
  });

  var clientes = Object.values(mapaContactos);

  if(!clientes.length){
    alert('No hay contactos con consentimiento.\nLos clientes se registran al escanear el QR de fidelización o desde F2 Clientes activando marketing.');
    return;
  }

  if(!confirm('¿Enviar a '+clientes.length+' contactos?\n\nMensaje:\n'+mensaje.substring(0,100)+'...')) return;

  el('mkt-envio-progress').innerHTML = '📤 Abriendo WhatsApp para '+clientes.length+' contactos...';
  var enviados = 0;

  function enviarSiguiente(i) {
    if(i >= clientes.length) {
      el('mkt-envio-progress').innerHTML = '✅ Campaña enviada: '+enviados+' mensajes';
      return;
    }
    var c = clientes[i];
    el('mkt-envio-progress').innerHTML = '📤 Enviando '+(i+1)+'/'+clientes.length+' — '+escH(c.nom)+'...';
    window.open('https://wa.me/'+c.tel+'?text='+encodeURIComponent(mensaje),'_blank');
    enviados++;
    setTimeout(function(){ enviarSiguiente(i+1); }, 2500);
  }
  enviarSiguiente(0);
}

