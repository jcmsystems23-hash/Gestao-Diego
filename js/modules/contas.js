import { crudPage } from "../crud.js";
import { dados, porId, atualizar } from "../store.js";
import { esc, dinheiro, fmtData, badge, diasAte, hojeStr, mesAtual, soma } from "../utils.js";
import { toast } from "../ui.js";
import { abrirImportacaoXml } from "./xml.js";

const aberto = c => c.situacao !== "quitado";
const atrasado = c => aberto(c) && c.vencimento && diasAte(c.vencimento) < 0;

function contasPage(tipo) {
  const rec = tipo === "receber";
  const colecao = rec ? "contas_receber" : "contas_pagar";
  const pessoaCol = rec ? "clientes" : "fornecedores";
  const pessoaRot = rec ? "Cliente" : "Fornecedor";
  const quitRot = rec ? "Recebido" : "Pago";

  return crudPage({
    titulo: rec ? "Contas a receber" : "Contas a pagar",
    sub: rec ? "Espelho gerencial do faturamento (notas emitidas)" : "Espelho gerencial das despesas e obrigações",
    singular: rec ? "lançamento a receber" : "lançamento a pagar",
    colecao,
    novoLabel: "Novo lançamento",
    dados: () => dados[colecao],
    ordenar: (a, b) => (a.situacao === "quitado") - (b.situacao === "quitado") || String(a.vencimento || "").localeCompare(String(b.vencimento || "")),
    busca: r => `${r.descricao} ${r.pessoaNome || ""} ${r.numeroNota || ""} ${r.itemDescricao || ""}`,
    vazio: "Nenhum lançamento encontrado.",
    podeCriar: () =>
      !dados.empresas.length ? "Cadastre uma empresa antes de lançar contas." :
      !dados[pessoaCol].length ? `Cadastre ao menos um ${pessoaRot.toLowerCase()} antes de lançar contas.` : null,
    filtros: [
      { label: "Todas", fn: () => true },
      { label: "Em aberto", fn: aberto },
      { label: "Atrasadas", fn: atrasado },
      { label: rec ? "Recebidas" : "Pagas", fn: c => c.situacao === "quitado" }
    ],
    resumo: todos => {
      const ab = todos.filter(aberto), at = todos.filter(atrasado);
      const mes = todos.filter(c => c.situacao === "quitado" && (c.dataBaixa || "").startsWith(mesAtual()));
      return `<div><small>Em aberto</small><strong>${dinheiro(soma(ab))}</strong></div>
        <div><small>Atrasado (${at.length})</small><strong class="${at.length ? "negative" : ""}">${dinheiro(soma(at))}</strong></div>
        <div><small>${quitRot} no mês</small><strong class="positive">${dinheiro(soma(mes))}</strong></div>`;
    },
    colunas: [
      { h: rec ? "Nota" : "Documento", f: r => `${esc(r.numeroNota) || "—"}${r.origem === "xml" ? `<span class="sub-text">${badge("gray", "XML")}</span>` : ""}` },
      { h: "Descrição", f: r => `<span class="strong">${esc(r.descricao)}</span><span class="sub-text">${esc(r.itemDescricao)}</span>` },
      { h: pessoaRot, f: r => esc(r.pessoaNome) || "—" },
      { h: "Empresa", f: r => esc(porId("empresas", r.empresaId)?.nome) || "—" },
      { h: "Vencimento", f: r => fmtData(r.vencimento) },
      { h: "Valor", cls: "strong", f: r => dinheiro(r.valor) },
      { h: "Situação", f: r => r.situacao === "quitado" ? badge("ok", quitRot) : atrasado(r) ? badge("bad", "Atrasado") : badge("warn", "Pendente") }
    ],
    acoes: r => r.situacao === "quitado"
      ? `<button class="btn sm ghost" data-act="reabrir" data-id="${r.id}">Reabrir</button> `
      : `<button class="btn sm ok" data-act="baixa" data-id="${r.id}">${rec ? "Receber" : "Pagar"}</button> `,
    aoAcao: async (act, row) => {
      if (act === "baixa") { await atualizar(colecao, row.id, { situacao: "quitado", dataBaixa: hojeStr() }); toast(`Marcado como ${quitRot.toLowerCase()}.`); }
      if (act === "reabrir") { await atualizar(colecao, row.id, { situacao: "pendente", dataBaixa: "" }); toast("Lançamento reaberto."); }
    },
    botoesExtra: rec ? [{ label: "Importar XML", icone: "upload", aoClicar: abrirImportacaoXml }] : [],
    campos: () => [
      { name: "empresaId", label: "Empresa", type: "select", required: true, options: dados.empresas.map(e => ({ v: e.id, l: e.nome })) },
      { name: "pessoaId", label: pessoaRot, type: "select", required: true, options: dados[pessoaCol].map(p => ({ v: p.id, l: p.nome })) },
      {
        name: "itemId", label: "Item / serviço", type: "select", vazio: "Nenhum (opcional)", span2: true,
        options: dados.itens.filter(i => !i.uso || i.uso === "ambos" || i.uso === tipo).map(i => ({ v: i.id, l: i.descricao })),
        aoMudar: (id, form) => {
          const it = porId("itens", id);
          if (!it) return;
          if (!form.elements.descricao.value) form.elements.descricao.value = it.descricao;
          if (!form.elements.valor.value && it.valorPadrao) form.elements.valor.value = it.valorPadrao;
        }
      },
      { name: "descricao", label: "Descrição", required: true, span2: true, placeholder: rec ? "Ex.: Frete Curitiba x Itajaí" : "Ex.: Abastecimento, pneus, seguro..." },
      { name: "numeroNota", label: rec ? "Nº da nota fiscal" : "Nº do documento" },
      { name: "valor", label: "Valor (R$)", type: "number", step: "0.01", min: 0.01, required: true },
      { name: "emissao", label: "Data de emissão", type: "date" },
      { name: "vencimento", label: "Vencimento", type: "date", required: true },
      { name: "situacao", label: "Situação", type: "select", required: true, options: [{ v: "pendente", l: "Pendente" }, { v: "quitado", l: quitRot }] },
      { name: "dataBaixa", label: `Data ${rec ? "do recebimento" : "do pagamento"}`, type: "date" },
      { name: "obs", label: "Observações", type: "textarea", span2: true }
    ],
    padrao: () => ({ situacao: "pendente", emissao: hojeStr(), empresaId: dados.empresas.length === 1 ? dados.empresas[0].id : "" }),
    preparar: v => {
      if (!(v.valor > 0)) throw new Error("Informe um valor maior que zero.");
      const out = {
        ...v,
        pessoaNome: porId(pessoaCol, v.pessoaId)?.nome || "",
        itemDescricao: v.itemId ? porId("itens", v.itemId)?.descricao || "" : ""
      };
      out.dataBaixa = v.situacao === "quitado" ? (v.dataBaixa || hojeStr()) : "";
      return out;
    }
  });
}

export const receber = contasPage("receber");
export const pagar = contasPage("pagar");
