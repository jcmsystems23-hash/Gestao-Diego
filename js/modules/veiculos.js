import { crudPage } from "../crud.js";
import { dados, criar, excluir, excluirLote, porId } from "../store.js";
import { esc, fmtData, badge, statusPrazo } from "../utils.js";
import { abrirModal, confirmar, toast } from "../ui.js";

export const TIPOS_VEICULO = ["Carro", "Caminhão", "Carreta / Semirreboque", "Outro"];
export const TIPOS_DOC = ["CRLV", "IPVA", "Licenciamento", "Seguro", "Tacógrafo (Inmetro)", "RNTRC / ANTT", "Outro"];

/** Pior situação entre os documentos de um veículo. */
export function statusDocs(veiculoId) {
  const docs = dados.documentos_veiculo.filter(d => d.veiculoId === veiculoId);
  if (!docs.length) return { nivel: "gray", texto: "Sem documentos", n: 0 };
  const pior = docs.map(d => ({ ...statusPrazo(d.vencimento), doc: d })).sort((a, b) => a.dias - b.dias)[0];
  return { ...pior, n: docs.length };
}

function abrirDocumentos(v) {
  const m = abrirModal({
    titulo: `Documentos — ${v.marca} ${v.modelo} (${v.placa})`,
    largura: "820px",
    corpo: `<form class="form-modal" id="fd">
        <label>Tipo *<select name="tipo" required>${TIPOS_DOC.map(t => `<option>${esc(t)}</option>`).join("")}</select></label>
        <label>Vencimento *<input name="vencimento" type="date" required></label>
        <label>Nº do documento / apólice<input name="numero"></label>
        <label>Seguradora / observação<input name="obs"></label>
        <div class="modal-actions span2"><button class="btn" type="submit">Adicionar documento</button></div>
      </form>
      <h3 style="margin:26px 0 8px;font-size:15px">Documentos cadastrados</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Tipo</th><th>Número / observação</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead>
        <tbody id="dl"></tbody></table></div>`
  });
  const dl = m.body.querySelector("#dl");

  const desenhar = () => {
    const docs = dados.documentos_veiculo.filter(d => d.veiculoId === v.id).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    dl.innerHTML = docs.map(d => {
      const s = statusPrazo(d.vencimento);
      return `<tr><td class="strong">${esc(d.tipo)}</td>
        <td>${esc(d.numero) || "—"}<span class="sub-text">${esc(d.obs)}</span></td>
        <td>${fmtData(d.vencimento)}</td><td>${badge(s.nivel, s.texto)}</td>
        <td class="actions"><button class="btn sm danger" data-id="${d.id}">Excluir</button></td></tr>`;
    }).join("") || `<tr><td colspan="5" class="empty">Nenhum documento cadastrado para este veículo.</td></tr>`;
  };

  m.body.querySelector("#fd").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target.elements;
    try {
      await criar("documentos_veiculo", {
        veiculoId: v.id, tipo: f.tipo.value, vencimento: f.vencimento.value,
        numero: f.numero.value.trim(), obs: f.obs.value.trim()
      });
      e.target.reset();
      toast("Documento adicionado.");
      desenhar();
    } catch (err) { toast("Erro ao salvar: " + err.message, "err"); }
  });

  dl.addEventListener("click", async e => {
    const b = e.target.closest("button[data-id]");
    if (!b || !await confirmar("Excluir documento", "Deseja excluir este documento?")) return;
    try { await excluir("documentos_veiculo", b.dataset.id); toast("Documento excluído."); desenhar(); }
    catch (err) { toast("Erro ao excluir: " + err.message, "err"); }
  });

  desenhar();
}

export default crudPage({
  titulo: "Frota de veículos",
  sub: "Carros, caminhões e carretas, com controle de documentos e seguros",
  singular: "veículo",
  colecao: "veiculos",
  novoLabel: "Novo veículo",
  dados: () => dados.veiculos,
  ordenar: (a, b) => String(a.placa).localeCompare(String(b.placa)),
  busca: r => `${r.marca} ${r.modelo} ${r.placa} ${r.tipo} ${porId("empresas", r.empresaId)?.nome || ""}`,
  vazio: "Nenhum veículo cadastrado.",
  podeCriar: () => dados.empresas.length ? null : "Cadastre ao menos uma empresa proprietária antes de adicionar veículos.",
  colunas: [
    { h: "Veículo", f: r => `<span class="strong">${esc(r.marca)} ${esc(r.modelo)}</span><span class="sub-text">${esc(r.tipo)} • ${esc(r.ano)}</span>` },
    { h: "Empresa", f: r => esc(porId("empresas", r.empresaId)?.nome) || "—" },
    { h: "Placa", f: r => `<span class="plate">${esc(r.placa)}</span>` },
    { h: "Documentos", f: r => { const s = statusDocs(r.id); return `${badge(s.nivel, s.texto)}<span class="sub-text">${s.n} cadastrado(s)${s.doc ? " • " + esc(s.doc.tipo) : ""}</span>`; } }
  ],
  acoes: r => `<button class="btn sm ok" data-act="docs" data-id="${r.id}">Documentos</button> `,
  aoAcao: (act, row) => { if (act === "docs") abrirDocumentos(row); },
  campos: () => [
    { name: "empresaId", label: "Empresa proprietária", type: "select", required: true, span2: true, options: dados.empresas.map(e => ({ v: e.id, l: e.nome })) },
    { name: "tipo", label: "Tipo", type: "select", required: true, options: TIPOS_VEICULO },
    { name: "placa", label: "Placa", required: true, placeholder: "ABC1D23", maxlength: 8 },
    { name: "marca", label: "Marca", required: true, placeholder: "Ex.: Volvo" },
    { name: "modelo", label: "Modelo", required: true, placeholder: "Ex.: FH 540" },
    { name: "ano", label: "Ano", type: "number", required: true, min: 1950, max: new Date().getFullYear() + 1 }
  ],
  padrao: () => ({ tipo: "Caminhão", empresaId: dados.empresas.length === 1 ? dados.empresas[0].id : "" }),
  preparar: (v, atual) => {
    const placa = v.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) throw new Error("Placa inválida. Use o formato ABC1234 ou ABC1D23.");
    if (dados.veiculos.some(x => x.placa === placa && x.id !== atual?.id)) throw new Error("Já existe um veículo cadastrado com esta placa.");
    return { ...v, placa };
  },
  aoExcluir: async row => {
    const ids = dados.documentos_veiculo.filter(d => d.veiculoId === row.id).map(d => d.id);
    if (ids.length) await excluirLote("documentos_veiculo", ids);
  }
});
