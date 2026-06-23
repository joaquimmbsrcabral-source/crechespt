/* Creches.app — Comparador (estado partilhado + sticky bar global)
   - Guarda até 3 creches em localStorage
   - Mostra sticky bar em qualquer página onde este script seja carregado
   - Expõe API global: window.Compare.{add, remove, has, count, list, clear, toggle}
   - Dispara evento "compareChange" quando lista muda
*/
(function(){
  const KEY = "crechespt/compare/v1";
  const MAX = 3;

  function read(){
    try{ return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch(e){ return []; }
  }
  function write(arr){
    try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch(e){}
    document.dispatchEvent(new CustomEvent("compareChange",{detail:{list:arr}}));
    renderBar();
  }

  function toast(msg){
    // toast simples (fallback se não houver função global)
    if(window.toast){ window.toast(msg,"ok",{duration:2500}); return; }
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2C2356;color:#fff;padding:10px 18px;border-radius:99px;font-family:Quicksand,sans-serif;font-size:13.5px;z-index:9999;box-shadow:0 8px 22px rgba(0,0,0,.25);opacity:0;transition:opacity .25s";
    document.body.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity = "1"; });
    setTimeout(()=>{ t.style.opacity = "0"; setTimeout(()=>t.remove(), 280); }, 2500);
  }

  const Compare = {
    list(){ return read(); },
    count(){ return read().length; },
    has(item){
      const id = typeof item === "string" ? item : item.id;
      return read().some(x => x.id === id);
    },
    add(item){
      const arr = read();
      if(arr.some(x => x.id === item.id)){ return false; }
      if(arr.length >= MAX){
        toast("Máximo 3 creches para comparar. Remove uma primeiro.");
        return false;
      }
      // Guardar só o essencial — quando aberta a /comparar, busca o resto
      arr.push({
        id: item.id,
        nome: item.nome,
        slug: item.slug || null,
        tipo: item.tipo || null,
        distrito: item.distrito || null,
        localidade: item.localidade || null,
        lat: item.lat || null,
        lon: item.lon || null
      });
      write(arr);
      toast(`✓ "${item.nome}" adicionada a comparar (${arr.length}/3)`);
      return true;
    },
    remove(id){
      const arr = read().filter(x => x.id !== id);
      write(arr);
    },
    toggle(item){
      if(this.has(item)){ this.remove(item.id); return false; }
      return this.add(item);
    },
    clear(){
      write([]);
    }
  };

  // === Sticky bar ===
  function ensureBar(){
    let bar = document.getElementById("cmp-bar");
    if(bar) return bar;
    bar = document.createElement("div");
    bar.id = "cmp-bar";
    bar.style.cssText = [
      "position:fixed","bottom:0","left:0","right:0","z-index:1000",
      "background:linear-gradient(135deg,#2C2356,#3D2D5C)","color:#fff",
      "padding:12px 16px 14px","box-shadow:0 -8px 28px rgba(60,40,90,.35)",
      "font-family:Quicksand,system-ui,sans-serif","display:none",
      "align-items:center","gap:12px","flex-wrap:wrap",
      "padding-bottom:calc(14px + env(safe-area-inset-bottom))"
    ].join(";");
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <span style="font-size:20px">📊</span>
        <div style="display:flex;flex-direction:column;line-height:1.3;min-width:0">
          <b id="cmp-bar-count" style="font-size:14px;font-weight:700">Marcaste 0 creches</b>
          <span id="cmp-bar-names" style="font-size:12px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%"></span>
        </div>
      </div>
      <button id="cmp-bar-clear" style="background:transparent;border:1.5px solid rgba(255,255,255,.35);color:#fff;border-radius:99px;padding:8px 14px;font-weight:600;font-size:12.5px;cursor:pointer;font-family:inherit">Limpar</button>
      <a id="cmp-bar-go" href="/comparar" style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;border-radius:99px;padding:11px 20px;font-weight:800;font-size:13.5px;text-decoration:none;box-shadow:0 6px 18px rgba(255,107,157,.4);display:flex;align-items:center;gap:6px">
        Comparar →
      </a>
    `;
    document.body.appendChild(bar);
    bar.querySelector("#cmp-bar-clear").addEventListener("click", ()=>{
      if(confirm("Limpar todas as creches do comparador?")) Compare.clear();
    });
    return bar;
  }

  function renderBar(){
    const list = read();
    const bar = ensureBar();
    if(list.length === 0){
      bar.style.display = "none";
      return;
    }
    bar.style.display = "flex";
    bar.querySelector("#cmp-bar-count").textContent =
      list.length === 1 ? "Marcaste 1 creche" : `Marcaste ${list.length} creches`;
    bar.querySelector("#cmp-bar-names").textContent = list.map(x => x.nome).join(" · ");
    const go = bar.querySelector("#cmp-bar-go");
    if(list.length < 2){
      go.style.opacity = ".5";
      go.style.pointerEvents = "none";
      go.textContent = "Adiciona +1 →";
    } else {
      go.style.opacity = "1";
      go.style.pointerEvents = "auto";
      go.textContent = "Comparar →";
    }
  }

  window.Compare = Compare;

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", renderBar);
  } else {
    renderBar();
  }
})();
