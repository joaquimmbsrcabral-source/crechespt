/* Creches.app — Perfil verificado da creche (público)
   Lê creche_profiles/{id} do Firestore (leitura pública) e injecta
   um cartão "gerido pela creche" na ficha, por baixo do vaga-slot.
   Inclui o módulo CrecheLeads ("Tenho interesse 💌") — partilhado com o /app.
   Requer firebase app+firestore compat já carregados na página. */
(function(){
  function esc(s){ return String(s||"").replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

  // ═══════ CrecheLeads — famílias deixam contacto a creches geridas (Fase 2) ═══════
  var LEADS_RATE_KEY = "crechespt/leads/rate";
  function _leadsCanSend(){
    try {
      var raw = JSON.parse(localStorage.getItem(LEADS_RATE_KEY) || "{}");
      var today = new Date().toISOString().slice(0,10);
      return raw.day !== today || (raw.count || 0) < 3;
    } catch(e){ return true; }
  }
  function _leadsBump(){
    try {
      var today = new Date().toISOString().slice(0,10);
      var raw = JSON.parse(localStorage.getItem(LEADS_RATE_KEY) || "{}");
      localStorage.setItem(LEADS_RATE_KEY, JSON.stringify(
        raw.day === today ? { day: today, count: (raw.count||0)+1 } : { day: today, count: 1 }
      ));
    } catch(e){}
  }
  window.CrecheLeads = {
    open: function(crecheId, crecheNome){
      var old = document.getElementById("lead-modal-cp");
      if(old) old.remove();
      var ov = document.createElement("div");
      ov.id = "lead-modal-cp";
      ov.style.cssText = "position:fixed;inset:0;background:rgba(44,35,86,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px";
      ov.innerHTML =
        '<div style="background:#fff;border-radius:18px;max-width:440px;width:100%;max-height:92vh;overflow:auto;padding:24px;font-family:Quicksand,system-ui,sans-serif;color:#2C2356;line-height:1.5" role="dialog" aria-modal="true">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
          '<h3 style="margin:0;font-size:1.15rem">💌 Tenho interesse</h3>' +
          '<button id="lead-x" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#6E6989" aria-label="Fechar">✕</button></div>' +
        '<p style="margin:0 0 14px;font-size:.85rem;color:#6E6989">Deixa o teu contacto a <b>' + esc(crecheNome || "esta creche") + '</b> — a creche recebe os teus dados no painel e contacta-te diretamente.</p>' +
        '<label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">O teu nome *</label>' +
        '<input id="lead-nome" maxlength="120" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem">' +
        '<label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">Email *</label>' +
        '<input id="lead-email" type="email" maxlength="120" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem">' +
        '<label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">Telefone (opcional)</label>' +
        '<input id="lead-tel" type="tel" maxlength="30" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div><label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">Idade da criança</label>' +
          '<select id="lead-idade" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem">' +
            '<option>Ainda não nasceu</option><option>0-12 meses</option><option>1-2 anos</option><option>2-3 anos</option><option>3 anos ou mais</option></select></div>' +
          '<div><label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">Entrada desejada</label>' +
          '<input id="lead-mes" maxlength="40" placeholder="Ex.: Setembro 2026" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem"></div></div>' +
        '<label style="display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px">Mensagem (opcional)</label>' +
        '<textarea id="lead-msg" maxlength="400" style="width:100%;box-sizing:border-box;min-height:64px;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:.92rem;resize:vertical"></textarea>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.78rem;color:#6E6989;margin:12px 0">' +
          '<input id="lead-rgpd" type="checkbox" style="margin-top:2px;flex:none">' +
          '<span>Autorizo a partilha destes dados com a creche, apenas para me contactar sobre vagas e inscrição. Os dados nunca são vendidos nem usados para publicidade. *</span></label>' +
        '<div id="lead-err" style="display:none;background:#FFE2EC;color:#B4255C;font-size:.85rem;font-weight:600;padding:10px 14px;border-radius:10px;margin-bottom:10px"></div>' +
        '<button id="lead-send" style="width:100%;background:#FF6B9D;color:#fff;border:none;border-radius:12px;padding:13px;font-family:inherit;font-weight:700;font-size:.95rem;cursor:pointer">Enviar à creche 💌</button>' +
        '</div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function(e){ if(e.target === ov) ov.remove(); });
      document.getElementById("lead-x").onclick = function(){ ov.remove(); };
      document.getElementById("lead-send").onclick = function(){
        var errEl = document.getElementById("lead-err");
        function fail(m){ errEl.textContent = m; errEl.style.display = "block"; }
        errEl.style.display = "none";
        var nome = document.getElementById("lead-nome").value.trim();
        var email = document.getElementById("lead-email").value.trim();
        if(nome.length < 2) return fail("Escreve o teu nome.");
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Escreve um email válido — é assim que a creche te responde.");
        if(!document.getElementById("lead-rgpd").checked) return fail("Para enviarmos o contacto à creche, precisas de autorizar a partilha dos dados.");
        if(!_leadsCanSend()) return fail("Já enviaste 3 pedidos hoje. Tenta amanhã.");
        var btn = this; btn.disabled = true; btn.textContent = "⏳ A enviar…";
        try {
          // Campos opcionais são OMITIDOS (não null) — as regras validam "is string" quando presentes
          var payload = {
            creche_id: String(crecheId),
            nome: nome.slice(0,120),
            email: email.slice(0,120),
            idade_crianca: document.getElementById("lead-idade").value,
            consentimento: true,
            status: "novo",
            ts: firebase.firestore.FieldValue.serverTimestamp()
          };
          if(crecheNome) payload.creche_nome = String(crecheNome).slice(0,200);
          var tel = document.getElementById("lead-tel").value.trim().slice(0,30);
          if(tel) payload.telefone = tel;
          var mes = document.getElementById("lead-mes").value.trim().slice(0,40);
          if(mes) payload.mes_entrada = mes;
          var msg = document.getElementById("lead-msg").value.trim().slice(0,400);
          if(msg) payload.mensagem = msg;
          firebase.firestore().collection("creche_leads").add(payload).then(function(ref){
            _leadsBump();
            // Avisar a creche por email (best-effort; se o Resend não estiver configurado, 503 e segue)
            try {
              fetch("/api/lead-notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: ref.id })
              }).catch(function(){});
            } catch(e){}
            // Avisar a app (se estiver aberta): marca a creche como "Contactada" no pipeline do pai
            try { window.dispatchEvent(new CustomEvent("creches:lead", { detail: { creche_id: String(crecheId) } })); } catch(e){}
            ov.firstChild.innerHTML = '<div style="text-align:center;padding:26px 10px">' +
              '<div style="font-size:2.4rem">💌</div><h3 style="margin:10px 0 6px;color:#2C2356">Enviado!</h3>' +
              '<p style="font-size:.9rem;color:#6E6989;margin:0">A creche recebeu o teu contacto e vai responder-te diretamente. Boa sorte! 🍀</p>' +
              '<button onclick="document.getElementById(\'lead-modal-cp\').remove()" style="margin-top:16px;background:#FFE3D2;color:#2C2356;border:none;border-radius:12px;padding:11px 26px;font-family:inherit;font-weight:700;cursor:pointer">Fechar</button></div>';
          }).catch(function(e){
            fail("Não foi possível enviar: " + (e.message || e));
            btn.disabled = false; btn.textContent = "Enviar à creche 💌";
          });
        } catch(e){
          fail("Não foi possível enviar. Tenta novamente.");
          btn.disabled = false; btn.textContent = "Enviar à creche 💌";
        }
      };
    }
  };

  function render(slot, p){
    var box = document.createElement("div");
    box.id = "perfil-creche-box";
    box.style.cssText = "margin:18px 0;padding:20px;background:linear-gradient(135deg,#fff 0%,#DEF5E1 130%);border:1.5px solid #7DD389;border-radius:18px;font-family:inherit";
    var h = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<span style="background:#7DD389;color:#fff;font-size:.72rem;font-weight:800;padding:4px 12px;border-radius:999px">✓ INFORMAÇÃO DA CRECHE</span>' +
      '<span style="font-size:.72rem;color:#6E6989">atualizada pela própria creche</span></div>';

    // Vagas
    var v = p.vagas || {};
    var salas = [];
    if(v.b0) salas.push("Berçário (0-12m)");
    if(v.m12) salas.push("1-2 anos");
    if(v.m24) salas.push("2-3 anos");
    if(v.ji36) salas.push("3-6 anos (JI)");
    var quando = "";
    try { if(v.atualizado && v.atualizado.toDate) quando = " · " + v.atualizado.toDate().toLocaleDateString("pt-PT"); } catch(e){}
    if(salas.length){
      h += '<div style="margin:6px 0;font-weight:700;color:#1F7A3D">🟢 Vagas abertas: ' + esc(salas.join(" · ")) + '<span style="font-weight:400;font-size:.75rem;color:#6E6989">' + quando + '</span></div>';
    } else if(v.atualizado){
      h += '<div style="margin:6px 0;font-weight:700;color:#B4255C">🔴 Sem vagas de momento<span style="font-weight:400;font-size:.75rem;color:#6E6989">' + quando + '</span></div>';
    }

    // Creche Feliz
    if(p.creche_feliz === true)  h += '<div style="margin:6px 0;font-size:.9rem">🍼 <b>Adere ao Creche Feliz</b> (creche gratuita para elegíveis)</div>';
    if(p.creche_feliz === false) h += '<div style="margin:6px 0;font-size:.9rem;color:#6E6989">🍼 Não adere ao programa Creche Feliz</div>';

    // Mensalidade / horário
    var extra = [];
    if(p.mensalidade_min != null || p.mensalidade_max != null){
      var m = "💶 Mensalidade";
      if(p.mensalidade_min != null) m += " desde " + p.mensalidade_min + "€";
      if(p.mensalidade_max != null) m += " até " + p.mensalidade_max + "€";
      extra.push(m);
    }
    if(p.horario) extra.push("🕐 " + esc(p.horario));
    if(p.capacidade != null) extra.push("👶 Capacidade: " + esc(String(p.capacidade)) + " crianças");
    if(p.valencias && p.valencias.length) extra.push("🏫 " + esc(p.valencias.join(" · ")));
    if(p.linguas) extra.push("🗣 " + esc(p.linguas));
    if(extra.length) h += '<div style="margin:6px 0;font-size:.9rem">' + extra.join(" &nbsp;·&nbsp; ") + '</div>';

    // Fase 2 — CTA primário: deixar contacto à creche (canal rastreável)
    h += '<button id="btn-lead-cp" style="margin:12px 0 2px;width:100%;background:#FF6B9D;color:#fff;border:none;border-radius:12px;padding:12px;font-family:inherit;font-weight:700;font-size:.95rem;cursor:pointer">💌 Tenho interesse — deixar contacto</button>' +
      '<div style="text-align:center;font-size:.72rem;color:#6E6989;margin-bottom:8px">A creche recebe o teu contacto e responde-te diretamente</div>';

    // Descrição
    if(p.descricao){
      var d = String(p.descricao);
      if(d.length > 420) d = d.slice(0, 420) + "…";
      h += '<p style="margin:10px 0 6px;font-size:.92rem;line-height:1.55;color:#2C2356">' + esc(d) + '</p>';
    }

    // Fotos aprovadas
    var fotos = (p.fotos || []).slice(0, 6);
    if(fotos.length){
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px">' +
        fotos.map(function(u){
          return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Fotografia da creche" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;display:block"></a>';
        }).join("") + '</div>';
    }

    // Contactos preferidos
    var ct = [];
    if(p.contacto_telefone) ct.push('<a href="tel:' + esc(p.contacto_telefone.replace(/\s+/g,"")) + '" style="color:#FF6B9D;font-weight:700">📞 ' + esc(p.contacto_telefone) + '</a>');
    if(p.contacto_email) ct.push('<a href="mailto:' + esc(p.contacto_email) + '" style="color:#FF6B9D;font-weight:700">✉️ ' + esc(p.contacto_email) + '</a>');
    if(p.website){
      var w = p.website.indexOf("http") === 0 ? p.website : "https://" + p.website;
      ct.push('<a href="' + esc(w) + '" target="_blank" rel="noopener" style="color:#FF6B9D;font-weight:700">🌐 Website</a>');
    }
    if(ct.length) h += '<div style="margin-top:10px;font-size:.9rem;display:flex;gap:16px;flex-wrap:wrap">' + ct.join("") + '</div>';

    box.innerHTML = h;
    slot.insertAdjacentElement("afterend", box);
    var lb = document.getElementById("btn-lead-cp");
    if(lb) lb.onclick = function(){
      var nome = "";
      try { nome = document.querySelector("h1") ? document.querySelector("h1").textContent.trim() : ""; } catch(e){}
      window.CrecheLeads.open(slotCrecheId(), nome);
    };
  }
  function slotCrecheId(){
    var slot = document.getElementById("vaga-slot");
    return slot ? slot.dataset.crecheId : "";
  }

  function init(){
    if(!window.firebase || !firebase.firestore) return;
    var slot = document.getElementById("vaga-slot");
    if(!slot || !slot.dataset.crecheId) return;
    try {
      firebase.firestore().doc("creche_profiles/" + slot.dataset.crecheId).get().then(function(snap){
        var p = snap.exists ? snap.data() : {};
        // Só mostra o cartão se houver conteúdo relevante
        var tem = p.descricao || p.horario || (p.fotos && p.fotos.length) ||
                  p.creche_feliz === true || p.creche_feliz === false ||
                  (p.vagas && (p.vagas.b0 || p.vagas.m12 || p.vagas.m24 || p.vagas.atualizado)) ||
                  p.mensalidade_min != null || p.capacidade != null ||
                  (p.valencias && p.valencias.length) || p.linguas;
        if(tem){ render(slot, p); return; }
        // Creche não aderente — nudge suave (pais sabem o que perdem; creches sabem o caminho)
        var note = document.createElement("div");
        note.style.cssText = "margin:14px 0;padding:10px 14px;background:#FFF6EE;border-radius:12px;font-size:.82rem;color:#6E6989;font-family:inherit";
        note.innerHTML = '💡 Esta creche ainda não gere a sua página no creches.app. Nas creches aderentes <span style="background:#7DD389;color:#fff;font-size:.62rem;font-weight:800;padding:2px 8px;border-radius:999px">✓</span> podes deixar o teu contacto diretamente pela app. É desta creche? <a href="/painel" style="color:#FF6B9D;font-weight:700">Adira gratuitamente</a>.';
        slot.insertAdjacentElement("afterend", note);
      }).catch(function(){});
    } catch(e){}
  }

  window.addEventListener("load", function(){ setTimeout(init, 900); });
})();
