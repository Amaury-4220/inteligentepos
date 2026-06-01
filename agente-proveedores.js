// ================================================================
// AGENTE PROVEEDORES — Vania POS v3.0
// Gestión proveedores, catálogos, órdenes de pedido, IA
// Funciones: renderProveedores, _renderProveedoresUI, esDiaVisita, encontrarProveedor, abrirRegistroProveedor, provTab, subirCatalogoProv, procesarProveedorIA, guardarProveedor, eliminarProveedor, contactarProveedor, pedirAProveedor, generarOrdenPedido, _generarOrdenParaProveedor, enviarOrdenWA, imprimirOrden, verCatalogoProv, copiarImagenProd, editarProveedor, renderStockBajoPorProveedor
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function renderProveedores() {
  // Cargar desde Firebase si hay conexión
  if(db && _NEG) {
    db.ref('negocios/'+_NEG.id+'/proveedores').once('value').then(function(snap){
      var data = snap.val();
      if(data) {
        S.proveedores = Array.isArray(data) ? data : Object.values(data);
      }
      _renderProveedoresUI();
    }).catch(function(){ _renderProveedoresUI(); });
  } else {
    _renderProveedoresUI();
  }
}

function _renderProveedoresUI() {
  // Stats
  var bajo = S.prods.filter(function(p){ return p.stock<=(p.minimo||5); });
  el('prov-stats').innerHTML = [
    [S.proveedores.length, '🏭 Proveedores registrados', '#2563eb'],
    [bajo.length, '⚠️ Productos con stock bajo', '#ef4444'],
    [S.proveedores.filter(function(p){ return esDiaVisita(p); }).length, '📅 Visitas hoy', '#10b981']
  ].map(function(x){
    return '<div class="stat" style="border-left:4px solid '+x[2]+'">'
      +'<div class="sv" style="color:'+x[2]+'">'+x[0]+'</div>'
      +'<div class="sl">'+x[1]+'</div></div>';
  }).join('');

  // Lista proveedores
  el('prov-lista').innerHTML = S.proveedores.length ? S.proveedores.map(function(p, i){
    var esHoy = esDiaVisita(p);
  return '<div class="card" style="border-left:4px solid '+(esHoy?'#10b981':'var(--border)')+'">'+
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      +'<div><div style="font-weight:700;font-size:14px">'+escH(p.compania)+'</div>'
      +'<div style="font-size:11px;color:var(--muted)">👤 '+escH(p.nombre)+(p.tel?' · 📱 '+escH(p.tel):'')+'</div></div>'
      +(esHoy?'<span style="background:#10b981;color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700">HOY</span>':'')
      +'</div>'
      +'<div style="font-size:12px;margin-bottom:6px">📦 <b>Marcas:</b> '+escH(p.marcas||'-')+'</div>'
      +'<div style="font-size:12px;margin-bottom:8px">📅 <b>Visita:</b> '+escH(p.dias||'-')+' · '+escH(p.horario||'-')+'</div>'
      +'<div style="display:flex;gap:4px">'
      +'<button class="btn bg" style="font-size:11px;padding:4px 8px" onclick="pedirAProveedor('+i+')">📋 Pedir</button>'
      +'<button class="btn" style="font-size:11px;padding:4px 8px" onclick="contactarProveedor('+i+')">📱 WhatsApp</button>'
      +'<button class="btn bd" style="font-size:11px;padding:4px 8px" onclick="eliminarProveedor('+i+')">✕</button>'
      +'</div></div>';
  }).join('') : '<div style="text-align:center;color:var(--muted);padding:24px">Sin proveedores registrados. Agrega uno con IA.</div>';

  // Stock bajo por proveedor
  renderStockBajoPorProveedor();
}

function esDiaVisita(prov) {
  if(!prov.dias) return false;
  var dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var hoyNom = dias[new Date().getDay()];
  return prov.dias.toLowerCase().indexOf(hoyNom.toLowerCase()) >= 0;
}

function encontrarProveedor(prod) {
  if(!S.proveedores.length) return null;
  var marcasProd = (prod.depto||'').toLowerCase();
  var nomProd = prod.desc.toLowerCase();
  return S.proveedores.find(function(prov){
    var marcas = (prov.marcas||'').toLowerCase();
    return marcas.split(',').some(function(m){
      m = m.trim();
      return m && (nomProd.indexOf(m)>=0 || marcasProd.indexOf(m)>=0);
    });
  }) || null;
}

