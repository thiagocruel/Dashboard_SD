(() => {
  window.__DASHBOARD_COMPARISON_VERSION__ = 8;

  const MONTH_NAMES = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL"];
  const METRICS = {
    LITRAGEM: { key: "volume", label: "Litragem", format: "liters" },
    TRANSACOES: { key: "transactions", label: "Transações", format: "integer" },
    "MIX GASOLINA ADITIVADA": { key: "mixGa", label: "Mix gasolina aditivada", format: "percent" },
    "FATURAMENTO DIVERSOS": { key: "diversos", label: "Faturamento diversos", format: "currency" },
    "FATURAMENTO LOJAS": { key: "faturamentoLoja", label: "Faturamento lojas", format: "currency" },
    "MARGEM BRUTA LOJA": { key: "margemLoja", label: "Margem bruta loja", format: "percent" },
    "LUCRO LIQUIDO GERAL": { key: "netProfit", label: "Lucro líquido geral", format: "currency" },
    "LUCRO LIQUIDO PISTA": { key: "fuelNetProfit", label: "Lucro líquido pista", format: "currency" },
    "LUCRO LIQUIDO LOJA": { key: "storeNetProfit", label: "Lucro líquido loja", format: "currency" },
    PRODUTIVIDADE: { key: "occupancy", label: "Produtividade", format: "percent" },
    "NPS ESTIMADO GOOGLE": { key: "nps", label: "NPS estimado — Google", format: "nps" },
    "TURNOVER MEDIO MENSAL": { key: "turnover", label: "Turnover", format: "percent" },
    "TURNOVER DO MES": { key: "turnover", label: "Turnover", format: "percent" },
  };

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9 ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const shortName = (value) => String(value || "").replace(/^POSTO SD /, "").replace(/^POSTO /, "");
  const sum = (rows, field) => rows.reduce((total, row) => total + Number(row.actual?.[field] || 0), 0);

  function selectedMonths() {
    const period = normalize(document.querySelector(".selection-summary strong")?.textContent);
    if (/JAN.*JUL/.test(period)) return [1, 2, 3, 4, 5, 6, 7];
    if (/NENHUM/.test(period)) return [];
    return MONTH_NAMES.map((label, index) => label && new RegExp(`\\b${label}\\b`).test(period) ? index : null).filter(Boolean);
  }

  function selectedCompanyIds(data) {
    const exposed = window.__DASHBOARD_FILTER_SCOPE__?.companyIds;
    if (Array.isArray(exposed)) return exposed;
    const names = new Set(
      [...document.querySelectorAll(".bar-panel .bar-name[title]")]
        .map((element) => normalize(element.getAttribute("title"))),
    );
    const fromChart = data.companies.filter((company) => names.has(normalize(company.name))).map((company) => company.id);
    return fromChart.length ? fromChart : data.companies.map((company) => company.id);
  }

  function selectedMetric() {
    const title = normalize(document.querySelector(".kpi-card.selected h3")?.textContent);
    return METRICS[title] || (title.startsWith("TURNOVER") ? METRICS["TURNOVER MEDIO MENSAL"] : null);
  }

  function metricValue(rows, key) {
    if (!rows.length) return null;
    if (key === "volume") return sum(rows, "volume");
    if (key === "transactions") return sum(rows, "fuelTransactions");
    if (key === "mixGa") {
      const additive = sum(rows, "gaLiters");
      const common = sum(rows, "gcLiters");
      return additive + common ? additive / (additive + common) * 100 : null;
    }
    if (key === "diversos") return sum(rows, "diverseRevenue");
    if (key === "faturamentoLoja") return sum(rows, "storeRevenue");
    if (key === "margemLoja") {
      const revenue = sum(rows, "storeRevenue");
      return revenue ? sum(rows, "storeProfit") / revenue * 100 : null;
    }
    if (["netProfit", "fuelNetProfit", "storeNetProfit"].includes(key)) return sum(rows, key);
    if (key === "occupancy") {
      const available = sum(rows, "equivalentDays");
      return available ? sum(rows, "proportionalDays") / available * 100 : null;
    }
    return null;
  }

  function variation(current, previous) {
    if (current == null || previous == null || previous === 0) return null;
    return (current - previous) / Math.abs(previous) * 100;
  }

  function compactNumber(value, digits = 1) {
    const absolute = Math.abs(value);
    if (absolute >= 1e6) return `${(value / 1e6).toFixed(digits).replace(".", ",")}mi`;
    if (absolute >= 1e3) return `${(value / 1e3).toFixed(0).replace(".", ",")}k`;
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);
  }

  function formatValue(value, format, compact = true) {
    if (value == null || !Number.isFinite(value)) return "—";
    if (format === "currency") return `R$ ${compact ? compactNumber(value) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)}`;
    if (format === "liters") return `${compact ? compactNumber(value) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)} L`;
    if (format === "integer") return compact ? compactNumber(value) : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
    if (format === "nps") return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}`;
    return `${value.toFixed(2).replace(".", ",")}%`;
  }

  function formatBarValue(value, format, compactLabels) {
    if (!compactLabels) return formatValue(value, format);
    if (value == null || !Number.isFinite(value)) return "—";
    if (format === "nps") return `${value > 0 ? "+" : ""}${Math.round(value)}`;
    if (format === "percent") return `${Math.round(value)}%`;
    const absolute = Math.abs(value);
    if (absolute >= 1e6) return `${(value / 1e6).toFixed(absolute < 1e7 ? 1 : 0).replace(".", ",")}M`;
    if (absolute >= 1e3) return `${Math.round(value / 1e3)}k`;
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
  }

  function formatDelta(value) {
    if (value == null || !Number.isFinite(value)) return "SEM BASE";
    return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
  }

  function npsForCompany(companyId) {
    const item = window.__NPS_GOOGLE_12M__?.branches?.[companyId];
    return item?.reviews ? (item.promoters - item.detractors) / item.reviews * 100 : null;
  }

  function turnoverAverage(year, months, key) {
    const rows = (window.__TURNOVER_DATA__?.[year] || []).filter((row) => months.includes(row.month));
    if (!rows.length) return null;
    return rows.reduce((total, row) => total + row[key], 0) / rows.length;
  }

  function regularBranchData(data, metric, companyIds, months) {
    return data.companies
      .filter((company) => companyIds.includes(company.id))
      .map((company) => {
        const rows = data.rows.filter((row) => months.includes(row.month) && row.companyId === company.id);
        const current = metric.key === "nps" ? npsForCompany(company.id) : metricValue(rows.filter((row) => row.year === 2026), metric.key);
        const previous = metric.key === "nps" ? null : metricValue(rows.filter((row) => row.year === 2025), metric.key);
        return { label: shortName(company.name), detail: company.city, current, previous, delta: variation(current, previous) };
      })
      .sort((a, b) => (b.current ?? -Infinity) - (a.current ?? -Infinity));
  }

  function turnoverBranchData(data, companyIds, months) {
    const cities = new Set(data.companies.filter((company) => companyIds.includes(company.id)).map((company) => company.city));
    const entries = [];
    if (cities.has("FORTALEZA") && (cities.has("SOBRAL") || cities.has("TERESINA"))) entries.push(["Geral", "general"]);
    if (cities.has("FORTALEZA")) entries.push(["CN Fortaleza", "fortaleza"]);
    if (cities.has("SOBRAL") || cities.has("TERESINA")) entries.push(["CN Sobral/Teresina", "sobralTeresina"]);
    return entries.map(([label, key]) => {
      const current = turnoverAverage(2026, months, key);
      const previous = turnoverAverage(2025, months, key);
      return { label, detail: "Base consolidada", current, previous, delta: variation(current, previous) };
    });
  }

  function monthlyData(data, metric, companyIds, months) {
    if (metric.key === "nps") return null;
    if (metric.key === "turnover") {
      const cities = new Set(data.companies.filter((company) => companyIds.includes(company.id)).map((company) => company.city));
      const key = cities.has("FORTALEZA") && (cities.has("SOBRAL") || cities.has("TERESINA"))
        ? "general"
        : cities.has("FORTALEZA") ? "fortaleza" : "sobralTeresina";
      return months.map((month) => {
        const current = turnoverAverage(2026, [month], key);
        const previous = turnoverAverage(2025, [month], key);
        return { label: MONTH_NAMES[month], current, previous, delta: variation(current, previous) };
      });
    }
    return months.map((month) => {
      const rows = data.rows.filter((row) => row.month === month && companyIds.includes(row.companyId));
      const current = metricValue(rows.filter((row) => row.year === 2026), metric.key);
      const previous = metricValue(rows.filter((row) => row.year === 2025), metric.key);
      return { label: MONTH_NAMES[month], current, previous, delta: variation(current, previous) };
    });
  }

  function barStyle(value, scale) {
    const height = value == null ? 0 : Math.max(2, Math.abs(value) / scale * 100);
    return `--comparison-height:${Math.min(100, height)}%`;
  }

  function comparisonChart(items, metric, compactLabels = false) {
    if (!items?.length) return `<div class="comparison-empty">Selecione ao menos um mês e uma filial.</div>`;
    const scale = Math.max(1, ...items.flatMap((item) => [Math.abs(item.current || 0), Math.abs(item.previous || 0)]));
    return `<div class="comparison-columns ${compactLabels ? "is-compact" : ""}" style="--comparison-count:${items.length}">
      ${items.map((item) => `
        <div class="comparison-group" title="${item.label}${item.detail ? ` · ${item.detail}` : ""}">
          <strong class="comparison-delta ${item.delta == null ? "is-muted" : item.delta >= 0 ? "is-positive" : "is-negative"}">${formatDelta(item.delta)}</strong>
          <div class="comparison-pair">
            <span class="comparison-series current ${item.current < 0 ? "is-value-negative" : ""}" title="2026: ${formatValue(item.current, metric.format, false)}"><b>${formatBarValue(item.current, metric.format, compactLabels)}</b><i style="${barStyle(item.current, scale)}"></i><small>26</small></span>
            <span class="comparison-series previous ${item.previous < 0 ? "is-value-negative" : ""}" title="2025: ${formatValue(item.previous, metric.format, false)}"><b>${formatBarValue(item.previous, metric.format, compactLabels)}</b><i style="${barStyle(item.previous, scale)}"></i><small>25</small></span>
          </div>
          <span class="comparison-name">${item.label}</span>
        </div>`).join("")}
    </div>`;
  }

  function setPanelHeader(panel, eyebrow, title) {
    const header = panel.querySelector(".panel-header");
    if (!header) return;
    const heading = header.querySelector(":scope > div:first-child");
    if (heading) heading.innerHTML = `<span>${eyebrow}</span><h3>${title}</h3>`;
    let legend = header.querySelector(".chart-legend");
    if (!legend) {
      legend = document.createElement("div");
      legend.className = "chart-legend";
      header.append(legend);
    }
    legend.innerHTML = `<span class="legend-current"><i></i>2026</span><span class="legend-previous"><i></i>2025</span><b>Rótulo: variação anual</b>`;
  }

  function ensureComparisonBody(panel) {
    [...panel.children].forEach((child) => {
      if (child !== panel.querySelector("header") && !child.classList.contains("kpi-comparison-chart")) child.classList.add("comparison-source-chart");
    });
    let body = panel.querySelector(".kpi-comparison-chart");
    if (!body) {
      body = document.createElement("div");
      body.className = "kpi-comparison-chart";
      panel.append(body);
    }
    return body;
  }

  function ensureMonthlyPanel(executiveGrid) {
    executiveGrid.querySelector(".monthly-occupancy-panel")?.remove();
    let panel = executiveGrid.querySelector(".monthly-comparison-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "monthly-comparison-panel";
      panel.innerHTML = `<header class="panel-header"><div></div><div class="chart-legend"></div></header><div class="monthly-comparison-chart"></div>`;
      executiveGrid.append(panel);
    }
    return panel;
  }

  function renderCharts() {
    const data = window.__DASHBOARD_DATA__;
    const metric = selectedMetric();
    const executiveGrid = document.querySelector(".executive-grid");
    const branchPanel = document.querySelector(".bar-panel");
    if (!data?.rows || !metric || !executiveGrid || !branchPanel) return;

    const months = selectedMonths();
    const companyIds = selectedCompanyIds(data);
    const branchItems = metric.key === "turnover" ? turnoverBranchData(data, companyIds, months) : regularBranchData(data, metric, companyIds, months);
    const monthlyItems = monthlyData(data, metric, companyIds, months);
    const renderKey = JSON.stringify({ metric: metric.key, months, companyIds, branchItems, monthlyItems });
    if (executiveGrid.dataset.comparisonKey === renderKey) return;
    executiveGrid.dataset.comparisonKey = renderKey;

    executiveGrid.classList.remove("occupancy-dashboard", "turnover-dashboard");
    executiveGrid.classList.add("comparison-dashboard");
    const branchTitle = metric.key === "turnover" ? "Turnover por centro de negócio" : `${metric.label} por filial`;
    const branchEyebrow = metric.key === "turnover" ? "COMPARATIVO POR CENTRO DE NEGÓCIO" : "COMPARATIVO POR FILIAL · ORDENADO POR 2026";
    setPanelHeader(branchPanel, branchEyebrow, branchTitle);
    ensureComparisonBody(branchPanel).innerHTML = comparisonChart(branchItems, metric, branchItems.length > 10);

    const monthlyPanel = ensureMonthlyPanel(executiveGrid);
    setPanelHeader(monthlyPanel, "EVOLUÇÃO MENSAL", `${metric.label} mês a mês`);
    monthlyPanel.querySelector(".monthly-comparison-chart").innerHTML = monthlyItems === null
      ? `<div class="comparison-empty"><strong>Sem abertura mensal e sem base 2025</strong><span>O NPS disponível está consolidado nos últimos 12 meses.</span></div>`
      : comparisonChart(monthlyItems, metric);
  }

  function updateFixedCopy() {
    const contentDescription = document.querySelector(".content-heading p");
    if (contentDescription) contentDescription.textContent = "Os gráficos comparam 2026 × 2025 por filial e por mês.";
    const productivityTitle = document.querySelector(".productivity-card header h3");
    if (productivityTitle) productivityTitle.textContent = "PRODUTIVIDADE";
    const updateStamp = document.querySelector(".update-stamp");
    if (updateStamp) {
      if (updateStamp.querySelector("span")) updateStamp.querySelector("span").textContent = "BASE DE DADOS";
      if (updateStamp.querySelector("strong")) updateStamp.querySelector("strong").textContent = "Atualizado até julho/26";
    }
    document.querySelectorAll(".primary-button").forEach((button) => {
      if (normalize(button.textContent).includes("EXPORTAR")) button.remove();
    });
  }

  function updateProductivityCard() {
    const productivityCard = document.querySelector(".productivity-card");
    const occupancyButton = [...document.querySelectorAll(".productivity-grid button")].find((button) => normalize(button.querySelector("span")?.textContent).startsWith("OCUPACAO REAL"));
    if (!productivityCard || !occupancyButton) return;
    productivityCard.classList.add("force-occupancy-only");
    let occupancyOnly = productivityCard.querySelector(".occupancy-only");
    if (!occupancyOnly) {
      occupancyOnly = document.createElement("div");
      occupancyOnly.className = "occupancy-only";
      occupancyOnly.setAttribute("role", "button");
      occupancyOnly.setAttribute("tabindex", "0");
      occupancyOnly.title = "Clique para exibir a produtividade por filial e por mês.";
      occupancyOnly.innerHTML = `<span>PERCENTUAL DE OCUPAÇÃO</span><strong></strong><small>Base: 14 transações por VIP/hora</small><p>Acima de 100% sinaliza sobrecarga ou possível concentração de registros.</p>`;
      const selectOccupancy = () => document.querySelectorAll(".kpi-card")[9]?.click();
      occupancyOnly.addEventListener("click", selectOccupancy);
      occupancyOnly.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") selectOccupancy();
      });
      productivityCard.append(occupancyOnly);
    }
    const value = occupancyButton.querySelector("strong")?.textContent || "—";
    if (occupancyOnly.querySelector("strong")?.textContent !== value) occupancyOnly.querySelector("strong").textContent = value;
  }

  let scheduled = false;
  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateFixedCopy();
      updateProductivityCard();
      renderCharts();
    });
  }

  const root = document.getElementById("root");
  if (!root) return;
  document.addEventListener("click", () => setTimeout(apply, 0), true);
  document.addEventListener("change", () => setTimeout(apply, 0), true);
  new MutationObserver(apply).observe(root, { childList: true, characterData: true, subtree: true });
  apply();
})();
