/* Creches.app — Perfil verificado da creche (público)
   Lê creche_profiles/{id} do Firestore (leitura pública) e injecta
   um cartão "gerido pela creche" na ficha, por baixo do vaga-slot.
   Requer firebase app+firestore compat já carregados na página. */
(function(){
  function esc(s){ return String(s||"").replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

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
    if(extra.length) h += '<div style="margin:6px 0;font-size:.9rem">' + extra.join(" &nbsp;·&nbsp; ") + '</div>';

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

  function init(){
    if(!window.firebase || !firebase.firestore) return;
    var slot = document.getElementById("vaga-slot");
    if(!slot || !slot.dataset.crecheId) return;
    try {
      firebase.firestore().doc("creche_profiles/" + slot.dataset.crecheId).get().then(function(snap){
        if(!snap.exists) return;
        var p = snap.data();
        // Só mostra se houver conteúdo relevante
        var tem = p.descricao || p.horario || (p.fotos && p.fotos.length) ||
                  p.creche_feliz === true || p.creche_feliz === false ||
                  (p.vagas && (p.vagas.b0 || p.vagas.m12 || p.vagas.m24 || p.vagas.atualizado)) ||
                  p.mensalidade_min != null;
        if(tem) render(slot, p);
      }).catch(function(){});
    } catch(e){}
  }

  window.addEventListener("load", function(){ setTimeout(init, 900); });
})();