function abrirRegistroProveedor() {
  el('prov-texto').value = '';
  el('prov-datos-extraidos').style.display = 'block';
  el('prov-err').textContent = '';
  el('prov-nom').value = '';
  el('prov-tel').value = '';
  el('prov-compania').value = '';
  el('prov-marcas').value = '';
  el('prov-dias').value = '';
  el('prov-notas').value = '';
  el('prov-catalogo-urls').value = '';
  el('prov-catalogo-preview').innerHTML = '';
  el('prov-catalogo-progress').textContent = '';
  provTab('ia');
  show('m-proveedor');
  setTimeout(function(){ el('prov-texto').focus(); }, 80);
}

function provTab(tab) {
  var panelIA = el('prov-panel-ia');
  var btnIA = el('prov-tab-ia');
  var btnManual = el('prov-tab-manual');
  var label = el('prov-datos-label');
  if(tab === 'ia') {
    if(panelIA) panelIA.style.display = 'block';
    if(btnIA){ btnIA.style.background='var(--pri)';btnIA.style.color='#fff';btnIA.style.borderColor='var(--pri)'; }
    if(btnManual){ btnManual.style.background='var(--card)';btnManual.style.color='var(--text)';btnManual.style.borderColor='var(--border)'; }
    if(label) label.textContent = '✅ Datos detectados — revisa y ajusta:';
  } else {
    if(panelIA) panelIA.style.display = 'none';
    if(btnManual){ btnManual.style.background='var(--pri)';btnManual.style.color='#fff';btnManual.style.borderColor='var(--pri)'; }
    if(btnIA){ btnIA.style.background='var(--card)';btnIA.style.color='var(--text)';btnIA.style.borderColor='var(--border)'; }
    if(label) label.textContent = '✏️ Completa los datos del proveedor:';
    setTimeout(function(){ el('prov-compania').focus(); }, 80);
  }
}

function subirCatalogoProv(input) {
  var files = input.files;
  if(!files.length) return;
  var prog = el('prov-catalogo-progress');
  var preview = el('prov-catalogo-preview');
  var urlsInput = el('prov-catalogo-urls');
  var urls = urlsInput.value ? JSON.parse(urlsInput.value) : [];
  
  prog.textContent = '⏳ Procesando '+files.length+' imagen(es)...';
  
  Array.from(files).forEach(function(file, i){
    var reader = new FileReader();
    reader.onload = function(e){
      var base64 = e.target.result;
      urls.push({nombre: file.name, data: base64, fecha: hoy()});
      urlsInput.value = JSON.stringify(urls);
      
      // Preview
      var img = document.createElement('div');
      img.style.cssText = 'position:relative;width:70px;height:70px';
      img.innerHTML = '<img src="'+base64+'" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">'
        +'<div style="font-size:9px;color:var(--muted);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70px">'+file.name+'</div>';
      preview.appendChild(img);
      
      if(i === files.length-1){
        prog.innerHTML = '<span style="color:var(--green)">✅ '+urls.length+' imagen(es) lista(s)</span>';
      }
    };
    reader.readAsDataURL(file);
  });
}

