/* ===== Assistente Financeiro da TI – FRONT ===== */

/* ===== Helpers ===== */
function AF_qs(sel){return document.querySelector(sel);}
function AF_qsa(sel){return document.querySelectorAll(sel);}
function AF_pad(n){n=Number(n);return (n<10?'0':'')+n;}
function AF_fmtBRL(cents){var v=Number(cents||0)/100;try{return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}catch(e){return 'R$ '+v.toFixed(2).replace('.',',');}}
function AF_fmtDateBR(iso){if(!iso) return '';var p=iso.split('-'); if(p.length<3) return iso;var y=p[0],m=p[1],d=p[2];return d.padStart(2,'0')+'-'+m.padStart(2,'0')+'-'+y;}
function AF_monthDiff(a,b){return b.getFullYear()*12+b.getMonth()-(a.getFullYear()*12+a.getMonth());}
function AF_pick(obj, pathList){for(let i=0;i<pathList.length;i++){let segs=pathList[i].split('.'), cur=obj;for(let j=0;j<segs.length && cur!=null;j++){cur=cur[segs[j]];}if(cur!=null && cur!=='') return cur;}return '';}
function AF_fmtDoc(doc){if(!doc) return '';const d=String(doc).replace(/\D+/g,'');if(d.length===14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');if(d.length===11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');return doc;}
function AF_fmtFreq(it){const f=it.freq||{},t=(f.type||'').toLowerCase();const pad2=n=>String(n??'').padStart(2,'0');const Cap=s=>s? s.charAt(0).toUpperCase()+s.slice(1):'';const start=f.start||f.date||'';const sParts=start && start.includes('-')? start.split('-'):null;const dayFromStart=sParts? Number(sParts[2]):null;const monthFromStart=sParts? Number(sParts[1]):null;switch(t){case 'mensal':case 'trimestral':case 'semestral':return Cap(t)+' • Dia '+pad2(f.day||dayFromStart||1);case 'anual':return 'Anual • Data '+pad2(f.day||dayFromStart||1)+'-'+pad2(f.month||monthFromStart||1);case 'unico': if(start){const a=start.split('-');return 'Único • '+pad2(a[2])+'-'+pad2(a[1])+'-'+a[0];}return 'Único';default:return Cap(t||'—');}}

/* ===== Config ===== */
var API_URL='/faturas.php';          // <= O PHP abaixo deve estar acessível aqui
var AF_DATA={cliente:{},itens:[],observacaoGeral:''};
var AF_ADMIN=false;
var CLIENTE_ID=(function(){var url=new URL(window.location.href);var c=url.searchParams.get('client'); if(c) return c;var el=document.getElementById('client-id');if(el&&el.dataset&&el.dataset.client) return el.dataset.client;return ''})();
(function(){var el=document.getElementById('af-admin');AF_ADMIN=!!(el&&el.dataset&&String(el.dataset.admin)==='1');})();

/* ===== Token ===== */
function AF_lsKey(){return 'AF_TOKEN_'+(CLIENTE_ID||'');}
function AF_getToken(){try{return localStorage.getItem(AF_lsKey())||'';}catch(e){return'';}}
function AF_setToken(v){try{localStorage.setItem(AF_lsKey(),v||'');}catch(e){}}
function AF_ensureToken(){var t=prompt('Informe o token (igual ao do faturas.php):',AF_getToken()||'');if(t!==null){AF_setToken(t);alert('Token salvo localmente.');}}

/* ===== Admin tools ===== */
function AF_buildAdminTools(){
  var box=AF_qs('#adminTools');
  var addBtn=AF_qs('#btnAdd');
  var adminEl=document.getElementById('af-admin');
  var isAdmin=!!(adminEl && adminEl.getAttribute('data-admin')==='1'); AF_ADMIN=isAdmin;
  if(isAdmin && box) box.style.display='flex';
  if(isAdmin && addBtn) addBtn.style.display='inline-block';
  if(isAdmin && adminEl && box){
    var sel=AF_qs('#clientSwitch');
    if(sel){
      var raw=adminEl.getAttribute('data-clients')||'[]'; var list=[];
      try{list=JSON.parse(raw);}catch(e){list=[];}
      var html='<option value="" selected disabled>— escolher cliente —</option>';
      for(var i=0;i<list.length;i++){var c=list[i]||{},id=c.id||'',name=c.name||id;html+='<option value="'+id+'">'+name+'</option>';}
      sel.innerHTML=html;
      if(CLIENTE_ID){sel.value=CLIENTE_ID;}
    }
  }
}
function AF_switchClient(){
  var sel=AF_qs('#clientSwitch'); if(!sel||!sel.value){alert('Escolha um cliente.');return;}
  var url=new URL(window.location.href); url.searchParams.set('client',sel.value); url.searchParams.delete('debug'); window.location.href=url.toString();
}

