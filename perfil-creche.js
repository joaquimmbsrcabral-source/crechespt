/* Creches.app — Perfil verificado da creche (público)
   Lê creche_profiles/{id} do Firestore (leitura pública) e injecta
   um cartão "gerido pela creche" na ficha, por baixo do vaga-slot.
   Inclui o módulo CrecheLeads ("Tenho interesse 💌") — partilhado com o /app.
   Inclui o módulo CrecheStats (taxa de resposta) — partilhado com o /app.
   Requer firebase app+firestore compat já carregados na página. */
(function(){
  function esc(s){ return String(s||"").replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

  // ═══════ CrecheStats — capacidade de resposta (Vaga 1 · 1.1) ═══════
  // Lê o agregado creche_stats/{id} (público, sem dados pessoais) alimentado
  // pelas respostas dos pais ao follow-up "A creche respondeu-te?".
  //
  // DECISÃO DELIBERADA: só mostramos o sinal quando é POSITIVO.
  // A amostra é enviesada (historicamente só perguntávamos a leads que a creche
  // nunca marcou como contactados), por isso uma percentagem baixa pode dizer
  // mais sobre o uso do painel do que sobre a creche. Premiar quem responde é
  // justo; expor quem aparenta não responder, com esta amostra, não é.
  // Quando a amostra estiver saudável, baixa-se o MIN_PCT.
  var STATS_MIN_RESPOSTAS = 5;    // abaixo disto não há sinal, há ruído
  var STATS_MIN_PCT = 0.7;        // "costuma responder" tem de ser verdade: 7 em 10
  var _statsCache = {};

  function _statsFrase(sim, total){
    var emCada10 = Math.round((sim / total) * 10);
    if(emCada10 >= 10) return "Todas as famílias que deixaram contacto aqui tiveram resposta";
    return emCada10 + " em cada 10 famílias que deixaram contacto aqui tiveram resposta";
  }

  window.CrecheStats = {
    // Devolve uma Promise com {sim,total,pct} ou null. Cache por id.
    get: function(crecheId){
      if(!crecheId || !window.firebase || !firebase.firestore) return Promise.resolve(null);
      var id = String(crecheId);
      if(_statsCache[id] !== undefined) return Promise.resolve(_statsCache[id]);
      return firebase.firestore().doc("creche_stats/" + id).get().then(function(snap){
        var d = snap.exists ? (snap.data() || {}) : {};
        var total = Number(d.respostas_total || 0);
        var sim = Number(d.respostas_sim || 0);
        var out = total > 0 ? { sim: sim, total: total, pct: sim / total } : null;
        _statsCache[id] = out;
        return out;
      }).catch(function(){ return null; });
    },
    // HTML do selo, ou "" se não houver sinal suficiente. compact = versão /app.
    html: function(st, compact){
      if(!st || st.total < STATS_MIN_RESPOSTAS || st.pct < STATS_MIN_PCT) return "";
      var fs = compact ? "12px" : ".82rem";
      return '<div style="display:flex;gap:9px;align-items:flex-start;margin:10px 0;padding:10px 13px;' +
        'background:#DEF5E1;border:1px solid #7DD389;border-radius:12px;font-size:' + fs + ';color:#1F7A3D;line-height:1.45;font-family:inherit">' +
        '<span style="flex:none;font-size:1.05em">💬</span>' +
        '<span><b>Costuma responder às famílias.</b> ' + esc(_statsFrase(st.sim, st.total)) +
        ' <span style="color:#4E7A5B;font-weight:600">(' + st.total + ' ' + (st.total === 1 ? "família respondeu-nos" : "famílias responderam-nos") + ')</span></span></div>';
    },
    // Injecta o selo dentro de um elemento, se houver sinal.
    renderInto: function(el, crecheId, compact){
      if(!el) return;
      window.CrecheStats.get(crecheId).then(function(st){
        var h = window.CrecheStats.html(st, compact);
        if(h) el.innerHTML = h;
      });
    }
  };

  // ═══════ CrecheLeads — famílias deixam contacto às creches ═══════
  var LEADS_RATE_KEY = "crechespt/leads/rate";
  var LEADS_PERFIL_KEY = "crechespt/lead/perfil";   // 1.6 — memória entre pedidos

  function _leadsCanSend(){
    try {
      var raw = JSON.parse(localStorage.getItem(LEADS_RATE_KEY) || "{}");
      var today = new Date().toISOString().slice(0,10);
      return raw.day !== today || (raw.count || 0) < 8;
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
  // 1.6 — guardar/recuperar os dados que não mudam de creche para creche
  function _perfilLer(){
    try { return JSON.parse(localStorage.getItem(LEADS_PERFIL_KEY) || "{}") || {}; }
    catch(e){ return {}; }
  }
  function _perfilGuardar(p){
    try { localStorage.setItem(LEADS_PERFIL_KEY, JSON.stringify(p)); } catch(e){}
  }

  // ── 1.4 — data de nascimento real (aceita datas futuras: "ainda não nasceu") ──
  var MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
               "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  function _idadeLegivel(iso){
    if(!iso) return "";
    var d = new Date(iso + "T12:00:00");
    if(isNaN(d.getTime())) return "";
    var hoje = new Date();
    if(d > hoje){
      return "Ainda não nasceu (prev. " + MESES[d.getMonth()] + " " + d.getFullYear() + ")";
    }
    var meses = (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());
    if(hoje.getDate() < d.getDate()) meses--;
    if(meses < 0) meses = 0;
    if(meses < 12) return meses + (meses === 1 ? " mês" : " meses");
    var anos = Math.floor(meses / 12), resto = meses % 12;
    return anos + (anos === 1 ? " ano" : " anos") + (resto ? " e " + resto + (resto === 1 ? " mês" : " meses") : "");
  }

  // ── 1.5 — data de início estruturada (mês + ano em vez de texto livre) ──
  function _opcoesInicio(sel){
    var hoje = new Date(), out = "";
    out += '<option value=""' + (sel ? "" : " selected") + '>Assim que houver vaga</option>';
    for(var i = 0; i < 30; i++){
      var d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      var ym = d.getFullYear() + "-" + ("0" + (d.getMonth()+1)).slice(-2);
      var lbl = MESES[d.getMonth()] + " " + d.getFullYear();
      out += '<option value="' + ym + '"' + (sel === ym ? " selected" : "") + '>' + lbl + '</option>';
    }
    return out;
  }
  function _inicioLegivel(ym){
    if(!ym) return "";
    var p = ym.split("-");
    var m = parseInt(p[1], 10) - 1;
    return (MESES[m] || "") + " " + p[0];
  }

  var INPUT_CSS = "width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid rgba(60,40,90,.12);border-radius:10px;font-family:inherit;font-size:16px;background:#fff;color:#2C2356";
  var LABEL_CSS = "display:block;font-size:.78rem;font-weight:700;color:#6E6989;margin:10px 0 4px";

  window.CrecheLeads = {
    /* crecheId, crecheNome, opts:
         { aderente:Boolean }  — muda a explicação do que vai acontecer a seguir */
    open: function(crecheId, crecheNome, opts){
      opts = opts || {};
      var aderente = opts.aderente !== false;
      var mem = _perfilLer();

      var old = document.getElementById("lead-modal-cp");
      if(old) old.remove();
      var ov = document.createElement("div");
      ov.id = "lead-modal-cp";
      ov.style.cssText = "position:fixed;inset:0;background:rgba(44,35,86,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px";

      var explica = aderente
        ? 'Deixa o teu contacto a <b>' + esc(crecheNome || "esta creche") + '</b> — a creche recebe os teus dados no painel e contacta-te diretamente.'
        : 'Enviamos o teu contacto por email a <b>' + esc(crecheNome || "esta creche") + '</b>. Esta creche ainda não gere a página no creches.app, por isso a resposta depende dela — mas nós tratamos de te avisar e de insistir se for preciso.';

      // Limites da data de nascimento: até 7 anos atrás, até 1 ano à frente
      var _h = new Date();
      var minDob = new Date(_h.getFullYear() - 7, _h.getMonth(), _h.getDate()).toISOString().slice(0,10);
      var maxDob = new Date(_h.getFullYear() + 1, _h.getMonth(), _h.getDate()).toISOString().slice(0,10);

      ov.innerHTML =
        '<div style="background:#fff;border-radius:18px;max-width:440px;width:100%;max-height:92vh;overflow:auto;padding:24px;font-family:Quicksand,system-ui,sans-serif;color:#2C2356;line-height:1.5" role="dialog" aria-modal="true" aria-labelledby="lead-h">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
          '<h3 id="lead-h" style="margin:0;font-size:1.15rem">💌 Tenho interesse</h3>' +
          '<button id="lead-x" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:#6E6989" aria-label="Fechar">✕</button></div>' +
        '<p style="margin:0 0 14px;font-size:.85rem;color:#6E6989">' + explica + '</p>' +
        (mem.nome ? '<div style="background:#FFF6EE;border-radius:10px;padding:8px 12px;font-size:.76rem;color:#6E6989;margin-bottom:10px">✨ Preenchemos com os dados do teu último pedido — confirma e envia.</div>' : "") +
        '<label for="lead-nome" style="' + LABEL_CSS + '">O teu nome *</label>' +
        '<input id="lead-nome" maxlength="120" value="' + esc(mem.nome || "") + '" style="' + INPUT_CSS + '">' +
        '<label for="lead-email" style="' + LABEL_CSS + '">Email *</label>' +
        '<input id="lead-email" type="email" maxlength="120" value="' + esc(mem.email || "") + '" style="' + INPUT_CSS + '">' +
        '<label for="lead-tel" style="' + LABEL_CSS + '">Telefone (opcional)</label>' +
        '<input id="lead-tel" type="tel" maxlength="30" value="' + esc(mem.telefone || "") + '" style="' + INPUT_CSS + '">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div><label for="lead-dob" style="' + LABEL_CSS + '">Nascimento da criança (opcional)</label>' +
          '<input id="lead-dob" type="date" min="' + minDob + '" max="' + maxDob + '" value="' + esc(mem.nascimento || "") + '" style="' + INPUT_CSS + '">' +
          '<div id="lead-dob-hint" style="font-size:.72rem;color:#6E6989;margin-top:4px;min-height:1em"></div></div>' +
          '<div><label for="lead-inicio" style="' + LABEL_CSS + '">Quando precisas de vaga</label>' +
          '<select id="lead-inicio" style="' + INPUT_CSS + '">' + _opcoesInicio(mem.inicio_ym || "") + '</select></div></div>' +
        '<label for="lead-msg" style="' + LABEL_CSS + '">Mensagem (opcional)</label>' +
        '<textarea id="lead-msg" maxlength="400" style="' + INPUT_CSS + ';min-height:64px;resize:vertical"></textarea>' +
        '<label style="display:flex;gap:8px;align-items:flex-start;font-size:.78rem;color:#6E6989;margin:12px 0">' +
          '<input id="lead-rgpd" type="checkbox" style="margin-top:2px;flex:none">' +
          '<span>Autorizo a partilha destes dados com a creche, apenas para me contactar sobre vagas e inscrição. ' +
          'A resposta da creche passa pelo creches.app e é-te reencaminhada — registamos que houve resposta e quando, ' +
          'nunca o conteúdo. Os dados não são vendidos nem usados para publicidade. *</span></label>' +
        '<div id="lead-err" style="display:none;background:#FFE2EC;color:#B4255C;font-size:.85rem;font-weight:600;padding:10px 14px;border-radius:10px;margin-bottom:10px"></div>' +
        '<button id="lead-send" style="width:100%;background:#FF6B9D;color:#fff;border:none;border-radius:12px;padding:13px;font-family:inherit;font-weight:700;font-size:.95rem;cursor:pointer">Enviar à creche 💌</button>' +
        '</div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function(e){ if(e.target === ov) ov.remove(); });
      document.getElementById("lead-x").onclick = function(){ ov.remove(); };

      // Feedback imediato da idade — confirma ao pai que a data está certa
      var dobEl = document.getElementById("lead-dob");
      var dobHint = document.getElementById("lead-dob-hint");
      function _dobSync(){
        var t = _idadeLegivel(dobEl.value);
        dobHint.textContent = t ? (t.indexOf("Ainda") === 0 ? t : "Terá " + t + " hoje") : "";
      }
      dobEl.addEventListener("change", _dobSync);
      dobEl.addEventListener("input", _dobSync);
      _dobSync();

      document.getElementById("lead-send").onclick = function(){
        var errEl = document.getElementById("lead-err");
        function fail(m){ errEl.textContent = m; errEl.style.display = "block"; }
        errEl.style.display = "none";
        var nome = document.getElementById("lead-nome").value.trim();
        var email = document.getElementById("lead-email").value.trim();
        if(nome.length < 2) return fail("Escreve o teu nome.");
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Escreve um email válido — é assim que a creche te responde.");
        if(!document.getElementById("lead-rgpd").checked) return fail("Para enviarmos o contacto à creche, precisas de autorizar a partilha dos dados.");
        if(!_leadsCanSend()) return fail("Já enviaste 8 pedidos hoje — é bom sinal! Para não sobrecarregar as creches, continua amanhã. Os pedidos de hoje ficam guardados.");
        var btn = this; btn.disabled = true; btn.textContent = "⏳ A enviar…";

        var dob = (dobEl.value || "").slice(0,10);
        var inicioYm = document.getElementById("lead-inicio").value || "";
        var tel = document.getElementById("lead-tel").value.trim().slice(0,30);

        // Token privado (128 bits) — dá à família um link para acompanhar a candidatura
        var tok = "";
        try {
          var arr = new Uint8Array(16); crypto.getRandomValues(arr);
          for(var bi=0; bi<arr.length; bi++) tok += ("0"+arr[bi].toString(16)).slice(-2);
        } catch(e){ tok = String(Date.now()) + Math.random().toString(36).slice(2,14); }

        try {
          // Campos opcionais são OMITIDOS (não null) — as regras validam "is string" quando presentes
          var payload = {
            creche_id: String(crecheId),
            nome: nome.slice(0,120),
            email: email.slice(0,120),
            // idade_crianca continua a existir (painel e emails leem-no) mas passa a ser
            // derivado da data real em vez de escolhido numa lista de intervalos
            idade_crianca: (_idadeLegivel(dob) || "Não indicada").slice(0,40),
            consentimento: true,
            status: "novo",
            ts: firebase.firestore.FieldValue.serverTimestamp()
          };
          if(crecheNome) payload.creche_nome = String(crecheNome).slice(0,200);
          if(tel) payload.telefone = tel;
          if(dob) payload.nascimento = dob;                       // 1.4 — data exata
          if(inicioYm){
            payload.inicio_ym = inicioYm;                          // 1.5 — agregável
            payload.mes_entrada = _inicioLegivel(inicioYm).slice(0,40);  // legível (retrocompatível)
          }
          var msg = document.getElementById("lead-msg").value.trim().slice(0,400);
          if(msg) payload.mensagem = msg;
          payload.token = tok;

          firebase.firestore().collection("creche_leads").add(payload).then(function(ref){
            // Espelho público SEM dados pessoais — é isto que a página /candidatura lê
            try {
              firebase.firestore().doc("lead_status/" + tok).set({
                creche_id: String(crecheId),
                creche_nome: crecheNome ? String(crecheNome).slice(0,200) : "",
                estado: "novo",
                atualizado: firebase.firestore.FieldValue.serverTimestamp()
              }).catch(function(){});
            } catch(e){}
            _leadsBump();
            // 1.6 — memoriza para o próximo pedido (nunca a mensagem, que é específica)
            _perfilGuardar({ nome: nome, email: email, telefone: tel, nascimento: dob, inicio_ym: inicioYm });

            // Avisar a creche por email. sendBeacon sobrevive ao fecho da página —
            // com fetch, se o pai fechasse o separador logo a seguir, o pedido morria
            // e o aviso nunca chegava à creche. keepalive no fetch faz o mesmo papel.
            try {
              var _body = JSON.stringify({ lead_id: ref.id });
              var _enviado = false;
              if(navigator.sendBeacon){
                try {
                  _enviado = navigator.sendBeacon("/api/lead-notify",
                    new Blob([_body], { type: "application/json" }));
                } catch(e){}
              }
              if(!_enviado){
                fetch("/api/lead-notify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: _body,
                  keepalive: true
                }).catch(function(){});
              }
            } catch(e){}
            // Avisar a app (se estiver aberta): marca a creche como "Contactada" no pipeline do pai
            try { window.dispatchEvent(new CustomEvent("creches:lead", { detail: { creche_id: String(crecheId) } })); } catch(e){}

            var linkAcomp = location.origin + "/candidatura?c=" + tok;
            ov.firstChild.innerHTML = '<div style="text-align:center;padding:22px 10px">' +
              '<div style="font-size:2.4rem">💌</div><h3 style="margin:10px 0 6px;color:#2C2356">Enviado!</h3>' +
              '<p style="font-size:.9rem;color:#6E6989;margin:0 0 14px">' +
                (aderente
                  ? 'A creche recebeu o teu contacto e vai responder-te diretamente. Boa sorte! 🍀'
                  : 'Enviámos o teu contacto por email à creche. Se não te responderem, avisamos-te e sugerimos alternativas. 🍀') +
              '</p>' +
              '<div style="background:#FFF6EE;border-radius:12px;padding:12px 14px;text-align:left">' +
                '<div style="font-size:.78rem;font-weight:700;color:#2C2356;margin-bottom:6px">📌 Acompanha a tua candidatura</div>' +
                '<div style="font-size:.72rem;color:#6E6989;margin-bottom:8px">Guarda este link privado — mostra-te o estado (recebida, em análise…) sem precisares de conta:</div>' +
                '<div style="display:flex;gap:6px">' +
                  '<input id="lead-link" readonly value="' + linkAcomp + '" style="flex:1;min-width:0;padding:8px 10px;border:1.5px solid rgba(60,40,90,.12);border-radius:8px;font-family:inherit;font-size:.72rem;color:#6E6989">' +
                  '<button id="lead-link-copy" style="flex:none;background:#FF6B9D;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-family:inherit;font-weight:700;font-size:.78rem;cursor:pointer">Copiar</button>' +
                '</div></div>' +
              '<button onclick="document.getElementById(\'lead-modal-cp\').remove()" style="margin-top:14px;background:#FFE3D2;color:#2C2356;border:none;border-radius:12px;padding:11px 26px;font-family:inherit;font-weight:700;cursor:pointer">Fechar</button></div>';
            var lc = document.getElementById("lead-link-copy");
            if(lc) lc.onclick = function(){
              var inp = document.getElementById("lead-link");
              inp.select();
              try { navigator.clipboard.writeText(inp.value); lc.textContent = "✓"; } catch(e){ document.execCommand("copy"); lc.textContent = "✓"; }
            };
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

  // ═══════ Cartão do perfil gerido pela creche ═══════
  function render(slot, p, stats){
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

    // 1.1 — capacidade de resposta (só quando o sinal é sólido)
    h += window.CrecheStats.html(stats, false);
    // O "Tenho interesse" vive no topo da ficha (#btn-lead-primary), gerado no
    // servidor. Repeti-lo aqui era pedir a mesma coisa duas vezes no mesmo ecrã.

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
  }

  // ═══════ 1.3 — Creche NÃO aderente: também dá para deixar contacto ═══════
  // Antes: só um aviso passivo, e o pai saía da app pelo tel:/mailto:. Resultado —
  // perdíamos o lead, o acompanhamento e a estatística na maioria das 2591 creches.
  // O api/lead-notify.js já sabe descobrir o email da creche no dataset público
  // (emailDoDataset), por isso basta haver email conhecido para o pedido chegar.
  function renderNaoAderente(slot, temEmail, stats){
    var h = window.CrecheStats.html(stats, false) +
      '<div style="font-size:.8rem;color:#6E6989;line-height:1.55">' +
      (temEmail
        ? 'Esta creche ainda não gere a sua página no creches.app — enviamos o teu pedido por email e avisamos-te se não responderem. '
        : '📭 Ainda não temos o email desta creche, por isso não conseguimos enviar o teu pedido por ti. Se souberes, <a href="/app" style="color:#FF6B9D;font-weight:700">ajuda-nos a corrigir</a>. ') +
      'É desta creche? <a href="/painel" style="color:#FF6B9D;font-weight:700">Adira gratuitamente</a>.</div>';

    var box = document.createElement("div");
    box.style.cssText = "margin:16px 0;padding:13px 16px;background:#FFF6EE;border-radius:14px;font-family:inherit";
    box.innerHTML = h;
    slot.insertAdjacentElement("afterend", box);
  }

  function init(){
    if(!window.firebase || !firebase.firestore) return;
    var slot = document.getElementById("vaga-slot");
    if(!slot || !slot.dataset.crecheId) return;
    var cid = slot.dataset.crecheId;
    var temEmail = !!slot.dataset.crecheEmail;
    try {
      Promise.all([
        firebase.firestore().doc("creche_profiles/" + cid).get().catch(function(){ return null; }),
        window.CrecheStats.get(cid)
      ]).then(function(res){
        var snap = res[0], stats = res[1];
        var p = (snap && snap.exists) ? snap.data() : {};
        // Só mostra o cartão verde se houver conteúdo relevante
        var tem = p.descricao || p.horario || (p.fotos && p.fotos.length) ||
                  p.creche_feliz === true || p.creche_feliz === false ||
                  (p.vagas && (p.vagas.b0 || p.vagas.m12 || p.vagas.m24 || p.vagas.atualizado)) ||
                  p.mensalidade_min != null || p.capacidade != null ||
                  (p.valencias && p.valencias.length) || p.linguas;
        if(tem) render(slot, p, stats);
        else renderNaoAderente(slot, temEmail, stats);
      }).catch(function(){});
    } catch(e){}
  }

  window.addEventListener("load", function(){ setTimeout(init, 900); });
})();
