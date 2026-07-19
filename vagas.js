/* Creches.app — Vagas em tempo real (MVP)
   Lib JS para reportar vagas + mostrar estado actual.
   Usa Firebase Firestore (window.firebase deve estar carregado primeiro).
   API global: window.Vagas.{get, getActive, report, hasActive, daysAgo, subscribeAlert, hasAlert}
*/
(function(){
  const COLL = "vagas";
  const ALERTS_COLL = "vaga_alerts";
  const TTL_DAYS = 30;   // 1 mês (ou até alguém reportar "sem vaga")
  const RATE_KEY = "crechespt/vagas/rate";
  const ALERTS_KEY = "crechespt/alertas";
  const RATE_MAX_PER_DAY = 5;

  function db(){
    if(!window.firebase) return null;
    try { return firebase.firestore(); } catch(e){ return null; }
  }

  function nowMs(){ return Date.now(); }

  // ─── Rate limit client-side ───
  function _canReport(){
    try {
      const raw = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
      const today = new Date().toISOString().slice(0,10);
      if(raw.day !== today) return true;
      return (raw.count || 0) < RATE_MAX_PER_DAY;
    } catch(e){ return true; }
  }
  function _bumpRate(){
    try {
      const today = new Date().toISOString().slice(0,10);
      const raw = JSON.parse(localStorage.getItem(RATE_KEY) || "{}");
      const next = raw.day === today
        ? { day: today, count: (raw.count || 0) + 1 }
        : { day: today, count: 1 };
      localStorage.setItem(RATE_KEY, JSON.stringify(next));
    } catch(e){}
  }

  // ─── Alertas subscritos (localStorage, só para a UI mostrar "✓ Alerta ativo") ───
  function _alertIds(){
    try {
      const raw = JSON.parse(localStorage.getItem(ALERTS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch(e){ return []; }
  }
  function _rememberAlert(crecheId){
    try {
      const ids = _alertIds();
      if(!ids.includes(crecheId)) ids.push(crecheId);
      localStorage.setItem(ALERTS_KEY, JSON.stringify(ids.slice(-100)));
    } catch(e){}
  }

  // ─── API ───
  const Vagas = {

    /** Devolve vagas activas (não expiradas) de uma creche */
    async getActive(crecheId){
      const fdb = db();
      if(!fdb || !crecheId) return [];
      try {
        const snap = await fdb.collection(COLL)
          .where("creche_id", "==", crecheId)
          .get();
        const now = nowMs();
        const out = [];
        // 1.ª passagem: último report "sem vaga" (não expirado) desta creche
        let semVagaTs = 0;
        snap.forEach(doc => {
          const v = doc.data();
          if(v.tipo !== "sem_vaga") return;
          const exp = v.expires_at && v.expires_at.toMillis ? v.expires_at.toMillis() : (v.expires_at || 0);
          if(exp <= now) return;
          const ts = v.reportado_em && v.reportado_em.toMillis ? v.reportado_em.toMillis() : 0;
          if(ts > semVagaTs) semVagaTs = ts;
        });
        // 2.ª passagem: vagas ativas — um "sem vaga" posterior cancela reports de pais
        // (vagas confirmadas pela creche no painel mantêm-se: a creche é a autoridade)
        snap.forEach(doc => {
          const v = doc.data();
          if(v.tipo === "sem_vaga") return;
          const exp = v.expires_at && v.expires_at.toMillis ? v.expires_at.toMillis() : (v.expires_at || 0);
          if(exp <= now) return;
          if(!v.verificado && semVagaTs){
            const ts = v.reportado_em && v.reportado_em.toMillis ? v.reportado_em.toMillis() : 0;
            if(ts <= semVagaTs) return;   // cancelada por report "sem vaga" mais recente
          }
          out.push({ id: doc.id, ...v });
        });
        // Ordenar: verificadas pela creche (painel) primeiro, depois mais recentes
        out.sort((a,b) => {
          const va = a.verificado ? 1 : 0, vb = b.verificado ? 1 : 0;
          if(va !== vb) return vb - va;
          const ta = a.reportado_em && a.reportado_em.toMillis ? a.reportado_em.toMillis() : 0;
          const tb = b.reportado_em && b.reportado_em.toMillis ? b.reportado_em.toMillis() : 0;
          return tb - ta;
        });
        return out;
      } catch(e){
        console.warn("Erro a ler vagas:", e);
        return [];
      }
    },

    /** True se a creche tem vaga activa */
    async hasActive(crecheId){
      const v = await this.getActive(crecheId);
      return v.length > 0;
    },

    /** Formato amigável "há X dias" */
    daysAgo(timestamp){
      const ts = timestamp && timestamp.toMillis ? timestamp.toMillis() : timestamp;
      if(!ts) return "?";
      const diffMs = nowMs() - ts;
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor(diffMs / 3600000);
      if(days === 0 && hours === 0) return "agora mesmo";
      if(days === 0) return `há ${hours}h`;
      if(days === 1) return "há 1 dia";
      return `há ${days} dias`;
    },

    /** Diz se uma vaga está "fresh" (< 5 dias) ou "old" (5-7 dias) */
    freshness(vaga){
      // Vagas geridas pela creche no painel: sempre "fresh" (a creche controla e expira aos 31d)
      if(vaga.source === "painel" && vaga.verificado) return "fresh";
      const ts = vaga.reportado_em && vaga.reportado_em.toMillis
        ? vaga.reportado_em.toMillis() : 0;
      const days = (nowMs() - ts) / 86400000;
      if(days < 5) return "fresh";   // verde brilhante
      if(days < 14) return "normal"; // verde normal
      return "old";                  // amarelo (14-30 dias)
    },

    /** Reporta vaga — source pode ser "pai" ou "creche" */
    async report({ creche_id, nome_creche, source, idades, notas, email, nome }){
      const fdb = db();
      if(!fdb) throw new Error("Firebase não disponível");
      if(!creche_id) throw new Error("creche_id obrigatório");

      // Rate limit pais
      if(source === "pai" && !_canReport()){
        throw new Error("Já reportaste 5 vagas hoje. Tenta amanhã.");
      }

      const now = firebase.firestore.FieldValue.serverTimestamp();
      const expires = firebase.firestore.Timestamp.fromMillis(
        nowMs() + TTL_DAYS * 86400000
      );

      const doc = {
        creche_id,
        nome_creche: nome_creche || null,
        source: source === "creche" ? "creche" : "pai",
        verificado: false,  // só fica true após validação email (creches)
        idades: Array.isArray(idades) ? idades.slice(0, 5) : [],
        notas: (notas || "").slice(0, 280),
        reportado_em: now,
        expires_at: expires,
        reportado_por: source === "creche"
          ? { email: (email || "").trim().toLowerCase() }
          : { nome: nome ? nome.slice(0, 40) : null }
      };

      const ref = await fdb.collection(COLL).add(doc);

      if(source === "pai") _bumpRate();

      // Avisar pais subscritos (alertas de vaga) — fire and forget, nunca bloqueia o report.
      // (report() nunca cria docs tipo "sem_vaga" — esses vêm de reportSemVaga.)
      try {
        fetch("/api/vaga-alert-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creche_id, vaga_id: ref.id })
        }).catch(()=>{});
      } catch(e){}

      return ref.id;
    },

    /** Reporta que AFINAL NÃO há vaga — cancela reports de pais anteriores.
        Vagas confirmadas pela creche (painel) não são afetadas. */
    async reportSemVaga(creche_id, nome_creche){
      const fdb = db();
      if(!fdb) throw new Error("Firebase não disponível");
      if(!creche_id) throw new Error("creche_id obrigatório");
      if(!_canReport()) throw new Error("Já reportaste 5 vezes hoje. Tenta amanhã.");

      const doc = {
        creche_id,
        nome_creche: nome_creche || null,
        source: "pai",
        tipo: "sem_vaga",
        verificado: false,
        idades: [],
        notas: "",
        reportado_em: firebase.firestore.FieldValue.serverTimestamp(),
        expires_at: firebase.firestore.Timestamp.fromMillis(nowMs() + TTL_DAYS * 86400000),
        reportado_por: { nome: null }
      };
      const ref = await fdb.collection(COLL).add(doc);
      _bumpRate();
      return ref.id;
    },

    /** Prompt simples chamado a partir do badge ("Já não há vaga?") */
    async semVagaPrompt(crecheId, nomeEnc){
      const nome = nomeEnc ? decodeURIComponent(nomeEnc) : "";
      if(!confirm(`Confirmas que ${nome || "esta creche"} já NÃO tem vaga?\n\nO aviso de vaga reportada por pais deixa de aparecer no mapa.`)) return;
      try {
        await this.reportSemVaga(crecheId, nome);
        document.querySelectorAll(".vaga-badge").forEach(el => {
          if(el.dataset.crecheId === crecheId) el.remove();
        });
        alert("Obrigado! O report foi registado e a vaga vai deixar de aparecer. 💛");
      } catch(e){
        alert("Erro: " + (e.message || e));
      }
    },

    /** True se este browser já subscreveu alerta para esta creche */
    hasAlert(crecheId){
      return !!crecheId && _alertIds().includes(crecheId);
    },

    /** Subscreve alerta de vaga — o pai recebe email quando alguém reportar vaga.
        Cria doc em vaga_alerts (só o Admin SDK lê) e memoriza em localStorage. */
    async subscribeAlert({ creche_id, nome_creche, email }){
      const fdb = db();
      if(!fdb) throw new Error("A app ainda está a carregar — tenta daqui a uns segundos.");
      if(!creche_id) throw new Error("creche_id obrigatório");
      const mail = String(email || "").trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || mail.length > 120){
        throw new Error("Esse email não parece válido — confirma e tenta outra vez.");
      }
      try {
        await fdb.collection(ALERTS_COLL).add({
          creche_id: String(creche_id).slice(0, 60),
          nome_creche: nome_creche ? String(nome_creche).slice(0, 120) : null,
          email: mail,
          criado_em: firebase.firestore.FieldValue.serverTimestamp(),
          notificado_em: null
        });
        _rememberAlert(creche_id);
        return true;
      } catch(e){
        console.warn("Erro a criar alerta:", e);
        throw new Error("Não conseguimos ativar o alerta. Verifica a ligação à internet e tenta outra vez.");
      }
    },

    /** Gera HTML do badge "vaga aberta" — para inserir em fichas/popups */
    badgeHTML(vaga){
      const fresh = this.freshness(vaga);
      const colorBg = fresh === "fresh" ? "#7DD389" :
                      fresh === "normal" ? "#A0D9A6" : "#FFD166";
      const colorTxt = fresh === "old" ? "#7B5500" : "#fff";
      const colorLight = fresh === "old" ? "#FFF3D6" : "#DEF5E1";
      const sourceLabel = vaga.verificado
        ? "✓ Confirmada pela creche"
        : (vaga.source === "creche" ? "⏳ A confirmar email" : "ℹ Reportada por pai");
      const when = this.daysAgo(vaga.reportado_em);
      const oldNote = fresh === "old"
        ? `<br><small style="opacity:.85">Pode já não estar disponível — liga para confirmar</small>`
        : "";
      // Reports de pais podem ser cancelados por outro pai ("afinal não há")
      const cid = (vaga.creche_id || "").replace(/"/g, "");
      const nomeEnc = encodeURIComponent(vaga.nome_creche || "");
      const semVagaLink = !vaga.verificado
        ? `<div style="margin-top:7px"><a href="#" onclick="event.preventDefault();window.Vagas&&window.Vagas.semVagaPrompt('${cid}','${nomeEnc}')" style="font-size:11.5px;color:#9B97B5;text-decoration:underline">Ligaste e afinal não há vaga? Diz-nos</a></div>`
        : "";
      return `
        <div class="vaga-badge" data-creche-id="${cid}" style="background:${colorLight};border-left:4px solid ${colorBg};padding:12px 14px;border-radius:14px;margin:0 0 14px;font-size:14px;color:#2C2356;line-height:1.45">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="background:${colorBg};color:${colorTxt};padding:4px 10px;border-radius:99px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:5px">🟢 Vaga aberta</span>
            <small style="color:#5A4A20;font-weight:600">${when}</small>
          </div>
          <div style="margin-top:6px;font-size:12.5px;color:#4A4060">
            ${sourceLabel}${oldNote}
          </div>
          ${semVagaLink}
        </div>
      `;
    },

    /** Render rápido: insere badge num element se houver vaga activa */
    async renderBadgeInto(element, crecheId){
      if(!element || !crecheId) return;
      const vagas = await this.getActive(crecheId);
      if(vagas.length === 0) return;
      element.innerHTML = this.badgeHTML(vagas[0]);
    }
  };

  window.Vagas = Vagas;
})();