function procesarProveedorIA() {
  var texto = el('prov-texto').value.trim();
  if(!texto){ alert('Escribe algo sobre tu proveedor'); return; }

  var btn = document.querySelector('#m-proveedor .btn.bg');
  if(btn) btn.textContent = '⏳ Nova analizando...';

  var system = 'Eres un asistente que extrae datos de proveedores para un POS chileno. '
    +'El usuario describe a su proveedor en lenguaje natural. '
    +'Debes responder SOLO con un JSON con estos campos: '
    +'{"nombre":"","telefono":"","compania":"","marcas":"","dias":"","horario":"","notas":""}. '
    +'Para horario usa: Mañana (09:00-12:00), Mediodía (12:00-14:00), Tarde (14:00-18:00), Todo el día. '
    +'Para marcas pon las marcas separadas por coma. '
    +'Si el usuario menciona Coca-Cola, agrega automáticamente Sprite, Fanta como sugerencia. '
    +'Si menciona Pepsi, agrega Kem, Bilz, Pap. '
    +'Si menciona CCU agrega Cristal, Escudo, Royal Guard. '
    +'Responde SOLO el JSON, sin texto adicional.';

  window._fantasmaCall('nova_ia', system,
    [{role:'user', content: texto}],
    function(resp){
      try {
        var clean = resp.replace(/```json|```/g,'').trim();
        var data = JSON.parse(clean);
        el('prov-nom').value = data.nombre||'';
        el('prov-tel').value = data.telefono||'';
        el('prov-compania').value = data.compania||'';
        el('prov-marcas').value = data.marcas||'';
        el('prov-dias').value = data.dias||'';
        if(data.horario) el('prov-horario').value = data.horario;
        el('prov-notas').value = data.notas||'';
        el('prov-datos-extraidos').style.display = 'block';
        if(btn) btn.textContent = '🤖 Nova, extrae los datos';
      } catch(e) {
        alert('Nova no pudo extraer los datos. Intenta ser más específico.');
        if(btn) btn.textContent = '🤖 Nova, extrae los datos';
      }
    },
    function(){
      alert('Error de conexión con Nova.');
      if(btn) btn.textContent = '🤖 Nova, extrae los datos';
    }
  );
}

function guardarProveedor() {
  var nom = el('prov-nom').value.trim();
  var comp = el('prov-compania').value.trim();
  if(!nom||!comp){ el('prov-err').textContent='Nombre y compañía son obligatorios'; return; }
  if(!S.proveedores) S.proveedores = [];
  var catalogoRaw = el('prov-catalogo-urls').value;
  var catalogo = [];
  try { catalogo = catalogoRaw ? JSON.parse(catalogoRaw) : []; } catch(e){}
  var nuevo = {
    id: Date.now(),
    nombre: nom,
    tel: el('prov-tel').value.trim(),
    compania: comp,
    marcas: el('prov-marcas').value.trim(),
    dias: el('prov-dias').value.trim(),
    horario: el('prov-horario').value,
    notas: el('prov-notas').value.trim(),
    catalogo: catalogo,
    creado: hoy()
  };
  S.proveedores.push(nuevo);
  save();
  // Sincronizar con Firebase
  if(db && _NEG) {
    db.ref('negocios/'+_NEG.id+'/proveedores').set(S.proveedores).then(function(){
      console.log('Proveedor sincronizado con Firebase');
    });
  }
  hide('m-proveedor');
  renderProveedores();
  alert('✅ Proveedor guardado: '+comp);
}

function eliminarProveedor(i) {
  if(!confirm('¿Eliminar este proveedor?')) return;
  S.proveedores.splice(i,1);
  save();
  if(db && _NEG) {
    db.ref('negocios/'+_NEG.id+'/proveedores').set(S.proveedores);
  }
  renderProveedores();
}

function contactarProveedor(i) {
  var p = S.proveedores[i]; if(!p) return;
  var tel = p.tel.replace(/[^0-9]/g,'');
  if(!tel){ alert('Este proveedor no tiene teléfono registrado'); return; }
  if(!tel.startsWith('56')) tel = '56'+tel;
  var msg = '¡Hola '+p.nombre+'! Te contacta '+S.cfg.nom+'. Necesitamos hacer un pedido de '+p.marcas+'.';
  window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(msg),'_blank');
}

function pedirAProveedor(i) {
  var prov = S.proveedores[i]; if(!prov) return;
  var productosProveedor = S.prods.filter(function(p){
    return p.stock <= (p.minimo||5) && encontrarProveedor(p) === prov;
  });
  _generarOrdenParaProveedor(prov, productosProveedor);
}

