import { crudPage } from "../crud.js";
import { dados } from "../store.js";
import { esc, badge, validarDoc } from "../utils.js";

const nomeOrd = (a, b) => String(a.nome || a.descricao || "").localeCompare(String(b.nome || b.descricao || ""), "pt-BR");

/* ---------------- EMPRESAS ---------------- */
export const empresas = crudPage({
  titulo: "Empresas proprietárias",
  sub: "Empresas do grupo que possuem os veículos em seu nome",
  singular: "empresa",
  colecao: "empresas",
  novoLabel: "Nova empresa",
  dados: () => dados.empresas,
  ordenar: nomeOrd,
  busca: r => `${r.nome} ${r.cnpj || ""} ${r.cidade || ""}`,
  vazio: "Nenhuma empresa cadastrada. Comece cadastrando a empresa proprietária dos veículos.",
  colunas: [
    { h: "Razão social", f: r => `<span class="strong">${esc(r.nome)}</span>` },
    { h: "CNPJ", f: r => esc(r.cnpj) || "—" },
    { h: "Cidade/UF", f: r => esc(r.cidade) || "—" },
    { h: "Veículos", f: r => dados.veiculos.filter(v => v.empresaId === r.id).length }
  ],
  campos: () => [
    { name: "nome", label: "Razão social / Nome", required: true, span2: true, placeholder: "Ex.: Transportes Silva LTDA" },
    { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0001-00" },
    { name: "cidade", label: "Cidade / UF" }
  ],
  preparar: v => { validarDoc(v.cnpj, [14]); return v; },
  bloquear: r =>
    dados.veiculos.some(v => v.empresaId === r.id) ? "Esta empresa possui veículos vinculados. Remova ou transfira os veículos antes." :
    (dados.contas_receber.some(c => c.empresaId === r.id) || dados.contas_pagar.some(c => c.empresaId === r.id)) ? "Esta empresa possui lançamentos financeiros vinculados." : null
});

/* ---------------- CLIENTES / FORNECEDORES ---------------- */
function pessoas({ colecao, singular, titulo, sub, contas, novoLabel, origem }) {
  return crudPage({
    titulo, sub, singular, colecao, novoLabel,
    dados: () => dados[colecao],
    ordenar: nomeOrd,
    busca: r => `${r.nome} ${r.documento || ""} ${r.email || ""} ${r.telefone || ""} ${r.cidade || ""}`,
    vazio: `Nenhum ${singular} cadastrado.`,
    colunas: [
      { h: "Nome", f: r => `<span class="strong">${esc(r.nome)}</span><span class="sub-text">${esc(r.documento) || "Sem documento"}</span>` },
      { h: "Contato", f: r => `${esc(r.email) || "—"}<span class="sub-text">${esc(r.telefone) || ""}</span>` },
      { h: "Cidade/UF", f: r => esc(r.cidade) || "—" },
      ...(origem ? [{ h: "Origem", f: r => r.origem === "xml" ? badge("ok", "Importado do XML") : badge("gray", "Manual") }] : [])
    ],
    campos: () => [
      { name: "nome", label: "Nome / Razão social", required: true, span2: true },
      { name: "documento", label: "CNPJ / CPF" },
      { name: "telefone", label: "Telefone" },
      { name: "email", label: "E-mail", type: "email" },
      { name: "cidade", label: "Cidade / UF" },
      { name: "obs", label: "Observações", type: "textarea", span2: true }
    ],
    padrao: () => ({}),
    preparar: (v, atual) => {
      validarDoc(v.documento);
      return atual ? v : { ...v, origem: "manual" };
    },
    bloquear: r => dados[contas].some(c => c.pessoaId === r.id) ? `Este ${singular} possui lançamentos vinculados e não pode ser excluído.` : null
  });
}

export const clientes = pessoas({
  colecao: "clientes", singular: "cliente", titulo: "Clientes",
  sub: "Cadastrados manualmente ou automaticamente pela importação de XML",
  contas: "contas_receber", novoLabel: "Novo cliente", origem: true
});

export const fornecedores = pessoas({
  colecao: "fornecedores", singular: "fornecedor", titulo: "Fornecedores",
  sub: "Usados nos lançamentos de contas a pagar",
  contas: "contas_pagar", novoLabel: "Novo fornecedor", origem: false
});

/* ---------------- ITENS ---------------- */
const USO = { ambos: "Receber e pagar", receber: "Somente a receber", pagar: "Somente a pagar" };

export const itens = crudPage({
  titulo: "Itens, produtos e serviços",
  sub: "Cadastro padronizado para vincular aos lançamentos",
  singular: "item",
  colecao: "itens",
  novoLabel: "Novo item",
  dados: () => dados.itens,
  ordenar: nomeOrd,
  busca: r => `${r.descricao} ${r.codigo || ""} ${r.tipo || ""}`,
  vazio: "Nenhum item cadastrado.",
  colunas: [
    { h: "Descrição", f: r => `<span class="strong">${esc(r.descricao)}</span><span class="sub-text">${r.codigo ? "Cód. " + esc(r.codigo) : ""}</span>` },
    { h: "Tipo", f: r => esc(r.tipo) || "—" },
    { h: "Uso", f: r => esc(USO[r.uso] || "Receber e pagar") },
    { h: "Unidade", f: r => esc(r.unidade) || "—" },
    { h: "Valor padrão", f: r => r.valorPadrao ? Number(r.valorPadrao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—" }
  ],
  campos: () => [
    { name: "descricao", label: "Descrição", required: true, span2: true, placeholder: "Ex.: Frete rodoviário, Óleo diesel S10" },
    { name: "codigo", label: "Código (opcional)" },
    { name: "tipo", label: "Tipo", type: "select", required: true, options: ["Serviço", "Produto"] },
    { name: "uso", label: "Usar em", type: "select", required: true, options: Object.entries(USO).map(([v, l]) => ({ v, l })) },
    { name: "unidade", label: "Unidade", placeholder: "UN, KM, VIAGEM, L..." },
    { name: "valorPadrao", label: "Valor padrão (R$)", type: "number", step: "0.01", min: 0 }
  ],
  padrao: () => ({ tipo: "Serviço", uso: "ambos", unidade: "UN" }),
  bloquear: r => (dados.contas_receber.some(c => c.itemId === r.id) || dados.contas_pagar.some(c => c.itemId === r.id)) ? "Este item está vinculado a lançamentos e não pode ser excluído." : null
});