/* ===== HTTP ===== */
async function AF_apiGet(){
  try{
    var url=new URL(window.location.origin+API_URL);
    url.searchParams.set('client',CLIENTE_ID);
    var isAdminUrl=(new URL(window.location.href)).searchParams.get('admin')==='1';
    if(isAdminUrl) url.searchParams.set('debug','1');
    url.searchParams.set('_',Date.now());
    var r=await fetch(url.toString(),{cache:'no-store'});
    return await r.json();
  }catch(e){console.error('AF_apiGet error',e);return {cliente:{},itens:[],observacaoGeral:''};}
}
async function AF_apiPost(payload){
  try{
    const body = Object.assign({}, payload, { client: CLIENTE_ID, token: AF_getToken() });
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json','X-Auth': AF_getToken() },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    let j = null; try { j = await r.json(); } catch(e) { j = null; }
    if (!r.ok) {
      const msg = (j && (j.error || j.hint)) ? (j.error + (j.hint ? ` – ${j.hint}` : '')) : `HTTP ${r.status}`;
      return { ok:false, error: msg, http: r.status, raw: j };
    }
    return j || { ok:false, error:'invalid json' };
  }catch(e){
    console.error('AF_apiPost error', e);
    return { ok:false, error:String(e) };
  }
}

/* ===== Upload ===== */
const AF_MAX_FILE = 5 * 1024 * 1024;
const AF_ALLOWED = ['application/pdf','image/png','image/jpeg','image/webp'];
async function AF_uploadFile(file, kind, id){
  if(!file) return { ok:true, url:null };
  if(file.size > AF_MAX_FILE) return { ok:false, error:'Arquivo maior que 5MB' };
  if(!AF_ALLOWED.includes(file.type)) return { ok:false, error:'Tipo não suportado (use PDF/Imagem)' };
  const fd = new FormData();
  fd.append('action','upload'); fd.append('kind', kind);
  fd.append('client', CLIENTE_ID); fd.append('id', id);
  fd.append('token', AF_getToken()); fd.append('file', file, file.name);
  try{
    const r = await fetch(API_URL, { method:'POST', body: fd, credentials:'same-origin' });
    const j = await r.json().catch(()=>null);
    if(!r.ok || !(j && j.ok)) return { ok:false, error: (j&&j.error)||('Falha HTTP '+r.status) };
    return { ok:true, url:j.url, name:file.name, size:file.size, mime:file.type };
  }catch(e){ return { ok:false, error:String(e) }; }
}

/* ===== Ações ===== */
function AF_selectedYM(){
  var input=AF_qs('#mesFiltro'); var mes=input&&input.value?input.value:'';
  if(!mes){var d=new Date();return {y:d.getFullYear(),m:d.getMonth()+1,ym:d.getFullYear()+'-'+AF_pad(d.getMonth()+1)};}
  var p=mes.split('-'); return {y:Number(p[0]||0),m:Number(p[1]||0),ym:p[0]+'-'+AF_pad(p[1])};
}
async function AF_clientPaidMonth(id){
  const ym = AF_selectedYM().ym;
  const res = await AF_apiPost({ action:'signalPaidMonth', id, ym });
  if (res && res.ok) { await AF_boot(); } else { alert('Falha ao sinalizar como pago.' + (res && res.error ? `\n\n${res.error}` : '')); }
}
async function AF_markOpenMonth(id){
  const ym = AF_selectedYM().ym;
  const res = await AF_apiPost({ action:'markOpenMonth', id, ym });
  if (res && res.ok) { await AF_boot(); } else { alert('Falha ao reabrir.' + (res && res.error ? `\n\n${res.error}` : '')); }
}

