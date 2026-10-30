export const el = id => document.getElementById(id);

export const dinheiro = n => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmtData = d => (d ? d.split("-").reverse().join("/") : "—");

export const hojeStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const mesAtual = () => hojeStr().slice(0, 7);

export const diasAte = d => Math.round((new Date(d + "T00:00:00") - new Date(hojeStr() + "T00:00:00")) / 86400000);

export const digitos = s => String(s || "").replace(/\D/g, "");

export const soma = (arr, f = x => x.valor) => arr.reduce((s, x) => s + Number(f(x) || 0), 0);

export const badge = (nivel, texto) => `<span class="badge ${nivel}">${esc(texto)}</span>`;

/** Situação de um prazo (documento, seguro...) em relação a hoje. */
export function statusPrazo(d) {
  if (!d) return { nivel: "gray", texto: "Não informado", dias: null };
  const n = diasAte(d);
  if (n < 0) return { nivel: "bad", texto: `Vencido há ${-n}d`, dias: n };
  if (n === 0) return { nivel: "warn", texto: "Vence hoje", dias: n };
  if (n <= 30) return { nivel: "warn", texto: `Vence em ${n}d`, dias: n };
  return { nivel: "ok", texto: "Em dia", dias: n };
}

/** Valida tamanho de CNPJ (14) / CPF (11). Campo vazio é permitido. */
export function validarDoc(valor, permitidos = [11, 14]) {
  if (!valor) return;
  if (!permitidos.includes(digitos(valor).length)) {
    const msg = permitidos.length === 1 ? "CNPJ inválido: informe 14 dígitos." : "CNPJ/CPF inválido: informe 14 dígitos (CNPJ) ou 11 (CPF).";
    throw new Error(msg);
  }
}
