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

// API anahtarları SUNUCUDA saklanır (medya_anahtarlar, yalnızca medya-proxy erişir). Tarayıcıda yalnızca "{{KEY:ad}}" yer tutucusu ve son 4 hane bulunur.
let SK={};
const KEYNAMES=['giphy','pexels','pixabay','serpapi'];
function rawCfg(){ try{return JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){return {};} }
function cfg(){
  const c=rawCfg();
  KEYNAMES.forEach(k=>{ c[k]=SK[k]?'{{KEY:'+k+'}}':''; });
  c.ai=c.ai||{};
  Object.keys(AI_DEFS).forEach(id=>{ c.ai[id]=Object.assign({},c.ai[id],{key:SK[id]?'{{KEY:'+id+'}}':''}); });
  return c;
}
function saveCfg(c){
  // gizli değerleri yerelde tutma
  const o=JSON.parse(JSON.stringify(c)); KEYNAMES.forEach(k=>delete o[k]); if(o.ai) Object.keys(o.ai).forEach(id=>{ if(o.ai[id]) delete o.ai[id].key; });
  try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}
}

const TONES=['samimi','nazik','esprili','flörtöz','romantik','seksi','şehvetli','erotik','azgın'];
const ADULT_TONES=['seksi','şehvetli','erotik','azgın'];
const AI_DEFS={
  claude:{ad:'Claude',model:'claude-sonnet-5-5'},
  openai:{ad:'ChatGPT (OpenAI)',model:'gpt-4o-mini',base:'https://api.openai.com/v1'},
  deepseek:{ad:'DeepSeek',model:'deepseek-chat',base:'https://api.deepseek.com'},
  grok:{ad:'Grok (xAI)',model:'grok-3',base:'https://api.x.ai/v1'}
};

