const txt = (raiz, sel) => raiz?.querySelector(sel)?.textContent?.trim() || "";

/**
 * Lê o XML de uma NF-e e devolve os dados já organizados.
 * Não depende do Firebase, então pode ser testado isoladamente.
 */
export function lerNfe(texto, Parser = DOMParser) {
  const xml = new Parser().parseFromString(texto, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("Arquivo XML inválido.");
  const inf = xml.querySelector("infNFe");
  if (!inf) throw new Error("Este XML não é de uma NF-e (elemento infNFe não encontrado).");

  const ide = inf.querySelector("ide"), emit = inf.querySelector("emit"), dest = inf.querySelector("dest");
  const chave = (inf.getAttribute("Id") || "").replace(/^NFe/, "") || txt(xml, "protNFe chNFe");
  const emissao = (txt(ide, "dhEmi") || txt(ide, "dEmi")).slice(0, 10);
  const total = Number(txt(inf, "total ICMSTot vNF") || txt(inf, "vNF") || 0);

  const itens = [...inf.querySelectorAll("det")].map(d => ({
    descricao: txt(d, "prod xProd"),
    qtd: Number(txt(d, "prod qCom") || 0),
    valorUnitario: Number(txt(d, "prod vUnCom") || 0),
    valor: Number(txt(d, "prod vProd") || 0)
  }));

  let parcelas = [...inf.querySelectorAll("cobr dup")]
    .map(d => ({ numero: txt(d, "nDup"), vencimento: txt(d, "dVenc") || emissao, valor: Number(txt(d, "vDup") || 0) }))
    .filter(p => p.valor > 0);
  if (!parcelas.length) parcelas = [{ numero: "", vencimento: emissao, valor: total }];

  const pessoa = n => ({
    nome: txt(n, "xNome"),
    documento: txt(n, "CNPJ") || txt(n, "CPF") || txt(n, "idEstrangeiro"),
    email: txt(n, "email"),
    telefone: txt(n, "fone"),
    cidade: [txt(n, "xMun"), txt(n, "UF")].filter(Boolean).join("/")
  });

  return {
    chave,
    numero: txt(ide, "nNF"),
    serie: txt(ide, "serie"),
    emissao,
    total,
    emitente: pessoa(emit),
    destinatario: dest ? pessoa(dest) : null,
    itens,
    parcelas
  };
}
