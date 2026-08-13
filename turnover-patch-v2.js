(() => {
  window.__TURNOVER_PATCH_VERSION__ = 9;

  const SOURCE = {
    2025: {
      fortaleza: {
        active: [212, 213, 206, 202, 209, 207, 206, 211, 212, 204, 207, 206],
        admissions: [20, 12, 13, 25, 12, 10, 17, 20, 12, 15, 16, 10],
        dismissals: [23, 22, 17, 21, 15, 13, 15, 24, 25, 16, 18, 11],
        adjustment: 2,
      },
      sobralTeresina: {
        active: [167, 166, 156, 162, 165, 164, 164, 170, 170, 165, 167, 165],
        admissions: [10, 8, 11, 6, 5, 7, 11, 8, 10, 9, 6, 12],
        dismissals: [12, 20, 8, 5, 8, 8, 10, 9, 17, 8, 9, 13],
        adjustment: 1,
      },
    },
    2026: {
      fortaleza: {
        active: [209, 210, 202, 204, 203, 204, 205],
        admissions: [18, 12, 23, 12, 19, 17, 20],
        dismissals: [19, 25, 24, 20, 20, 20, 10],
        adjustment: 2,
      },
      sobralTeresina: {
        active: [165, 167, 170, 171, 173, 173, 170],
        admissions: [8, 11, 12, 7, 10, 3, 11],
        dismissals: [8, 12, 13, 9, 13, 8, 14],
        adjustment: 1,
      },
    },
  };

  const MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL"];
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const format = (value) => `${value.toFixed(2).replace(".", ",")}%`;
  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const severity = (value) => value <= 4 ? { label: "bom", className: "positive" } : value <= 6 ? { label: "atenção", className: "attention" } : { label: "alto", className: "negative" };

  function monthly(year) {
    const fortaleza = SOURCE[year].fortaleza;
    const sobral = SOURCE[year].sobralTeresina;
    return fortaleza.active.map((_, index) => {
      const fortalezaEvents = Math.max(0, fortaleza.admissions[index] - fortaleza.adjustment) + Math.max(0, fortaleza.dismissals[index] - fortaleza.adjustment);
      const sobralEvents = Math.max(0, sobral.admissions[index] - sobral.adjustment) + Math.max(0, sobral.dismissals[index] - sobral.adjustment);
      return {
        month: index + 1,
        fortaleza: (fortalezaEvents / 2) / fortaleza.active[index] * 100,
        sobralTeresina: (sobralEvents / 2) / sobral.active[index] * 100,
        general: ((fortalezaEvents + sobralEvents) / 2) / (fortaleza.active[index] + sobral.active[index]) * 100,
      };
    });
  }

  const TURNOVER = { 2025: monthly(2025), 2026: monthly(2026) };
  window.__TURNOVER_DATA__ = TURNOVER;

  function selectedMonths() {
    const period = normalize(document.querySelector(".selection-summary strong")?.textContent);
    if (/JAN.*JUL/.test(period)) return [1, 2, 3, 4, 5, 6, 7];
    if (/NENHUM/.test(period)) return [];
    return MONTHS.map((label, index) => new RegExp(`\\b${label}\\b`).test(period) ? index + 1 : null).filter(Boolean);
  }

  function valuesFor(year, months) {
    const rows = TURNOVER[year].filter((row) => months.includes(row.month));
    return {
      rows,
      general: mean(rows.map((row) => row.general)),
      fortaleza: mean(rows.map((row) => row.fortaleza)),
      sobralTeresina: mean(rows.map((row) => row.sobralTeresina)),
    };
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setFoot(span, label, value) {
    if (!span) return;
    const tone = severity(value);
    const expectedText = `${label} · ${tone.label} ${format(value)}`;
    const currentDetail = span.querySelector("b");
    if (span.textContent.trim() === expectedText && currentDetail?.className === tone.className) return;
    span.innerHTML = `${label} · ${tone.label} <b class="${tone.className}">${format(value)}</b>`;
  }

  function updateCard() {
    const card = [...document.querySelectorAll(".kpi-card")].find((item) => normalize(item.querySelector("h3")?.textContent).startsWith("TURNOVER"));
    if (!card) return;
    card.classList.add("turnover-card");
    const months = selectedMonths();
    const current = valuesFor(2026, months);
    card.classList.remove("is-pending");
    setText(card.querySelector("h3"), months.length === 1 ? "Turnover do mês" : "Turnover médio mensal");
    const tone = severity(current.general);
    const indicator = card.querySelector(".kpi-top i");
    if (indicator) indicator.className = tone.className === "positive" ? "good" : tone.className === "negative" ? "bad" : "attention";
    setText(card.querySelector(":scope > strong"), months.length ? format(current.general) : "—");
    const foot = card.querySelectorAll(".kpi-foot span");
    if (months.length) {
      setFoot(foot[0], "CN Fortaleza", current.fortaleza);
      setFoot(foot[1], "CN Sobral/Teresina", current.sobralTeresina);
    }
    card.title = months.length === 1
      ? "Taxa do mês selecionado."
      : "Média aritmética das taxas mensais dos meses selecionados; não é percentual acumulado.";
  }

  function rowHtml(label, key, rows) {
    return `<div class="turnover-row"><strong>${label}</strong>${rows.map((row) => {
      const tone = severity(row[key]);
      return `<span class="${tone.className}" title="${tone.label}">${format(row[key])}</span>`;
    }).join("")}</div>`;
  }

  function updatePanel() {
    const panel = document.querySelector(".bar-panel");
    const title = panel?.querySelector(".panel-header h3");
    if (!panel || !normalize(title?.textContent).startsWith("TURNOVER")) return;
    const months = selectedMonths();
    const rows = TURNOVER[2026].filter((row) => months.includes(row.month));
    const previous = valuesFor(2025, months);
    const body = panel.querySelector(".empty-chart, .turnover-monthly-panel");
    if (!body) return;
    body.className = "turnover-monthly-panel";
    const renderKey = JSON.stringify({ months, rows, previous });
    if (body.dataset.renderKey !== renderKey) {
      body.dataset.renderKey = renderKey;
      body.innerHTML = rows.length ? `
      <div class="turnover-table" style="--turnover-months:${rows.length}">
        <div class="turnover-row turnover-head"><strong>CN / MÊS</strong>${rows.map((row) => `<span>${MONTHS[row.month - 1]}</span>`).join("")}</div>
        ${rowHtml("Geral", "general", rows)}
        ${rowHtml("Fortaleza", "fortaleza", rows)}
        ${rowHtml("Sobral/Teresina", "sobralTeresina", rows)}
      </div>
      <small>Média mensal no mesmo período de 2025: Geral ${format(previous.general)} · Fortaleza ${format(previous.fortaleza)} · Sobral/Teresina ${format(previous.sobralTeresina)}.</small>
    ` : `<strong>Selecione ao menos um mês.</strong>`;
    }
    setText(title, "Turnover por mês");
    const eyebrow = panel.querySelector(".panel-header > div > span");
    setText(eyebrow, "EVOLUÇÃO MENSAL · 2026");
    const legend = panel.querySelector(".chart-legend");
    const legendHtml = `<span>Média mensal, não acumulado</span><b>Bom ≤ 4% · atenção ≤ 6% · alto &gt; 6%</b>`;
    if (legend && legend.innerHTML !== legendHtml) legend.innerHTML = legendHtml;
  }

  let scheduled = false;
  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateCard();
    });
  }

  document.addEventListener("click", () => setTimeout(apply, 0), true);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  apply();
})();
