/* Creches.app — Vagas em tempo real (MVP)
   Lib JS para reportar vagas + mostrar estado actual.
   Usa Firebase Firestore (window.firebase deve estar carregado primeiro).
   API global: window.Vagas.{get, getActive, report, hasActive, daysAgo}
*/
(function(){
  const COLL = "vagas";
  const TTL_DAYS = 7;
  const RATE_KEY = "crechespt/vagas/rate";
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
        snap.forEach(doc => {
          const v = doc.data();
          const exp = v.expires_at && v.expires_at.toMillis ? v.expires_at.toMillis() : (v.expires_at || 0);
          if(exp > now){
            out.push({ id: doc.id, ...v });
          }
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
      if(days < 3) return "fresh";   // verde brilhante
      if(days < 5) return "normal";  // verde normal
      return "old";                  // amarelo
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

      return ref.id;
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
      return `
        <div class="vaga-badge" style="background:${colorLight};border-left:4px solid ${colorBg};padding:12px 14px;border-radius:14px;margin:0 0 14px;font-size:14px;color:#2C2356;line-height:1.45">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="background:${colorBg};color:${colorTxt};padding:4px 10px;border-radius:99px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:5px">🟢 Vaga aberta</span>
            <small style="color:#5A4A20;font-weight:600">${when}</small>
          </div>
          <div style="margin-top:6px;font-size:12.5px;color:#4A4060">
            ${sourceLabel}${oldNote}
          </div>
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
