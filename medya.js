// SohbetHane — Multimedya + Yapay zekâ önerileri (YALNIZCA yönetici)
// Bu dosya yalnızca yönetici hesabıyla giriş yapılınca yüklenir. Veriler özel depoda ve
// yönetici-yalnızca tablolarda durur; başka hiçbir kullanıcı okuyamaz.
(function(){
if(window.MY) return;
const MY=window.MY={};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BUCKET='medya_ozel';
const LS='sh_admin_medya_cfg';
const TURKEY=s=>String(s||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i');

function cfg(){ try{return JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){return {};} }
function saveCfg(c){ try{localStorage.setItem(LS,JSON.stringify(c));}catch(e){} }

const AI_DEFS={
  claude:{ad:'Claude',model:'claude-sonnet-5-5'},
  openai:{ad:'ChatGPT (OpenAI)',model:'gpt-4o-mini',base:'https://api.openai.com/v1'},
  deepseek:{ad:'DeepSeek',model:'deepseek-chat',base:'https://api.deepseek.com'},
  grok:{ad:'Grok (xAI)',model:'grok-3',base:'https://api.x.ai/v1'}
};

const ST={tab:'lib',folders:[],folderId:null,items:[],urls:{},sent:new Set(),q:'',showSent:false,
  src:'giphy',res:[],sel:new Set(),page:0,busy:false,lastQuery:''};

// ───────── arayüz ─────────
function css(){
  if($('my-css')) return;
  const st=document.createElement('style'); st.id='my-css';
  st.textContent=`
#my-modal{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9000;display:none;align-items:stretch;justify-content:center}
#my-modal.open{display:flex}
#my-box{background:var(--bg,#0d1117);color:var(--txt,#e6edf3);width:min(1100px,100%);max-height:100%;margin:auto;display:flex;flex-direction:column;border:1px solid var(--brd,#30363d);border-radius:14px;overflow:hidden;height:min(92vh,860px)}
#my-head{display:flex;align-items:center;gap:.5rem;padding:.6rem .9rem;border-bottom:1px solid var(--brd,#30363d)}
#my-head b{flex:1}
.my-tabs{display:flex;gap:.3rem;padding:.4rem .9rem;border-bottom:1px solid var(--brd,#30363d);flex-wrap:wrap}
.my-tab{padding:.35rem .8rem;border-radius:8px;background:var(--bg2,#161b22);color:var(--txt2,#8b949e);cursor:pointer;font-size:.85rem;border:1px solid transparent}
.my-tab.on{color:var(--txt,#e6edf3);border-color:var(--acc,#e11d48)}
#my-body{flex:1;overflow:auto;padding:.8rem .9rem}
#my-foot{border-top:1px solid var(--brd,#30363d);padding:.5rem .9rem;display:flex;gap:.5rem;align-items:flex-start}
#my-foot textarea{flex:1;min-height:38px;max-height:90px;background:var(--bg2,#161b22);color:inherit;border:1px solid var(--brd,#30363d);border-radius:8px;padding:.4rem .6rem;font:inherit;resize:vertical}
.my-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.6rem}
.my-row input,.my-row select{background:var(--bg2,#161b22);color:inherit;border:1px solid var(--brd,#30363d);border-radius:8px;padding:.4rem .6rem;font:inherit}
.my-row input.grow{flex:1;min-width:140px}
.my-split{display:grid;grid-template-columns:190px 1fr;gap:.8rem}
@media(max-width:700px){.my-split{grid-template-columns:1fr}}
.my-fold{padding:.4rem .6rem;border-radius:8px;cursor:pointer;font-size:.85rem;display:flex;justify-content:space-between;gap:.4rem}
.my-fold.on{background:var(--bg2,#161b22);border:1px solid var(--acc,#e11d48)}
.my-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.6rem}
.my-card{background:var(--bg2,#161b22);border:1px solid var(--brd,#30363d);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;position:relative}
.my-card.sel{outline:2px solid var(--acc,#e11d48)}
.my-prev{height:120px;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden}
.my-prev img,.my-prev video{max-width:100%;max-height:100%;object-fit:contain}
.my-prev.txt{background:var(--bg3,#21262d);padding:.5rem;font-size:.82rem;text-align:center;overflow:auto;align-items:flex-start;display:block;white-space:pre-wrap}
.my-meta{padding:.35rem .5rem;font-size:.7rem;color:var(--txt2,#8b949e);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.my-act{display:flex;gap:.25rem;padding:0 .4rem .4rem;flex-wrap:wrap}
.my-act button{font-size:.72rem;padding:.2rem .4rem}
.my-badge{position:absolute;top:4px;left:4px;background:rgba(63,185,80,.9);color:#fff;font-size:.65rem;padding:1px 6px;border-radius:8px}
.my-sug{background:var(--bg2,#161b22);border:1px solid var(--brd,#30363d);border-radius:10px;padding:.7rem;margin-bottom:.6rem}
.my-muted{color:var(--txt2,#8b949e);font-size:.8rem}
`;
  document.head.appendChild(st);
}
function ui(){
  css();
  if($('my-modal')) return;
  const d=document.createElement('div'); d.id='my-modal';
  d.innerHTML=`<div id="my-box">
  <div id="my-head"><b>🗂 Multimedya <span class="my-muted">(yalnızca yönetici)</span></b><button class="btn btn-secondary btn-sm" onclick="MY.close()">✕ Kapat</button></div>
  <div class="my-tabs">
    <div class="my-tab" data-t="lib" onclick="MY.tab('lib')">📚 Kütüphane</div>
    <div class="my-tab" data-t="topla" onclick="MY.tab('topla')">🔎 Topla</div>
    <div class="my-tab" data-t="sug" onclick="MY.tab('sug')">🤖 Öneri</div>
    <div class="my-tab" data-t="ai" onclick="MY.tab('ai')">⚙ Ayarlar</div>
  </div>
  <div id="my-body"></div>
  <div id="my-foot">
    <textarea id="my-caption" placeholder="Açıklama metni (gönderirken medyanın altına eklenir, isteğe bağlı)"></textarea>
    <button class="btn btn-secondary btn-sm" title="Veciz Sözler klasöründen rastgele söz ekle" onclick="MY.randomQuote()">🎲 Söz</button>
  </div>
</div>`;
  d.addEventListener('mousedown',e=>{ if(e.target===d) MY.close(); });
  document.body.appendChild(d);
}
MY.open=async function(tab){
  if(!S||!S.profile||!S.profile.yonetici) return;
  ui(); $('my-modal').classList.add('open');
  await loadFolders();
  MY.tab(tab||ST.tab||'lib');
};
MY.close=function(){ const m=$('my-modal'); if(m) m.classList.remove('open'); };
MY.tab=function(t){
  ST.tab=t;
  document.querySelectorAll('#my-modal .my-tab').forEach(x=>x.classList.toggle('on',x.dataset.t===t));
  ({lib:renderLib,topla:renderTopla,sug:renderSug,ai:renderAi})[t]();
};
const toast=(m,t)=>{ try{ window.toast(m,t||'info'); }catch(e){ console.log(m); } };

// ───────── dış ağ (ayrı sayfa üzerinden; ana sitenin güvenlik ilkesi korunur) ─────────
function netWin(){
  return new Promise((res,rej)=>{
    let f=$('my-net');
    if(f&&f._ready) return res(f.contentWindow);
    if(!f){ f=document.createElement('iframe'); f.id='my-net'; f.style.display='none'; f.src='medya-net.html?v=20261123a'; f.onerror=rej; document.body.appendChild(f); }
    f.addEventListener('load',()=>{ f._ready=true; res(f.contentWindow); });
    setTimeout(()=>rej(new Error('ağ sayfası yüklenemedi')),10000);
  });
}
const DIRECT_OK=/(^|\.)(giphy\.com|pexels\.com|pixabay\.com|vimeocdn\.com|anthropic\.com|openai\.com|deepseek\.com|x\.ai)$/i;
function hostOf(u){ try{ return new URL(u).hostname; }catch(e){ return ''; } }
function sniff(buf){
  const b=new Uint8Array(buf.slice(0,16)); const h=(...x)=>x.every((v,i)=>b[i]===v);
  if(h(0x47,0x49,0x46,0x38)) return 'image/gif'; if(h(0xFF,0xD8,0xFF)) return 'image/jpeg'; if(h(0x89,0x50,0x4E,0x47)) return 'image/png';
  if(h(0x52,0x49,0x46,0x46)&&b[8]===0x57&&b[9]===0x45) return 'image/webp'; if(b[4]===0x66&&b[5]===0x74&&b[6]===0x79&&b[7]===0x70) return 'video/mp4'; if(h(0x1A,0x45,0xDF,0xA3)) return 'video/webm';
  return 'application/octet-stream';
}
// Sunucudaki yönetici-yalnızca indirme aracı (Supabase edge function)
async function PX(body){
  const ses=(await sb.auth.getSession()).data.session; if(!ses) throw new Error('oturum yok');
  const r=await fetch(SUPABASE_URL+'/functions/v1/medya-proxy',{method:'POST',headers:{'Authorization':'Bearer '+ses.access_token,'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r;
}
async function PJ(url,opts){
  const r=await PX({mode:'json',url,method:opts&&opts.method,headers:opts&&opts.headers,body:opts&&opts.body});
  const j=await r.json().catch(()=>null); if(!j) throw new Error('indirme aracı yanıt vermedi ('+r.status+')'); if(j.error&&j.ok===false&&j.status==null) throw new Error(j.error); return j;
}
async function PB(url){
  const r=await PX({mode:'buf',url});
  const ct=r.headers.get('content-type')||'';
  if(ct.includes('application/json')){ const j=await r.json(); throw new Error(j.error||('indirilemedi '+(j.status||''))); }
  const buf=await r.arrayBuffer(); const type=r.headers.get('x-up-type')||sniff(buf);
  return {blob:new Blob([buf],{type}),type};
}
async function NJ(url,opts){
  const direct=DIRECT_OK.test(hostOf(url));
  if(direct){ try{ const w=await netWin(); const r=await w.netFetch(url,opts,'json'); if(!r.error) return r; }catch(e){} }
  return PJ(url,opts);
}
async function NB(url,opts){
  if(DIRECT_OK.test(hostOf(url))){
    try{ const w=await netWin(); const r=await w.netFetch(url,opts,'buf'); if(!r.error&&r.ok) return {blob:new Blob([r.buf],{type:(r.type||'').split(';')[0]}),type:(r.type||'').split(';')[0]}; }catch(e){}
  }
  return PB(url);
}
const _thumbs={};
async function thumb(url){ if(_thumbs[url]) return _thumbs[url]; try{ const {blob}=await NB(url); return _thumbs[url]=URL.createObjectURL(blob); }catch(e){ return ''; } }
function hydrateThumbs(root){ root.querySelectorAll('img[data-turl]').forEach(async im=>{ const u=await thumb(im.dataset.turl); if(u) im.src=u; }); }

// ───────── veri ─────────
async function loadFolders(){
  const {data,error}=await sb.from('medya_klasorler').select('*').order('ad');
  if(error){ toast('Klasörler alınamadı: '+error.message,'error'); return; }
  ST.folders=data||[];
  if(!ST.folderId||!ST.folders.find(f=>f.id===ST.folderId)) ST.folderId=ST.folders[0]?.id||null;
}
async function loadSent(){
  ST.sent=new Set();
  if(!S.currentRoom) return;
  const {data}=await sb.from('medya_gonderilen').select('oge_id').eq('oda_id',S.currentRoom.id);
  (data||[]).forEach(r=>ST.sent.add(r.oge_id));
}
async function loadItems(){
  let q=sb.from('medya_ogeler').select('*').order('olusturma',{ascending:false});
  if(ST.q) q=q.limit(1500); else q=q.eq('klasor_id',ST.folderId).limit(500);
  const {data,error}=await q;
  if(error){ toast('Öğeler alınamadı: '+error.message,'error'); return []; }
  let items=data||[];
  if(ST.q){
    const words=TURKEY(ST.q).split(/\s+/).filter(Boolean);
    const fname={}; ST.folders.forEach(f=>fname[f.id]=f.ad);
    items=items.filter(it=>{
      const hay=TURKEY([fname[it.klasor_id],it.etiket,it.aciklama,it.metin,it.tur].join(' '));
      return words.every(w=>hay.includes(w));
    });
  }
  ST.items=items;
  return items;
}
async function signUrls(items){
  const need=items.filter(i=>i.dosya_yolu&&!ST.urls[i.dosya_yolu]).map(i=>i.dosya_yolu);
  if(!need.length) return;
  const {data}=await sb.storage.from(BUCKET).createSignedUrls(need,3600);
  (data||[]).forEach(r=>{ if(r&&r.signedUrl) ST.urls[r.path]=r.signedUrl; });
}

// ───────── kütüphane ─────────
async function renderLib(){
  const body=$('my-body');
  body.innerHTML='<div class="my-muted">Yükleniyor…</div>';
  await Promise.all([loadSent(),loadItems()]);
  const room=S.currentRoom;
  const roomLbl=room?('Açık sohbet: <b>'+esc(room.tur==='dm'?'Birebir sohbet':(room.isim||'Oda'))+'</b>'):'<span style="color:#f0883e">Gönderebilmek için önce bir sohbet aç</span>';
  const folders=ST.folders.map(f=>`<div class="my-fold ${f.id===ST.folderId&&!ST.q?'on':''}" onclick="MY.pickFolder('${f.id}')"><span>📁 ${esc(f.ad)}</span></div>`).join('');
  body.innerHTML=`<div class="my-row">
      <input class="grow" id="my-q" placeholder="Ara: örn. beyaz çiçek (tüm klasörlerde)" value="${esc(ST.q)}" onkeydown="if(event.key==='Enter')MY.search()">
      <button class="btn btn-primary btn-sm" onclick="MY.search()">🔍 Ara</button>
      <label class="my-muted"><input type="checkbox" ${ST.showSent?'checked':''} onchange="MY.toggleSent(this.checked)"> bu sohbete gönderilenleri de göster</label>
    </div>
    <div class="my-muted" style="margin-bottom:.5rem">${roomLbl} · bu sohbette zaten gönderdiklerin varsayılan olarak gizlenir.</div>
    <div class="my-split"><div>
      ${folders}
      <div class="my-row" style="margin-top:.5rem"><button class="btn btn-secondary btn-sm" onclick="MY.newFolder()">➕ Yeni klasör</button></div>
      ${ST.folderId&&!ST.q?`<div class="my-row"><button class="btn btn-secondary btn-sm" onclick="MY.renameFolder()">✏️</button><button class="btn btn-danger btn-sm" onclick="MY.delFolder()">🗑 Klasörü sil</button></div>`:''}
    </div><div id="my-grid"></div></div>`;
  drawGrid();
}
async function drawGrid(){
  let items=ST.items;
  if(S.currentRoom&&!ST.showSent) items=items.filter(i=>!ST.sent.has(i.id));
  const g=$('my-grid'); if(!g) return;
  if(!items.length){ g.innerHTML='<div class="my-muted">Bu görünümde öğe yok.</div>'; return; }
  await signUrls(items);
  const fopts=ST.folders.map(f=>`<option value="${f.id}">${esc(f.ad)}</option>`).join('');
  g.innerHTML='<div class="my-grid">'+items.map(it=>{
    const u=ST.urls[it.dosya_yolu]||'';
    let prev;
    if(it.tur==='video') prev=`<div class="my-prev"><video src="${esc(u)}" muted loop playsinline preload="metadata" onmouseenter="this.play()" onmouseleave="this.pause()"></video></div>`;
    else if(it.tur==='gif'||it.tur==='resim') prev=`<div class="my-prev"><img loading="lazy" src="${esc(u)}" alt=""></div>`;
    else prev=`<div class="my-prev txt">${esc(it.metin||'')}</div>`;
    const sent=ST.sent.has(it.id)?'<span class="my-badge">✓ gönderildi</span>':'';
    return `<div class="my-card">${sent}${prev}
      <div class="my-meta" title="${esc(it.etiket)}">${esc(it.tur)} · ${esc(it.etiket||'—')}</div>
      <div class="my-act">
        <button class="btn btn-primary btn-sm" onclick="MY.send('${it.id}')">💬 Gönder</button>
        <button class="btn btn-secondary btn-sm" onclick="MY.post('${it.id}')" title="Zaman tünelinde herkese açık paylaş">📰</button>
        <select class="btn btn-secondary btn-sm" style="max-width:70px" onchange="MY.move('${it.id}',this.value)"><option value="">Taşı…</option>${fopts}</select>
        <button class="btn btn-danger btn-sm" onclick="MY.del('${it.id}')">🗑</button>
      </div></div>`;
  }).join('')+'</div>';
}
MY.pickFolder=async function(id){ ST.folderId=id; ST.q=''; await renderLib(); };
MY.search=async function(){ ST.q=($('my-q').value||'').trim(); await renderLib(); };
MY.toggleSent=function(v){ ST.showSent=!!v; drawGrid(); };
MY.newFolder=async function(){
  const ad=(prompt('Yeni klasör adı:')||'').trim(); if(!ad) return;
  const {data,error}=await sb.from('medya_klasorler').insert({ad}).select().single();
  if(error){ toast('Klasör açılamadı: '+error.message,'error'); return; }
  await loadFolders(); ST.folderId=data.id; ST.q=''; MY.tab(ST.tab);
};
MY.renameFolder=async function(){
  const f=ST.folders.find(x=>x.id===ST.folderId); if(!f) return;
  const ad=(prompt('Klasör adı:',f.ad)||'').trim(); if(!ad||ad===f.ad) return;
  const {error}=await sb.from('medya_klasorler').update({ad}).eq('id',f.id);
  if(error){ toast(error.message,'error'); return; }
  await loadFolders(); MY.tab(ST.tab);
};
MY.delFolder=async function(){
  const f=ST.folders.find(x=>x.id===ST.folderId); if(!f) return;
  if(!confirm('"'+f.ad+'" klasörü ve içindeki TÜM öğeler silinsin mi? Geri alınamaz.')) return;
  const {data:its}=await sb.from('medya_ogeler').select('dosya_yolu').eq('klasor_id',f.id);
  const paths=(its||[]).map(i=>i.dosya_yolu).filter(Boolean);
  if(paths.length) await sb.storage.from(BUCKET).remove(paths);
  const {error}=await sb.from('medya_klasorler').delete().eq('id',f.id);
  if(error){ toast(error.message,'error'); return; }
  ST.folderId=null; await loadFolders(); MY.tab(ST.tab);
};
MY.move=async function(id,fid){
  if(!fid) return;
  const {error}=await sb.from('medya_ogeler').update({klasor_id:fid}).eq('id',id);
  if(error){ toast(error.message,'error'); return; }
  toast('Taşındı ✓','success'); renderLib();
};
MY.del=async function(id){
  const it=ST.items.find(x=>x.id===id); if(!it) return;
  if(!confirm('Bu öğe kalıcı silinsin mi?')) return;
  if(it.dosya_yolu) await sb.storage.from(BUCKET).remove([it.dosya_yolu]);
  const {error}=await sb.from('medya_ogeler').delete().eq('id',id);
  if(error){ toast(error.message,'error'); return; }
  ST.items=ST.items.filter(x=>x.id!==id); drawGrid();
};

// ───────── gönderme ─────────
const EXT={'image/gif':'gif','image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
async function itemFile(it){
  const {data,error}=await sb.storage.from(BUCKET).download(it.dosya_yolu);
  if(error||!data) throw new Error(error?.message||'dosya indirilemedi');
  const mime=it.mime||data.type||'application/octet-stream';
  const ext=EXT[mime]||(it.dosya_yolu.split('.').pop());
  return new File([data],(it.etiket||'medya').slice(0,40).replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_')+'_'+it.id.slice(0,6)+'.'+ext,{type:mime});
}
async function markSent(roomId,id){
  await sb.from('medya_gonderilen').upsert({oda_id:roomId,oge_id:id});
  ST.sent.add(id);
}
async function sendOne(it,caption){
  const room=S.currentRoom;
  if(!room) throw new Error('Önce bir sohbet aç');
  if(it.tur==='soz'||it.tur==='emoji'){
    const txt=(caption?caption+'\n\n':'')+(it.metin||'');
    await sendTextMessage(txt,room);
  } else {
    const f=await itemFile(it);
    const ok=await sendFileDirectly(f,caption||'');
    if(!ok) throw new Error('gönderilemedi');
  }
  await markSent(room.id,it.id);
}
MY.send=async function(id,silent){
  const it=ST.items.find(x=>x.id===id)||ST.sugItems?.find(x=>x.id===id); if(!it) return;
  if(!S.currentRoom){ toast('Önce soldan bir sohbet aç, sonra Multimedya\'yı aç','error'); return; }
  const cap=($('my-caption')?.value||'').trim();
  try{ await sendOne(it,cap); toast('Gönderildi ✓','success'); if($('my-caption')) $('my-caption').value=''; if(ST.tab==='lib') drawGrid(); }
  catch(e){ toast('Gönderilemedi: '+(e.message||e),'error'); }
};
MY.post=async function(id){
  const it=ST.items.find(x=>x.id===id); if(!it) return;
  const cap=($('my-caption')?.value||'').trim();
  if(!confirm('Bu içerik zaman tünelinde HERKESE AÇIK paylaşılacak. Devam?')) return;
  try{
    let medya_url=null,medya_tip=null,medya_adi=null,metin=cap||null;
    if(it.tur==='soz'||it.tur==='emoji'){ metin=(cap?cap+'\n\n':'')+(it.metin||''); }
    else{
      const f=await itemFile(it);
      const path=`posts/${S.user.id}/${Date.now()}.${f.name.split('.').pop().toLowerCase()}`;
      const {error:ue}=await sb.storage.from('medya').upload(path,f,{contentType:f.type,upsert:false});
      if(ue) throw ue;
      medya_url=sb.storage.from('medya').getPublicUrl(path).data.publicUrl;
      medya_adi=f.name; medya_tip=f.type.startsWith('video/')?'video':'resim';
    }
    const {error}=await sb.from('gonderiler').insert({kullanici_id:S.user.id,metin,medya_url,medya_tip,medya_adi,genel:true});
    if(error) throw error;
    toast('Zaman tünelinde paylaşıldı 🎉','success'); if($('my-caption')) $('my-caption').value='';
  }catch(e){ toast('Paylaşılamadı: '+(e.message||e),'error'); }
};
MY.randomQuote=async function(){
  const f=ST.folders.find(x=>TURKEY(x.ad).includes('veciz'));
  let q=sb.from('medya_ogeler').select('id,metin').eq('tur','soz').limit(300);
  if(f) q=q.eq('klasor_id',f.id);
  const {data}=await q;
  let pool=data||[];
  if(S.currentRoom){ const un=pool.filter(x=>!ST.sent.has(x.id)); if(un.length) pool=un; }
  if(!pool.length){ toast('Henüz kayıtlı söz yok. Topla sekmesinden "Söz (yapay zekâ)" ile ekle.','info'); return; }
  $('my-caption').value=pool[Math.floor(Math.random()*pool.length)].metin;
};

// ───────── toplama ─────────
const SRC={
  giphy:{ad:'GIF — Giphy',tur:'gif',key:'giphy',link:'developers.giphy.com'},
  pexels_img:{ad:'Resim — Pexels',tur:'resim',key:'pexels',link:'pexels.com/api'},
  pexels_vid:{ad:'Video — Pexels',tur:'video',key:'pexels',link:'pexels.com/api'},
  pixabay_img:{ad:'Resim — Pixabay',tur:'resim',key:'pixabay',link:'pixabay.com/api/docs'},
  pixabay_vid:{ad:'Video — Pixabay',tur:'video',key:'pixabay',link:'pixabay.com/api/docs'},
  google_img:{ad:'Resim — Google Görseller',tur:'resim',key:'serpapi',link:'serpapi.com'},
  google_gif:{ad:'GIF — Google Görseller',tur:'gif',key:'serpapi',link:'serpapi.com'},
  yandex_img:{ad:'Resim — Yandex Görseller',tur:'resim',key:'serpapi',link:'serpapi.com'},
  pinterest:{ad:'Resim — Pinterest',tur:'resim',key:'serpapi',link:'serpapi.com'},
  emoji:{ad:'Emoji (anahtar kelimeye göre)',tur:'emoji'},
  soz:{ad:'Veciz söz (yapay zekâ yazar)',tur:'soz',ai:true},
  emoji_ai:{ad:'Emoji kombinasyonu (yapay zekâ)',tur:'emoji',ai:true}
};
function renderTopla(){
  const body=$('my-body');
  const fopts=ST.folders.map(f=>`<option value="${f.id}" ${f.id===ST.folderId?'selected':''}>${esc(f.ad)}</option>`).join('');
  body.innerHTML=`<div class="my-row">
      <select id="my-src" onchange="MY.setSrc(this.value)">${Object.entries(SRC).map(([k,v])=>`<option value="${k}" ${k===ST.src?'selected':''}>${v.ad}</option>`).join('')}</select>
      <input class="grow" id="my-tq" placeholder="Anahtar kelime (örn. beyaz çiçek)" onkeydown="if(event.key==='Enter')MY.collect(true)">
      <button class="btn btn-primary btn-sm" onclick="MY.collect(true)">🔎 Ara</button>
    </div>
    <div class="my-row"><span class="my-muted">Kaydedilecek klasör:</span><select id="my-tf">${fopts}</select>
      <button class="btn btn-secondary btn-sm" onclick="MY.newFolder()">➕ Yeni klasör</button>
      <button class="btn btn-success btn-sm" onclick="MY.saveSel()">💾 Seçilenleri kaydet</button>
      <button class="btn btn-secondary btn-sm" onclick="MY.selAll()">Tümünü seç</button></div>
    <div class="my-row"><span class="my-muted">Kendi dosyaların:</span>
      <input type="file" id="my-file" multiple accept="image/*,video/*" onchange="MY.upload(this)">
      <input class="grow" id="my-url" placeholder="veya doğrudan dosya adresi (.gif/.jpg/.mp4)">
      <button class="btn btn-secondary btn-sm" onclick="MY.addUrl()">Ekle</button></div>
    <div id="my-res"><div class="my-muted">Bir kaynak seç, anahtar kelime yaz ve ara. Sonuçlardan beğendiklerini işaretleyip klasöre kaydet.</div></div>`;
  if(ST.res.length) drawRes(ST.more);
}
MY.setSrc=function(v){ ST.src=v; ST.res=[]; ST.sel=new Set(); ST.page=0; $('my-res').innerHTML='<div class="my-muted">Anahtar kelime yazıp ara.</div>'; };
async function jget(url,headers){
  const r=await NJ(url,{headers:headers||{}});
  if(!r.ok) throw new Error('Servis hatası '+r.status+(r.data&&(r.data.error||r.data.message)?': '+(r.data.error?.message||r.data.error||r.data.message):''));
  return r.data;
}
const BAD=['porn','xxx','nsfw'];
async function searchSrc(src,q,page){
  const c=cfg(); const s=SRC[src]; const k=s.key&&c[s.key];
  if(s.key&&!k) throw new Error(s.ad+' için API anahtarı yok. "⚙ Ayarlar" sekmesinden ekle (ücretsiz: '+s.link+').');
  const per=24;
  if(src==='giphy'){
    const d=await jget(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(k)}&q=${encodeURIComponent(q)}&limit=${per}&offset=${page*per}&lang=tr`);
    return (d.data||[]).map(g=>({id:'g'+g.id,tur:'gif',thumb:g.images?.fixed_width?.url||g.images?.original?.url,url:g.images?.original?.url,mime:'image/gif',ad:g.title||q,kaynak:'giphy'}));
  }
  if(src==='pexels_img'){
    const d=await jget(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${per}&page=${page+1}`,{Authorization:k});
    return (d.photos||[]).map(p=>({id:'p'+p.id,tur:'resim',thumb:p.src.medium,url:p.src.large2x||p.src.large||p.src.original,mime:'image/jpeg',ad:p.alt||q,kaynak:'pexels'}));
  }
  if(src==='pexels_vid'){
    const d=await jget(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${per}&page=${page+1}`,{Authorization:k});
    return (d.videos||[]).map(v=>{
      const f=(v.video_files||[]).filter(x=>x.file_type==='video/mp4'&&x.width&&x.width<=1280).sort((a,b)=>b.width-a.width)[0]||(v.video_files||[])[0];
      return f?{id:'v'+v.id,tur:'video',thumb:v.image,url:f.link,mime:'video/mp4',ad:q,kaynak:'pexels'}:null;
    }).filter(Boolean);
  }
  if(src==='pixabay_img'){
    const d=await jget(`https://pixabay.com/api/?key=${encodeURIComponent(k)}&q=${encodeURIComponent(q)}&image_type=photo&per_page=${per}&page=${page+1}`);
    return (d.hits||[]).map(h=>({id:'x'+h.id,tur:'resim',thumb:h.webformatURL,url:h.largeImageURL||h.webformatURL,mime:'image/jpeg',ad:h.tags||q,kaynak:'pixabay'}));
  }
  if(src==='pixabay_vid'){
    const d=await jget(`https://pixabay.com/api/videos/?key=${encodeURIComponent(k)}&q=${encodeURIComponent(q)}&per_page=${per}&page=${page+1}`);
    return (d.hits||[]).map(h=>({id:'y'+h.id,tur:'video',thumb:`https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`,url:h.videos?.medium?.url||h.videos?.small?.url,mime:'video/mp4',ad:h.tags||q,kaynak:'pixabay'})).filter(x=>x.url);
  }
  if(src==='google_img'||src==='google_gif'){
    const gif=src==='google_gif';
    const d=await jget(`https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(q)}&ijn=${page}${gif?'&tbs=itp:animated':''}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    return (d.images_results||[]).filter(x=>x.original).map((x,i)=>({id:'gi'+page+'_'+i,tur:gif?'gif':'resim',thumb:x.thumbnail,url:x.original,mime:gif?'image/gif':'image/jpeg',ad:x.title||q,kaynak:'google'}));
  }
  if(src==='yandex_img'){
    const d=await jget(`https://serpapi.com/search.json?engine=yandex_images&text=${encodeURIComponent(q)}&p=${page}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    return (d.images_results||[]).filter(x=>x.original).map((x,i)=>({id:'yi'+page+'_'+i,tur:'resim',thumb:x.thumbnail,url:x.original,mime:'image/jpeg',ad:x.title||q,kaynak:'yandex'}));
  }
  if(src==='pinterest'){
    const d=await jget(`https://serpapi.com/search.json?engine=pinterest&q=${encodeURIComponent(q)}${page&&ST.pinTok?'&next_page_token='+encodeURIComponent(ST.pinTok):''}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    ST.pinTok=d.serpapi_pagination?.next_page_token||null;
    return (d.pins||[]).filter(x=>x.original).map((x,i)=>({id:'pi'+page+'_'+i,tur:'resim',thumb:x.thumbnail,url:x.original,mime:'image/jpeg',ad:x.title||x.description||q,kaynak:'pinterest'}));
  }
  if(src==='emoji') return emojiSearch(q);
  if(src==='soz'||src==='emoji_ai') return aiCollect(src,q);
  return [];
}
MY.collect=async function(reset){
  if(ST.busy) return;
  const q=($('my-tq')?.value||'').trim();
  if(!q){ toast('Anahtar kelime yaz','error'); return; }
  if(reset){ ST.res=[]; ST.sel=new Set(); ST.page=0; ST.lastQuery=q; ST.pinTok=null; }
  ST.busy=true; $('my-res').innerHTML='<div class="my-muted">Aranıyor…</div>';
  try{
    const r=await searchSrc(ST.src,ST.lastQuery||q,ST.page);
    ST.res=ST.res.concat(r); ST.page++;
    ST.more=r.length>=8&&!(ST.src==='emoji'||ST.src==='soz'||ST.src==='emoji_ai')&&!(ST.src==='pinterest'&&!ST.pinTok);
    if(!ST.res.length) $('my-res').innerHTML='<div class="my-muted">Sonuç bulunamadı.</div>'; else drawRes(ST.more);
  }catch(e){ $('my-res').innerHTML='<div style="color:#f85149">'+esc(e.message||e)+'</div>'; }
  ST.busy=false;
};
function drawRes(more){
  const wrap=$('my-res');
  wrap.innerHTML='<div class="my-grid">'+ST.res.map((r,i)=>{
    let prev;
    if(r.tur==='emoji'||r.tur==='soz') prev=`<div class="my-prev txt" style="font-size:${r.tur==='emoji'?'1.8rem':'.82rem'}">${esc(r.metin)}</div>`;
    else prev=`<div class="my-prev"><img data-turl="${esc(r.thumb||r.url)}" alt=""></div>`;
    return `<div class="my-card ${ST.sel.has(i)?'sel':''}" onclick="MY.toggleSel(${i})" style="cursor:pointer">${prev}<div class="my-meta">${esc(r.tur)} · ${esc(r.ad||'')}</div></div>`;
  }).join('')+'</div>'+(more?'<div class="my-row" style="margin-top:.6rem"><button class="btn btn-secondary btn-sm" onclick="MY.collect(false)">Daha fazla yükle</button></div>':'');
  hydrateThumbs(wrap);
}
MY.toggleSel=function(i){ if(ST.sel.has(i)) ST.sel.delete(i); else ST.sel.add(i); drawRes(ST.more); };
MY.selAll=function(){ ST.res.forEach((_,i)=>ST.sel.add(i)); drawRes(ST.more); };
async function putFile(folderId,blob,mime,meta){
  const ext=EXT[mime]||(mime.split('/')[1]||'bin');
  const path=`${folderId}/${(crypto.randomUUID?crypto.randomUUID():Date.now()+''+Math.random().toString(16).slice(2))}.${ext}`;
  const {error:ue}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:mime,upsert:false});
  if(ue) throw ue;
  const {error}=await sb.from('medya_ogeler').insert({klasor_id:folderId,tur:meta.tur,dosya_yolu:path,etiket:meta.etiket||'',aciklama:meta.aciklama||null,kaynak:meta.kaynak||null,mime,boyut:blob.size});
  if(error){ await sb.storage.from(BUCKET).remove([path]); throw error; }
}
MY.saveSel=async function(){
  const fid=$('my-tf')?.value; if(!fid){ toast('Klasör seç','error'); return; }
  const picks=[...ST.sel].map(i=>ST.res[i]).filter(Boolean);
  if(!picks.length){ toast('Önce sonuçlardan seç','error'); return; }
  const q=ST.lastQuery||'';
  let ok=0,fail=0,idx=0;
  toast(picks.length+' öğe kaydediliyor…','info');
  async function worker(){
    while(idx<picks.length){
      const r=picks[idx++];
      try{
        if(r.tur==='emoji'||r.tur==='soz'){
          const {error}=await sb.from('medya_ogeler').insert({klasor_id:fid,tur:r.tur,metin:r.metin,etiket:(q+' '+(r.ad||'')).trim(),kaynak:r.kaynak||'yerel'});
          if(error) throw error;
        } else {
          const {blob:b,type:bt}=await NB(r.url);
          const _m=(bt&&bt!=='application/octet-stream')?bt:r.mime; await putFile(fid,b,_m,{tur:_m.startsWith('video/')?'video':(_m==='image/gif'?'gif':'resim'),etiket:(q+' '+(r.ad||'')).trim().slice(0,200),kaynak:r.kaynak});
        }
        ok++;
      }catch(e){ fail++; console.warn('medya kaydet',e); }
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  toast(ok+' kaydedildi'+(fail?', '+fail+' başarısız (tarayıcı bazı sitelerden indirmeye izin vermeyebilir)':''),fail&&!ok?'error':'success');
  ST.sel=new Set(); drawRes(ST.more);
};
MY.upload=async function(inp){
  const fid=$('my-tf')?.value; const files=[...(inp.files||[])]; inp.value='';
  if(!fid||!files.length) return;
  const q=($('my-tq')?.value||'').trim(); let ok=0;
  for(const f of files){
    try{ await putFile(fid,f,f.type||'application/octet-stream',{tur:f.type.startsWith('video/')?'video':(f.type==='image/gif'?'gif':'resim'),etiket:(q+' '+f.name.replace(/\.[^.]+$/,'')).trim(),kaynak:'yüklendi'}); ok++; }
    catch(e){ toast('Yüklenemedi: '+f.name+' — '+(e.message||e),'error'); }
  }
  if(ok) toast(ok+' dosya yüklendi ✓','success');
};
MY.addUrl=async function(){
  const u=($('my-url')?.value||'').trim(); const fid=$('my-tf')?.value; if(!u||!fid) return;
  try{
    const {blob:b,type:m}=await NB(u);
    if(!/^(image|video)\//.test(m)) throw new Error('resim/gif/video değil');
    const q=($('my-tq')?.value||'').trim();
    await putFile(fid,b,m,{tur:m.startsWith('video/')?'video':(m==='image/gif'?'gif':'resim'),etiket:(q||u.split('/').pop().replace(/\.[^.]+$/,'')),kaynak:'adres'});
    $('my-url').value=''; toast('Eklendi ✓','success');
  }catch(e){ toast('Eklenemedi: '+(e.message||e)+' (site indirmeye izin vermiyor olabilir; dosyayı bilgisayarına indirip "Kendi dosyaların" ile yükle)','error'); }
};

// ───────── emoji sözlüğü ─────────
const EMO=`❤️|aşk sevgi kalp love heart
😍|aşık hayran gözleri kalp heart eyes
😘|öpücük kiss
🥰|sevgi tatlı sevimli
😊|gülümseme mutlu smile happy
😂|kahkaha gülmek komik laugh
🤣|yerlere yatmak komik lol
😉|göz kırpma flört wink
😎|havalı cool güneş gözlüğü
🥺|rica yalvarma hassas pleading
😢|ağlamak üzgün cry sad
😭|hüngür ağlamak sob
😡|kızgın öfke angry
😴|uyku uykulu sleep
🤔|düşünmek merak think
🙄|göz devirme eye roll
😏|sırıtış kurnaz smirk
😈|şeytan yaramaz devil naughty
🔥|ateş sıcak hot fire
💋|dudak öpücük kiss lips
👄|dudak lips
💕|kalpler aşk hearts
💖|parlayan kalp sparkle heart
💘|ok kalp aşk cupid
💔|kırık kalp heartbreak
🌹|gül çiçek aşk rose flower
🌷|lale çiçek tulip flower
🌸|kiraz çiçeği bahar blossom flower
🌼|papatya çiçek daisy flower
🌻|ayçiçeği sunflower flower
💐|buket çiçek bouquet flower
🌺|çiçek hibiscus flower
🌿|yaprak bitki herb leaf
🍀|yonca şans clover luck
🌞|güneş sabah sun morning
🌙|ay gece moon night
⭐|yıldız star
✨|parıltı sparkles
🌈|gökkuşağı rainbow
☕|kahve çay coffee tea
🍷|şarap wine
🥂|kadeh şampanya cheers champagne
🍫|çikolata chocolate
🍓|çilek strawberry
🍑|şeftali peach
🍒|kiraz cherry
🍰|pasta cake
🎂|doğum günü birthday
🎁|hediye gift
🎉|kutlama parti party celebration
🎶|müzik şarkı music
🎵|nota music
💃|dans kadın dance woman
🕺|dans erkek dance man
👩|kadın woman
👨|erkek man
👫|çift couple
💑|çift aşk couple love
👀|bakmak gözler eyes
👋|merhaba selam hello wave
🤝|el sıkışma anlaşma handshake deal
🙏|dua teşekkür lütfen thanks please
👍|beğeni tamam like ok
👏|alkış bravo clap
💪|güç kas strong
🤗|sarılma hug
😇|melek masum angel
🤭|kıkırdama giggle
😳|utanmak şaşırmak blush
🥵|bunalmış sıcak hot
😋|lezzetli yummy
🤤|ağız sulanması drool
😜|dil çıkarma şaka playful
🙈|utanç görmemek shy monkey
🌹❤️|aşk gül romantik romantic
🚗|araba car
🏎️|spor araba yarış race car
🚙|araba suv car
🚘|araba car
🏍️|motor motorcycle
✈️|uçak seyahat plane travel
🏖️|plaj tatil beach holiday
🌊|deniz dalga sea wave
🏔️|dağ mountain
🌃|gece şehir night city
🏠|ev home
🐶|köpek dog
🐱|kedi cat
🦋|kelebek butterfly
🐝|arı bee
🍀🌸|şans bahar luck spring
💎|elmas diamond
👑|taç kral kraliçe crown
💍|yüzük evlilik ring
🌅|gün doğumu sunrise
🌇|gün batımı sunset
🕯️|mum romantik candle
🛏️|yatak bed
🌙✨|iyi geceler good night
☀️|günaydın good morning
🥀|solmuş gül wilted rose
😌|rahat huzur relieved
😔|düşünceli üzgün pensive
🤍|beyaz kalp white heart
🖤|siyah kalp black heart
💜|mor kalp purple heart
💙|mavi kalp blue heart
💚|yeşil kalp green heart
🧡|turuncu kalp orange heart`.split('\n').map(l=>{const i=l.indexOf('|');return [l.slice(0,i),l.slice(i+1)];});
function emojiSearch(q){
  const words=TURKEY(q).split(/\s+/).filter(Boolean);
  const hit=EMO.filter(([e,k])=>words.some(w=>TURKEY(k).includes(w)));
  return hit.map(([e,k],i)=>({id:'e'+i,tur:'emoji',metin:e,ad:k.split(' ').slice(0,3).join(' '),kaynak:'yerel'}));
}

// ───────── yapay zekâ (resmi API'ler) ─────────
function aiList(){
  const c=cfg().ai||{};
  return Object.keys(AI_DEFS).filter(k=>c[k]&&c[k].key&&c[k].on!==false).map(k=>({id:k,ad:AI_DEFS[k].ad,key:c[k].key,model:c[k].model||AI_DEFS[k].model}));
}
async function aiCall(p,system,user,maxTok){
  let r;
  if(p.id==='claude'){
    r=await NJ('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':p.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true','content-type':'application/json'},body:JSON.stringify({model:p.model,max_tokens:maxTok||500,system,messages:[{role:'user',content:user}]})});
    if(!r.ok) throw new Error(r.data?.error?.message||('hata '+r.status));
    return (r.data.content||[]).map(x=>x.text||'').join('');
  }
  r=await NJ(AI_DEFS[p.id].base+'/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+p.key,'content-type':'application/json'},body:JSON.stringify({model:p.model,messages:[{role:'system',content:system},{role:'user',content:user}]})});
  if(!r.ok) throw new Error(r.data?.error?.message||('hata '+r.status));
  return r.data.choices?.[0]?.message?.content||'';
}
async function aiCollect(src,q){
  const list=aiList(); if(!list.length) throw new Error('Yapay zekâ için API anahtarı yok. "⚙ Ayarlar" sekmesinden ekle.');
  const p=list[0];
  if(src==='soz'){
    const txt=await aiCall(p,'Türkçe, özgün, kısa ve etkileyici veciz sözler yazarsın. Gerçek kişilere atıf yapma, yazar adı verme.',`"${q}" konusunda 10 farklı veciz söz yaz. Her söz tek satır olsun, numara ve tırnak kullanma.`,900);
    return txt.split('\n').map(s=>s.replace(/^[\s\-\*\d\.\)]+/,'').replace(/^["“]|["”]$/g,'').trim()).filter(s=>s.length>8).slice(0,12).map((s,i)=>({id:'s'+i,tur:'soz',metin:s,ad:q,kaynak:p.ad}));
  }
  const txt=await aiCall(p,'Emoji kombinasyonları üretirsin.',`"${q}" temalı, 10 farklı kısa emoji kombinasyonu üret (her biri 2-5 emoji). Her satıra bir kombinasyon, başka hiçbir yazı yazma.`,300);
  return txt.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,12).map((s,i)=>({id:'a'+i,tur:'emoji',metin:s,ad:q,kaynak:p.ad}));
}

// ───────── öneri (sohbet için) ─────────
let _ack=false;
function ackOk(){
  try{ if(localStorage.getItem('sh_ai_ack')==='1') return true; }catch(e){}
  const ok=confirm('Dikkat: Öneri istediğinde bu sohbetin SON 8 mesajı (çözülmüş düz yazı) seçtiğin yapay zekâ servislerine gönderilir. Bu mesajlar artık uçtan uca şifreli kalmaz ve ilgili şirketlerin politikalarına tabi olur. Kullanıcıların gizlilik metninde bunu belirtmeni öneririm.\n\nDevam edilsin mi?');
  if(ok){ try{localStorage.setItem('sh_ai_ack','1');}catch(e){} }
  return ok;
}
function renderSug(){
  const body=$('my-body');
  const list=aiList();
  if(!S.currentRoom){ body.innerHTML='<div class="my-muted">Önce soldan bir sohbet aç, sonra buraya gel.</div>'; return; }
  if(!list.length){ body.innerHTML='<div class="my-muted">Henüz yapay zekâ bağlı değil. "⚙ Ayarlar" sekmesinden en az bir servisin API anahtarını ekle (en fazla 3 tanesi kullanılır).</div>'; return; }
  body.innerHTML=`<div class="my-row"><span class="my-muted">Kullanılacak: ${list.slice(0,3).map(x=>esc(x.ad)).join(', ')}</span>
    <select id="my-ton">${['samimi','nazik','esprili','flörtöz'].map(t=>`<option ${cfg().ton===t?'selected':''}>${t}</option>`).join('')}</select>
    <button class="btn btn-primary btn-sm" onclick="MY.runSug()">✨ Öneri getir</button></div>
    <div id="my-sugout" class="my-muted">Karşı tarafın son mesajlarına göre cevap ve uygun medya önerir. Butona basınca çalışır (otomatik değil).</div>`;
}
function convo(){
  const ms=(S.messages||[]).filter(m=>m.mesaj_tipi==='metin'&&m._text&&!String(m._text).startsWith('🔒')).slice(-8);
  return ms.map(m=>(m.gonderen_id===S.user.id?'Ben: ':'Karşı taraf: ')+String(m._text).slice(0,400)).join('\n');
}
MY.runSug=async function(){
  const c=cfg(); const ton=$('my-ton').value; c.ton=ton; saveCfg(c);
  const conv=convo(); if(!conv){ toast('Bu sohbette öneri için okunabilir mesaj yok','error'); return; }
  if(!ackOk()) return;
  const out=$('my-sugout'); out.innerHTML='Yapay zekâlar düşünüyor…';
  const sys=`Bir sohbet sitesinde yazışıyorsun. Aşağıdaki konuşmanın devamı için "Ben" adına ${ton} tonda, doğal ve kısa (en fazla 2 cümle) bir cevap öner. Karşı tarafın yazdığı dilde yaz. Yalnızca şu JSON'u ver: {"cevap":"...","medya_anahtar":"GIF/resim aramak için 1-3 kelime"}`;
  const ps=aiList().slice(0,3);
  const res=await Promise.all(ps.map(async p=>{
    try{
      const t=await aiCall(p,sys,conv,400);
      const m=t.match(/\{[\s\S]*\}/); let j=null; try{ j=JSON.parse(m?m[0]:'');}catch(e){}
      return {p,cevap:(j&&j.cevap)||t.trim(),key:(j&&j.medya_anahtar)||''};
    }catch(e){ return {p,err:e.message||String(e)}; }
  }));
  const keys=[...new Set(res.map(r=>r.key).filter(Boolean))];
  let items=[];
  if(keys.length){
    const {data}=await sb.from('medya_ogeler').select('*').limit(1500);
    const fname={}; ST.folders.forEach(f=>fname[f.id]=f.ad);
    await loadSent();
    for(const k of keys){
      const ws=TURKEY(k).split(/\s+/).filter(Boolean);
      (data||[]).forEach(it=>{
        if(ST.sent.has(it.id)||items.find(x=>x.id===it.id)) return;
        const hay=TURKEY([fname[it.klasor_id],it.etiket,it.aciklama,it.metin].join(' '));
        if(ws.some(w=>hay.includes(w))) items.push(it);
      });
    }
    items=items.slice(0,8);
  }
  ST.sugItems=items; await signUrls(items);
  out.innerHTML=res.map((r,i)=>`<div class="my-sug"><b>${esc(r.p.ad)}</b>${r.err?`<div style="color:#f85149;font-size:.8rem">${esc(r.err)}</div>`:`<div style="margin:.4rem 0;white-space:pre-wrap">${esc(r.cevap)}</div><div class="my-muted">medya: ${esc(r.key||'—')}</div><button class="btn btn-primary btn-sm" onclick="MY.useSug(${i})">Mesaj kutusuna koy</button>`}</div>`).join('')
   +(items.length?`<div class="my-sug"><b>Kütüphaneden medya önerileri</b> <span class="my-muted">(bu sohbete daha önce gönderilmemiş)</span><div class="my-grid" style="margin-top:.5rem">${items.map(it=>{
      const u=ST.urls[it.dosya_yolu]||'';
      const prev=it.tur==='video'?`<video src="${esc(u)}" muted playsinline preload="metadata"></video>`:(it.tur==='gif'||it.tur==='resim')?`<img src="${esc(u)}" alt="">`:`<div style="padding:.4rem;font-size:.8rem">${esc(it.metin||'')}</div>`;
      return `<div class="my-card"><div class="my-prev">${prev}</div><div class="my-act"><button class="btn btn-primary btn-sm" onclick="MY.send('${it.id}')">💬 Gönder</button></div></div>`;}).join('')}</div></div>`:'');
  window._mySugRes=res;
};
MY.useSug=function(i){
  const r=window._mySugRes&&window._mySugRes[i]; if(!r) return;
  const inp=document.getElementById('chat-input'); if(inp){ inp.value=r.cevap; try{autoResize(inp);}catch(e){} inp.focus(); }
  MY.close();
};

// ───────── ayarlar ─────────
function renderAi(){
  const c=cfg(); const ai=c.ai||{};
  const body=$('my-body');
  body.innerHTML=`<div class="my-muted" style="margin-bottom:.6rem">Anahtarlar yalnızca bu tarayıcıda (yönetici hesabında) saklanır; sunucuya gönderilmez. Ücretsiz anahtarlar: Giphy → developers.giphy.com, Pexels → pexels.com/api, Pixabay → pixabay.com/api/docs, SerpApi (Google/Yandex Görseller, Pinterest) → serpapi.com (ücretsiz plan var)</div>
  <h4>İçerik servisleri</h4>
  <div class="my-row"><label style="width:110px">Giphy</label><input class="grow" type="password" id="k-giphy" value="${esc(c.giphy||'')}" placeholder="Giphy API anahtarı"></div>
  <div class="my-row"><label style="width:110px">Pexels</label><input class="grow" type="password" id="k-pexels" value="${esc(c.pexels||'')}" placeholder="Pexels API anahtarı"></div>
  <div class="my-row"><label style="width:110px">SerpApi</label><input class="grow" type="password" id="k-serpapi" value="${esc(c.serpapi||'')}" placeholder="SerpApi anahtarı (Google/Yandex Görseller + Pinterest için)"></div>
  <div class="my-row"><label style="width:110px">Pixabay</label><input class="grow" type="password" id="k-pixabay" value="${esc(c.pixabay||'')}" placeholder="Pixabay API anahtarı"></div>
  <h4 style="margin-top:1rem">Yapay zekâ (cevap önerisi, söz ve emoji yazdırma) — resmi API anahtarları</h4>
  ${Object.keys(AI_DEFS).map(k=>`<div class="my-row"><label style="width:110px"><input type="checkbox" id="on-${k}" ${(ai[k]?.on!==false)?'checked':''}> ${esc(AI_DEFS[k].ad)}</label>
    <input class="grow" type="password" id="ak-${k}" value="${esc(ai[k]?.key||'')}" placeholder="API anahtarı">
    <input id="am-${k}" value="${esc(ai[k]?.model||AI_DEFS[k].model)}" style="width:170px" title="Model adı"></div>`).join('')}
  <div class="my-muted">En fazla 3 servis kullanılır (sıra: Claude, ChatGPT, DeepSeek, Grok; anahtarı olanlar). Model adlarını servisin güncel listesine göre değiştirebilirsin.</div>
  <div class="my-row" style="margin-top:.8rem"><button class="btn btn-primary btn-sm" onclick="MY.saveAi()">💾 Kaydet</button></div>`;
}
MY.saveAi=function(){
  const c=cfg();
  c.giphy=$('k-giphy').value.trim(); c.pexels=$('k-pexels').value.trim(); c.pixabay=$('k-pixabay').value.trim(); c.serpapi=$('k-serpapi').value.trim();
  c.ai={};
  Object.keys(AI_DEFS).forEach(k=>{ c.ai[k]={key:$('ak-'+k).value.trim(),model:$('am-'+k).value.trim()||AI_DEFS[k].model,on:$('on-'+k).checked}; });
  saveCfg(c); toast('Kaydedildi ✓','success');
};
})();