function generarOrdenPedido() {
  var bajo = S.prods.filter(function(p){ return p.stock<=(p.minimo||5); });
  if(!bajo.length){ alert('¡No hay productos con stock bajo!'); return; }

  // Agrupar por proveedor
  var grupos = {};
  var sinProveedor = [];
  bajo.forEach(function(p){
    var prov = encontrarProveedor(p);
    if(prov){
      var key = prov.compania;
      if(!grupos[key]) grupos[key] = {prov:prov, prods:[]};
      grupos[key].prods.push(p);
    } else {
      sinProveedor.push(p);
    }
  });

  var html = '';
  Object.keys(grupos).forEach(function(key){
    var g = grupos[key];
    html += '<div class="card" style="margin-bottom:10px;border-left:4px solid var(--pri)">'
      +'<div style="font-weight:700;font-size:14px;margin-bottom:4px">🏭 '+escH(g.prov.compania)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:8px">👤 '+escH(g.prov.nombre)+(g.prov.tel?' · 📱 '+escH(g.prov.tel):'')+'</div>'
      +'<table style="width:100%;font-size:12px"><thead><tr><th>Producto</th><th>Stock</th><th>Pedir</th></tr></thead><tbody>'
      +g.prods.map(function(p){
        var reponer = Math.max(0,(p.minimo||5)*2 - p.stock);
        return '<tr><td>'+escH(p.desc)+'</td><td style="color:var(--red);font-weight:700">'+p.stock+'</td><td><b>'+reponer+'</b></td></tr>';
      }).join('')
      +'</tbody></table></div>';
  });

  if(sinProveedor.length){
    html += '<div class="card" style="border-left:4px solid var(--yellow)">'
      +'<div style="font-weight:700;margin-bottom:8px">⚠️ Sin proveedor asignado</div>'
      +'<div style="font-size:12px">'+sinProveedor.map(function(p){ return escH(p.desc)+' (stock: '+p.stock+')'; }).join(', ')+'</div>'
      +'</div>';
  }

  if(!html){ html = '<div style="text-align:center;color:var(--green);padding:20px">¡Todo el stock está bien!</div>'; }

  el('orden-contenido').innerHTML = html;
  show('m-orden-pedido');
}

function _generarOrdenParaProveedor(prov, prods) {
  var html = '<div class="card" style="border-left:4px solid var(--pri)">'
    +'<div style="font-weight:700;font-size:14px;margin-bottom:4px">🏭 '+escH(prov.compania)+'</div>'
    +'<table style="width:100%;font-size:12px"><thead><tr><th>Producto</th><th>Stock</th><th>Pedir</th></tr></thead><tbody>'
    +prods.map(function(p){
      var reponer = Math.max(0,(p.minimo||5)*2 - p.stock);
      return '<tr><td>'+escH(p.desc)+'</td><td style="color:var(--red)">'+p.stock+'</td><td><b>'+reponer+'</b></td></tr>';
    }).join('')
    +'</tbody></table></div>';
  el('orden-contenido').innerHTML = html;
  show('m-orden-pedido');
}

function enviarOrdenWA() {
  var contenido = el('orden-contenido');
  var rows = contenido.querySelectorAll('tr');
  var msg = '📦 *ORDEN DE PEDIDO — '+escH(S.cfg.nom)+'*\n';
  msg += '📅 '+hoy()+'\n\n';
  var provActual = '';
  rows.forEach(function(row){
    var celdas = row.querySelectorAll('td');
    if(celdas.length===3){
      msg += '• '+celdas[0].textContent+' — pedir: *'+celdas[2].textContent+'*\n';
    }
  });
  var provCards = contenido.querySelectorAll('.card');
  provCards.forEach(function(card){
    var tel = '';
    S.proveedores.forEach(function(p){
      if(card.textContent.indexOf(p.compania)>=0 && p.tel) tel = p.tel.replace(/[^0-9]/g,'');
    });
    if(tel){
      if(!tel.startsWith('56')) tel = '56'+tel;
      window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(msg),'_blank');
    }
  });
  if(!provCards.length || !msg) alert('No hay proveedores con teléfono registrado');
}

function imprimirOrden() {
  var html = el('orden-contenido').innerHTML;
  var w = window.open('','_blank','width=400,height=500');
  if(w){
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orden de Pedido</title>'
      +'<style>body{font-family:monospace;padding:12px;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px}@media print{#np{display:none}}</style>'
      +'</head><body><h2>📦 Orden de Pedido — '+escH(S.cfg.nom)+'</h2><p>'+hoy()+'</p>'+html
      +'<div id="np" style="margin-top:12px;text-align:center">'
      +'<button onclick="window.print()" style="padding:8px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Imprimir</button>'
      +'</div></body></html>');
    w.document.close();
  }
}