const ST={siteTypes:new Set(['gif','resim','video']),siteAddr:'',tab:'lib',folders:[],folderId:null,items:[],urls:{},sent:new Set(),q:'',showSent:false,
  src:'bing_img',srcs:new Set(['bing_img','bing_gif']),pg:{},pinTokMap:{},notes:[],res:[],sel:new Set(),page:0,busy:false,lastQuery:''};

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
.my-dur{position:absolute;top:.35rem;right:.35rem;z-index:3;background:rgba(0,0,0,.75);color:#fff;font-size:.7rem;padding:.1rem .4rem;border-radius:6px}
.my-zoom{position:absolute;top:.35rem;right:.35rem;z-index:4;background:rgba(0,0,0,.65);color:#fff;border:0;border-radius:6px;width:28px;height:28px;font-size:1rem;cursor:zoom-in}
.my-card[data-vid] .my-zoom{top:2rem}
.my-simblock{grid-column:1/-1;border:1px dashed #58a6ff;border-radius:10px;padding:.5rem;background:rgba(88,166,255,.06)}
.my-lb{position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;flex-direction:column;gap:.6rem;padding:2.5rem .5rem .5rem}
.my-lb-box{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
.my-lb-box img,.my-lb-box video{max-width:96vw;max-height:78vh;object-fit:contain;border-radius:8px}
.my-lb-txt{font-size:2.2rem;color:#fff;text-align:center;padding:1rem;max-width:90vw}
.my-lb-bar{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;justify-content:center;padding:.3rem}
.my-lb-x{position:absolute;top:.5rem;right:.7rem;background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;font-size:1.3rem;width:40px;height:40px;cursor:pointer}
.my-lb-n{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:50%;font-size:2rem;width:44px;height:44px;cursor:pointer;z-index:2}
.my-lb-n.l{left:.5rem}.my-lb-n.r{right:.5rem}
.my-sitelist{display:flex;flex-direction:column;gap:.35rem;margin-top:.5rem}
.my-siterow{display:flex;align-items:center;gap:.6rem;border:1px solid var(--brd,#30363d);border-radius:10px;padding:.5rem .7rem;cursor:pointer}
.my-siterow.on{border-color:#58a6ff;background:rgba(88,166,255,.12)}
.my-siterow .t{font-size:.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.my-siterow .u{font-size:.75rem;color:#8b949e}
.my-siterow>div{flex:1}.my-siterow input{width:18px;height:18px}
.my-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;pointer-events:none;border:2px solid rgba(255,255,255,.8)}
.my-badge{margin:0 .4rem .4rem;font-size:.7rem;color:#3fb950}
.my-pick{position:fixed;z-index:100000;background:var(--bg2,#161b22);border:1px solid var(--brd,#30363d);border-radius:12px;padding:.6rem;box-shadow:0 10px 30px rgba(0,0,0,.5);max-height:70vh;overflow:auto}
.my-pick-h{font-weight:600;font-size:.85rem;margin-bottom:.5rem}
.my-pick-l{display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem}
.my-pick-n{display:flex;gap:.3rem}.my-pick-n input{flex:1;min-width:0;font-size:.8rem}
.my-act{display:flex;gap:.25rem;padding:0 .4rem .4rem;flex-wrap:wrap}
.my-act button{font-size:.72rem;padding:.2rem .4rem}
.my-badge{position:absolute;top:4px;left:4px;background:rgba(63,185,80,.9);color:#fff;font-size:.65rem;padding:1px 6px;border-radius:8px}
.my-sug{background:var(--bg2,#161b22);border:1px solid var(--brd,#30363d);border-radius:10px;padding:.7rem;margin-bottom:.6rem}
.my-muted{color:var(--txt2,#8b949e);font-size:.8rem}

.my-chk{position:absolute;top:.35rem;left:.35rem;z-index:3;background:rgba(0,0,0,.6);border-radius:6px;padding:.1rem .25rem;display:flex}.my-chk input{width:18px;height:18px;cursor:pointer}
#ai-inline{display:none;padding:.45rem .6rem;border-top:1px solid rgba(255,255,255,.1);background:rgba(10,10,25,.92);max-height:38vh;overflow:auto}
.ai-in-h{display:flex;gap:.4rem;align-items:center;margin-bottom:.35rem}.ai-in-h b{flex:1;font-size:.82rem}.ai-in-h select{background:var(--bg3,#161b22);color:inherit;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:.15rem .3rem;font-size:.78rem}
.ai-in-row{display:flex;gap:.4rem;align-items:center;margin:.25rem 0;font-size:.85rem}.ai-in-t{flex:1;white-space:pre-wrap}.ai-in-row.err{color:#f85149;font-size:.76rem}
.ai-in-media{display:flex;gap:.35rem;overflow:auto;margin-top:.3rem}.ai-in-m{border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:0;background:#000;width:64px;height:64px;flex:none;overflow:hidden;cursor:pointer}.ai-in-m img,.ai-in-m video{width:100%;height:100%;object-fit:cover}
`;
  document.head.appendChild(st);
}
function ui(){
  css();
  if($('my-modal')) return;
  const d=document.createElement('div'); d.id='my-modal'; d.setAttribute('translate','no'); d.className='notranslate';
  d.innerHTML=`<div id="my-box">
  <div id="my-head"><b>🗂 Multimedya <span class="my-muted">(yalnızca yönetici)</span></b> <span title="Tüm aramalar ve indirmeler sunucu üzerinden yapılır; erişim engellerini aşar. Her zaman açık." style="font-size:.75rem;background:rgba(63,185,80,.18);color:#3fb950;border:1px solid #3fb950;border-radius:999px;padding:.1rem .5rem;margin-left:.4rem">🛡 VPN aktif</span><button class="btn btn-secondary btn-sm" onclick="MY.close()">✕ Kapat</button></div>
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
  await Promise.all([loadFolders(),loadKeys()]);
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
const REF={};
async function PX(body){
  if(rawCfg().vpn===false && !String(body.mode||'').startsWith('keys_') && !/KEY(:|%3A)/i.test(JSON.stringify([body.url,body.headers]))) throw new Error('Sunucu üzerinden erişim (VPN) Ayarlar\'dan kapatılmış');
  if(body.url&&REF[body.url]) body.referer=REF[body.url];
  const ses=(await sb.auth.getSession()).data.session; if(!ses) throw new Error('oturum yok');
  const r=await fetch(SUPABASE_URL+'/functions/v1/medya-proxy',{method:'POST',headers:{'Authorization':'Bearer '+ses.access_token,'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r;
}
async function PJ(url,opts){
  const r=await PX({mode:'json',url,method:opts&&opts.method,headers:opts&&opts.headers,body:opts&&opts.body});
  const j=await r.json().catch(()=>null); if(!j) throw new Error('indirme aracı yanıt vermedi ('+r.status+')'); if(j.error&&j.ok===false&&j.status==null) throw new Error(j.error); return j;
}
async function PH(url){
  const r=await PX({mode:'html',url}); const j=await r.json().catch(()=>null);
  if(!j) throw new Error('sayfa okunamadı ('+r.status+')'); if(j.ok===false&&j.error) throw new Error(j.error); if(!j.ok) throw new Error('Site yanıtı: '+j.status);
  return j;
}
async function PB(url){
  const r=await PX({mode:'buf',url});
  const ct=r.headers.get('content-type')||'';
  if(ct.includes('application/json')){ const j=await r.json(); throw new Error(j.error||('indirilemedi '+(j.status||''))); }
  const buf=await r.arrayBuffer(); const type=r.headers.get('x-up-type')||sniff(buf);
  return {blob:new Blob([buf],{type}),type};
}
async function loadKeys(){
  try{ const r=await PX({mode:'keys_status'}); const j=await r.json(); if(j&&j.ok) SK=j.keys||{}; }catch(e){ console.warn('anahtarlar alınamadı',e); }
  // eski sürümde tarayıcıda saklanan anahtarları sunucuya taşı ve yerelden sil
  try{
    const c=rawCfg(); const mv={}; KEYNAMES.forEach(k=>{ if(c[k]&&!SK[k]) mv[k]=c[k]; });
    Object.keys(AI_DEFS).forEach(id=>{ const v=c.ai&&c.ai[id]&&c.ai[id].key; if(v&&!SK[id]) mv[id]=v; });
    if(Object.keys(mv).length){ const r=await PX({mode:'keys_set',keys:mv}); const j=await r.json(); if(j&&j.ok){ SK=j.keys||SK; toast('Anahtarların sunucuya taşındı ✓','success'); } }
    if(Object.keys(SK).length){ saveCfg(Object.assign({},c)); }
  }catch(e){ console.warn(e); }
}
// VPN modu: tüm arama/indirme istekleri sunucu (edge function) üzerinden gider — her zaman açık
const VPN_ON=true;
async function NJ(url,opts){
  const direct=!VPN_ON && DIRECT_OK.test(hostOf(url)) && !/KEY(:|%3A)/i.test(JSON.stringify([url,opts&&opts.headers]));
  if(direct){ try{ const w=await netWin(); const r=await w.netFetch(url,opts,'json'); if(!r.error) return r; }catch(e){} }
  return PJ(url,opts);
}
async function NB(url,opts){
  if(!VPN_ON&&DIRECT_OK.test(hostOf(url))){
    try{ const w=await netWin(); const r=await w.netFetch(url,opts,'buf'); if(!r.error&&r.ok) return {blob:new Blob([r.buf],{type:(r.type||'').split(';')[0]}),type:(r.type||'').split(';')[0]}; }catch(e){}
  }
  return PB(url);
}
const _thumbs={};
async function thumb(url){ if(_thumbs[url]) return _thumbs[url]; try{ const {blob}=await NB(url); return _thumbs[url]=URL.createObjectURL(blob); }catch(e){ return ''; } }

// ───────── video süre grupları ─────────
const VF=[['all','Tüm videolar'],['short','⚡ Kısa (<30 sn)'],['mid','🎬 Orta (30 sn–2 dk)'],['long','🎞 Uzun (>2 dk)']];
function vGroup(d){ return d<30?'short':(d<=120?'mid':'long'); }
function fmtDur(d){ d=Math.round(d); const m=Math.floor(d/60),s=d%60; return m+':'+String(s).padStart(2,'0'); }
function vfBar(){ ST.vf=ST.vf||'all'; return '<div class="my-row" id="my-vfbar" style="gap:.3rem"><span class="my-muted">Video süresi:</span>'+VF.map(([k,l])=>`<label style="cursor:pointer;border:1px solid ${ST.vf===k?'#58a6ff':'#30363d'};background:${ST.vf===k?'rgba(88,166,255,.15)':'transparent'};border-radius:999px;padding:.2rem .6rem;font-size:.78rem;white-space:nowrap" onclick="MY.vfSet('${k}')">${l}<span class="my-vfn" data-k="${k}"></span></label>`).join('')+'</div>'; }
function applyVF(){
  const f=ST.vf||'all'; const cnt={all:0,short:0,mid:0,long:0};
  document.querySelectorAll('.my-card[data-vid]').forEach(c=>{
    const g=c.dataset.dur?vGroup(parseFloat(c.dataset.dur)):'';
    cnt.all++; if(g) cnt[g]++;
    c.style.display=(f==='all'||g===f)?'':'none';
  });
  document.querySelectorAll('.my-vfn').forEach(e=>{ const k=e.dataset.k; e.textContent=cnt.all?' ('+cnt[k]+')':''; });
}
MY.vfSet=function(k){ ST.vf=k; const bar=document.getElementById('my-vfbar'); if(bar) bar.outerHTML=vfBar(); applyVF(); };
function trackDur(v){
  const card=v.closest('.my-card'); if(!card) return; card.dataset.vid='1';
  const set=()=>{ if(!isFinite(v.duration)||!v.duration) return; card.dataset.dur=v.duration; if(!card.querySelector('.my-dur')) card.insertAdjacentHTML('afterbegin','<span class="my-dur">'+fmtDur(v.duration)+'</span>'); applyVF(); };
  if(v.readyState>=1) set(); v.addEventListener('loadedmetadata',set);
}
function hydrateVideos(root){ root.querySelectorAll('video[data-vurl]').forEach(v=>{
  const u=v.dataset.vurl; delete v.dataset.vurl;
  let tried=false;
  const viaProxy=async()=>{ if(tried) return; tried=true;
    try{ const {blob}=await NB(u); const t=(blob.type&&blob.type.startsWith('video/'))?blob.type:'video/mp4'; v.src=URL.createObjectURL(new Blob([blob],{type:t})); v.load(); }
    catch(e){ if(!v.nextElementSibling||!v.nextElementSibling.classList.contains('my-vfail')) v.insertAdjacentHTML('afterend','<div class="my-muted my-vfail" style="font-size:.7rem;padding:.2rem">Önizleme yüklenemedi (yine de kaydedilebilir)</div>'); } };
  trackDur(v);
  v.addEventListener('error',viaProxy);
  v.addEventListener('loadeddata',()=>{ try{ if(v.currentTime===0) v.currentTime=0.1; }catch(e){} },{once:true});
  v.src=u;
  // Doğrudan yüklenemediyse (hotlink engeli vb. hata vermeden takılırsa) 3 sn sonra sunucu üzerinden getir
  setTimeout(()=>{ if(!tried&&(v.readyState<2||!v.videoWidth)) viaProxy(); },3000);
}); }
function hydrateThumbs(root){ hydrateVideos(root); root.querySelectorAll('img[data-turl]').forEach(async im=>{ let u=await thumb(im.dataset.turl); if(!u&&im.dataset.tfb) u=await thumb(im.dataset.tfb); if(u) im.src=u; }); }

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
  if(!ST.lsel) ST.lsel=new Set();
  const vis=new Set(items.map(i=>i.id)); [...ST.lsel].forEach(id=>{ if(!vis.has(id)) ST.lsel.delete(id); });
  const nsel=ST.lsel.size;
  const bar=`<div class="my-row" style="position:sticky;top:0;z-index:5;background:var(--bg2,#0d1117);padding:.3rem 0">
      <button class="btn btn-secondary btn-sm" onclick="MY.lSelAll()">${nsel&&nsel===items.length?'Seçimi bırak':'☑ Tümünü seç ('+items.length+')'}</button>
      <button class="btn btn-danger btn-sm" ${nsel?'':'disabled'} onclick="MY.lDelSel()">🗑 Seçilenleri sil (${nsel})</button>
      <select class="btn btn-secondary btn-sm" ${nsel?'':'disabled'} onchange="MY.lMoveSel(this.value)"><option value="">Seçilenleri taşı…</option>${fopts}</select>
    </div>`;
  g.innerHTML=bar+(items.some(i=>i.tur==='video')?vfBar():'')+'<div class="my-grid">'+items.map(it=>{
    const u=ST.urls[it.dosya_yolu]||'';
    let prev;
    if(it.tur==='video') prev=`<div class="my-prev"><video data-lib="1" src="${esc(u)}" controls loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;background:#000"></video></div>`;
    else if(it.tur==='gif'||it.tur==='resim') prev=`<div class="my-prev"><img loading="lazy" src="${esc(u)}" alt=""></div>`;
    else prev=`<div class="my-prev txt">${esc(it.metin||'')}</div>`;
    const sent=ST.sent.has(it.id)?'<span class="my-badge">✓ gönderildi</span>':'';
    return `<div class="my-card ${ST.lsel.has(it.id)?'sel':''}"><label class="my-chk" onclick="event.stopPropagation()"><input type="checkbox" ${ST.lsel.has(it.id)?'checked':''} onchange="MY.lToggle('${it.id}')"></label>${sent}${prev}
      <div class="my-meta" title="${esc(it.etiket)}">${esc(it.tur)} · ${esc(it.etiket||'—')}</div>
      <div class="my-act">
        <button class="btn btn-primary btn-sm" onclick="MY.send('${it.id}')">💬 Gönder</button>
        <button class="btn btn-secondary btn-sm" onclick="MY.post('${it.id}')" title="Zaman tünelinde herkese açık paylaş">📰</button>
        <select class="btn btn-secondary btn-sm" style="max-width:70px" onchange="MY.move('${it.id}',this.value)"><option value="">Taşı…</option>${fopts}</select>
        <button class="btn btn-danger btn-sm" onclick="MY.del('${it.id}')">🗑</button>
      </div></div>`;
  }).join('')+'</div>';
  g.querySelectorAll('video[data-lib]').forEach(trackDur); applyVF();
}
MY.lToggle=function(id){ if(!ST.lsel) ST.lsel=new Set(); if(ST.lsel.has(id)) ST.lsel.delete(id); else ST.lsel.add(id); drawGrid(); };
MY.lSelAll=function(){ if(!ST.lsel) ST.lsel=new Set(); let items=ST.items; if(S.currentRoom&&!ST.showSent) items=items.filter(i=>!ST.sent.has(i.id)); if(ST.lsel.size&&ST.lsel.size===items.length) ST.lsel=new Set(); else ST.lsel=new Set(items.map(i=>i.id)); drawGrid(); };
MY.lDelSel=async function(){
  const ids=[...(ST.lsel||[])]; if(!ids.length) return;
  if(!confirm(ids.length+' öğe KALICI olarak silinsin mi? Geri alınamaz.')) return;
  const its=ST.items.filter(i=>ids.includes(i.id));
  const paths=its.map(i=>i.dosya_yolu).filter(Boolean);
  try{
    for(let i=0;i<paths.length;i+=100){ await sb.storage.from(BUCKET).remove(paths.slice(i,i+100)); }
    for(let i=0;i<ids.length;i+=100){ const {error}=await sb.from('medya_ogeler').delete().in('id',ids.slice(i,i+100)); if(error) throw error; }
    ST.items=ST.items.filter(i=>!ids.includes(i.id)); ST.lsel=new Set();
    toast(ids.length+' öğe silindi','success'); drawGrid();
  }catch(e){ toast('Silinemedi: '+(e.message||e),'error'); }
};
MY.lMoveSel=async function(fid){
  const ids=[...(ST.lsel||[])]; if(!ids.length||!fid) return;
  try{
    for(let i=0;i<ids.length;i+=100){ const {error}=await sb.from('medya_ogeler').update({klasor_id:fid}).in('id',ids.slice(i,i+100)); if(error) throw error; }
    ST.lsel=new Set(); toast(ids.length+' öğe taşındı ✓','success'); renderLib();
  }catch(e){ toast('Taşınamadı: '+(e.message||e),'error'); }
};
MY.pickFolder=async function(id){ ST.lsel=new Set(); ST.folderId=id; ST.q=''; await renderLib(); };
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
const EXT={'image/svg+xml':'svg','image/avif':'avif','image/gif':'gif','image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
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
  archive_vid:{ad:'Video — Internet Archive (uzun filmler/videolar, anahtarsız)',tur:'video',free:true},
  commons_vid:{ad:'Video — Wikimedia Commons (anahtarsız, açık lisans)',tur:'video',free:true},
  bing_vektor:{ad:'Vektörel — Bing (anahtarsız)',tur:'vektor',free:true},
  bing_ikon:{ad:'İkon — Bing (anahtarsız)',tur:'ikon',free:true},
  bing_cizim:{ad:'Çizim/illüstrasyon — Bing (anahtarsız)',tur:'cizim',free:true},
  bing_sticker:{ad:'Sticker (şeffaf) — Bing (anahtarsız)',tur:'sticker',free:true},
  yandex_free_img:{ad:'Resim — Yandex (anahtarsız, deneysel)',tur:'resim',free:true},
  yandex_free_gif:{ad:'GIF — Yandex (anahtarsız, deneysel)',tur:'gif',free:true},
  google_free_img:{ad:'Resim — Google (anahtarsız, deneysel)',tur:'resim',free:true},
  google_free_gif:{ad:'GIF — Google (anahtarsız, deneysel)',tur:'gif',free:true},
  bing_img:{ad:'Resim — Bing (anahtarsız)',tur:'resim',free:true},
  bing_gif:{ad:'GIF — Bing (anahtarsız)',tur:'gif',free:true},
  bing_pin:{ad:'Pinterest — Bing üzerinden (anahtarsız)',tur:'resim',free:true},
  bing_pin_gif:{ad:'GIF — Pinterest, Bing üzerinden (anahtarsız)',tur:'gif',free:true},
  bing_giphy:{ad:'GIF — Giphy/Tenor (anahtarsız)',tur:'gif',free:true},
  giphy:{ad:'GIF — Giphy',tur:'gif',key:'giphy',link:'developers.giphy.com'},
  pexels_img:{ad:'Resim — Pexels',tur:'resim',key:'pexels',link:'pexels.com/api'},
  pexels_vid:{ad:'Video — Pexels',tur:'video',key:'pexels',link:'pexels.com/api'},
  pixabay_img:{ad:'Resim — Pixabay',tur:'resim',key:'pixabay',link:'pixabay.com/api/docs'},
  pixabay_vid:{ad:'Video — Pixabay',tur:'video',key:'pixabay',link:'pixabay.com/api/docs'},
  site:{ad:'🌐 Site adresinden topla (anahtar gerekmez)',tur:'karma'},
  google_img:{ad:'Resim — Google (SerpApi)',tur:'resim',key:'serpapi',link:'serpapi.com'},
  google_gif:{ad:'GIF — Google (SerpApi)',tur:'gif',key:'serpapi',link:'serpapi.com'},
  yandex_img:{ad:'Resim — Yandex (SerpApi)',tur:'resim',key:'serpapi',link:'serpapi.com'},
  yandex_gif:{ad:'GIF — Yandex (SerpApi)',tur:'gif',key:'serpapi',link:'serpapi.com'},
  pinterest:{ad:'Resim — Pinterest',tur:'resim',key:'serpapi',link:'serpapi.com'},
  pinterest_gif:{ad:'GIF — Pinterest',tur:'gif',key:'serpapi',link:'serpapi.com'},
  emoji:{ad:'Emoji (anahtar kelimeye göre)',tur:'emoji'},
  soz:{ad:'Veciz söz (yapay zekâ yazar)',tur:'soz',ai:true},
  emoji_ai:{ad:'Emoji kombinasyonu (yapay zekâ)',tur:'emoji',ai:true}
};
const TYPE_DEFS=[['gif','🎞 GIF'],['resim','🖼 Resim'],['video','🎬 Video'],['emoji','😀 Emoji'],['soz','💬 Veciz söz'],['vektor','📐 Vektörel'],['ikon','🔷 İkon'],['cizim','✏️ Çizim'],['sticker','🏷 Sticker']];
function mediaSrcs(){ return Object.keys(SRC).filter(k=>!SRC[k].ai&&k!=='emoji'&&k!=='site'); }
function usableOf(t){ const c=cfg(); const ai=aiList().length>0; return Object.keys(SRC).filter(k=>k!=='site'&&SRC[k].tur===t&&(!SRC[k].key||c[SRC[k].key])&&(!SRC[k].ai||ai)); }
function typeOn(t){ const u=usableOf(t); return u.length>0&&u.every(k=>ST.srcs.has(k)); }
MY.typeToggle=function(t){
  const on=new Set(TYPE_DEFS.map(x=>x[0]).filter(typeOn));
  if(on.has(t)) on.delete(t); else on.add(t);
  const list=[]; on.forEach(x=>list.push(...usableOf(x)));
  if(!usableOf(t).length){ toast(t==='video'?'Video için anahtarsız kaynak yok: Pexels/Pixabay anahtarı ekle ya da "Site adresinden topla"yı kullan':(t==='soz'?'Veciz söz için bir yapay zekâ anahtarı gerekir (Ayarlar)':'Bu tür için kullanılabilir kaynak yok'),'error'); return; }
  ST.srcs=new Set(list.length?list:['bing_img']); srcRefresh();
};
function siteChip(t,l,on,fn){ return `<label style="cursor:pointer;border:1px solid ${on?'#58a6ff':'#30363d'};background:${on?'rgba(88,166,255,.15)':'transparent'};border-radius:999px;padding:.2rem .6rem;font-size:.78rem;white-space:nowrap"><input type="checkbox" style="display:none" ${on?'checked':''} onchange="${fn}">${l}</label>`; }
function srcChips(){
  const media=Object.keys(SRC).filter(k=>!SRC[k].ai&&k!=='emoji'&&k!=='site');
  const _c=cfg(); const usable0=media.filter(k=>!SRC[k].key||_c[SRC[k].key]); const all=usable0.length>0&&usable0.every(k=>ST.srcs.has(k));
  const chip=(k,t,on,fn)=>`<label style="cursor:pointer;border:1px solid ${on?'#58a6ff':'#30363d'};background:${on?'rgba(88,166,255,.15)':'transparent'};border-radius:999px;padding:.2rem .6rem;font-size:.78rem;white-space:nowrap"><input type="checkbox" style="display:none" ${on?'checked':''} onchange="${fn}">${t}</label>`;
  const typeRow='<div style="width:100%;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center"><span class="my-muted">Ne toplansın:</span>'+TYPE_DEFS.filter(([t])=>usableOf(t).length||t==='video').map(([t,l])=>chip('t_'+t,l,typeOn(t),`MY.typeToggle('${t}')`)).join('')+'</div>';
  return typeRow+chip('all','✅ Tümü (kullanılabilir tüm kaynaklar)',all,"MY.srcAll()")+Object.entries(SRC).filter(([k,v])=>k!=='site'&&!v.ai&&k!=='emoji'&&(!v.key||_c[v.key])).map(([k,v])=>chip(k,v.ad.replace(/ \((anahtarsız|deneysel|anahtarsız, deneysel)\)/,'').replace(', Bing üzerinden',''),ST.srcs.has(k),`MY.srcToggle('${k}')`)).join('');
}
function srcRefresh(){
  const w=$('my-srcs'); if(w) w.innerHTML=srcChips();
  
  ST.src=[...ST.srcs][0]||'bing_img';
}
MY.siteType=function(t){ if(ST.siteTypes.has(t)) ST.siteTypes.delete(t); else ST.siteTypes.add(t); if(!ST.siteTypes.size) ST.siteTypes.add(t); ST.siteAddr=$('my-site')?.value||ST.siteAddr; renderTopla(); };
const looksUrl=t=>/^https?:\/\//i.test(t)||(!/\s/.test(t)&&/\.[a-z]{2,}(\/|$|:)/i.test(t));
function _decBing(h){ try{ const u=new URL(h); if(/bing\.com$/.test(u.hostname)&&u.pathname.startsWith('/ck/a')){ let v=u.searchParams.get('u')||''; if(v.startsWith('a1')) v=v.slice(2); v=v.replace(/-/g,'+').replace(/_/g,'/'); while(v.length%4) v+='='; return decodeURIComponent(escape(atob(v))); } }catch(e){} return h; }
async function findSites(kw){
  const tw=[]; if(ST.siteTypes.has('gif')) tw.push('gif'); if(ST.siteTypes.has('resim')) tw.push('photos gallery'); if(ST.siteTypes.has('video')) tw.push('videos');
  const q=kw+' '+tw.join(' ');
  const out=[]; const seen=new Set(); const skip=/(^|\.)(google|bing|yandex|duckduckgo|youtube|facebook|instagram|twitter|x|wikipedia|pinterest|reddit|tiktok|microsoft|yahoo)\.[a-z.]+$/i;
  const add=(href,title)=>{ try{ const u=new URL(href); if(!/^https?:$/.test(u.protocol)) return; const h=u.hostname.replace(/^www\./,''); if(skip.test(h)||seen.has(h)) return; seen.add(h); out.push({url:u.origin+u.pathname,host:h,title:String(title||h).replace(/\s+/g,' ').slice(0,90)}); }catch(e){} };
  try{ const j=await PH('https://html.duckduckgo.com/html/?q='+encodeURIComponent(q)); const doc=new DOMParser().parseFromString(j.text||'','text/html');
    doc.querySelectorAll('a.result__a').forEach(an=>{ let h=an.getAttribute('href')||''; const m=h.match(/[?&]uddg=([^&]+)/); if(m) h=decodeURIComponent(m[1]); else if(h.startsWith('//')) h='https:'+h; add(h,an.textContent); }); }catch(e){}
  if(out.length<5){ try{ const j=await PH('https://www.bing.com/search?q='+encodeURIComponent(q)+'&count=30&setlang=en'); const doc=new DOMParser().parseFromString(j.text||'','text/html');
    doc.querySelectorAll('li.b_algo h2 a').forEach(an=>add(_decBing(an.getAttribute('href')||''),an.textContent)); }catch(e){} }
  return out.slice(0,30);
}
MY.siteScan=async function(){
  if(ST.busy) return;
  const a=($('my-site')?.value||'').trim(); ST.siteAddr=a;
  if(!a){ toast('Site adresi ya da anahtar kelime yaz','error'); return; }
  if(!looksUrl(a)){ return MY.siteFind(a); }
  return MY.siteScanMany([a.startsWith('http')?a:'https://'+a]);
};
MY.siteFind=async function(kw){
  ST.busy=true; ST.siteList=[]; ST.siteSelU=new Set();
  $('my-res').innerHTML='<div class="my-muted">“'+esc(kw)+'” için siteler aranıyor…</div>';
  try{ ST.siteList=await findSites(kw); }catch(e){}
  ST.busy=false; ST.siteKw=kw; drawSiteList();
};
function drawSiteList(){
  const l=ST.siteList||[]; const sel=ST.siteSelU||new Set();
  if(!l.length){ $('my-res').innerHTML='<div style="color:#f0883e;font-size:.85rem">Bu anahtar kelime için site bulunamadı. Farklı/İngilizce kelime dene ya da doğrudan site adresi yaz.</div>'; return; }
  $('my-res').innerHTML=`<div class="my-row"><b>🔗 “${esc(ST.siteKw)}” için bulunan siteler (${l.length})</b>
    <button class="btn btn-secondary btn-sm" onclick="MY.siteSelAll()">${sel.size===l.length?'Seçimi bırak':'☑ Tümünü seç'}</button>
    <button class="btn btn-primary btn-sm" ${sel.size?'':'disabled'} onclick="MY.siteScanSel()">🔎 Seçilenleri tara (${sel.size})</button></div>
    <div class="my-sitelist">${l.map((x,i)=>`<label class="my-siterow ${sel.has(x.url)?'on':''}"><input type="checkbox" ${sel.has(x.url)?'checked':''} onchange="MY.siteSelTog(${i})"><div style="min-width:0"><div class="t">${esc(x.title)}</div><div class="u">${esc(x.host)}</div></div><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" title="Siteyi aç">↗</a><button class="btn btn-secondary btn-sm" onclick="event.preventDefault();event.stopPropagation();MY.siteScanMany(['${esc(x.url)}'])">Tara</button></label>`).join('')}</div>`;
}
MY.siteSelTog=function(i){ const u=ST.siteList[i].url; if(ST.siteSelU.has(u)) ST.siteSelU.delete(u); else ST.siteSelU.add(u); drawSiteList(); };
MY.siteSelAll=function(){ const l=ST.siteList||[]; if(ST.siteSelU.size===l.length) ST.siteSelU=new Set(); else l.forEach(x=>ST.siteSelU.add(x.url)); drawSiteList(); };
MY.siteScanSel=function(){ MY.siteScanMany([...ST.siteSelU]); };
MY.siteScanMany=async function(urls){
  if(ST.busy||!urls.length) return;
  ST.res=[]; ST.sims={}; ST.sel=new Set(); ST.notes=[]; ST.more=false; ST.doneSrc=new Set(); ST.pg={};
  ST.lastQuery=(ST.siteKw&&urls.length>0&&!looksUrl(ST.siteAddr||'')?ST.siteKw:urls[0].replace(/^https?:\/\//i,'').split('/')[0]);
  ST.busy=true; let done=0; const total=urls.length;
  const upd=()=>{ $('my-res').innerHTML='<div class="my-muted">Siteler taranıyor… '+done+'/'+total+' ('+ST.res.length+' sonuç)</div>'; }; upd();
  const all=[]; const seen=new Set(); const fails=[]; let idx=0;
  const c={gif:0,resim:0,video:0};
  async function worker(){ while(idx<urls.length){ const u=urls[idx++]; try{ const r=await siteSearch(u); const host=u.replace(/^https?:\/\//i,'').split('/')[0].replace(/^www\./,'');
      r.forEach(x=>{ c[x.tur]++; if(!ST.siteTypes.has(x.tur)||seen.has(x.url)) return; seen.add(x.url); all.push({...x,ad:host+' · '+(x.ad||''),id:'site:'+host+':'+x.id,src:'site'}); });
    }catch(e){ fails.push(u.replace(/^https?:\/\//i,'').split('/')[0]); } done++; ST.res=all; upd(); } }
  await Promise.all([worker(),worker(),worker()]);
  ST.res=all;
  ST.notes=['Taranan: '+(total-fails.length)+'/'+total+' site — bulunan: '+c.gif+' GIF, '+c.resim+' resim, '+c.video+' video'+(fails.length?' · taranamayan: '+fails.slice(0,5).join(', '):'')];
  ST.busy=false;
  if(!all.length) $('my-res').innerHTML='<div style="color:#f0883e;font-size:.78rem;margin-bottom:.4rem">'+esc(ST.notes[0])+'</div><div class="my-muted">Seçili türde sonuç yok; başka tür seç ya da başka site dene.</div>'+(ST.siteList&&ST.siteList.length?'<div class="my-row"><button class="btn btn-secondary btn-sm" onclick="drawSiteListBack()">← Site listesine dön</button></div>':'');
  else { drawRes(false); if(ST.siteList&&ST.siteList.length) $('my-res').insertAdjacentHTML('afterbegin','<div class="my-row"><button class="btn btn-secondary btn-sm" onclick="drawSiteListBack()">← Site listesine dön</button></div>'); }
};
window.drawSiteListBack=function(){ drawSiteList(); };
MY.srcToggle=function(k){
  if(ST.srcs.has(k)) { ST.srcs.delete(k); if(!ST.srcs.size) ST.srcs.add(k); }
  else { if(k==='site') ST.srcs=new Set(['site']); else { ST.srcs.delete('site'); ST.srcs.add(k); } }
  srcRefresh();
};
MY.srcAll=function(){
  const media=Object.keys(SRC).filter(k=>!SRC[k].ai&&k!=='emoji'&&k!=='site');
  const c=cfg(); const usable=media.filter(k=>!SRC[k].key||c[SRC[k].key]);
  ST.srcs=new Set(usable.every(k=>ST.srcs.has(k))?['bing_img']:usable); srcRefresh();
};

// ───────── Tarz düğmeleri (hazır aramalar, İngilizce karşılığıyla) ─────────
const TARZ=[['💞 Romantik','romantic couple'],['😘 Flört','flirting couple'],['👫 Çift','couple together'],['💃 Dans','couple dancing'],['🌙 Gece','night city romantic'],['🕯 Sensual','sensual candlelight'],['🌹 Gül/Çiçek','rose flowers'],['🏖 Sahil','beach sunset couple'],['☕ Kahve','coffee date'],['🥂 Şarap','wine dinner couple'],['🛏 Sabah','cozy morning bed'],['💋 Öpücük','kiss couple']];
MY.tarz=function(i){
  const t=TARZ[i]; if(!t) return;
  const inp=$('my-tq'); if(inp) inp.value=t[1];
  const c=cfg(); const add=k=>{ const sc=SRC[k]; if(sc&&(!sc.key||c[sc.key])) ST.srcs.add(k); };
  ['resim','video'].forEach(x=>{ if(typeOn(x)||ST.srcs.has('bing_img')||[...ST.srcs].some(k=>SRC[k]&&SRC[k].tur===x)){ if(x==='resim'){ add('pexels_img'); add('pixabay_img'); } else { add('pexels_vid'); add('pixabay_vid'); } } });
  srcRefresh(); MY.collect(true);
};
function tarzRow(){ return '<div class="my-row" style="gap:.35rem"><span class="my-muted">Tarz:</span>'+TARZ.map((t,i)=>`<button class="btn btn-secondary btn-sm" style="border-radius:999px" onclick="MY.tarz(${i})">${esc(t[0])}</button>`).join('')+'</div>'; }
function renderTopla(){
  const body=$('my-body');
  const fopts=ST.folders.map(f=>`<option value="${f.id}" ${f.id===ST.folderId?'selected':''}>${esc(f.ad)}</option>`).join('');
  body.innerHTML=`<div class="my-row" style="border:1px solid #1f6feb;border-radius:10px;padding:.5rem;background:rgba(31,111,235,.08)">
      <b style="width:100%;font-size:.85rem">🌐 Site adresinden topla <span class="my-muted" style="font-weight:400">(anahtar gerekmez)</span></b>
      <input class="grow" id="my-site" placeholder="Site adresi VEYA anahtar kelime (örn. ornek.com ya da kedi gif)" value="${esc(ST.siteAddr||'')}" onkeydown="if(event.key==='Enter')MY.siteScan()">
      <span class="my-muted">Ne taransın:</span>
      ${[['gif','🎞 GIF'],['resim','🖼 Resim'],['video','🎬 Video']].map(([t,l])=>siteChip('s_'+t,l,ST.siteTypes.has(t),`MY.siteType('${t}')`)).join('')}
      <button class="btn btn-primary btn-sm" onclick="MY.siteScan()">🔎 Siteyi tara</button>
    </div>
    <div class="my-row">
      <div id="my-srcs" style="display:flex;flex-wrap:wrap;gap:.35rem;width:100%">${srcChips()}</div>
      <input class="grow" id="my-tq" placeholder="Anahtar kelime (örn. beyaz çiçek)" onkeydown="if(event.key==='Enter')MY.collect(true)">
      <button class="btn btn-primary btn-sm" onclick="MY.collect(true)">🔎 Ara</button>
    </div>
    ${tarzRow()}
    <div class="my-row"><span class="my-muted">Kaydedilecek klasör:</span><select id="my-tf">${fopts}</select>
      <button class="btn btn-secondary btn-sm" onclick="MY.newFolder()">➕ Yeni klasör</button>
      <button class="btn btn-primary btn-sm" onclick="MY.sendRes()">💬 Seçilenleri sohbete gönder</button>
      <button class="btn btn-success btn-sm" onclick="MY.saveSel()">💾 Yalnızca kaydet</button>
      <button class="btn btn-secondary btn-sm" onclick="MY.pickSel(this)" title="Seçilenleri istediğin klasöre gönder">📁 Seçilenleri klasöre…</button>
      <label class="my-muted" style="display:flex;gap:.3rem;align-items:center"><input type="checkbox" id="my-alsosave" checked> Gönderirken kütüphaneye de kaydet</label>
      <button class="btn btn-secondary btn-sm" onclick="MY.selAll()">Tümünü seç / bırak</button>
      <button class="btn btn-secondary btn-sm" onclick="MY.selType('gif')">Yalnız GIF'leri seç</button>
      <button class="btn btn-secondary btn-sm" onclick="MY.selType('resim')">Yalnız resimleri seç</button>
      <button class="btn btn-secondary btn-sm" onclick="MY.loadAll()" title="Tüm sayfaları getirir (en fazla 8 sayfa)">⏬ Hepsini getir</button>
      <button class="btn btn-success btn-sm" onclick="MY.saveAll()" title="Ekrandaki tüm sonuçları seçip kütüphaneye kaydeder">💾 Hepsini kaydet</button></div>
    <div class="my-row"><span class="my-muted">Kendi dosyaların:</span>
      <input type="file" id="my-file" multiple accept="image/*,video/*" onchange="MY.upload(this)">
      <input class="grow" id="my-url" placeholder="veya doğrudan dosya adresi (.gif/.jpg/.mp4)">
      <button class="btn btn-secondary btn-sm" onclick="MY.addUrl()">Ekle</button></div>
    <div id="my-res"><div class="my-muted">Bir kaynak seç, anahtar kelime yaz ve ara. Sonuçlardan beğendiklerini işaretleyip klasöre kaydet.</div></div>`;
  if(ST.res.length) drawRes(ST.more);
}
MY.setSrc=function(v){ ST.srcs=new Set([v]); srcRefresh(); };
async function jget(url,headers){
  const r=await NJ(url,{headers:headers||{}});
  if(!r.ok) throw new Error('Servis hatası '+r.status+(r.data&&(r.data.error||r.data.message)?': '+(r.data.error?.message||r.data.error||r.data.message):''));
  return r.data;
}
const BAD=['porn','xxx','nsfw'];
const MEDIA_RE=/\.(gif|jpe?g|png|webp|avif|mp4|webm)(\?|#|$)/i;
async function siteSearch(addr){
  let u=addr.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; u=u.replace(/^http:/i,'https:');
  try{ new URL(u); }catch(e){ throw new Error('Geçerli bir site adresi yaz (örn. https://ornek.com/sayfa)'); }
  const j=await PH(u); const html=j.text||''; const base=j.url||u;
  const doc=new DOMParser().parseFromString(html,'text/html');
  const bt=doc.querySelector('base[href]'); let bu=base; try{ if(bt) bu=new URL(bt.getAttribute('href'),base).toString(); }catch(e){}
  const seen=new Map(); const add=(raw,hint)=>{
    if(!raw) return; raw=String(raw).trim().replace(/&amp;/g,'&').replace(/\\\//g,'/'); if(!raw||raw.startsWith('data:')||raw.startsWith('blob:')) return;
    let a; try{ a=new URL(raw,bu).toString(); }catch(e){ return; }
    if(!/^https:/i.test(a)) { if(/^http:/i.test(a)) a=a.replace(/^http:/i,'https:'); else return; }
    if(/(sprite|favicon|logo|avatar|1x1|pixel|spacer|blank)\b/i.test(a)&&!/\.gif/i.test(a)) return;
    if(!hint&&!MEDIA_RE.test(a)) return;
    const key=a.split('#')[0]; if(!seen.has(key)) seen.set(key,hint||'');
  };
  const srcset=v=>{ if(!v) return; const parts=v.split(',').map(x=>x.trim().split(/\s+/)); parts.sort((x,y)=>(parseFloat(y[1])||0)-(parseFloat(x[1])||0)); if(parts[0]) add(parts[0][0],'img'); };
  doc.querySelectorAll('meta[property="og:image"],meta[property="og:video"],meta[property="og:video:url"],meta[name="twitter:image"],meta[name="twitter:player:stream"]').forEach(m=>add(m.getAttribute('content'),'meta'));
  doc.querySelectorAll('img').forEach(im=>{ ['data-original','data-src','data-lazy-src','data-gif','src'].forEach(a=>add(im.getAttribute(a),'img')); srcset(im.getAttribute('srcset')||im.getAttribute('data-srcset')); });
  doc.querySelectorAll('source').forEach(el=>{ add(el.getAttribute('src'),'src'); srcset(el.getAttribute('srcset')); });
  doc.querySelectorAll('video').forEach(v=>{ add(v.getAttribute('src'),'video'); add(v.getAttribute('data-src'),'video'); });
  doc.querySelectorAll('a[href]').forEach(a=>add(a.getAttribute('href')));
  (html.match(/https?:\\?\/\\?\/[^\s"'<>\\)]+?\.(?:gif|jpe?g|png|webp|mp4|webm)(?:\?[^\s"'<>\\)]*)?/gi)||[]).forEach(x=>add(x));
  const out=[]; let n=0;
  for(const [a] of seen){
    const m=a.match(/\.(gif|jpe?g|png|webp|avif|mp4|webm)(\?|$)/i); const ext=(m?m[1]:'jpg').toLowerCase();
    const tur=ext==='gif'?'gif':(/^(mp4|webm)$/.test(ext)?'video':'resim');
    const mime=ext==='gif'?'image/gif':(ext==='mp4'?'video/mp4':ext==='webm'?'video/webm':ext==='png'?'image/png':ext==='webp'?'image/webp':ext==='avif'?'image/avif':'image/jpeg');
    REF[a]=base; out.push({id:'s'+(n++),tur,thumb:tur==='video'?'':a,url:a,mime,ad:decodeURIComponent((a.split('?')[0].split('/').pop()||'')).slice(0,40),kaynak:'site'});
    if(out.length>=120) break;
  }
  if(!out.length) throw new Error('Bu sayfada indirilebilir resim/GIF/video bulunamadı. Sayfa JavaScript ile sonradan yükleniyorsa içerikler görünmeyebilir; başka bir sayfa adresi dene.');
  return out;
}
function decEnt(t){ return String(t).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
async function bingSearch(q,page,gif,site,extra){
  extra=extra||{};
  const qq=(site?q+' '+site:q)+(extra.suffix?' '+extra.suffix:'');
  const qft=(gif?' filterui:photo-animatedgif':'')+(extra.qft?' '+extra.qft:'');
  const url='https://www.bing.com/images/async?q='+encodeURIComponent(qq)+'&first='+(page*35)+'&count=35&mmasync=1&setlang=tr'+(qft?'&qft='+encodeURIComponent(qft):'');
  const j=await PH(url); const html=j.text||'';
  const out=[]; const seen=new Set(); let n=0;
  for(const m of html.matchAll(/\sm="(\{[^"]*\})"/g)){
    let o; try{ o=JSON.parse(decEnt(m[1])); }catch(e){ continue; }
    if(!o.murl||seen.has(o.murl)) continue; seen.add(o.murl);
    const isGif=/\.gif(\?|$)/i.test(o.murl); if(gif&&!isGif) continue;
    const vid=/\.(mp4|webm)(\?|$)/i.test(o.murl);
    out.push({id:'b'+page+'_'+(n++),tur:isGif?'gif':(vid?'video':'resim'),thumb:isGif?o.murl:(o.turl||o.murl),thumbFb:o.turl||'',url:o.murl,mime:isGif?'image/gif':'image/jpeg',ad:(o.t||q).replace(/<[^>]+>/g,'').slice(0,60),kaynak:'bing'});
  }
  if(!out.length) throw new Error('Bing sonuç vermedi (sayfa yapısı değişmiş ya da erişim engellenmiş olabilir)');
  return out;
}
function mkItems(urls,pfx,page,q,gif,max){
  const seen=new Set(); const out=[]; let n=0;
  for(const u0 of urls){
    const u=u0.replace(/\\u003d/gi,'=').replace(/\\u0026/gi,'&').replace(/&amp;/g,'&');
    if(seen.has(u)||!/^https?:/i.test(u)) continue; seen.add(u);
    const isGif=/\.gif(\?|$)/i.test(u); if(gif&&!isGif) continue;
    const vid=/\.(mp4|webm)(\?|$)/i.test(u);
    out.push({id:pfx+page+'_'+(n++),tur:isGif?'gif':(vid?'video':'resim'),thumb:u,url:u.replace(/^http:/i,'https:'),mime:isGif?'image/gif':'image/jpeg',ad:q,kaynak:pfx});
    if(out.length>=max) break;
  }
  return out;
}
async function yandexFree(q,page,gif){
  const url='https://yandex.com.tr/gorsel/search?text='+encodeURIComponent(q)+(gif?'&itype=gifan':'')+'&p='+page;
  const j=await PH(url); const html=j.text||'';
  if(/showcaptcha|smartcaptcha|checkcaptcha/i.test(html.slice(0,12000))&&!/img_href/.test(html)) throw new Error('Yandex doğrulama (captcha) istedi: sunucu adresi geçici engellenmiş olabilir. Biraz sonra dene ya da Bing kaynaklarını kullan.');
  const urls=[...html.matchAll(/img_href(?:&quot;|"):(?:&quot;|")(https?:(?:(?!&quot;|")[^\s])+)/g)].map(m=>m[1]);
  const out=mkItems(urls,'yf',page,q,gif,60);
  if(!out.length) throw new Error('Yandex sonuç vermedi (sayfa yapısı değişmiş ya da erişim engellenmiş olabilir)');
  return out;
}
async function googleFree(q,page,gif){
  const url='https://www.google.com/search?q='+encodeURIComponent(q)+'&udm=2&hl=tr&gl=tr'+(gif?'&tbs=itp:animated':'')+(page?'&start='+(page*20):'');
  const j=await PH(url); const html=j.text||'';
  if(/unusual traffic|olağan dışı trafik|\/sorry\//i.test(html.slice(0,20000))&&!/\["https?:/.test(html)) throw new Error('Google doğrulama istedi: sunucu adresi geçici engellenmiş olabilir. Biraz sonra dene ya da Bing kaynaklarını kullan.');
  const urls=[...html.matchAll(/\["(https?:\/\/(?!encrypted-tbn|www\.google|gstatic|lh\d\.google|ssl\.gstatic)[^"]+?)",\s*\d+,\s*\d+\]/g)].map(m=>m[1]);
  const out=mkItems(urls,'gf',page,q,gif,60);
  if(!out.length) throw new Error('Google sonuç vermedi (sayfa yapısı değişmiş ya da erişim engellenmiş olabilir)');
  return out;
}
async function toEn(q){ try{ const d=await jget('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q='+encodeURIComponent(q)); const t=Array.isArray(d)&&Array.isArray(d[0])?d[0].map(x=>x&&x[0]).join(''):''; return (t||q).trim()||q; }catch(e){ return q; } }
function _runSec(t){ if(!t) return 0; t=String(t); if(/^\d+(\.\d+)?$/.test(t)) return +t; const p=t.split(':').map(Number); if(p.some(isNaN)) return 0; return p.reduce((a,b)=>a*60+b,0); }
async function archiveVideos(q,page){
  const qe=await toEn(q);
  const d=await jget('https://archive.org/advancedsearch.php?q='+encodeURIComponent('('+qe+') AND mediatype:movies')+'&fl[]=identifier&fl[]=title&fl[]=runtime&rows=24&page='+(page+1)+'&sort[]=downloads+desc&output=json');
  const docs=(d.response&&d.response.docs)||[];
  const res=await Promise.allSettled(docs.map(async x=>{
    const m=await jget('https://archive.org/metadata/'+encodeURIComponent(x.identifier));
    const files=(m.files||[]).filter(f=>/\.(mp4|webm|m4v)$/i.test(f.name||'')&&!/_(thumb|small)\b/i.test(f.name));
    if(!files.length) return null;
    const lim=75*1024*1024; const ok=files.filter(f=>+f.size&&+f.size<=lim).sort((a,b)=>b.size-a.size);
    const f=ok[0]||files.sort((a,b)=>(+a.size||1e12)-(+b.size||1e12))[0];
    const mime=/\.webm$/i.test(f.name)?'video/webm':'video/mp4';
    return {id:'ia'+x.identifier,tur:'video',thumb:'https://archive.org/services/img/'+encodeURIComponent(x.identifier),url:'https://archive.org/download/'+encodeURIComponent(x.identifier)+'/'+f.name.split('/').map(encodeURIComponent).join('/'),mime,ad:String(x.title||q).slice(0,60)+(x.runtime?' ['+x.runtime+']':''),kaynak:'archive.org',sure:_runSec(x.runtime)};
  }));
  return res.map(r=>r.status==='fulfilled'?r.value:null).filter(Boolean);
}
async function searchSrc(src,q,page){
  const c=cfg(); const s=SRC[src]; const k=s.key&&c[s.key];
  if(s.key&&!k) throw new Error(s.ad+' için API anahtarı yok. "⚙ Ayarlar" sekmesinden ekle (ücretsiz: '+s.link+').');
  const per=24;
  if(src==='archive_vid') return archiveVideos(q,page);
  if(src==='commons_vid'){
    q=await toEn(q);
    const one=async mime=>{
      const u=`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=20&gsroffset=${page*20}&gsrsearch=${encodeURIComponent(q+' filemime:'+mime)}&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=320`;
      const d=await jget(u); const pages=Object.values((d.query&&d.query.pages)||{});
      return pages.map(p=>{ const ii=(p.imageinfo||[])[0]; if(!ii||!ii.url) return null;
        return {id:'cv'+p.pageid,tur:'video',thumb:ii.thumburl||'',url:ii.url,mime:ii.mime||mime,ad:String(p.title||q).replace(/^File:/,'').replace(/\.[a-z0-9]+$/i,'').slice(0,60),kaynak:'wikimedia'}; }).filter(Boolean);
    };
    const [a,b]=await Promise.allSettled([one('video/webm'),one('video/mp4')]);
    const out=[...(a.status==='fulfilled'?a.value:[]),...(b.status==='fulfilled'?b.value:[])];
    if(!out.length&&a.status==='rejected'&&b.status==='rejected') throw a.reason;
    return out;
  }
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
    return (d.images_results||[]).filter(x=>x.original).map((x,i)=>({id:'gi'+page+'_'+i,tur:gif?'gif':'resim',thumb:gif?x.original:x.thumbnail,thumbFb:x.thumbnail,url:x.original,mime:gif?'image/gif':'image/jpeg',ad:x.title||q,kaynak:'google'}));
  }
  if(src==='site') return siteSearch(q);
  if(src==='yandex_free_img') return yandexFree(q,page,false);
  if(src==='yandex_free_gif') return yandexFree(q,page,true);
  if(src==='google_free_img') return googleFree(q,page,false);
  if(src==='google_free_gif') return googleFree(q,page,true);
  if(src==='bing_vektor') return bingSearch(q,page,false,'',{suffix:'vektör vector',qft:'filterui:photo-clipart'});
  if(src==='bing_ikon') return bingSearch(q,page,false,'',{suffix:'icon',qft:'filterui:photo-transparent'});
  if(src==='bing_cizim') return bingSearch(q,page,false,'',{suffix:'illüstrasyon çizim',qft:'filterui:photo-linedrawing'});
  if(src==='bing_sticker') return bingSearch(q,page,false,'',{suffix:'sticker png',qft:'filterui:photo-transparent'});
  if(src==='bing_img') return bingSearch(q,page,false);
  if(src==='bing_gif') return bingSearch(q,page,true);
  if(src==='bing_pin') return bingSearch(q,page,false,'site:pinterest.com');
  if(src==='bing_pin_gif') return bingSearch(q,page,true,'site:pinterest.com');
  if(src==='bing_giphy') return bingSearch(q,page,true,'(site:giphy.com OR site:tenor.com)');
  if(src==='yandex_img'||src==='yandex_gif'){
    const gif=src==='yandex_gif';
    const d=await jget(`https://serpapi.com/search.json?engine=yandex_images&text=${encodeURIComponent(q+(gif?' gif':''))}&p=${page}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    return (d.images_results||[]).filter(x=>x.original&&(!gif||/\.gif(\?|$)/i.test(x.original))).map((x,i)=>({id:'yi'+page+'_'+i,tur:gif?'gif':'resim',thumb:gif?x.original:x.thumbnail,thumbFb:x.thumbnail,url:x.original,mime:gif?'image/gif':'image/jpeg',ad:x.title||q,kaynak:'yandex'}));
  }
  if(false){
    const d=await jget(`https://serpapi.com/search.json?engine=yandex_images&text=${encodeURIComponent(q)}&p=${page}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    return (d.images_results||[]).filter(x=>x.original).map((x,i)=>({id:'yi'+page+'_'+i,tur:'resim',thumb:x.thumbnail,url:x.original,mime:'image/jpeg',ad:x.title||q,kaynak:'yandex'}));
  }
  if(src==='pinterest'||src==='pinterest_gif'){
    const gif=src==='pinterest_gif';
    const d=await jget(`https://serpapi.com/search.json?engine=pinterest&q=${encodeURIComponent(q+(gif?' gif':''))}${page&&ST.pinTokMap[src]?'&next_page_token='+encodeURIComponent(ST.pinTokMap[src]):''}&api_key=${encodeURIComponent(k)}`);
    if(d.error) throw new Error(d.error);
    ST.pinTokMap[src]=d.serpapi_pagination?.next_page_token||null;
    return (d.pins||[]).filter(x=>x.original&&(!gif||/\.gif(\?|$)/i.test(x.original))).map((x,i)=>({id:'pi'+page+'_'+i,tur:gif?'gif':'resim',thumb:gif?x.original:x.thumbnail,thumbFb:x.thumbnail,url:x.original,mime:gif?'image/gif':'image/jpeg',ad:x.title||x.description||q,kaynak:'pinterest'}));
  }
  if(src==='emoji') return emojiSearch(q);
  if(src==='soz'||src==='emoji_ai') return aiCollect(src,q);
  return [];
}
MY.collect=async function(reset){
  if(ST.busy) return;
  const q=($('my-tq')?.value||'').trim();
  const list=[...ST.srcs];
  if(!q){ toast(list[0]==='site'?'Site adresi yaz':'Anahtar kelime yaz','error'); return; }
  if(reset){ ST.res=[]; ST.sel=new Set(); ST.pg={}; ST.pinTokMap={}; ST.notes=[]; ST.lastQuery=q; ST.doneSrc=new Set(); ST.sims={}; }
  ST.busy=true; if(reset||!ST.res.length) $('my-res').innerHTML='<div class="my-muted">Aranıyor…</div>'; else toast('Daha fazla getiriliyor…','info');
  const _oldLen=ST.res.length;
  const todo=list.filter(k=>!(ST.doneSrc&&ST.doneSrc.has(k)));
  const out=await Promise.allSettled(todo.map(k=>searchSrc(k,ST.lastQuery||q,ST.pg[k]||0)));
  const lists=[]; let more=false;
  out.forEach((o,i)=>{
    const k=todo[i];
    if(o.status==='fulfilled'){
      ST.pg[k]=(ST.pg[k]||0)+1; const r=o.value.map(x=>({...x,id:k+':'+x.id,src:k}));
      lists.push(r);
      const single=(k==='emoji'||k==='soz'||k==='emoji_ai'||k==='site');
      const pin=(k==='pinterest'||k==='pinterest_gif')&&!ST.pinTokMap[k];
      if(single||pin||r.length<8) ST.doneSrc.add(k); else more=true;
    } else { ST.doneSrc.add(k); ST.notes.push(SRC[k].ad+': '+(o.reason?.message||o.reason)); }
  });
  // kaynakları dönüşümlü karıştır, aynı adresi tekrar ekleme
  const seen=new Set(ST.res.map(x=>x.url||x.metin)); const mixed=[]; const mx=Math.max(0,...lists.map(l=>l.length));
  for(let i=0;i<mx;i++) lists.forEach(l=>{ const x=l[i]; if(x){ const key=x.url||x.metin; if(!seen.has(key)){ seen.add(key); mixed.push(x); } } });
  ST.res=ST.res.concat(mixed); ST.more=more; if(!reset&&mixed.length) ST.focusIdx=_oldLen;
  const note=ST.notes.length?'<div style="color:#f0883e;font-size:.78rem;margin-bottom:.4rem">'+ST.notes.map(esc).join('<br>')+'</div>':'';
  if(!ST.res.length) $('my-res').innerHTML=note+'<div class="my-muted">Sonuç bulunamadı.</div>'; else drawRes(ST.more);
  ST.busy=false;
};
function resCard(r,i){
  let prev;
  if(r.tur==='emoji'||r.tur==='soz') prev=`<div class="my-prev txt" style="font-size:${r.tur==='emoji'?'1.8rem':'.82rem'}">${esc(r.metin)}</div>`;
  else if(r.tur==='video'&&r.thumb) prev=`<div class="my-prev" style="position:relative;cursor:pointer" onclick="event.stopPropagation();MY.playRes(${i},this)"><img data-turl="${esc(r.thumb)}" data-tfb="" alt=""><span class="my-play">▶</span></div>`;
  else if(r.tur==='video') prev=`<div class="my-prev"><video data-vurl="${esc(r.url)}" ${r.thumb?'poster="'+esc(r.thumb)+'"':''} controls muted playsinline preload="metadata" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;background:#000" onclick="event.stopPropagation()"></video></div>`;
  else prev=`<div class="my-prev" style="cursor:zoom-in" onclick="event.stopPropagation();MY.zoom(${i})"><img data-turl="${esc(r.thumb||r.url)}" data-tfb="${esc(r.thumbFb||'')}" alt=""></div>`;
  return `<div class="my-card ${ST.sel.has(i)?'sel':''}" data-ri="${i}"${r.tur==='video'&&r.sure?' data-vid="1" data-dur="'+r.sure+'"':''} onclick="MY.toggleSel(${i})" style="cursor:pointer"><button type="button" class="my-zoom" title="Büyük göster" onclick="event.stopPropagation();MY.zoom(${i})">⤢</button>${prev}<div class="my-meta">${esc(r.tur)} · ${esc(r.ad||'')}</div><div class="my-act" onclick="event.stopPropagation()"><button class="btn btn-primary btn-sm" onclick="MY.sendRes([${i}])">💬 Gönder</button><button class="btn btn-secondary btn-sm" title="Yalnızca kütüphaneye kaydet" onclick="MY.saveOne(${i})">💾</button><button class="btn btn-secondary btn-sm" title="Klasöre gönder…" onclick="MY.pickFor([${i}],this)">📁${r._klasor?' ✓':''}</button></div>${r._klasor?'<div class="my-badge">✓ '+esc((ST.folders.find(f=>f.id===r._klasor)||{}).ad||'')+'</div>':''}</div>`;
}
function drawRes(more){
  const wrap=$('my-res'); const body=$('my-body'); const keep=body?body.scrollTop:0;
  ST.sims=ST.sims||{}; const cols=ST.cols||4;
  const flow=[]; ST.res.forEach((r,i)=>{ if(!r._sim) flow.push(i); });
  // benzer blokları: seçilen öğenin 2 satır aşağısında
  const after={};
  Object.keys(ST.sims).forEach(k=>{ const p=flow.indexOf(+k); if(p<0) return; const at=flow[Math.min(flow.length-1,(Math.floor(p/cols)+3)*cols-1)]; (after[at]=after[at]||[]).push(+k); });
  let html='';
  flow.forEach(i=>{
    html+=resCard(ST.res[i],i);
    (after[i]||[]).forEach(k=>{ const ids=ST.sims[k]||[]; const t=ST.res[k];
      html+=`<div class="my-simblock"><div class="my-row" style="margin:0 0 .4rem"><b style="font-size:.82rem">✨ Benzerleri: ${esc((t&&t.ad||'').slice(0,50))}</b> <span class="my-muted">(${ids.length})</span><button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="MY.simClose(${k})">✕ Kapat</button></div><div class="my-grid">${ids.map(j=>resCard(ST.res[j],j)).join('')||'<div class="my-muted">Benzer sonuç bulunamadı</div>'}</div></div>`; });
  });
  wrap.innerHTML=(ST.res.some(r=>r.tur==='video')?vfBar():'')+'<div class="my-grid" id="my-maingrid">'+html+'</div>'+(more?'<div class="my-row" style="margin-top:.6rem"><button class="btn btn-secondary btn-sm" onclick="MY.collect(false)">Daha fazla yükle</button></div>':'');
  if(ST.notes&&ST.notes.length) wrap.insertAdjacentHTML('afterbegin','<div style="color:#f0883e;font-size:.78rem;margin-bottom:.4rem">'+ST.notes.map(esc).join('<br>')+'</div>');
  hydrateThumbs(wrap); applyVF();
  const g=$('my-maingrid'); if(g){ const n=getComputedStyle(g).gridTemplateColumns.split(' ').length; if(n>0) ST.cols=n; }
  if(body){
    if(ST.focusIdx!=null){ const c=wrap.querySelector('[data-ri="'+ST.focusIdx+'"]'); ST.focusIdx=null; if(c){ body.scrollTop=Math.max(0,c.getBoundingClientRect().top-body.getBoundingClientRect().top+keep-8); } else body.scrollTop=keep; }
    else body.scrollTop=keep;
  }
}
MY.playRes=function(i,el){ const r=ST.res[i]; if(!r) return; el.onclick=null; el.style.cursor='default'; el.innerHTML=`<video data-vurl="${esc(r.url)}" controls autoplay playsinline referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:contain;background:#000"></video>`; hydrateVideos(el); };
MY.simClose=function(k){ delete ST.sims[k]; ST.res.forEach(r=>{ if(r._simOf===k) r._dead=1; }); drawRes(ST.more); };
const _STOP=new Set(['the','and','for','with','gif','jpg','png','jpeg','mp4','webp','video','resim','image','photo']);
MY.similar=async function(i,quiet){
  const r=ST.res[i]; if(!r||r._sim||ST.sims[i]) return;
  if(r.tur==='emoji'||r.tur==='soz'||r.src==='site'||!r.src){ if(!quiet) toast('Bu öğe için benzer arama yok','info'); return; }
  const words=String(r.ad||'').replace(/\.[a-z0-9]{2,4}$/i,'').replace(/[_\-\.\d]+/g,' ').split(/\s+/).filter(w=>w.length>2&&!_STOP.has(w.toLowerCase())).slice(0,4);
  const q=(words.join(' ')||ST.lastQuery||'').trim(); if(!q) return;
  ST.sims[i]=[]; drawRes(ST.more);
  try{
    const list=await searchSrc(r.src,q,0);
    const have=new Set(ST.res.map(x=>x.url||x.metin)); const add=[];
    for(const x of list){ const key=x.url||x.metin; if(have.has(key)) continue; have.add(key); add.push({...x,id:r.src+':sim'+i+'_'+x.id,src:r.src,_sim:true,_simOf:i}); if(add.length>=12) break; }
    const ids=add.map(x=>{ ST.res.push(x); return ST.res.length-1; });
    ST.sims[i]=ids;
    if(!ids.length&&!quiet) toast('Benzer sonuç bulunamadı','info');
  }catch(e){ delete ST.sims[i]; if(!quiet) toast('Benzerleri getirilemedi: '+(e.message||e),'error'); }
  drawRes(ST.more);
};
// ───────── büyük gösterim (lightbox) ─────────
MY.zoom=function(i){
  const r=ST.res[i]; if(!r) return; ST.zi=i;
  let lb=document.getElementById('my-lb'); if(!lb){ lb=document.createElement('div'); lb.id='my-lb'; lb.className='my-lb'; document.body.appendChild(lb);
    lb.addEventListener('click',e=>{ if(e.target===lb) MY.zoomClose(); });
    document.addEventListener('keydown',MY._lbKey=function(e){ if(!document.getElementById('my-lb')) return; if(e.key==='Escape') MY.zoomClose(); else if(e.key==='ArrowRight') MY.zoomGo(1); else if(e.key==='ArrowLeft') MY.zoomGo(-1); }); }
  let media;
  if(r.tur==='emoji'||r.tur==='soz') media=`<div class="my-lb-txt">${esc(r.metin)}</div>`;
  else if(r.tur==='video') media=`<video id="my-lb-m" data-vurl="${esc(r.url)}" controls autoplay playsinline referrerpolicy="no-referrer"></video>`;
  else media=`<img id="my-lb-m" data-lbu="${esc(r.url)}" data-lbt="${esc(r.thumb||'')}" referrerpolicy="no-referrer" alt="">`;
  lb.innerHTML=`<button class="my-lb-x" onclick="MY.zoomClose()">✕</button><button class="my-lb-n l" onclick="MY.zoomGo(-1)">‹</button><button class="my-lb-n r" onclick="MY.zoomGo(1)">›</button>
   <div class="my-lb-box">${media}</div>
   <div class="my-lb-bar"><span class="my-muted" style="color:#ccc">${esc(r.tur)} · ${esc((r.ad||'').slice(0,60))}</span>
     <button class="btn btn-secondary btn-sm" onclick="MY.toggleSel(${i});MY.zoom(${i})">${ST.sel.has(i)?'☑ Seçili':'☐ Seç'}</button>
     <button class="btn btn-primary btn-sm" onclick="MY.sendRes([${i}])">💬 Gönder</button>
     <button class="btn btn-secondary btn-sm" onclick="MY.saveOne(${i})">💾 Kaydet</button>
     <button class="btn btn-secondary btn-sm" onclick="MY.pickFor([${i}],this)">📁 Klasöre…</button>
     <button class="btn btn-secondary btn-sm" onclick="MY.zoomSim(${i})">✨ Benzerleri</button></div>`;
  lb.style.display='flex';
  const m=document.getElementById('my-lb-m');
  if(m&&m.dataset.vurl){ hydrateVideos(lb); m.muted=false; }
  else if(m&&m.dataset.lbu){ const u=m.dataset.lbu; let fb=0;
    m.onerror=async()=>{ if(fb++) return; try{ const {blob}=await NB(u); m.src=URL.createObjectURL(blob); }catch(e){ const t=m.dataset.lbt; if(t){ try{ m.src=await thumb(t); }catch(_){} } } };
    m.src=u; }
};
MY.zoomClose=function(){ const lb=document.getElementById('my-lb'); if(lb){ lb.querySelectorAll('video').forEach(v=>v.pause()); lb.remove(); } if(MY._lbKey){ document.removeEventListener('keydown',MY._lbKey); MY._lbKey=null; } };
MY.zoomGo=function(d){ let j=ST.zi; for(let n=0;n<ST.res.length;n++){ j=(j+d+ST.res.length)%ST.res.length; if(!ST.res[j]._dead) break; } MY.zoom(j); };
MY.zoomSim=function(i){ MY.zoomClose(); MY.similar(i); setTimeout(()=>{ const c=document.querySelector('.my-simblock'); if(c) c.scrollIntoView({block:'center',behavior:'smooth'}); },700); };
MY.toggleSel=function(i){ const on=!ST.sel.has(i); if(on) ST.sel.add(i); else ST.sel.delete(i); drawRes(ST.more); if(on&&!(ST.res[i]&&ST.res[i]._sim)) MY.similar(i,true); };
MY.selAll=function(){ if(ST.res.length&&ST.sel.size===ST.res.length) ST.sel=new Set(); else ST.res.forEach((_,i)=>ST.sel.add(i)); drawRes(ST.more); };
MY.selType=function(t){ ST.sel=new Set(); ST.res.forEach((r,i)=>{ if(r.tur===t) ST.sel.add(i); }); if(!ST.sel.size) toast('Bu türden sonuç yok','error'); drawRes(ST.more); };
MY.loadAll=async function(){
  let n=0; while(ST.more&&!ST.busy&&n<8){ n++; toast('Sayfa '+(n+1)+' getiriliyor… ('+ST.res.length+' sonuç)','info'); await MY.collect(false); }
  toast(ST.res.length+' sonuç getirildi'+(ST.more?' (daha fazlası var, tekrar bas)':''),'success');
};
MY.saveAll=async function(){
  if(!ST.res.length){ toast('Önce bir arama yap','error'); return; }
  if(ST.res.length>60&&!confirm(ST.res.length+' öğe kütüphaneye kaydedilecek. Devam edilsin mi?')) return;
  ST.res.forEach((_,i)=>ST.sel.add(i)); await MY.saveSel();
};
async function putFile(folderId,blob,mime,meta){
  const ext=EXT[mime]||(mime.split('/')[1]||'bin');
  const path=`${folderId}/${(crypto.randomUUID?crypto.randomUUID():Date.now()+''+Math.random().toString(16).slice(2))}.${ext}`;
  const {error:ue}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:mime,upsert:false});
  if(ue) throw ue;
  const {data:row,error}=await sb.from('medya_ogeler').insert({klasor_id:folderId,tur:meta.tur,dosya_yolu:path,etiket:meta.etiket||'',aciklama:meta.aciklama||null,kaynak:meta.kaynak||null,mime,boyut:blob.size}).select().single();
  if(error){ await sb.storage.from(BUCKET).remove([path]); throw error; }
  return row;
}
// Topla sonuçlarından doğrudan sohbete gönder (isteğe bağlı kütüphaneye de kaydeder)
MY.sendRes=async function(list){
  if(!S.currentRoom){ toast('Önce soldan bir sohbet aç, sonra Multimedya\'yı aç','error'); return; }
  const picks=(list||[...ST.sel]).map(i=>ST.res[i]).filter(x=>x&&!x._dead);
  if(!picks.length){ toast('Önce sonuçlardan seç','error'); return; }
  const save=$('my-alsosave')?.checked!==false; const fid=$('my-tf')?.value;
  if(save&&!fid){ toast('Klasör seç ya da "Kütüphaneye de kaydet" kutusunu kapat','error'); return; }
  const cap=($('my-caption')?.value||'').trim(); const q=ST.lastQuery||'';
  let ok=0,fail=0,first=true;
  toast(picks.length+' öğe gönderiliyor…','info');
  for(const r of picks){
    try{
      const capNow=first?cap:''; // açıklama yalnızca ilk öğeye
      if(r.tur==='emoji'||r.tur==='soz'){
        let row=null;
        if(save){ const {data,error}=await sb.from('medya_ogeler').insert({klasor_id:fid,tur:r.tur,metin:r.metin,etiket:(q+' '+(r.ad||'')).trim(),kaynak:r.kaynak||'yerel'}).select().single(); if(error) throw error; row=data; }
        await sendTextMessage((capNow?capNow+'\n\n':'')+(r.metin||''),S.currentRoom);
        if(row) await markSent(S.currentRoom.id,row.id);
      } else {
        const {blob:b,type:bt}=await NB(r.url);
        const m=(bt&&bt!=='application/octet-stream')?bt:r.mime;
        let row=null;
        if(save) row=await putFile(fid,b,m,{tur:m.startsWith('video/')?'video':(m==='image/gif'?'gif':'resim'),etiket:(q+' '+(r.ad||'')).trim().slice(0,200),kaynak:r.kaynak});
        const f=new File([b],'medya_'+Date.now()+'.'+(EXT[m]||'bin'),{type:m});
        const okS=await sendFileDirectly(f,capNow);
        if(!okS) throw new Error('gönderilemedi');
        if(row) await markSent(S.currentRoom.id,row.id);
      }
      ok++; first=false;
    }catch(e){ fail++; console.warn('medya gönder',e); if(fail===1) toast('Gönderilemedi: '+(e.message||e),'error'); }
  }
  if(ok){ toast(ok+' öğe gönderildi ✓'+(save?' (kütüphaneye de kaydedildi)':''),'success'); if($('my-caption')&&cap) $('my-caption').value=''; ST.sel=new Set(); drawRes(ST.more); }
};
MY.pickFor=function(idx,btn){
  MY.closePick();
  const q=TURKEY(ST.lastQuery||'');
  const last=(()=>{try{return JSON.parse(localStorage.getItem('my_lastf')||'[]');}catch(e){return [];}})();
  const score=f=>{const n=TURKEY(f.ad); let sc=last.indexOf(f.id); sc=sc<0?99:sc; if(q&&(q.includes(n)||n.includes(q))) sc=-1; return sc;};
  const fl=[...ST.folders].sort((a,b)=>score(a)-score(b));
  const box=document.createElement('div'); box.id='my-pick'; box.className='my-pick';
  box.innerHTML='<div class="my-pick-h">📁 '+idx.length+' öğeyi klasöre gönder <span onclick="MY.closePick()" style="cursor:pointer;float:right">✕</span></div>'+
    '<div class="my-pick-l">'+fl.map(f=>'<button class="btn btn-secondary btn-sm" onclick="MY.pickDo(\''+f.id+'\',['+idx.join(',')+'])">'+esc(f.ad)+(score(f)<0?' ⭐':'')+'</button>').join('')+'</div>'+
    '<div class="my-pick-n"><input id="my-pick-new" class="input" placeholder="+ Yeni klasör adı" maxlength="60"><button class="btn btn-primary btn-sm" onclick="MY.pickNew(['+idx.join(',')+'])">Oluştur ve gönder</button></div>';
  document.body.appendChild(box);
  const r=btn.getBoundingClientRect(); const w=Math.min(300,innerWidth-16);
  box.style.width=w+'px'; box.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
  const h=box.offsetHeight; box.style.top=(r.bottom+h+8>innerHeight?Math.max(8,r.top-h-4):r.bottom+4)+'px';
  setTimeout(()=>document.addEventListener('mousedown',MY._pickOut=function(e){ if(!box.contains(e.target)) MY.closePick(); }),0);
};
MY.closePick=function(){ const b=document.getElementById('my-pick'); if(b) b.remove(); if(MY._pickOut){ document.removeEventListener('mousedown',MY._pickOut); MY._pickOut=null; } };
MY.pickDo=async function(fid,idx){
  MY.closePick();
  try{ let l=JSON.parse(localStorage.getItem('my_lastf')||'[]').filter(x=>x!==fid); l.unshift(fid); localStorage.setItem('my_lastf',JSON.stringify(l.slice(0,8))); }catch(e){}
  await MY.saveSel(fid,idx);
};
MY.pickNew=async function(idx){
  const ad=($('my-pick-new')?.value||'').trim(); if(!ad) return;
  const {data,error}=await sb.from('medya_klasorler').insert({ad}).select().single();
  if(error){ toast('Klasör oluşturulamadı: '+error.message,'error'); return; }
  ST.folders.push(data); await MY.pickDo(data.id,idx);
};
MY.pickSel=function(btn){ const idx=[...ST.sel]; if(!idx.length){ toast('Önce sonuçlardan seç','error'); return; } MY.pickFor(idx,btn); };
MY.saveOne=function(i){ ST.sel=new Set([i]); MY.saveSel(); };
MY.saveSel=async function(fidArg,idxArg){
  const fid=fidArg||$('my-tf')?.value; if(!fid){ toast('Klasör seç','error'); return; }
  const idxs=idxArg||[...ST.sel];
  const picks=idxs.map(i=>ST.res[i]).filter(x=>x&&!x._dead);
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
        ok++; r._klasor=fid;
      }catch(e){ fail++; console.warn('medya kaydet',e); }
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  toast(ok+' kaydedildi'+(fail?', '+fail+' başarısız (tarayıcı bazı sitelerden indirmeye izin vermeyebilir)':''),fail&&!ok?'error':'success');
  if(!idxArg) ST.sel=new Set(); drawRes(ST.more);
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
    <select id="my-ton">${TONES.map(t=>`<option ${cfg().ton===t?'selected':''}>${t}</option>`).join('')}</select>
    <button class="btn btn-primary btn-sm" onclick="MY.runSug()">✨ Öneri getir</button></div>
    <div id="my-sugout" class="my-muted">Karşı tarafın son mesajlarına göre cevap ve uygun medya önerir. Butona basınca çalışır (otomatik değil).</div>`;
}
function convo(){
  const ms=(S.messages||[]).filter(m=>m.mesaj_tipi==='metin'&&m._text&&!String(m._text).startsWith('🔒')).slice(-8);
  return ms.map(m=>(m.gonderen_id===S.user.id?'Ben: ':'Karşı taraf: ')+String(m._text).slice(0,400)).join('\n');
}
async function sugCompute(ton,conv){
  const sys=`Bir sohbet sitesinde yazışıyorsun. ${ADULT_TONES.includes(ton)?'Bu, yetişkinlerin (18+) karşılıklı rızayla yazıştığı bir yetişkin sohbet sitesi. Cevap '+ton+' ve cüretkâr olabilir; ancak karşı tarafın açtığı seviyeyi ve rahatlığını gözet, rahatsız olduğu ya da geri çekildiği an nazikçe geri çekil. Karşı tarafın reşit olmadığına dair en küçük işaret varsa cinsel içerik YAZMA, nötr ve kibar bir cevap ver. ':''}Aşağıdaki konuşmanın devamı için "Ben" adına ${ton} tonda, doğal ve kısa (en fazla 2 cümle) bir cevap öner. Karşı tarafın yazdığı dilde yaz. Yalnızca şu JSON'u ver: {"cevap":"...","medya_anahtar":"GIF/resim aramak için 1-3 kelime"}`;
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
  return {res,items};
}

// ───────── ana sohbet penceresinde hızlı öneri ─────────
function inlineBox(){
  let b=$('ai-inline'); if(b) return b;
  const wrap=$('chat-input-wrap'); if(!wrap) return null;
  b=document.createElement('div'); b.id='ai-inline';
  wrap.parentNode.insertBefore(b,wrap); return b;
}
function inlineHead(ton){
  return `<div class="ai-in-h"><b>🤖 Cevap önerileri</b>
    <select id="ai-in-ton" onchange="MY.inline(this.value)">${TONES.map(t=>`<option ${t===ton?'selected':''}>${t}</option>`).join('')}</select>
    <button class="btn btn-secondary btn-sm" onclick="MY.inline(document.getElementById('ai-in-ton').value)" title="Yeniden getir">↻</button>
    <button class="btn btn-secondary btn-sm" onclick="MY.inlineClose()">✕</button></div>`;
}
MY.inlineClose=function(){ const b=$('ai-inline'); if(b) b.style.display='none'; };
MY.inline=async function(tonArg){
  if(!S.currentRoom){ toast('Önce bir sohbet aç','error'); return; }
  css();
  const box=inlineBox(); if(!box) return;
  const c=rawCfg(); const ton=(typeof tonArg==='string'&&tonArg)?tonArg:(c.ton||'samimi');
  if(ton!==c.ton){ c.ton=ton; saveCfg(c); }
  box.style.display='block';
  const conv=convo();
  if(!conv){ box.innerHTML=inlineHead(ton)+'<div class="my-muted">Bu sohbette öneri için okunabilir mesaj yok.</div>'; return; }
  if(!ackOk()){ box.style.display='none'; return; }
  if(!aiList().length&&!Object.keys(SK).length) await loadKeys();
  if(!aiList().length){ box.innerHTML=inlineHead(ton)+'<div class="my-muted">Önce 🗂 Multimedya > Ayarlar bölümünden bir yapay zekâ anahtarı ekle.</div>'; return; }
  box.innerHTML=inlineHead(ton)+'<div class="my-muted">Yapay zekâlar düşünüyor…</div>';
  try{
    if(!ST.folders.length) await loadFolders();
    const {res,items}=await sugCompute(ton,conv);
    window._mySugRes=res;
    box.innerHTML=inlineHead(ton)+res.map((r,i)=>r.err
      ?`<div class="ai-in-row err"><b>${esc(r.p.ad)}</b> ${esc(r.err)}</div>`
      :`<div class="ai-in-row"><div class="ai-in-t"><b>${esc(r.p.ad)}</b> ${esc(r.cevap)}</div><button class="btn btn-secondary btn-sm" onclick="MY.useSug(${i})" title="Mesaj kutusuna yaz">✎ Yaz</button><button class="btn btn-primary btn-sm" onclick="MY.sendSug(${i})" title="Hemen gönder">➤ Gönder</button></div>`).join('')
      +(items.length?'<div class="ai-in-media">'+items.map(it=>{ const u=ST.urls[it.dosya_yolu]||''; const prev=it.tur==='video'?`<video src="${esc(u)}" muted playsinline preload="metadata"></video>`:(it.tur==='gif'||it.tur==='resim')?`<img src="${esc(u)}" alt="">`:`<span>${esc((it.metin||'').slice(0,40))}</span>`; return `<button type="button" class="ai-in-m" onclick="MY.send('${it.id}')" title="Gönder">${prev}</button>`; }).join('')+'</div>':'');
  }catch(e){ box.innerHTML=inlineHead(ton)+'<div class="ai-in-row err">'+esc(e.message||e)+'</div>'; }
};
MY.sendSug=async function(i){
  const r=window._mySugRes&&window._mySugRes[i]; if(!r||!r.cevap) return;
  try{ await sendTextMessage(r.cevap,S.currentRoom); MY.inlineClose(); }catch(e){ toast('Gönderilemedi: '+(e.message||e),'error'); }
};
MY.runSug=async function(){
  const c=cfg(); const ton=$('my-ton').value; c.ton=ton; saveCfg(c);
  const conv=convo(); if(!conv){ toast('Bu sohbette öneri için okunabilir mesaj yok','error'); return; }
  if(!ackOk()) return;
  const out=$('my-sugout'); out.innerHTML='Yapay zekâlar düşünüyor…';
  const {res,items}=await sugCompute(ton,conv);
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
  MY.close(); MY.inlineClose();
};

// ───────── ayarlar ─────────
function renderAi(){
  const c=cfg(); const ai=c.ai||{};
  const body=$('my-body');
  body.innerHTML=`<div class="my-muted" style="margin-bottom:.6rem">Anahtarlar sunucuda güvenli saklanır (yalnızca senin yönetici hesabın kullanabilir, tarayıcıya geri indirilmez); hangi bilgisayardan girersen gir çalışır. Kayıtlı bir anahtarı değiştirmek için kutuya yenisini yaz, boş bırakırsan eskisi kalır. Ücretsiz anahtarlar: Giphy → developers.giphy.com, Pexels → pexels.com/api, Pixabay → pixabay.com/api/docs, SerpApi (Google/Yandex Görseller, Pinterest) → serpapi.com (ücretsiz plan var)</div>
  <h4>İçerik servisleri</h4>
  <div class="my-row"><label style="width:110px">Giphy</label><input class="grow" type="password" id="k-giphy" value="" placeholder="${SK.giphy?'•••• kayıtlı (sonu '+SK.giphy+') — değiştirmek için yenisini yaz':'Giphy API anahtarı'}"></div>
  <div class="my-row"><label style="width:110px">Pexels</label><input class="grow" type="password" id="k-pexels" value="" placeholder="${SK.pexels?'•••• kayıtlı (sonu '+SK.pexels+') — değiştirmek için yenisini yaz':'Pexels API anahtarı'}"></div>
  <div class="my-row"><label style="display:flex;gap:.4rem;align-items:center"><input type="checkbox" id="k-vpn" ${c.vpn===false?'':'checked'}> 🌍 Sunucu üzerinden eriş (VPN benzeri — erişim engelli sitelerden de toplar)</label></div>
  <div class="my-row"><label style="width:110px">SerpApi</label><input class="grow" type="password" id="k-serpapi" value="" placeholder="${SK.serpapi?'•••• kayıtlı (sonu '+SK.serpapi+') — değiştirmek için yenisini yaz':'SerpApi anahtarı (Google/Yandex Görseller + Pinterest için)'}"></div>
  <div class="my-row"><label style="width:110px">Pixabay</label><input class="grow" type="password" id="k-pixabay" value="" placeholder="${SK.pixabay?'•••• kayıtlı (sonu '+SK.pixabay+') — değiştirmek için yenisini yaz':'Pixabay API anahtarı'}"></div>
  <h4 style="margin-top:1rem">Yapay zekâ (cevap önerisi, söz ve emoji yazdırma) — resmi API anahtarları</h4>
  ${Object.keys(AI_DEFS).map(k=>`<div class="my-row"><label style="width:110px"><input type="checkbox" id="on-${k}" ${(ai[k]?.on!==false)?'checked':''}> ${esc(AI_DEFS[k].ad)}</label>
    <input class="grow" type="password" id="ak-${k}" value="" placeholder="${SK[k]?'•••• kayıtlı (sonu '+SK[k]+') — değiştirmek için yenisini yaz':'API anahtarı'}">
    <input id="am-${k}" value="${esc(ai[k]?.model||AI_DEFS[k].model)}" style="width:170px" title="Model adı"></div>`).join('')}
  <div class="my-muted">En fazla 3 servis kullanılır (sıra: Claude, ChatGPT, DeepSeek, Grok; anahtarı olanlar). Model adlarını servisin güncel listesine göre değiştirebilirsin.</div>
  <div class="my-row" style="margin-top:.8rem"><button class="btn btn-primary btn-sm" onclick="MY.saveAi()">💾 Kaydet</button> <button class="btn btn-secondary btn-sm" onclick="MY.clearKeys()">🗑 Kayıtlı anahtarları sil</button></div>`;
}
MY.saveAi=async function(){
  const c=rawCfg();
  c.vpn=$('k-vpn').checked;
  c.ai=c.ai||{};
  Object.keys(AI_DEFS).forEach(k=>{ c.ai[k]={model:$('am-'+k).value.trim()||AI_DEFS[k].model,on:$('on-'+k).checked}; });
  saveCfg(c);
  const keys={};
  KEYNAMES.forEach(k=>{ const v=($('k-'+k)?.value||'').trim(); if(v) keys[k]=v; });
  Object.keys(AI_DEFS).forEach(k=>{ const v=($('ak-'+k)?.value||'').trim(); if(v) keys[k]=v; });
  try{
    if(Object.keys(keys).length){
      const r=await PX({mode:'keys_set',keys}); const j=await r.json();
      if(!j.ok) throw new Error(j.error||'kaydedilemedi'); SK=j.keys||SK;
    }
    toast('Kaydedildi ✓ (anahtarlar sunucuda saklandı)','success'); renderAi();
  }catch(e){ toast('Anahtar kaydedilemedi: '+(e.message||e),'error'); }
};
MY.clearKeys=async function(){
  if(!confirm('Sunucuda kayıtlı TÜM API anahtarları silinsin mi?')) return;
  try{ const all={}; [...KEYNAMES,...Object.keys(AI_DEFS)].forEach(k=>all[k]=null); const r=await PX({mode:'keys_set',keys:all}); const j=await r.json(); if(!j.ok) throw new Error(j.error); SK=j.keys||{}; toast('Anahtarlar silindi','success'); renderAi(); }
  catch(e){ toast('Silinemedi: '+(e.message||e),'error'); }
};
})();
