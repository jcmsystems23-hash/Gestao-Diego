import { dados, porId } from "../store.js";
import { dinheiro, esc, fmtData, diasAte, soma, badge, statusPrazo } from "../utils.js";
import { svg } from "../ui.js";

const aberto = c => c.situacao !== "quitado";

export default {
  titulo: "Painel",
  sub: "Visão geral da operação",
  render(root) {
    const rec = dados.contas_receber.filter(aberto), pag = dados.contas_pagar.filter(aberto);
    const totR = soma(rec), totP = soma(pag), saldo = totR - totP;
    const atrR = rec.filter(c => c.vencimento && diasAte(c.vencimento) < 0).length;
    const atrP = pag.filter(c => c.vencimento && diasAte(c.vencimento) < 0).length;
    const alertas = dados.documentos_veiculo
      .filter(d => d.vencimento && diasAte(d.vencimento) <= 30)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

    // gráfico: 3 meses atrás até 2 à frente, por vencimento
    const base = new Date(); base.setDate(1);
    const meses = [];
    for (let i = -3; i <= 2; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      meses.push({ k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, l: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), r: 0, p: 0 });
    }
    dados.contas_receber.forEach(c => { const m = meses.find(x => x.k === (c.vencimento || "").slice(0, 7)); if (m) m.r += Number(c.valor || 0); });
    dados.contas_pagar.forEach(c => { const m = meses.find(x => x.k === (c.vencimento || "").slice(0, 7)); if (m) m.p += Number(c.valor || 0); });
    const max = Math.max(1, ...meses.map(m => Math.max(m.r, m.p)));

    const proximos = [
      ...rec.map(c => ({ ...c, t: "receber" })),
      ...pag.map(c => ({ ...c, t: "pagar" }))
    ].filter(c => c.vencimento).sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 7);

    root.innerHTML = `
      <div class="cards">
        <div class="stat"><div class="ico green">${svg("down")}</div><div><small>A receber (em aberto)</small><strong>${dinheiro(totR)}</strong><em>${atrR ? atrR + " atrasado(s)" : "Nenhum atraso"}</em></div></div>
        <div class="stat"><div class="ico red">${svg("up")}</div><div><small>A pagar (em aberto)</small><strong>${dinheiro(totP)}</strong><em>${atrP ? atrP + " atrasado(s)" : "Nenhum atraso"}</em></div></div>
        <div class="stat"><div class="ico blue">${svg("pulse")}</div><div><small>Saldo previsto</small><strong class="${saldo < 0 ? "negative" : "positive"}">${dinheiro(saldo)}</strong><em>Receber − pagar</em></div></div>
        <div class="stat"><div class="ico amber">${svg("truck")}</div><div><small>Veículos cadastrados</small><strong>${dados.veiculos.length}</strong><em>${alertas.length ? alertas.length + " documento(s) em alerta" : "Documentos em dia"}</em></div></div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <div><h2>Fluxo previsto</h2><div class="hint">Por data de vencimento (3 meses atrás a 2 à frente)</div></div>
            <div class="legend"><span><i style="background:#059669"></i>Receber</span><span><i style="background:#dc2626"></i>Pagar</span></div>
          </div>
          <div class="chart">${meses.map(m => `<div class="col"><div class="bars">
            <div class="bar r" style="height:${(m.r / max) * 100}%" title="A receber: ${dinheiro(m.r)}"></div>
            <div class="bar d" style="height:${(m.p / max) * 100}%" title="A pagar: ${dinheiro(m.p)}"></div></div></div>`).join("")}</div>
          <div class="xl">${meses.map(m => `<span>${m.l}</span>`).join("")}</div>
        </div>

        <div class="panel">
          <div class="panel-head"><div><h2>Próximos vencimentos</h2><div class="hint">Contas em aberto</div></div></div>
          <div class="list">${proximos.map(c => {
            const r = c.t === "receber", n = diasAte(c.vencimento);
            const quando = n < 0 ? `atrasado ${-n}d` : n === 0 ? "vence hoje" : `em ${n}d`;
            return `<div class="li"><div class="ico ${r ? "green" : "red"}">${svg(r ? "down" : "up")}</div>
              <div class="grow"><b>${esc(c.descricao)}</b><span>${esc(c.pessoaNome || "—")} • ${fmtData(c.vencimento)} (${quando})</span></div>
              <div class="val ${r ? "positive" : "negative"}">${dinheiro(c.valor)}</div></div>`;
          }).join("") || '<div class="empty">Nenhuma conta em aberto.</div>'}</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><div><h2>Alertas de documentos e seguros</h2><div class="hint">Vencidos ou a vencer em até 30 dias</div></div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Veículo</th><th>Documento</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>${alertas.map(a => {
            const v = porId("veiculos", a.veiculoId), s = statusPrazo(a.vencimento);
            return `<tr><td><span class="strong">${esc(v ? v.marca + " " + v.modelo : "—")}</span> ${v ? `<span class="plate" style="margin-left:6px">${esc(v.placa)}</span>` : ""}</td>
              <td>${esc(a.tipo)}<span class="sub-text">${esc(a.numero)}</span></td><td>${fmtData(a.vencimento)}</td><td>${badge(s.nivel, s.texto)}</td></tr>`;
          }).join("") || `<tr><td colspan="4" class="empty">${badge("ok", "Tudo em dia")}<br><br>Nenhum documento ou seguro vencido ou próximo do vencimento.</td></tr>`}</tbody>
        </table></div>
      </div>`;
  }
};
