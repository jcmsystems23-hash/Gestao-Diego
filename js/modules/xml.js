import { abrirModal, toast, svg } from "../ui.js";
import { lerNfe } from "./nfe-parser.js";
import { dados, carregar } from "../store.js";
import { db, auth, collection, doc, writeBatch } from "../firebase.js";
import { esc, dinheiro, fmtData, digitos } from "../utils.js";

const lerArquivo = f => new Promise((ok, err) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => err(new Error("Falha ao ler o arquivo."));
  r.readAsText(f);
});

export function abrirImportacaoXml() {
  if (!dados.empresas.length) { toast("Cadastre ao menos uma empresa antes de importar notas.", "err"); return; }

  const m = abrirModal({
    titulo: "Importar XML de NF-e",
    largura: "780px",
    corpo: `<label class="drop" id="dz">
      <div class="ico blue">${svg("upload")}</div>
      <b>Clique ou arraste os arquivos XML aqui</b>
      <span>Você pode selecionar várias notas de uma vez. Cada uma será conferida antes de importar.</span>
      <input type="file" id="xf" accept=".xml,text/xml" multiple class="hidden">
    </label>`
  });
  const body = m.body;
  const resumo = { ok: 0, pulou: 0, erro: 0, msgs: [] };

  function ligarDropzone() {
    const dz = body.querySelector("#dz"), xf = body.querySelector("#xf");
    xf.addEventListener("change", e => processar([...e.target.files]));
    ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", e => processar([...e.dataTransfer.files].filter(f => /\.xml$/i.test(f.name))));
  }
  ligarDropzone();

  async function processar(files) {
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
      try {
        const nf = lerNfe(await lerArquivo(files[i]));
        const r = await prever(nf, files[i].name, i + 1, files.length);
        resumo[r]++;
      } catch (e) {
        resumo.erro++;
        resumo.msgs.push(`${files[i].name}: ${e.message}`);
      }
    }
    fim();
  }

  function fim() {
    body.innerHTML = `<div class="aviso ${resumo.erro ? "bad" : "ok"}">
        <b>Importação concluída.</b> ${resumo.ok} nota(s) importada(s), ${resumo.pulou} ignorada(s), ${resumo.erro} com erro.
      </div>
      ${resumo.msgs.map(t => `<div class="sub-text" style="margin-bottom:6px">${esc(t)}</div>`).join("")}
      <div class="modal-actions"><button class="btn" id="fechar">Fechar</button></div>`;
    body.querySelector("#fechar").onclick = m.fechar;
  }

  function prever(nf, nome, i, n) {
    return new Promise((resolve, reject) => {
      const dup = nf.chave && dados.contas_receber.some(c => c.chaveNfe === nf.chave);
      const docEmit = digitos(nf.emitente.documento);
      const empAuto = docEmit ? dados.empresas.find(e => digitos(e.cnpj) === docEmit) : null;
      const d = nf.destinatario;
      const dd = d ? digitos(d.documento) : "";
      const cli = d ? dados.clientes.find(c => (dd && digitos(c.documento) === dd) || (!dd && String(c.nome).toLowerCase() === d.nome.toLowerCase())) : null;

      const infoCli = cli
        ? `<b>Cliente já cadastrado:</b> ${esc(cli.nome)}`
        : d && d.nome
          ? `<b>Novo cliente será cadastrado:</b> ${esc(d.nome)}${d.documento ? " — " + esc(d.documento) : ""}${d.cidade ? " (" + esc(d.cidade) + ")" : ""}`
          : `<b>Sem destinatário no XML:</b> será lançado como "Consumidor final".`;

      body.innerHTML = `
        <div class="xml-head"><span class="badge gray">Arquivo ${i} de ${n}</span><b>${esc(nome)}</b></div>
        ${dup ? `<div class="aviso bad">Esta nota (chave ${esc(nf.chave)}) já foi importada e não pode ser importada novamente.</div>` : ""}
        <div class="resumo">
          <div><small>NF-e nº</small><strong>${esc(nf.numero) || "—"}${nf.serie ? " / " + esc(nf.serie) : ""}</strong></div>
          <div><small>Emissão</small><strong>${fmtData(nf.emissao)}</strong></div>
          <div><small>Valor total</small><strong>${dinheiro(nf.total)}</strong></div>
        </div>
        <label>Empresa emitente (proprietária) *
          <select id="xe"><option value="">Selecione...</option>${dados.empresas.map(e => `<option value="${e.id}" ${empAuto && empAuto.id === e.id ? "selected" : ""}>${esc(e.nome)}</option>`).join("")}</select>
          <span class="sub-text">Emitente no XML: ${esc(nf.emitente.nome)}${nf.emitente.documento ? " — " + esc(nf.emitente.documento) : ""}${empAuto ? "" : " (nenhuma empresa cadastrada com este CNPJ; escolha uma)"}</span>
        </label>
        <div class="xml-box">${infoCli}</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
          <tbody>${nf.parcelas.map((p, k) => `<tr><td>${nf.parcelas.length > 1 ? `${k + 1}/${nf.parcelas.length}` : "Única"}</td><td>${fmtData(p.vencimento)}</td><td>${dinheiro(p.valor)}</td></tr>`).join("")}</tbody>
        </table></div>
        <div class="sub-text" style="margin-top:10px">${nf.itens.length} item(ns) na nota serão guardados no lançamento.</div>
        <div class="modal-actions" style="margin-top:20px">
          <button class="btn cancel" id="xs">Pular</button>
          <button class="btn" id="xi" ${dup ? "disabled" : ""}>Importar</button>
        </div>`;

      body.querySelector("#xs").onclick = () => resolve("pulou");
      body.querySelector("#xi").onclick = async () => {
        const empresaId = body.querySelector("#xe").value;
        if (!empresaId) { toast("Selecione a empresa emitente.", "err"); return; }
        body.querySelector("#xi").disabled = true;
        try {
          await gravar(nf, empresaId, cli);
          resolve("ok");
        } catch (e) { reject(e); }
      };
    });
  }

  async function gravar(nf, empresaId, cliExistente) {
    const meta = { criadoEm: new Date().toISOString(), criadoPor: auth.currentUser?.email || "" };
    const batch = writeBatch(db);
    const d = nf.destinatario;
    let pessoaId = cliExistente?.id || "";
    let pessoaNome = cliExistente?.nome || (d?.nome) || "Consumidor final";

    if (!cliExistente && d && d.nome) {
      const ref = doc(collection(db, "clientes"));
      batch.set(ref, { nome: d.nome, documento: d.documento, email: d.email, telefone: d.telefone, cidade: d.cidade, origem: "xml", ...meta });
      pessoaId = ref.id;
    }

    nf.parcelas.forEach((p, k) => {
      const ref = doc(collection(db, "contas_receber"));
      batch.set(ref, {
        empresaId, pessoaId, pessoaNome,
        numeroNota: nf.numero + (nf.parcelas.length > 1 ? ` (${k + 1}/${nf.parcelas.length})` : ""),
        chaveNfe: nf.chave,
        descricao: `NF-e ${nf.numero}${nf.parcelas.length > 1 ? ` — parcela ${k + 1}/${nf.parcelas.length}` : ""}`,
        itens: nf.itens,
        valor: p.valor,
        emissao: nf.emissao,
        vencimento: p.vencimento,
        situacao: "pendente",
        dataBaixa: "",
        origem: "xml",
        ...meta
      });
    });

    await batch.commit();
    await carregar("clientes", "contas_receber");
  }
}
