import { el, esc } from "./utils.js";

export const ICON = {
  grid: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  building: '<path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 10h4a1 1 0 011 1v10M2 21h20M8 8h3M8 12h3M8 16h3"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  users: '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  package: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
};
export const svg = (nome, estilo = "") => `<svg viewBox="0 0 24 24" ${estilo ? `style="${estilo}"` : ""}>${ICON[nome] || ""}</svg>`;

export function toast(msg, tipo = "ok") {
  const t = document.createElement("div");
  t.className = "toast " + tipo;
  t.innerHTML = svg(tipo === "ok" ? "check" : "alert", "width:18px;height:18px") + `<span>${esc(msg)}</span>`;
  el("toasts").appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

export function confirmar(titulo, msg, rotulo = "Excluir", perigo = true) {
  return new Promise(res => {
    const dlg = el("dlg"), yes = el("dlgYes"), no = el("dlgNo");
    el("dlgTitle").textContent = titulo;
    el("dlgMsg").textContent = msg;
    yes.textContent = rotulo;
    yes.className = "btn" + (perigo ? " danger" : "");
    const fim = v => { if (dlg.open) dlg.close(); yes.onclick = no.onclick = dlg.oncancel = null; res(v); };
    yes.onclick = () => fim(true);
    no.onclick = () => fim(false);
    dlg.oncancel = () => fim(false);
    dlg.showModal();
  });
}

export function abrirModal({ titulo, corpo = "", largura }) {
  const dlg = el("modal"), body = el("modalBody");
  el("modalTitle").textContent = titulo;
  body.innerHTML = corpo;
  dlg.style.width = largura ? `min(${largura},calc(100% - 24px))` : "";
  const fechar = () => { if (dlg.open) dlg.close(); };
  el("modalX").onclick = fechar;
  dlg.onclick = e => { if (e.target === dlg) fechar(); };
  dlg.onclose = () => { body.innerHTML = ""; };
  if (!dlg.open) dlg.showModal();
  return { body, fechar, setTitulo: t => { el("modalTitle").textContent = t; } };
}

/**
 * Abre um formulário em modal.
 * campos: [{name,label,type,options,required,span2,placeholder,step,min,max,hint,aoMudar}]
 * options: ["A","B"] ou [{v,l}]
 */
export function formModal({ titulo, campos, valores = {}, rotulo = "Salvar", aoSalvar }) {
  const opt = o => (typeof o === "object" ? o : { v: o, l: o });
  const campoHtml = c => {
    const id = "f_" + c.name, req = c.required ? "required" : "";
    let ctl;
    if (c.type === "select") {
      ctl = `<select id="${id}" name="${c.name}" ${req}><option value="">${esc(c.vazio || "Selecione...")}</option>${(c.options || []).map(opt).map(o => `<option value="${esc(o.v)}">${esc(o.l)}</option>`).join("")}</select>`;
    } else if (c.type === "textarea") {
      ctl = `<textarea id="${id}" name="${c.name}" rows="2" ${req} placeholder="${esc(c.placeholder || "")}"></textarea>`;
    } else {
      ctl = `<input id="${id}" name="${c.name}" type="${c.type || "text"}" ${req} placeholder="${esc(c.placeholder || "")}"${c.step ? ` step="${c.step}"` : ""}${c.min != null ? ` min="${c.min}"` : ""}${c.max != null ? ` max="${c.max}"` : ""}${c.maxlength ? ` maxlength="${c.maxlength}"` : ""}>`;
    }
    return `<label class="${c.span2 ? "span2" : ""}">${esc(c.label)}${c.required ? " *" : ""}${ctl}${c.hint ? `<span class="sub-text">${esc(c.hint)}</span>` : ""}</label>`;
  };

  const m = abrirModal({
    titulo,
    corpo: `<form class="form-modal" id="fm">${campos.map(campoHtml).join("")}
      <div class="modal-actions span2"><button type="button" class="btn cancel" id="fmNo">Cancelar</button><button type="submit" class="btn" id="fmOk">${esc(rotulo)}</button></div></form>`
  });
  const form = m.body.querySelector("#fm");

  campos.forEach(c => {
    const ctl = form.elements[c.name];
    const v = valores[c.name];
    if (v !== undefined && v !== null) ctl.value = v;
    if (c.aoMudar) ctl.addEventListener("change", e => c.aoMudar(e.target.value, form));
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const out = {};
    campos.forEach(c => {
      let v = form.elements[c.name].value;
      v = c.type === "number" ? (v === "" ? "" : Number(v)) : v.trim();
      out[c.name] = v;
    });
    const ok = form.querySelector("#fmOk");
    ok.disabled = true;
    try {
      await aoSalvar(out);
      m.fechar();
    } catch (err) {
      toast(err.message || String(err), "err");
      ok.disabled = false;
    }
  });
  form.querySelector("#fmNo").onclick = m.fechar;
  form.querySelector("input,select,textarea")?.focus();
  return m;
}
