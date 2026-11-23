// Anonim ziyaret sayacı: yalnızca ülke kodu, dil, cihaz türü ve rastgele ziyaretçi no saklanır (IP/isim yok).
(function(){try{
var U='https://jjkvjrvaozubvdnjdpbs.supabase.co',K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa3ZqcnZhb3p1YnZkbmpkcGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODM2NDEsImV4cCI6MjEwNzQ1OTY0MX0.ozfpJFkCuU200AQOT_hpc4QcE3jlskGi69ulXqoUa_Q';
var path=location.pathname.replace(/index\.html$/,'')||'/';
var sk='sh_v_'+path;if(sessionStorage.getItem(sk))return;sessionStorage.setItem(sk,'1');
var vid;try{vid=localStorage.getItem('sh_vid');if(!vid){vid=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now());localStorage.setItem('sh_vid',vid);}}catch(e){vid=String(Math.random()).slice(2)+Date.now();}
var ref='';try{if(document.referrer){var h=new URL(document.referrer).hostname;if(h!==location.hostname)ref=h.replace(/^www\./,'');}}catch(e){}
var q=new URLSearchParams(location.search);if(q.get('ref'))ref=q.get('ref').slice(0,40);
function send(cc){fetch(U+'/rest/v1/rpc/ziyaret_kaydet',{method:'POST',headers:{'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'},body:JSON.stringify({p_ziyaretci:vid,p_ulke:cc||'',p_yol:path,p_dil:(navigator.language||'').slice(0,2).toLowerCase(),p_kaynak:ref,p_cihaz:/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'mobil':'masaüstü'}),keepalive:true}).catch(function(){});}
fetch('https://www.cloudflare.com/cdn-cgi/trace').then(function(r){return r.text();}).then(function(t){var m=t.match(/^loc=([A-Z]{2})/m);send(m&&m[1]);}).catch(function(){
fetch('https://ipwho.is/').then(function(r){return r.json();}).then(function(d){send(d&&d.country_code);}).catch(function(){send('');});});
}catch(e){}})();