/* ===== Remoção (modal) ===== */
function AF_ensureRemoveModal(){
  if (document.getElementById('modalRemove')) return;
  var wrapper = document.createElement('div');
  wrapper.innerHTML = `
<div id="modalRemove" class="af-modal">
  <div class="af-modal__backdrop" data-af-close></div>
  <div class="af-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="rmTitle">
    <div class="af-modal__header af-danger">
      <h3 id="rmTitle">Remover cobrança</h3>
      <button class="af-modal__close" type="button" title="Fechar" data-af-close>×</button>
    </div>
    <div class="af-modal__body">
      <h3 class="af-modal__lead">Selecione como deseja remover esta cobrança:</h3>
      <div class="af-radio-list">
        <label><input type="radio" name="rm_scope" value="onlyThis" checked> Somente esta (apenas este mês)</label>
        <label><input type="radio" name="rm_scope" value="thisAndFuture"> Esta e as futuras (a partir deste mês)</label>
        <label><input type="radio" name="rm_scope" value="allIncludingPaid"> Todas (incluindo as passadas)</label>
      </div>
    </div>
    <div class="af-modal__footer">
      <button type="button" class="btn-af ghost" data-af-close>Cancelar</button>
      <button type="button" class="btn-af" style="background:#e74c3c;color:#fff" id="rmConfirmBtn">Remover</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(wrapper.firstElementChild);
  var m = document.getElementById('modalRemove');
  m.querySelectorAll('[data-af-close]').forEach(btn => btn.onclick = AF_closeRemove);
  var confirmBtn = document.getElementById('rmConfirmBtn');
  if (confirmBtn) confirmBtn.onclick = AF_confirmRemove;
}
var AF_REMOVE_CTX = { id: null };
function AF_remove(id){
  AF_REMOVE_CTX.id = id;
  AF_ensureRemoveModal();
  var m = document.getElementById('modalRemove');
  m.style.display = 'flex';
  document.body.classList.add('af-modal-open');
  function onKey(e){ if(e.key === 'Escape'){ AF_closeRemove(); } }
  m._afKey = onKey; document.addEventListener('keydown', onKey);
}
function AF_closeRemove(){
  var m = document.getElementById('modalRemove');
  if(m){
    m.style.display = 'none';
    if(m._afKey){ document.removeEventListener('keydown', m._afKey); m._afKey = null; }
  }
  document.body.classList.remove('af-modal-open');
}
async function AF_confirmRemove(){
  var m=document.getElementById('modalRemove'); if(!m) return;
  var scopeEl=m.querySelector('input[name="rm_scope"]:checked'); var scope=scopeEl?scopeEl.value:'onlyThis';
  var ym=AF_selectedYM().ym;
  const res = await AF_apiPost({ action:'remove', id: AF_REMOVE_CTX.id, scope, ym });
  AF_closeRemove(); if(res && res.ok){ await AF_boot(); } else { alert('Falha ao remover.'); }
}

/* ===== Anexos por mês ===== */
var AF_ATTACH_CTX = { id:null, nfUrl:null, boletoUrl:null, comprovanteUrl:null };
function AF_openAttachManage(id){
  AF_ATTACH_CTX.id = id;
  var ym = AF_selectedYM().ym;
  var it = (AF_DATA.itens||[]).find(x=>x.id===id) || {};
  var at = (it.attachments && it.attachments[ym]) || { nfUrl:null, boletoUrl:null };
  AF_ATTACH_CTX.nfUrl = at.nfUrl || null;
  AF_ATTACH_CTX.boletoUrl = at.boletoUrl || null;
  AF_ATTACH_CTX.comprovanteUrl= at.comprovanteUrl || null;
    // ... (mantém tudo acima igual: carregar AF_ATTACH_CTX.*)

  var rows = [];

  if (AF_ATTACH_CTX.nfUrl) {
    rows.push(
      '<div class="line">' +
        '<div class="title">NF do mês</div>' +
        '<div class="actions">' +
          '<a href="'+AF_ATTACH_CTX.nfUrl+'" target="_blank" rel="noopener">abrir</a>' +
          '<button class="btn-af ghost" style="padding:4px 8px" onclick="AF_deleteAttachment(\'nf\')">Remover</button>' +
        '</div>' +
      '</div>'
    );
  }
  if (AF_ATTACH_CTX.boletoUrl) {
    rows.push(
      '<div class="line">' +
        '<div class="title">Boleto/Pix do mês</div>' +
        '<div class="actions">' +
          '<a href="'+AF_ATTACH_CTX.boletoUrl+'" target="_blank" rel="noopener">abrir</a>' +
          '<button class="btn-af ghost" style="padding:4px 8px" onclick="AF_deleteAttachment(\'boleto\')">Remover</button>' +
        '</div>' +
      '</div>'
    );
  }
  if (AF_ATTACH_CTX.comprovanteUrl) {
    rows.push(
      '<div class="line">' +
        '<div class="title">Comprovante do mês</div>' +
        '<div class="actions">' +
          '<a href="'+AF_ATTACH_CTX.comprovanteUrl+'" target="_blank" rel="noopener">abrir</a>' +
          '<button class="btn-af ghost" style="padding:4px 8px" onclick="AF_deleteAttachment(\'comprovante\')">Remover</button>' +
        '</div>' +
      '</div>'
    );
  }

var htmlCurrent =
  '<div class="af-attach-current">' +
    // (sem cabeçalho aqui!)
    (rows.length
      ? rows.join('')
      : '<div class="line"><div class="title" style="font-weight:400;color:#6b7280">Nenhum anexo neste mês.</div></div>'
    ) +
    '<hr class="af-divider">' +
  '</div>';

AF_qs('#am_current').innerHTML = htmlCurrent;

var m = AF_qs('#modalAttachManage');
  m.style.display = 'flex';
  document.body.classList.add('af-modal-open');
  m.querySelectorAll('[data-af-close]').forEach(btn => btn.onclick = ()=>{ m.style.display='none'; document.body.classList.remove('af-modal-open'); });
}
async function AF_submitAttachManage(){
  var nfFile = (AF_qs('#am_nf')||{}).files ? AF_qs('#am_nf').files[0] : null;
  var blFile = (AF_qs('#am_boleto')||{}).files ? AF_qs('#am_boleto').files[0] : null;
  var cvFile = (AF_qs('#am_comprovante')||{}).files ? AF_qs('#am_comprovante').files[0] : null;
  let nfRes = await AF_uploadFile(nfFile, 'nf', AF_ATTACH_CTX.id);
  if(nfFile && !nfRes.ok){ alert('Falha ao anexar Nota Fiscal: '+nfRes.error); return; }
  let blRes = await AF_uploadFile(blFile, 'boleto', AF_ATTACH_CTX.id);
  if(blFile && !blRes.ok){ alert('Falha ao anexar Boleto/Pix: '+blRes.error); return; }
  let cvRes = await AF_uploadFile(cvFile, 'comprovante', AF_ATTACH_CTX.id);
  if(cvFile && !cvRes.ok){ alert('Falha ao anexar Comprovante: '+cvRes.error); return; }

  const ym = AF_selectedYM().ym;
  const payload = { action:'attachSet', id:AF_ATTACH_CTX.id, ym, nfUrl:nfRes.url ?? AF_ATTACH_CTX.nfUrl ?? null, boletoUrl:blRes.url ?? AF_ATTACH_CTX.boletoUrl ?? null, comprovanteUrl: cvRes.url ?? AF_ATTACH_CTX.comprovanteUrl ?? null };
  const res = await AF_apiPost(payload);
  if(res && res.ok){
    AF_qs('#modalAttachManage').style.display='none';
    document.body.classList.remove('af-modal-open');
    await AF_boot();
  }else{
    alert('Falha ao salvar anexos.' + (res && res.error ? `\n\n${res.error}` : ''));
  }
}
function AF_openAttachDownload(id){
  var ym = AF_selectedYM().ym;
  var it = (AF_DATA.itens||[]).find(x=>x.id===id) || {};
  var at = (it.attachments && it.attachments[ym]) || { nfUrl:null, boletoUrl:null };
  var box = AF_qs('#ad_options');
  var html = '';
  if (at.nfUrl) html += '<label><input type="radio" name="ad_pick" value="'+encodeURIComponent(at.nfUrl)+'" checked> Nota Fiscal</label>';
  if (at.boletoUrl) html += '<label><input type="radio" name="ad_pick" value="'+encodeURIComponent(at.boletoUrl)+'" '+(!at.nfUrl?'checked':'')+'> Boleto / Pix</label>';
  if (at.comprovanteUrl) html += '<label><input type="radio" name="ad_pick" value="'+encodeURIComponent(at.comprovanteUrl)+'" '+(!at.nfUrl && !at.boletoUrl ? 'checked' : '')+'> Comprovante</label>';

  box.innerHTML = html || '<div class="desc-af">Não há anexos disponíveis neste mês.</div>';
  var m = AF_qs('#modalAttachDownload');
  m.style.display='flex';
  document.body.classList.add('af-modal-open');
  m.querySelectorAll('[data-af-close]').forEach(btn => btn.onclick = ()=>{ m.style.display='none'; document.body.classList.remove('af-modal-open'); });
}
function AF_confirmAttachDownload(){
  var sel = AF_qs('input[name="ad_pick"]:checked');
  if(!sel){ alert('Selecione um arquivo.'); return; }
  var url = decodeURIComponent(sel.value);
  var a = document.createElement('a');
  a.href = url; a.download = ''; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove();
  AF_qs('#modalAttachDownload').style.display='none'; document.body.classList.remove('af-modal-open');
}

async function AF_deleteAttachment(kind){
  // kind: 'nf' | 'boleto' | 'comprovante'
  if(!AF_ATTACH_CTX.id){ alert('Sem item selecionado.'); return; }
  const labels = { nf:'Nota Fiscal', boleto:'Boleto/Pix', comprovante:'Comprovante' };
  if(!confirm('Remover "'+(labels[kind]||kind)+'" deste mês? O arquivo poderá ser removido fisicamente também.')){
    return;
  }
  const ym = AF_selectedYM().ym;
  const res = await AF_apiPost({ action:'attachUnset', id:AF_ATTACH_CTX.id, ym, kind, deletePhysical:true });
  if(res && res.ok){
    // fecha e reabre para atualizar lista
    const m = AF_qs('#modalAttachManage');
    if(m){ m.style.display='none'; document.body.classList.remove('af-modal-open'); }
    await AF_boot();
  }else{
    alert('Falha ao remover anexo.' + (res && res.error ? `\n\n${res.error}` : ''));
  }
}


/* ===== Categorias ===== */
function AF_buildCategoryOptions(itens){
  var sel=AF_qs('#filterCategoria'); if(!sel) return;
  var current = (sel.value||'').trim();
  var set = new Set();
  for(var j=0;j<itens.length;j++){
    var c=(itens[j].categoria||'').trim();
    if(c) set.add(c);
  }
  var html='<option value="">Todas as categorias</option>';
  Array.from(set).sort().forEach(c=>{ html+='<option value="'+c+'">'+c+'</option>'; });
  sel.innerHTML=html;
  if(current && Array.from(set).includes(current)) sel.value=current; else sel.value='';
}
function AF_onCatChange(){
  var sel=AF_qs('#filterCategoria'); if(sel && sel.selectedIndex===0) sel.value='';
  AF_render();
}

/* ===== Render ===== */
function AF_render(){
  var data=AF_DATA||{itens:[],cliente:{}}; var itens=data.itens||[];
  var q=AF_qs('#q'); q=q? q.value.trim().toLowerCase():'';
  var fcat=(AF_qs('#filterCategoria')||{}).value||'';
  var ym=AF_selectedYM().ym;

  var rows=[]; var totalCents=0;
  var somaMensal=0, somaAnual=0, somaUnico=0, somaTrimestral=0, somaSemestral=0;

  for(var i=0;i<itens.length;i++){
    var it=itens[i], f=it.freq||{};
    var text=(it.fornecedor||'')+' '+(it.categoria||'')+' '+(it.descricao||'');
    if(q && text.toLowerCase().indexOf(q)===-1) continue;
    if(fcat && (it.categoria||'').trim()!==fcat) continue;

    var show=true, vencLabel='', cents=Number(it.valorCentavos||0);
    var startIso=f.start||f.date||''; var startYm=startIso? startIso.slice(0,7):'';
    var selY=Number(ym.split('-')[0]), selM=Number(ym.split('-')[1]);
    var sParts = startIso && startIso.includes('-') ? startIso.split('-') : null;
    var dayFromStart = sParts ? Number(sParts[2]) : 1;
    function beforeStart(){ return startYm && ym<startYm; }

    if((f.type||'').toLowerCase()==='mensal'){
      if(beforeStart()) show=false;
      var day = Number(f.day || dayFromStart || 1);
      vencLabel = AF_fmtDateBR(ym+'-'+AF_pad(day));
    }
    else if(f.type==='trimestral' || f.type==='semestral'){
      var k=(f.type==='trimestral')?3:6;
      if(!startIso){ show=false; }
      else{
        if(beforeStart()) show=false;
        else{
          var sY=Number(startYm.split('-')[0]), sM=Number(startYm.split('-')[1])-1;
          var sDate=new Date(sY,sM,1), cDate=new Date(selY,selM-1,1);
          var diff=AF_monthDiff(sDate,cDate);
          if(diff<0 || diff%k!==0) show=false;
        }
      }
      if(show){
        var dayQ = Number(f.day || dayFromStart || 1);
        vencLabel=AF_fmtDateBR(ym+'-'+AF_pad(dayQ));
      }
    }
    else if((f.type||'').toLowerCase()==='anual'){
      if(beforeStart()) show=false;
      var monthFromStart = sParts ? Number(sParts[1]) : null;
      var month = Number(f.month || monthFromStart || 1);
      if(show && month!==selM) show=false;
      var dayA = Number(f.day || dayFromStart || 1);
      if(show) vencLabel=AF_fmtDateBR(ym+'-'+AF_pad(dayA));
    }
    else if((f.type||'').toLowerCase()==='unico'){
      if(startIso && startYm===ym){vencLabel=AF_fmtDateBR(startIso);} else {show=false;}
    } else { show=false; }

    if(show && it.excludes && Array.isArray(it.excludes) && it.excludes.indexOf(ym)!==-1) show=false;
    if(show && it.endYm && ym>it.endYm) show=false;
    if(!show) continue;

    totalCents += cents;
    var t = (f.type||'').toLowerCase();
    if(t==='mensal')      somaMensal     += cents;
    if(t==='anual')       somaAnual      += cents;
    if(t==='unico')       somaUnico      += cents;
    if(t==='trimestral')  somaTrimestral += cents;
    if(t==='semestral')   somaSemestral  += cents;

    var badge='pendente';
    var baixas=it.baixas||[]; var paidThisMonth=false;
    for(var b=0;b<baixas.length;b++){var bx=baixas[b]||{}; if(bx.ym===ym && (bx.status==='pago' || bx.ok===true)){paidThisMonth=true;break;}}
    if(paidThisMonth) badge='pago';
    else if(it.flagPagoCliente) badge='flag';

    var atMonth = (it.attachments && it.attachments[ym]) || { nfUrl:null, boletoUrl:null };
    var hasNF = !!atMonth.nfUrl; var hasBoleto = !!atMonth.boletoUrl;

    var anexosCell = '';
    if (AF_ADMIN){
      var chips = [];
      if (hasNF) chips.push('<a href="'+atMonth.nfUrl+'" target="_blank" rel="noopener">NF</a>');
      if (hasBoleto) chips.push('<a href="'+atMonth.boletoUrl+'" target="_blank" rel="noopener">Boleto/Pix</a>');
      if (atMonth.comprovanteUrl) chips.push('<a href="'+atMonth.comprovanteUrl+'" target="_blank" rel="noopener">Comprovante</a>');
      anexosCell = '<button class="btn-af ghost" onclick="AF_openAttachManage(\''+it.id+'\')">Gerenciar</button>'+(chips.length?'<div class="attach-af" style="margin-top:4px;font-size:12px;color:#6b7280">'+chips.join(' · ')+'</div>':'');
    } else {
      anexosCell = (hasNF||hasBoleto) ? '<button class="btn-af ghost" onclick="AF_openAttachDownload(\''+it.id+'\')">Baixar</button>' : '<span class="desc-af">—</span>';
    }

    var acoes='';
    if(badge==='pago' || badge==='flag'){ acoes+='<button class="btn-af ghost" onclick="AF_markOpenMonth(\''+it.id+'\')">Em aberto</button>'; }
    else { acoes+='<button class="btn-af ghost" onclick="AF_clientPaidMonth(\''+it.id+'\')">OK</button>'; }
    if(AF_ADMIN){ acoes+=' <button class="btn-af ghost" onclick="AF_remove(\''+it.id+'\')">Remover</button>'; }

    rows.push('<tr>'+
      '<td>'+(it.categoria||'')+'</td>'+
      '<td>'+(it.fornecedor||'')+(it.descricao?'<div class="desc-af">'+it.descricao+'</div>':'')+'</td>'+
      '<td>'+(it.tipoPagamento||'')+'</td>'+
      '<td>'+AF_fmtFreq(it)+'</td>'+
      '<td>'+vencLabel+'</td>'+
      '<td>'+AF_fmtBRL(cents)+'</td>'+
      '<td><span class="badge-af '+badge+'">'+(badge==='flag'?'OK':badge)+'</span></td>'+
      '<td>'+anexosCell+'</td>'+
      '<td>'+acoes+'</td>'+
    '</tr>');
  }

  var tbody=AF_qs('#tbl tbody'); if(tbody){tbody.innerHTML=rows.join('');}
  var ft=AF_qs('#ftTotal'); if(ft){ft.textContent=AF_fmtBRL(totalCents);}

  // KPIs
  var kM = AF_qs('#kMensal');      if(kM) kM.textContent      = AF_fmtBRL(somaMensal);
  var kA = AF_qs('#kAnual');       if(kA) kA.textContent      = AF_fmtBRL(somaAnual);
  var kU = AF_qs('#kUnico');       if(kU) kU.textContent      = AF_fmtBRL(somaUnico);
  var kT = AF_qs('#kTotal');       if(kT) kT.textContent      = AF_fmtBRL(totalCents);
  var kTr= AF_qs('#kTrimestral');  if(kTr) kTr.textContent    = AF_fmtBRL(somaTrimestral);
  var kS = AF_qs('#kSemestral');   if(kS) kS.textContent      = AF_fmtBRL(somaSemestral);

  AF_buildCategoryOptions(itens);

// dentro do AF_render(), substitua o trecho da observação por:
var obs = AF_qs('#obsGeral');
if (obs) {
  // usa o que está no HTML como padrão
  var defaultText = obs.textContent;
  // se vier da API, substitui; senão mantém o do HTML
  obs.textContent = (AF_DATA && AF_DATA.observacaoGeral) ? AF_DATA.observacaoGeral : defaultText;
}

}

/* ===== Boot ===== */
async function AF_boot(){
  AF_buildAdminTools();
  if(AF_ADMIN && !AF_getToken()){ setTimeout(function(){ AF_ensureToken(); }, 100); }

  // Cabeçalho (nome/doc)
  var hdr = AF_qs('#clientLine');
  var sub = AF_qs('#clientSub');
  var meta = document.getElementById('client-id');
  if(meta){
    var nmMeta  = meta.dataset.name || meta.getAttribute('data-name') || '';
    var docMeta = meta.dataset.cnpj || meta.dataset.cpf || meta.getAttribute('data-cnpj') || meta.getAttribute('data-cpf') || '';
    if(nmMeta) hdr.textContent = nmMeta;
    if(docMeta){ sub.textContent = AF_fmtDoc(docMeta); sub.style.display = 'block'; }
  }else if(CLIENTE_ID){ hdr.textContent = CLIENTE_ID; }

  if(!CLIENTE_ID){ hdr.textContent='Nenhum cliente selecionado'; return; }

  var data = await AF_apiGet();
  AF_DATA = (data && data.data) ? data.data : data;
  AF_DATA = AF_DATA || { itens:[], cliente:{} };

  var nameFromData = AF_pick(AF_DATA, ['cliente.nome','cliente.name','cliente.razaoSocial','cliente.razao','cliente.titulo']);
  if(nameFromData) hdr.textContent = nameFromData;
  var docFromData = AF_pick(AF_DATA, ['cliente.cnpj','cliente.cpf','cliente.doc']);
  if(docFromData){ sub.textContent = AF_fmtDoc(docFromData); sub.style.display = 'block'; }

  var mesInput=AF_qs('#mesFiltro');
  if(mesInput && !mesInput.value){ var d=new Date(); mesInput.value=d.getFullYear()+'-'+AF_pad(d.getMonth()+1); }

  AF_render();
}
AF_boot();

/* ===== Modal Add ===== */
function AF_setupAddForm() {
  var type = (document.getElementById('f_freq_type')||{}).value || 'mensal';
  document.querySelectorAll('#modalAF [data-af-show]').forEach(function(n){
    var groups = (n.getAttribute('data-af-show')||'').split(/\s+/);
    n.style.display = groups.indexOf(type) !== -1 ? '' : 'none';
  });
}
function AF_openAdd(){
  var m = document.getElementById('modalAF'); if(!m) return;
  m.style.display = 'flex'; document.body.classList.add('af-modal-open');
  function onKey(e){ if(e.key === 'Escape'){ AF_closeAdd(); } }
  m._afKey = onKey; document.addEventListener('keydown', onKey);
  m.querySelectorAll('[data-af-close]').forEach(btn=>btn.addEventListener('click', AF_closeAdd, {once:true}));
  var sel = document.getElementById('f_freq_type'); if (sel){ sel.removeEventListener('change', AF_setupAddForm); sel.addEventListener('change', AF_setupAddForm); }
  AF_setupAddForm();
  var first = document.getElementById('f_categoria'); if(first) first.focus();
}
function AF_closeAdd(){
  var m = document.getElementById('modalAF'); if(!m) return;
  m.style.display = 'none'; document.body.classList.remove('af-modal-open');
  if(m._afKey){ document.removeEventListener('keydown', m._afKey); m._afKey = null; }
}
async function AF_submitAdd(){
  var start = (AF_qs('#f_start')||{}).value || '';
  var sParts = start && start.includes('-') ? start.split('-') : null;
  var dayFromStart = sParts ? Number(sParts[2]) : null;
  var monthFromStart = sParts ? Number(sParts[1]) : null;

  var it={
    categoria:(AF_qs('#f_categoria')||{}).value||'',
    fornecedor:(AF_qs('#f_fornecedor')||{}).value||'',
    tipoPagamento:(AF_qs('#f_tipo')||{}).value||'',
    valorCentavos:Math.round(Number((AF_qs('#f_valor')||{}).value||0)*100),
    descricao:(AF_qs('#f_desc')||{}).value||'',
    attachments:{},
    freq:{ type:(AF_qs('#f_freq_type')||{}).value||'mensal', day: dayFromStart || 1, month: monthFromStart || null, start: start || null, date: start || null }
  };
  var res=await AF_apiPost({action:'add',item:it});
  if(res&&res.ok){alert('Salvo!');AF_closeAdd();AF_boot();}else{alert('Falha ao salvar. Verifique o token.');}
}

/* ===== Exporta para onclick ===== */
window.AF_openAttachManage      = AF_openAttachManage;
window.AF_submitAttachManage    = AF_submitAttachManage;
window.AF_openAttachDownload    = AF_openAttachDownload;
window.AF_confirmAttachDownload = AF_confirmAttachDownload;
window.AF_remove                = AF_remove;
window.AF_confirmRemove         = AF_confirmRemove;
window.AF_closeRemove           = AF_closeRemove;
window.AF_clientPaidMonth       = AF_clientPaidMonth;
window.AF_markOpenMonth         = AF_markOpenMonth;
window.AF_openAdd               = AF_openAdd;
window.AF_submitAdd             = AF_submitAdd;
window.AF_ensureToken           = AF_ensureToken;
window.AF_switchClient          = AF_switchClient;
window.AF_onCatChange           = AF_onCatChange;
window.AF_render                = AF_render;
window.AF_deleteAttachment      = AF_deleteAttachment;