function verCatalogoProv(i) {
  var p = S.proveedores[i]; if(!p || !p.catalogo || !p.catalogo.length) return;
  var modal = document.getElementById('m-catalogo-prov');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'm-catalogo-prov';
    modal.className = 'mbg';
    document.body.appendChild(modal);
  }
  modal.innerHTML = '<div class="mbox" style="max-width:560px;max-height:90vh;overflow-y:auto">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    +'<h3 style="margin:0">📷 Catálogo — '+escH(p.compania)+'</h3>'
    +'<button class="btn bd" onclick="document.getElementById(\'m-catalogo-prov\').classList.remove(\'on\')">✕</button></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">'
    +p.catalogo.map(function(img, idx){
      return '<div style="text-align:center">'
        +'<img src="'+img.data+'" style="width:100%;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="copiarImagenProd(\''+idx+'\','+i+')" title="Clic para asignar a producto">'
        +'<div style="font-size:9px;color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escH(img.nombre)+'</div>'
        +'<button class="btn bg" style="font-size:9px;padding:2px 6px;margin-top:3px;width:100%" onclick="copiarImagenProd('+idx+','+i+')">📋 Usar en producto</button>'
        +'</div>';
    }).join('')
    +'</div></div>';
  modal.classList.add('on');
  modal.onclick = function(e){ if(e.target===modal) modal.classList.remove('on'); };
}

function copiarImagenProd(imgIdx, provIdx) {
  var p = S.proveedores[provIdx];
  var img = p.catalogo[imgIdx];
  var nombre = prompt('¿A qué producto asignar esta imagen?\n(Escribe parte del nombre del producto)','');
  if(!nombre) return;
  var prod = S.prods.find(function(x){ return x.desc.toLowerCase().indexOf(nombre.toLowerCase())>=0; });
  if(!prod){ alert('Producto no encontrado. Ve a F3 Productos y edítalo manualmente.'); return; }
  prod.img = img.data;
  save();
  document.getElementById('m-catalogo-prov').classList.remove('on');
  alert('✅ Imagen asignada a: '+prod.desc);
}

function editarProveedor(i) {
  var p = S.proveedores[i]; if(!p) return;
  el('prov-nom').value = p.nombre||'';
  el('prov-tel').value = p.tel||'';
  el('prov-compania').value = p.compania||'';
  el('prov-marcas').value = p.marcas||'';
  el('prov-dias').value = p.dias||'';
  el('prov-horario').value = p.horario||'Mañana (09:00-12:00)';
  el('prov-notas').value = p.notas||'';
  el('prov-catalogo-urls').value = p.catalogo ? JSON.stringify(p.catalogo) : '';
  // Mostrar preview del catálogo existente
  var preview = el('prov-catalogo-preview');
  preview.innerHTML = '';
  if(p.catalogo && p.catalogo.length) {
    p.catalogo.forEach(function(img){
      var div = document.createElement('div');
      div.innerHTML = '<img src="'+img.data+'" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">'
        +'<div style="font-size:9px;color:var(--muted);text-align:center;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escH(img.nombre)+'</div>';
      preview.appendChild(div);
    });
    el('prov-catalogo-progress').innerHTML = '<span style="color:var(--green)">✅ '+p.catalogo.length+' imagen(es) cargadas</span>';
  }
  // Remover el proveedor actual para reemplazarlo al guardar
  S._editandoProveedorIdx = i;
  provTab('manual');
  show('m-proveedor');
}

function renderStockBajoPorProveedor() {
  var bajo = S.prods.filter(function(p){ return p.stock<=(p.minimo||5); });
  el('t-prov-stock-bajo').innerHTML = bajo.map(function(p){
    var prov = encontrarProveedor(p);
    return '<tr>'
      +'<td><b>'+escH(p.desc)+'</b></td>'
      +'<td style="color:var(--red);font-weight:700">'+p.stock+'</td>'
      +'<td>'+(p.minimo||5)+'</td>'
      +'<td>'+(prov?escH(prov.compania):'<span style="color:var(--muted)">Sin asignar</span>')+'</td>'
      +'<td>'+(prov&&esDiaVisita(prov)?'<span style="color:var(--green);font-weight:700">HOY — '+escH(prov.horario)+'</span>':prov?escH(prov.dias||'-'):'—')+'</td>'
      +'</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--green)">¡Todo el stock está bien!</td></tr>';
}

