import { db, auth, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, writeBatch } from "./firebase.js";

export const COLECOES = [
  "empresas", "veiculos", "documentos_veiculo",
  "clientes", "fornecedores", "itens",
  "contas_receber", "contas_pagar"
];

export const dados = Object.fromEntries(COLECOES.map(c => [c, []]));

const ouvintes = new Set();
export const aoMudar = fn => ouvintes.add(fn);
const notificar = () => ouvintes.forEach(f => f());

const agora = () => new Date().toISOString();
const quem = () => auth.currentUser?.email || "";

export async function carregar(...cols) {
  const alvo = cols.length ? cols : COLECOES;
  await Promise.all(alvo.map(async c => {
    const snap = await getDocs(collection(db, c));
    dados[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }));
  notificar();
}

export async function criar(colecao, obj) {
  const ref = await addDoc(collection(db, colecao), { ...obj, criadoEm: agora(), criadoPor: quem() });
  await carregar(colecao);
  return ref.id;
}

export async function atualizar(colecao, id, obj) {
  await updateDoc(doc(db, colecao, id), { ...obj, atualizadoEm: agora(), atualizadoPor: quem() });
  await carregar(colecao);
}

export async function excluir(colecao, id) {
  await deleteDoc(doc(db, colecao, id));
  await carregar(colecao);
}

export async function excluirLote(colecao, ids) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, colecao, id)));
    await batch.commit();
  }
  await carregar(colecao);
}

export const porId = (colecao, id) => dados[colecao].find(x => x.id === id);
