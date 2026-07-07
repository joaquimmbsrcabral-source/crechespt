/**
 * Newsletter capture — componente reutilizável.
 *
 * Uso:
 *   1. Inclui no HTML um elemento com data-newsletter (placeholder)
 *   2. Inclui este script + Firebase compat (app + firestore)
 *   3. Chama window.mountNewsletter(elemento, { source: "home" })
 *
 * Guarda email em Firestore collection newsletter_subscribers.
 */
(function(){
  // === Firebase init (lazy) ===
  function ensureFirebase(){
    if(typeof firebase === "undefined"){
      console.warn("Firebase não carregado — newsletter offline");
      return null;
    }
    if(!firebase.apps || firebase.apps.length === 0){
      firebase.initializeApp({
        apiKey: "AIzaSyCOGTFg5_gzSwjGWs8_B0QvUKLudcTvZXI",
        authDomain: "crechespt.firebaseapp.com",
        projectId: "crechespt",
        storageBucket: "crechespt.firebasestorage.app",
        messagingSenderId: "470551729340",
        appId: "1:470551729340:web:6e0843f7f4f0fc02f5e8a8"
      });
    }
    return firebase.firestore();
  }

  // === Componente HTML ===
  function htmlTemplate(){
    return `
      <div class="nl-card" style="background:linear-gradient(135deg,#FFE3EE 0%,#FFE8D6 100%);border-radius:18px;padding:24px 26px;max-width:520px;margin:20px auto;text-align:center;box-shadow:0 4px 16px rgba(60,40,90,.08)">
        <h3 style="font-family:'Fredoka',inherit;font-size:20px;color:#2C2356;margin:0 0 8px;font-weight:600">📬 Recebe novidades por email</h3>
        <p style="color:#6E6989;font-size:13.5px;margin:0 0 16px;line-height:1.5">1 email por mês com novos guias, melhorias e quando houver atualizações importantes para pais à procura de creche. Sem spam.</p>
        <form class="nl-form" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <input type="email" class="nl-email" placeholder="o-teu-email@exemplo.pt" required
                 style="flex:1;min-width:200px;padding:11px 14px;border:1.5px solid #fff;border-radius:999px;font:inherit;background:rgba(255,255,255,.9);outline:none;color:#2C2356">
          <button type="submit" class="nl-submit"
                  style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;border:0;border-radius:999px;padding:11px 22px;font-weight:700;cursor:pointer;font:inherit;font-size:14px;box-shadow:0 4px 12px rgba(255,107,157,.3)">
            Subscrever →
          </button>
        </form>
        <div class="nl-status" style="font-size:12px;color:#6E6989;margin-top:10px;min-height:16px"></div>
      </div>
    `;
  }

  // === Mounter público ===
  window.mountNewsletter = function(el, opts){
    opts = opts || {};
    const source = opts.source || "unknown";
    el.innerHTML = htmlTemplate();
    const form = el.querySelector(".nl-form");
    const inp = el.querySelector(".nl-email");
    const btn = el.querySelector(".nl-submit");
    const status = el.querySelector(".nl-status");

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      const email = (inp.value || "").trim().toLowerCase();
      if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        status.textContent = "Indica um email válido.";
        status.style.color = "#b3261e";
        return;
      }
      // Anti-spam local: já subscreveu nesta sessão?
      const k = "crechespt/newsletter_subscribed";
      if(localStorage.getItem(k) === email){
        status.textContent = "Já recebemos a tua subscrição. Obrigado 💛";
        status.style.color = "#0a7e3a";
        return;
      }
      btn.disabled = true;
      btn.textContent = "A enviar…";
      const db = ensureFirebase();
      if(!db){
        status.textContent = "Sem ligação. Tenta de novo.";
        status.style.color = "#b3261e";
        btn.disabled = false;
        btn.textContent = "Subscrever →";
        return;
      }
      try{
        await db.collection("newsletter_subscribers").add({
          email: email.slice(0, 120),
          source: String(source).slice(0, 30),
          lang: navigator.language || "",
          ts: firebase.firestore.FieldValue.serverTimestamp()
        });
        localStorage.setItem(k, email);
        // Sucesso — substituir UI
        el.innerHTML = `
          <div style="background:linear-gradient(135deg,#DEF5E1 0%,#D8F5F4 100%);border-radius:18px;padding:24px 26px;max-width:520px;margin:20px auto;text-align:center">
            <div style="font-size:34px;margin-bottom:8px">🎉</div>
            <h3 style="font-family:'Fredoka',inherit;font-size:20px;color:#2C2356;margin:0 0 6px;font-weight:600">Obrigado!</h3>
            <p style="color:#6E6989;font-size:14px;margin:0">Vais receber novidades em <b style="color:#2C2356">${String(email).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; })}</b>. Verifica a pasta de spam se não chegar nada.</p>
          </div>
        `;
      }catch(err){
        console.warn("newsletter error:", err);
        status.textContent = "Não foi possível enviar. Tenta de novo.";
        status.style.color = "#b3261e";
        btn.disabled = false;
        btn.textContent = "Subscrever →";
      }
    });
  };
})();
