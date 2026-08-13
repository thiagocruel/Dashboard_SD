(() => {
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^POSTO SD /, "")
      .replace(/^POSTO /, "")
      .trim()
      .toUpperCase();

  const parsePercent = (value) => {
    const parsed = Number(
      String(value || "")
        .replace(/[^0-9,.-]/g, "")
        .replace(".", "")
        .replace(",", "."),
    );
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const selectedMonths = () => {
    const labels = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7 };
    const period = document.querySelector(".selection-summary strong")?.textContent?.trim() || "";
    if (/JAN[–-]JUL/i.test(period)) return [1, 2, 3, 4, 5, 6, 7];
    if (/NENHUM/i.test(period)) return [];
    return Object.entries(labels)
      .filter(([label]) => new RegExp(`\\b${label}\\b`, "i").test(normalize(period)))
      .map(([, month]) => month);
  };

  const activeCompanyIds = (branchRows, data) => {
    const names = new Set(
      [...branchRows].map((row) => normalize(row.querySelector(".bar-name")?.getAttribute("title"))),
    );
    return data.companies.filter((company) => names.has(normalize(company.name))).map((company) => company.id);
  };

  const setBranchColumns = (branchBars) => {
    const rows = [...branchBars.querySelectorAll(".bar-row")];
    const values = rows.map((row) => parsePercent(row.querySelector(":scope > strong")?.textContent));
    const scale = Math.max(100, Math.ceil(Math.max(...values, 0) / 10) * 10);
    rows.forEach((row, index) => {
      const bar = row.querySelector(".bar-track i");
      if (bar) bar.style.setProperty("--column-height", `${Math.min(100, (values[index] / scale) * 100)}%`);
    });
    branchBars.style.setProperty("--reference-position", `${(100 / scale) * 100}%`);
    branchBars.style.setProperty("--branch-count", String(Math.max(rows.length, 1)));
    if (!branchBars.querySelector(".occupancy-reference")) {
      const reference = document.createElement("span");
      reference.className = "occupancy-reference";
      reference.textContent = "100%";
      branchBars.append(reference);
    }
  };

  const renderMonthlyColumns = (executiveGrid, branchRows) => {
    const data = window.__DASHBOARD_DATA__;
    if (!data?.rows || !data?.companies) return;

    let panel = executiveGrid.querySelector(".monthly-occupancy-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "monthly-occupancy-panel";
      panel.innerHTML = `
        <header class="panel-header">
          <div><span>EVOLUÇÃO MENSAL</span><h3>Ocupação real por mês</h3></div>
          <div class="chart-legend"><i></i><span>Realizado 2026</span><b>Referência 100%</b></div>
        </header>
        <div class="monthly-columns"></div>`;
      executiveGrid.append(panel);
    }

    const companyIds = new Set(activeCompanyIds(branchRows, data));
    const months = selectedMonths();
    const monthNames = ["", "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL"];
    const values = months.map((month) => {
      const rows = data.rows.filter(
        (row) => row.year === 2026 && row.month === month && companyIds.has(row.companyId),
      );
      const proportional = rows.reduce((sum, row) => sum + (row.actual.proportionalDays || 0), 0);
      const available = rows.reduce((sum, row) => sum + (row.actual.equivalentDays || 0), 0);
      return { month, value: available ? (proportional / available) * 100 : null };
    });
    const scale = Math.max(
      100,
      Math.ceil(Math.max(...values.map((item) => item.value || 0), 0) / 10) * 10,
    );
    const key = JSON.stringify({ companies: [...companyIds].sort(), months, values, scale });
    if (panel.dataset.renderKey === key) return;
    panel.dataset.renderKey = key;

    const chart = panel.querySelector(".monthly-columns");
    chart.style.setProperty("--reference-position", `${(100 / scale) * 100}%`);
    chart.innerHTML = values.length
      ? `<span class="occupancy-reference">100%</span>${values
          .map(
            ({ month, value }) => `<div class="month-column">
              <strong>${value == null ? "—" : `${value.toFixed(2).replace(".", ",")}%`}</strong>
              <span class="month-track"><i style="--column-height:${value == null ? 0 : Math.min(100, (value / scale) * 100)}%"></i></span>
              <b>${monthNames[month]}</b>
            </div>`,
          )
          .join("")}`
      : `<div class="monthly-empty">Selecione ao menos um mês.</div>`;
  };

  const applyCopyUpdates = () => {
    const productivityTitle = document.querySelector(".productivity-card header h3");
    if (productivityTitle && productivityTitle.textContent !== "PRODUTIVIDADE") {
      productivityTitle.textContent = "PRODUTIVIDADE";
    }

    const updateStamp = document.querySelector(".update-stamp");
    if (updateStamp) {
      const label = updateStamp.querySelector("span");
      const value = updateStamp.querySelector("strong");
      if (label && label.textContent !== "BASE DE DADOS") {
        label.textContent = "BASE DE DADOS";
      }
      if (value && value.textContent !== "Atualizado até julho/26") {
        value.textContent = "Atualizado até julho/26";
      }
    }

    document.querySelectorAll(".primary-button").forEach((button) => {
      if (button.textContent.trim().toLowerCase().includes("exportar")) {
        button.remove();
      }
    });

    const productivityGrid = document.querySelector(".productivity-grid");
    if (productivityGrid) {
      let removedRevenuePerFe = false;
      productivityGrid.querySelectorAll("button").forEach((button) => {
        const label = button.querySelector("span")?.textContent || "";
        if (label.toLocaleUpperCase("pt-BR").startsWith("FATURAMENTO / FE")) {
          button.remove();
          removedRevenuePerFe = true;
        }
      });
      productivityGrid.classList.toggle("without-revenue-per-fe", removedRevenuePerFe);
    }

    const executiveGrid = document.querySelector(".executive-grid");
    const productivityCard = document.querySelector(".productivity-card");
    const branchPanel = document.querySelector(".bar-panel");
    const occupancyButton = [...document.querySelectorAll(".productivity-grid button")].find((button) =>
      normalize(button.querySelector("span")?.textContent).startsWith("OCUPACAO REAL"),
    );
    if (!executiveGrid || !productivityCard || !branchPanel || !occupancyButton) return;

    executiveGrid.classList.add("occupancy-dashboard");
    if (normalize(branchPanel.querySelector(".panel-header h3")?.textContent) !== "OCUPACAO REAL") {
      occupancyButton.click();
      return;
    }

    let occupancyOnly = productivityCard.querySelector(".occupancy-only");
    if (!occupancyOnly) {
      occupancyOnly = document.createElement("div");
      occupancyOnly.className = "occupancy-only";
      occupancyOnly.innerHTML = `
        <span>PERCENTUAL DE OCUPAÇÃO</span>
        <strong></strong>
        <small>Base: 14 transações por VIP/hora</small>
        <p>Acima de 100% sinaliza sobrecarga ou possível concentração de registros.</p>`;
      productivityCard.append(occupancyOnly);
    }
    const occupancyValue = occupancyButton.querySelector("strong")?.textContent || "—";
    const valueTarget = occupancyOnly.querySelector("strong");
    if (valueTarget.textContent !== occupancyValue) valueTarget.textContent = occupancyValue;

    const branchBars = branchPanel.querySelector(".branch-bars");
    if (!branchBars) return;
    setBranchColumns(branchBars);
    renderMonthlyColumns(executiveGrid, branchBars.querySelectorAll(".bar-row"));
  };

  const root = document.getElementById("root");
  if (!root) return;

  applyCopyUpdates();
  new MutationObserver(applyCopyUpdates).observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
  });
})();
