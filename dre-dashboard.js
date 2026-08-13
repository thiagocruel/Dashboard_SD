(() => {
  const data = window.DRE_DATA;
  if (!data?.records?.length) return;

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul"];
  const state = { city: "ALL", branch: "ALL", months: new Set([1, 2, 3, 4, 5, 6, 7]) };
  const metrics = [
    ["revenue", "Faturamento", "Receita total"],
    ["grossProfit", "Lucro bruto", "Após CMV"],
    ["ebitda", "EBITDA", "Resultado operacional"],
    ["netProfit", "Lucro líquido geral", "Pista + loja"],
    ["fuelNetProfit", "Lucro líquido pista", "Geral menos loja"],
    ["storeNetProfit", "Lucro líquido loja", "DRE exclusiva da conveniência"],
    ["storeRevenue", "Faturamento loja", "15 lojas com operação"],
  ];

  const cityFilter = document.querySelector("#cityFilter");
  const branchFilter = document.querySelector("#branchFilter");
  const monthFilters = document.querySelector("#monthFilters");
  const branches = [...new Map(data.records.map((r) => [r.branchId, { id: r.branchId, name: r.name, city: r.city, number: r.branchNumber, hasStore: r.hasStore }])).values()].sort((a, b) => a.number - b.number);
  const cities = [...new Set(branches.map((b) => b.city))].sort();

  const shortName = (name) => name.replace(/^POSTO SD /, "").replace(/^POSTO /, "");
  const money = (value, compact = false) => {
    if (compact && Math.abs(value) >= 1e6) return `R$ ${(value / 1e6).toFixed(2).replace(".", ",")} mi`;
    if (compact && Math.abs(value) >= 1e3) return `R$ ${(value / 1e3).toFixed(0).replace(".", ",")} mil`;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
  };
  const percent = (value) => value == null || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
  const delta = (current, previous) => previous ? (current - previous) / Math.abs(previous) * 100 : null;
  const sum = (records, key) => records.reduce((total, row) => total + (row[key] || 0), 0);
  const selected = (year, branchId = null) => data.records.filter((r) => r.year === year && state.months.has(r.month) && (state.city === "ALL" || r.city === state.city) && (state.branch === "ALL" || String(r.branchId) === state.branch) && (branchId == null || r.branchId === branchId));

  function populateFilters() {
    cityFilter.insertAdjacentHTML("beforeend", cities.map((city) => `<option value="${city}">${city[0]}${city.slice(1).toLowerCase()}</option>`).join(""));
    monthFilters.innerHTML = months.map((month, index) => `<label><input type="checkbox" value="${index + 1}" checked><span>${month}</span></label>`).join("");
    updateBranchOptions();
  }

  function updateBranchOptions() {
    const available = branches.filter((branch) => state.city === "ALL" || branch.city === state.city);
    if (state.branch !== "ALL" && !available.some((branch) => String(branch.id) === state.branch)) state.branch = "ALL";
    branchFilter.innerHTML = `<option value="ALL">Todos os postos</option>${available.map((branch) => `<option value="${branch.id}">${String(branch.number).padStart(2, "0")} · ${shortName(branch.name)}</option>`).join("")}`;
    branchFilter.value = state.branch;
  }

  function renderCards() {
    const current = selected(2026);
    const previous = selected(2025);
    document.querySelector("#metricCards").innerHTML = metrics.map(([key, label, detail], index) => {
      const value = sum(current, key);
      const prior = sum(previous, key);
      const change = delta(value, prior);
      const tone = change == null ? "" : change >= 0 ? "delta-positive" : "delta-negative";
      let extra = detail;
      if (key === "grossProfit" && sum(current, "revenue")) extra = `Margem ${(value / sum(current, "revenue") * 100).toFixed(1).replace(".", ",")}%`;
      if (key === "netProfit" && sum(current, "revenue")) extra = `Margem ${(value / sum(current, "revenue") * 100).toFixed(1).replace(".", ",")}%`;
      return `<article class="dre-card"><header><small>0${index + 1}</small><i></i></header><h2>${label}</h2><strong>${money(value, true)}</strong><footer><span>2025 <b>${money(prior, true)}</b></span><b class="${tone}">${percent(change)}</b></footer><small>${extra}</small></article>`;
    }).join("");
  }

  function renderBridge() {
    const current = selected(2026);
    const previous = selected(2025);
    const lines = [["revenue", "Faturamento"], ["cmv", "(–) CMV"], ["grossProfit", "Lucro bruto"], ["ebitda", "EBITDA"], ["incomeTax", "(–) IRPJ / CSLL"], ["netProfit", "Lucro líquido"]];
    document.querySelector("#bridgeBody").innerHTML = lines.map(([key, label]) => {
      const v26 = sum(current, key), v25 = sum(previous, key), change = delta(v26, v25);
      const tone = change == null ? "" : change >= 0 ? "delta-positive" : "delta-negative";
      return `<tr><td>${label}</td><td>${money(v26)}</td><td>${money(v25)}</td><td class="${tone}">${percent(change)}</td></tr>`;
    }).join("");
  }

  function renderTrend() {
    const values = months.map((_, index) => {
      const month = index + 1;
      const base = (year) => data.records.filter((r) => r.year === year && r.month === month && (state.city === "ALL" || r.city === state.city) && (state.branch === "ALL" || String(r.branchId) === state.branch));
      return { month, current: sum(base(2026), "netProfit"), previous: sum(base(2025), "netProfit") };
    }).filter((row) => state.months.has(row.month));
    const max = Math.max(1, ...values.flatMap((row) => [Math.abs(row.current), Math.abs(row.previous)]));
    const bars = values.map((row) => {
      const h26 = Math.max(2, Math.abs(row.current) / max * 220), h25 = Math.max(2, Math.abs(row.previous) / max * 220);
      return `<div class="trend-month"><div class="trend-bars"><div class="trend-bar previous" style="height:${h25}px"><span>${money(row.previous, true).replace("R$ ", "")}</span></div><div class="trend-bar current" style="height:${h26}px"><span>${money(row.current, true).replace("R$ ", "")}</span></div></div><strong>${months[row.month - 1]}</strong></div>`;
    }).join("");
    document.querySelector("#profitTrend").innerHTML = bars || `<p>Selecione ao menos um mês.</p>`;
    document.querySelector("#profitTrend").insertAdjacentHTML("afterend", `<div class="trend-legend"><span>2026</span><span>2025</span></div>`);
    const legends = document.querySelectorAll(".trend-legend");
    legends.forEach((legend, index) => index < legends.length - 1 && legend.remove());
  }

  function renderBranches() {
    const branchRows = branches.filter((branch) => (state.city === "ALL" || branch.city === state.city) && (state.branch === "ALL" || String(branch.id) === state.branch)).map((branch) => {
      const r26 = selected(2026, branch.id), r25 = selected(2025, branch.id);
      return { branch, net26: sum(r26, "netProfit"), net25: sum(r25, "netProfit"), revenue26: sum(r26, "revenue"), fuel26: sum(r26, "fuelNetProfit"), store26: sum(r26, "storeNetProfit") };
    }).sort((a, b) => b.net26 - a.net26);
    document.querySelector("#branchCount").textContent = `${branchRows.length} posto(s)`;
    document.querySelector("#branchBody").innerHTML = branchRows.map((row) => {
      const change = delta(row.net26, row.net25), margin = row.revenue26 ? row.net26 / row.revenue26 * 100 : null;
      const tone = change == null ? "" : change >= 0 ? "delta-positive" : "delta-negative";
      return `<tr><td>${String(row.branch.number).padStart(2, "0")} · ${shortName(row.branch.name)}</td><td>${row.branch.city[0]}${row.branch.city.slice(1).toLowerCase()}</td><td>${money(row.net26)}</td><td>${money(row.fuel26)}</td><td>${row.branch.hasStore ? money(row.store26) : "—"}</td><td>${money(row.net25)}</td><td class="${tone}">${percent(change)}</td><td>${margin == null ? "—" : `${margin.toFixed(1).replace(".", ",")}%`}</td></tr>`;
    }).join("");
  }

  function renderScope() {
    const selectedBranches = branches.filter((branch) => (state.city === "ALL" || branch.city === state.city) && (state.branch === "ALL" || String(branch.id) === state.branch));
    const period = [...state.months].sort((a, b) => a - b).map((m) => months[m - 1]).join(" + ") || "Nenhum mês";
    document.querySelector("#scopeSummary").textContent = `${period} · ${selectedBranches.length} posto(s) · ${new Set(selectedBranches.map((b) => b.city)).size} cidade(s)`;
    const currentJuly = selected(2026).filter((r) => r.month === 7);
    const alert = document.querySelector("#taxAlert");
    const show = state.months.has(7) && currentJuly.length && currentJuly.every((r) => r.incomeTax === 0);
    alert.classList.toggle("is-visible", Boolean(show));
    alert.textContent = show ? "Atenção: julho/2026 está sem lançamento de IRPJ/CSLL nas DREs recebidas; o lucro líquido do mês pode estar provisório." : "";
  }

  function render() { renderScope(); renderCards(); renderTrend(); renderBridge(); renderBranches(); }
  cityFilter.addEventListener("change", () => { state.city = cityFilter.value; updateBranchOptions(); render(); });
  branchFilter.addEventListener("change", () => { state.branch = branchFilter.value; render(); });
  monthFilters.addEventListener("change", (event) => { const month = Number(event.target.value); event.target.checked ? state.months.add(month) : state.months.delete(month); render(); });
  document.querySelector("#resetFilters").addEventListener("click", () => { state.city = "ALL"; state.branch = "ALL"; state.months = new Set([1, 2, 3, 4, 5, 6, 7]); cityFilter.value = "ALL"; monthFilters.querySelectorAll("input").forEach((input) => input.checked = true); updateBranchOptions(); render(); });

  populateFilters();
  render();
})();
