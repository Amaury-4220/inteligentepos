// ================================================================
// AGENTE TICKET — Vania POS v3.0
// Genera, formatea e imprime boletas 58mm/80mm
// Funciones: generarHTMLTicket, imprimirTicket
// ================================================================
/* global S, fmt, escH, hoy, ahora_, el, show, hide, save, db, _NEG, pagoTipo */

function generarHTMLTicket(venta) {
  var cfg=S.cfg||{}, nom=cfg.nom||'ALMACEN VANIA', dir=cfg.dir||'', tel=cfg.tel||'';
  var mostrarIVA=cfg.ticketMostrarIVA!==false;
  var mostrarCajero=cfg.ticketMostrarCajero!==false;
  var rut=cfg.rut||'', msg2=cfg.msg||'GRACIAS POR SU COMPRA';
  var pago=venta.pago||'-';
  var pagoLabel={efectivo:'EFECTIVO',tarjeta:'TARJETA/DEBITO',transferencia:'TRANSFERENCIA',credito:'CREDITO/FIADO'}[pago]||pago.toUpperCase();
  var CPL=28; // 28 chars = seguro para 58mm
  var NL=String.fromCharCode(10);

  function padR(s,n){s=String(s);while(s.length<n)s+=' ';return s.substring(0,n);}
  function padL(s,n){s=String(s);while(s.length<n)s=' '+s;return s.substring(0,n);}
  function center(txt){
    txt=String(txt).substring(0,CPL);
    var sp=Math.max(0,Math.floor((CPL-txt.length)/2));
    var r='';for(var i=0;i<sp;i++)r+=' ';return r+txt;
  }
  function lr(l,r){
    l=String(l);r=String(r);
    var g=CPL-l.length-r.length;
    if(g<1){l=l.substring(0,CPL-r.length-1)+' ';g=0;}
    while(g-->0)l+=' ';return l+r;
  }
  function sep(ch){var s='';for(var i=0;i<CPL;i++)s+=ch||'-';return s;}
  function monto(v){
    var n=Math.round(v||0);
    if(n>=1000000)return(n/1000000).toFixed(1)+'M';
    if(n>=1000)return Math.round(n/100)/10+'K';
    return String(n);
  }
  function wrap(txt,maxLen){
    var words=txt.split(' '),lines=[],cur='';
    words.forEach(function(w){
      if(!w)return;
      var test=cur?cur+' '+w:w;
      if(test.length<=maxLen)cur=test;
      else{if(cur)lines.push(cur);cur=w.length>maxLen?w.substring(0,maxLen):w;}
    });
    if(cur)lines.push(cur);
    return lines.length?lines:[''];
  }

  var NIT=venta.items.reduce(function(a,x){return a+(x.qty||1);},0);
  var t='';

  // CABECERA
  t+=center(nom)+NL;
  if(dir)t+=center(dir.substring(0,CPL))+NL;
  if(tel)t+=center('Tel:'+tel)+NL;
  if(rut)t+=center('RUT:'+rut)+NL;
  t+=sep('=')+NL;
  t+=lr('Folio:#'+(venta.folio||''),venta.fecha||'')+NL;
  t+=lr('Hora:'+(venta.hora||''),mostrarCajero?'Caj:'+(venta.user||''):'')+NL;
  t+=sep('-')+NL;

  // ITEMS — formato 2 líneas: nombre | cant x pu = total
  venta.items.forEach(function(it){
    var sub=Math.round((it.precio||0)*(it.qty||1));
    var qty=it.qty||1;
    var pu=Math.round(it.precio||0);
    var dl=wrap(it.desc,CPL);
    // Línea 1: nombre
    t+=dl[0]+NL;
    for(var i=1;i<dl.length;i++)t+='  '+dl[i]+NL;
    // Línea 2: cant x precio = total (alineado derecha)
    var detalle=qty+'x'+monto(pu)+'='+monto(sub);
    t+=padL(detalle,CPL)+NL;
  });

  t+=sep('=')+NL;
  t+=lr('Articulos:',String(NIT))+NL;
  if(mostrarIVA&&cfg.iva>0){
    var neto=Math.round(venta.total/(1+cfg.iva/100));
    var iva=Math.round(venta.total-neto);
    t+=lr('Neto:','$'+neto.toLocaleString('es-CL'))+NL;
    t+=lr('IVA('+cfg.iva+'%):','$'+iva.toLocaleString('es-CL'))+NL;
  }
  t+=sep('=')+NL;
  var totalStr='$'+(Math.round(venta.total||0)).toLocaleString('es-CL');
  t+=lr('TOTAL:',totalStr)+NL;
  t+=lr('Pago:',pagoLabel)+NL;
  if(venta.pago==='credito'&&venta.clienteNom)t+=lr('Cliente:',venta.clienteNom.substring(0,10))+NL;
  t+=sep('=')+NL;
  if(venta.anulada){t+=center('** ANULADA **')+NL;t+=sep('=')+NL;}
  t+=center(msg2)+NL;
  t+=center('vaniapos.cl')+NL;
  t+=NL+NL;

  // Escapar y retornar HTML puro — sin createElement
  var esc=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return '<pre style="font-family:monospace;font-size:12px;font-weight:700;line-height:1.5;color:#000;background:#fff;margin:0;padding:4px 2px;white-space:pre;width:210px;max-width:210px;overflow:hidden;display:block">'+esc+'</pre>';
}

