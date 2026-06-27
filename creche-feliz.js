/* Creches.app — Reports Creche Feliz (Onda 32)
   Mesma arquitectura das Vagas mas sem expiração (adesão é estável).
   API global: window.CrecheFelizReports.{getActive, report, badgeHTML, daysAgo}
*/
(function(){
  const COLL = "creche_feliz_reports";
  const RATE_KEY = "crechespt/cf/rate";
  const RATE_MAX_PER_DAY = 10;

  function db(){
    if(!window.firebase) return null;
    try { return firebase.firestore(); } catch(e){ return null; }
  }

  function nowMs(){ return Date.now(); }

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

  const CF = {
    /** Reports activos (valido=true) para uma creche */
    async getActive(crecheId){
      const fdb = db();
      if(!fdb || !crecheId) return [];
      try {
        const snap = await fdb.collection(COLL)
          .where("creche_id", "==", crecheId)
          .get();
        const out = [];
        snap.forEach(doc => {
          const v = doc.data();
          if(v.valido !== false) out.push({ id: doc.id, ...v });
        });
        out.sort((a,b) => {
          const ta = a.reportado_em && a.reportado_em.toMillis ? a.reportado_em.toMillis() : 0;
          const tb = b.reportado_em && b.reportado_em.toMillis ? b.reportado_em.toMillis() : 0;
          return tb - ta;
        });
        return out;
      } catch(e){
        console.warn("Erro a ler creche feliz reports:", e);
        return [];
      }
    },

    /** True se houver pelo menos 1 report válido */
    async hasActive(crecheId){
      const r = await this.getActive(crecheId);
      return r.length > 0;
    },

    daysAgo(timestamp){
      const ts = timestamp && timestamp.toMillis ? timestamp.toMillis() : timestamp;
      if(!ts) return "?";
      const diffMs = nowMs() - ts;
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor(diffMs / 3600000);
      if(days === 0 && hours === 0) return "agora mesmo";
      if(days === 0) return `há ${hours}h`;
      if(days === 1) return "há 1 dia";
      if(days < 30) return `há ${days} dias`;
      const months = Math.floor(days / 30);
      return months === 1 ? "há 1 mês" : `há ${months} meses`;
    },

    /** Reporta adesão — source "pai" (anónimo) ou "creche" (com email) */
    async report({ creche_id, nome_creche, source, email, nome }){
      const fdb = db();
      if(!fdb) throw new Error("Firebase não disponível");
      if(!creche_id) throw new Error("creche_id obrigatório");

      if(source === "pai" && !_canReport()){
        throw new Error("Já reportaste muitas creches hoje. Tenta amanhã.");
      }

      const now = firebase.firestore.FieldValue.serverTimestamp();

      const doc = {
        creche_id,
        nome_creche: nome_creche || null,
        source: source === "creche" ? "creche" : "pai",
        verificado: false,
        valido: true,  // pode ser marcado false por admin se for falso positivo
        reportado_em: now,
        reportado_por: source === "creche"
          ? { email: (email || "").trim().toLowerCase() }
          : { nome: nome ? nome.slice(0, 40) : null }
      };

      const ref = await fdb.collection(COLL).add(doc);
      if(source === "pai") _bumpRate();
      return ref.id;
    },

    /** Badge HTML — mostrar "🆓 Creche Feliz aderente" */
    badgeHTML(reports){
      const verified = reports.find(r => r.verificado);
      const fromCreche = reports.find(r => r.source === "creche");
      const fromPais = reports.filter(r => r.source === "pai");

      const sourceLabel = verified
        ? "✓ Confirmada pela creche"
        : (fromCreche ? "⏳ Creche aguarda confirmação"
        : fromPais.length >= 2 ? `ℹ Reportada por ${fromPais.length} pais`
        : "ℹ Reportada por pai");

      return `
        <div class="cf-badge" style="background:linear-gradient(135deg,#DEF5E1,#F0FBF2);border-left:4px solid #7DD389;padding:12px 14px;border-radius:14px;margin:0 0 14px;font-size:14px;color:#1F4F2A;line-height:1.45">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="background:linear-gradient(135deg,#7DD389,#5BC077);color:#fff;padding:4px 10px;border-radius:99px;font-weight:700;font-size:12.5px;display:inline-flex;align-items:center;gap:5px">🆓 Creche Feliz</span>
            <small style="color:#3D6D45;font-weight:600">aderente ao programa</small>
          </div>
          <div style="margin-top:6px;font-size:12.5px;color:#3D6D45">
            ${sourceLabel} — confirma com a creche que tem vaga ao abrigo do programa.
          </div>
        </div>
      `;
    },

    /** Render rápido — insere badge se houver reports válidos */
    async renderBadgeInto(element, crecheId, fallbackCrecheFeliz){
      if(!element || !crecheId) return;
      // Se a creche já está marcada como creche_feliz no dataset/override, mostra a badge "confirmada"
      if(fallbackCrecheFeliz){
        element.innerHTML = this.badgeHTML([{ verificado: true, source: "creche" }]);
        return;
      }
      const reports = await this.getActive(crecheId);
      if(reports.length === 0) return;
      element.innerHTML = this.badgeHTML(reports);
    }
  };

  window.CrecheFelizReports = CF;
})();
