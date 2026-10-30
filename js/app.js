import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "./firebase.js";
import { el, diasAte } from "./utils.js";
import { toast, confirmar, svg } from "./ui.js";
import { carregar, aoMudar, dados } from "./store.js";
import dashboard from "./modules/dashboard.js";
import veiculos from "./modules/veiculos.js";
import { empresas, clientes, fornecedores, itens } from "./modules/cadastros.js";
import { receber, pagar } from "./modules/contas.js";

const GRUPOS = [
  { t: null, r: [{ id: "painel", l: "Painel", i: "grid", m: dashboard }] },
  { t: "Frota", r: [
    { id: "veiculos", l: "Veículos", i: "truck", m: veiculos },
    { id: "empresas", l: "Empresas", i: "building", m: empresas }
  ] },
  { t: "Financeiro", r: [
    { id: "receber", l: "Contas a receber", i: "down", m: receber },
    { id: "pagar", l: "Contas a pagar", i: "up", m: pagar }
  ] },
  { t: "Cadastros", r: [
    { id: "clientes", l: "Clientes", i: "users", m: clientes },
    { id: "fornecedores", l: "Fornecedores", i: "package", m: fornecedores },
    { id: "itens", l: "Itens e serviços", i: "tag", m: itens }
  ] }
];
const ROTAS = GRUPOS.flatMap(g => g.r);
let pronto = false;

/* ---------- menu ---------- */
el("nav").innerHTML = GRUPOS.map(g =>
  (g.t ? `<div class="nav-group">${g.t}</div>` : "") +
  g.r.map(r => `<button data-id="${r.id}">${svg(r.i)}<span>${r.l}</span><span class="nb hidden" id="nb-${r.id}"></span></button>`).join("")
).join("");

el("nav").addEventListener("click", e => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  if (location.hash === "#/" + b.dataset.id) desenhar();
  else location.hash = "#/" + b.dataset.id;
  el("sidebar").classList.remove("open");
});
el("menuBtn").addEventListener("click", () => el("sidebar").classList.toggle("open"));
document.addEventListener("click", e => {
  if (el("sidebar").classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest("#menuBtn")) el("sidebar").classList.remove("open");
});

/* ---------- rotas ---------- */
const rotaAtual = () => ROTAS.find(r => "#/" + r.id === location.hash) || ROTAS[0];

function desenhar() {
  const rota = rotaAtual();
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("active", b.dataset.id === rota.id));
  el("pageTitle").textContent = rota.m.titulo;
  el("pageSub").textContent = rota.m.sub || "";
  rota.m.render(el("view"));
}

function atualizarBadges() {
  const docsAlerta = dados.documentos_veiculo.filter(d => d.vencimento && diasAte(d.vencimento) <= 30).length;
  const atr = lista => lista.filter(c => c.situacao !== "quitado" && c.vencimento && diasAte(c.vencimento) < 0).length;
  const set = (id, n) => { const b = el("nb-" + id); b.textContent = n; b.classList.toggle("hidden", !n); };
  set("veiculos", docsAlerta);
  set("receber", atr(dados.contas_receber));
  set("pagar", atr(dados.contas_pagar));
}

window.addEventListener("hashchange", () => { if (pronto) { desenhar(); window.scrollTo({ top: 0 }); } });
aoMudar(() => { if (pronto) { desenhar(); atualizarBadges(); } });

/* ---------- autenticação ---------- */
onAuthStateChanged(auth, async user => {
  if (user) {
    pronto = false;
    el("loginScreen").classList.add("hidden");
    el("appContent").classList.remove("hidden");
    el("userEmail").textContent = user.email;
    el("view").innerHTML = '<div class="panel empty">Carregando dados...</div>';
    try {
      await carregar();
    } catch (err) {
      toast("Não foi possível carregar os dados: " + err.message + " (verifique as regras do Firestore).", "err");
    }
    pronto = true;
    desenhar();
    atualizarBadges();
  } else {
    pronto = false;
    el("appContent").classList.add("hidden");
    el("loginScreen").classList.remove("hidden");
  }
});

el("formLogin").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = el("btnEntrar");
  btn.disabled = true; btn.textContent = "Entrando...";
  try {
    await signInWithEmailAndPassword(auth, el("loginEmail").value.trim(), el("loginSenha").value);
    el("formLogin").reset();
  } catch {
    toast("E-mail ou palavra-passe inválidos.", "err");
  }
  btn.disabled = false; btn.textContent = "Entrar no sistema";
});

el("btnLogout").addEventListener("click", async () => {
  if (await confirmar("Terminar sessão", "Deseja sair do sistema?", "Sair", false)) await signOut(auth);
});
