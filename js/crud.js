import { esc } from "./utils.js";
import { svg, formModal, confirmar, toast } from "./ui.js";
import { criar, atualizar, excluir } from "./store.js";

/**
 * Página de cadastro genérica: lista + busca + filtros + modal de novo/editar + excluir.
 * cfg: titulo, sub, singular, colecao, dados(), colunas[{h,f,cls}], campos(row), busca(row),
 *      ordenar, vazio, novoLabel, padrao(), preparar(valores, atual), bloquear(row),
 *      podeCriar(), aoExcluir(row), acoes(row), aoAcao(act,row), filtros[{label,fn}],
 *      resumo(todos), botoesExtra[{label,icone,aoClicar}]
 */
export function crudPage(cfg) {
  return {
    titulo: cfg.titulo,
    sub: cfg.sub,
    render(root) {
      let busca = "", filtro = 0;
      const filtros = cfg.filtros || [];
      const extras = cfg.botoesExtra || [];

      root.innerHTML = `<div class="panel">
        <div class="panel-head">
          <div><h2>${esc(cfg.titulo)}</h2><div class="hint">${esc(cfg.sub || "")}</div></div>
          <div class="toolbar">
            ${filtros.length ? `<div class="seg" id="seg">${filtros.map((f, i) => `<button data-i="${i}" class="${i === 0 ? "on" : ""}">${esc(f.label)}</button>`).join("")}</div>` : ""}
            <div class="search">${svg("search")}<input id="q" placeholder="Buscar..."></div>
            ${extras.map((b, i) => `<button class="btn ghost" data-x="${i}">${svg(b.icone || "upload")}${esc(b.label)}</button>`).join("")}
            <button class="btn" id="novo">${svg("plus")}${esc(cfg.novoLabel || "Novo")}</button>
          </div>
        </div>
        <div id="resumo"></div>
        <div class="table-wrap"><table>
          <thead><tr>${cfg.colunas.map(c => `<th>${esc(c.h)}</th>`).join("")}<th style="text-align:right">Ações</th></tr></thead>
          <tbody id="rows"></tbody>
        </table></div>
      </div>`;

      const tb = root.querySelector("#rows");
      const resumoEl = root.querySelector("#resumo");

      const lista = () => {
        let l = cfg.dados();
        if (filtros[filtro]) l = l.filter(filtros[filtro].fn);
        if (busca) l = l.filter(r => String(cfg.busca(r) || "").toLowerCase().includes(busca));
        return [...l].sort(cfg.ordenar || (() => 0));
      };

      function desenhar() {
        const l = lista();
        tb.innerHTML = l.map(r => `<tr>
          ${cfg.colunas.map(c => `<td class="${c.cls || ""}">${c.f(r)}</td>`).join("")}
          <td class="actions">${cfg.acoes ? cfg.acoes(r) : ""}
            <button class="btn sm ghost" data-act="edit" data-id="${r.id}">Editar</button>
            <button class="btn sm danger" data-act="del" data-id="${r.id}">Excluir</button></td>
        </tr>`).join("") || `<tr><td colspan="${cfg.colunas.length + 1}" class="empty">${esc(cfg.vazio || "Nenhum registro encontrado.")}</td></tr>`;
        resumoEl.innerHTML = cfg.resumo ? `<div class="resumo">${cfg.resumo(cfg.dados())}</div>` : "";
      }

      function abrirForm(row) {
        if (!row) {
          const aviso = cfg.podeCriar?.();
          if (aviso) { toast(aviso, "err"); return; }
        }
        formModal({
          titulo: row ? `Editar ${cfg.singular}` : `Novo(a) ${cfg.singular}`,
          campos: cfg.campos(row),
          valores: row || cfg.padrao?.() || {},
          aoSalvar: async v => {
            const obj = cfg.preparar ? await cfg.preparar(v, row) : v;
            if (row) await atualizar(cfg.colecao, row.id, obj);
            else await criar(cfg.colecao, obj);
            toast(row ? "Alterações salvas." : "Cadastro realizado!");
          }
        });
      }

      async function remover(row) {
        const msg = cfg.bloquear?.(row);
        if (msg) { toast(msg, "err"); return; }
        if (!await confirmar("Excluir registro", "Deseja excluir este registro? Esta ação não pode ser desfeita.")) return;
        try {
          await excluir(cfg.colecao, row.id);
          if (cfg.aoExcluir) await cfg.aoExcluir(row);
          toast("Registro excluído.");
        } catch (e) { toast("Erro ao excluir: " + e.message, "err"); }
      }

      tb.addEventListener("click", async e => {
        const b = e.target.closest("button[data-act]");
        if (!b) return;
        const row = cfg.dados().find(r => r.id === b.dataset.id);
        if (!row) return;
        if (b.dataset.act === "edit") abrirForm(row);
        else if (b.dataset.act === "del") remover(row);
        else if (cfg.aoAcao) {
          try { await cfg.aoAcao(b.dataset.act, row); } catch (err) { toast(err.message, "err"); }
        }
      });
      root.querySelector("#novo").addEventListener("click", () => abrirForm(null));
      root.querySelector("#q").addEventListener("input", e => { busca = e.target.value.toLowerCase(); desenhar(); });
      root.querySelectorAll("[data-x]").forEach(b => b.addEventListener("click", () => extras[b.dataset.x].aoClicar()));
      root.querySelector("#seg")?.addEventListener("click", e => {
        const b = e.target.closest("button[data-i]");
        if (!b) return;
        filtro = Number(b.dataset.i);
        root.querySelectorAll("#seg button").forEach(x => x.classList.toggle("on", x === b));
        desenhar();
      });

      desenhar();
    }
  };
}
