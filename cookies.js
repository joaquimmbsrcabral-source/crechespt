/* CrechesPT — gestão de consentimento de cookies (RGPD)
   - Banner ao primeiro acesso
   - Opt-in para cookies analíticos (Firebase Analytics)
   - Função global openCookiePrefs() para reabrir
   - Chave localStorage: crechespt/cookies/v1
   */
(function(){
  const KEY = "crechespt/cookies/v1";
  const ANALYTICS_ID = "G-736Z8TECXG";

  function read(){
    try{ return JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){ return null; }
  }
  function write(v){
    try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){}
  }

  function loadAnalytics(){
    if(window._gaLoaded) return;
    window._gaLoaded = true;
    // gtag.js (Google Analytics 4) com flag IP anónimo
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ANALYTICS_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", ANALYTICS_ID, { anonymize_ip:true });
  }

  function ensureStyles(){
    if(document.getElementById("cookie-styles")) return;
    const css = `
      #cookie-banner{position:fixed;left:14px;right:14px;bottom:14px;z-index:5000;
        background:#fff;border-radius:18px;box-shadow:0 20px 50px rgba(60,40,90,.25);
        padding:18px 22px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;
        font-family:"Quicksand",system-ui,-apple-system,sans-serif;color:#2C2356;font-size:14px;line-height:1.5;
        animation:cookSlide .25s ease-out;max-width:760px;margin:0 auto;
        border:1px solid #F1E6D9;
      }
      @keyframes cookSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      #cookie-banner .cb-icon{font-size:28px;line-height:1;flex-shrink:0}
      #cookie-banner .cb-text{flex:1;min-width:260px}
      #cookie-banner .cb-text b{display:block;margin-bottom:2px;font-family:"Fredoka";font-weight:600;font-size:15px}
      #cookie-banner .cb-text small{color:#6E6790;font-size:12.5px}
      #cookie-banner .cb-text a{color:#FF6B9D;font-weight:600;text-decoration:underline}
      #cookie-banner .cb-actions{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
      #cookie-banner button{border:none;border-radius:99px;padding:10px 18px;font-weight:700;font-size:13.5px;
        cursor:pointer;font-family:inherit;transition:all .15s}
      #cookie-banner .cb-reject{background:#F1E6D9;color:#2C2356}
      #cookie-banner .cb-reject:hover{background:#E2D2BF}
      #cookie-banner .cb-accept{background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;
        box-shadow:0 6px 14px rgba(255,107,157,.35)}
      #cookie-banner .cb-accept:hover{transform:translateY(-1px);filter:brightness(1.05)}
      #cookie-banner.fade{opacity:0;pointer-events:none;transition:opacity .2s}
      @media (max-width:540px){
        #cookie-banner{flex-direction:column;align-items:flex-start;padding:16px}
        #cookie-banner .cb-actions{width:100%}
        #cookie-banner .cb-actions button{flex:1}
      }
    `;
    const style = document.createElement("style");
    style.id = "cookie-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showBanner(){
    ensureStyles();
    if(document.getElementById("cookie-banner")) return;
    const div = document.createElement("div");
    div.id = "cookie-banner";
    div.setAttribute("role","dialog");
    div.setAttribute("aria-label","Preferências de cookies");
    div.innerHTML = `
      <div class="cb-icon" aria-hidden="true">🍪</div>
      <div class="cb-text">
        <b>Cookies para melhorar a app</b>
        <small>Usamos cookies essenciais para o serviço funcionar (login, guardar as tuas notas). Queremos também usar cookies analíticos anónimos para nos ajudar a melhorar — só com a tua autorização. <a href="/cookies">Saber mais</a></small>
      </div>
      <div class="cb-actions">
        <button class="cb-reject" type="button">Apenas essenciais</button>
        <button class="cb-accept" type="button">Aceitar todos</button>
      </div>
    `;
    document.body.appendChild(div);
    div.querySelector(".cb-accept").addEventListener("click", ()=>{ choose(true); });
    div.querySelector(".cb-reject").addEventListener("click", ()=>{ choose(false); });
  }

  function hideBanner(){
    const b = document.getElementById("cookie-banner");
    if(!b) return;
    b.classList.add("fade");
    setTimeout(()=>b.remove(), 220);
  }

  function choose(accept){
    write({ analytics: !!accept, ts: new Date().toISOString(), v: 1 });
    hideBanner();
    if(accept) loadAnalytics();
  }

  function init(){
    const v = read();
    if(!v){
      // Mostrar banner com pequeno atraso para não competir com o carregamento da app
      setTimeout(showBanner, 1200);
      return;
    }
    if(v.analytics) loadAnalytics();
  }

  // Expor função para reabrir preferências (usada em /cookies e no footer)
  window.openCookiePrefs = function(){
    hideBanner();
    setTimeout(showBanner, 240);
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