function imprimirTicket() {
  var html=el('ticket-prev-contenido').innerHTML;
  var ancho=(S.cfg&&S.cfg.anchoTicket)||'56mm';
  var px=ancho==='80mm'?'302px':'216px';
  var fs=ancho==='80mm'?'11px':'10px';
  var estilos='@page{size:'+ancho+' auto;margin:1mm 2mm}'
    +'*{box-sizing:border-box!important}'
    +'body{font-family:"Courier New",Courier,monospace;font-size:'+fs+';line-height:1.4;margin:0;padding:2mm;color:#000;background:#fff;width:'+px+';max-width:'+px+'}'
    +'div{max-width:100%!important;width:auto!important}'
    +'span{display:inline-block;overflow:hidden}'
    +'@media print{body{width:'+px+'!important;font-size:'+fs+'!important}#no-print{display:none!important}}';

  var w;
  try{ w=window.open('','_blank','width=280,height=620'); }catch(e){ w=null; }

  if(!w){
    var tmpDiv=document.createElement('div');
    tmpDiv.id='_print_tmp';
    tmpDiv.style.cssText='position:fixed;inset:0;z-index:999999;background:#fff;overflow:auto;padding:16px';
    tmpDiv.innerHTML='<style>'+estilos+'@media print{#_print_controls{display:none!important}}</style>'
      +'<div id="_print_controls" style="text-align:center;margin-bottom:12px">'
      +'<button onclick="window.print()" style="padding:8px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-right:8px">&#x1F5A8;&#xFE0F; Imprimir</button>'
      +'<button onclick="document.getElementById(\'_print_tmp\').remove()" style="padding:8px 16px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">&#x2715; Cerrar</button>'
      +'</div>'+html;
    document.body.appendChild(tmpDiv);
    return;
  }

  try{
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title><style>'+estilos+'</style></head><body>'
      +html
      +'<div id="no-print" style="text-align:center;margin-top:10px">'
      +'<button onclick="window.print()" style="padding:8px 20px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">&#x1F5A8;&#xFE0F; Imprimir ('+ancho+')</button>'
      +'</div></body></html>');
    w.document.close();
    setTimeout(function(){ try{ w.print(); }catch(e){} },400);
  }catch(e){
    try{ w.close(); }catch(e2){}
    alert('Permite las ventanas emergentes en tu navegador.');
  }
}

function compartirTicket() {
  var contenido = el('ticket-prev-contenido');
  var txt = contenido ? contenido.textContent : '';
  if(navigator.share){ navigator.share({title:'Ticket Vania POS', text:txt}); }
  else if(navigator.clipboard){ navigator.clipboard.writeText(txt).then(function(){ alert('Ticket copiado.'); }); }
  else{ alert(txt); }
}

function abrirTicketVenta(folio) {
  var v = S.hist.find(function(x){ return x.folio===folio; });
  if(!v) return;
  window._ticketActualData = v;
  var cont = el('ticket-prev-contenido');
  if(cont) cont.innerHTML = generarHTMLTicket(v);
  show('m-ticket-prev');
}
