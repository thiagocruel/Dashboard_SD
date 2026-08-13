(() => {
  const source = window.__NPS_GOOGLE_12M__;
  if (!source) return;

  const companies = [
    { id: 3946, name: "POSTO SD ARCO", city: "SOBRAL" },
    { id: 3947, name: "POSTO SD GLORIMAR", city: "SOBRAL" },
    { id: 4756, name: "POSTO SD JABURUNA", city: "SOBRAL" },
    { id: 2565, name: "POSTO SD MISTER HULL", city: "FORTALEZA" },
    { id: 4757, name: "POSTO SD TERESINA", city: "TERESINA" },
    { id: 1, name: "POSTO SD JOCKEY", city: "FORTALEZA" },
    { id: 4458, name: "POSTO SD FLASH", city: "SOBRAL" },
    { id: 4459, name: "POSTO SD CORACAO", city: "SOBRAL" },
    { id: 2737, name: "POSTO SD MODELO", city: "FORTALEZA" },
    { id: 2564, name: "POSTO SD JANGADA", city: "FORTALEZA" },
    { id: 2736, name: "POSTO SD CIDADE", city: "FORTALEZA" },
    { id: 3221, name: "POSTO SD SANTOS DUMONT", city: "FORTALEZA" },
    { id: 3805, name: "POSTO SD SINHA SABOIA", city: "SOBRAL" },
    { id: 2380, name: "POSTO SD GAVIAO", city: "FORTALEZA" },
    { id: 3222, name: "POSTO SD UIRAPURU", city: "FORTALEZA" },
    { id: 5832, name: "POSTO NO PRECO", city: "FORTALEZA" },
    { id: 6828, name: "POSTO BOA VIZINHANÇA", city: "SOBRAL" },
  ];

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  const shortName = (value) => value.replace(/^POSTO SD /, "").replace(/^POSTO /, "");
  const companyByShortName = new Map(companies.map((company) => [normalize(shortName(company.name)), company]));
  const allCities = [...new Set(companies.map((company) => company.city))];
  let selectedCities = [...allCities];
  let selectedCompanyIds = companies.map((company) => company.id);
  let scheduled = false;

  function selectedCompanies() {
    return companies.filter((company) => selectedCities.includes(company.city) && selectedCompanyIds.includes(company.id));
  }

  function aggregate(scope) {
    const stats = scope.map((company) => source.branches[company.id]).filter(Boolean);
    const sum = (key) => stats.reduce((total, item) => total + item[key], 0);
    const reviews = sum("reviews");
    const promoters = sum("promoters");
    const neutrals = sum("neutrals");
    const detractors = sum("detractors");
    return {
      reviews,
      promoters,
      neutrals,
      detractors,
      profiles: stats.length,
      nps: reviews ? ((promoters - detractors) / reviews) * 100 : null,
    };
  }

  function branchStats(company) {
    const item = source.branches[company.id];
    if (!item) return { ...company, reviews: 0, nps: null, averageStars: null };
    return {
      ...company,
      ...item,
      nps: ((item.promoters - item.detractors) / item.reviews) * 100,
      averageStars: item.starsSum / item.reviews,
    };
  }

  function formatNps(value) {
    if (value == null) return "Sem base Google";
    const number = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    return `${value > 0 ? "+" : ""}${number}`;
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setFoot(span, label, value) {
    if (!span) return;
    if (normalize(span.textContent) === normalize(`${label} ${value}`)) return;
    span.replaceChildren(document.createTextNode(`${label} `));
    const detail = document.createElement("b");
    detail.className = "muted";
    detail.textContent = value;
    span.append(detail);
  }

  function findNpsCard() {
    return [...document.querySelectorAll(".kpi-card")].find((card) => {
      const label = normalize(card.querySelector("h3")?.textContent);
      return label === "NPS" || label === "NPS ESTIMADO — GOOGLE";
    });
  }

  function updateCard() {
    const card = findNpsCard();
    if (!card) return;
    card.classList.add("nps-card");
    const scope = selectedCompanies();
    const stats = aggregate(scope);
    setText(card.querySelector("h3"), "NPS estimado — Google");
    card.classList.toggle("is-pending", stats.nps == null);
    const dot = card.querySelector(".kpi-top i");
    if (dot) dot.className = stats.nps == null ? "neutral" : stats.nps >= 0 ? "good" : "bad";
    setText(card.querySelector(":scope > strong"), formatNps(stats.nps));
    const foot = card.querySelectorAll(".kpi-foot span");
    setFoot(foot[0], "12 meses", `${stats.reviews} avaliações`);
    setFoot(foot[1], "Google Maps", `${stats.profiles}/${scope.length} perfis`);
  }

  function createChartRow(item, index) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const name = document.createElement("span");
    name.className = "bar-name";
    const title = document.createElement("b");
    title.textContent = shortName(item.name);
    const city = document.createElement("small");
    city.textContent = item.city;
    name.append(title, city);

    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("i");
    fill.className = index === 0 ? "best" : "";
    fill.style.width = item.nps == null ? "2%" : `${Math.max(2, Math.min(100, (item.nps + 100) / 2))}%`;
    track.append(fill);

    const value = document.createElement("strong");
    value.textContent = formatNps(item.nps);
    const count = document.createElement("small");
    count.className = item.nps == null ? "muted" : item.nps >= 0 ? "positive" : "negative";
    count.textContent = `${item.reviews} aval.`;
    row.append(name, track, value, count);
    return row;
  }

  function updatePanel() {
    const card = findNpsCard();
    const panel = document.querySelector(".bar-panel");
    if (!panel) return;
    const selected = card?.classList.contains("selected");
    let custom = panel.querySelector(".nps-patch-chart");
    const reactChart = [...panel.children].find((child) => child !== panel.querySelector("header") && !child.classList.contains("nps-patch-chart"));

    if (!selected) {
      custom?.remove();
      if (reactChart) reactChart.style.display = "";
      return;
    }

    setText(panel.querySelector(".panel-header h3"), "NPS estimado — Google");
    setText(panel.querySelector(".chart-legend span"), "12 meses");
    setText(panel.querySelector(".chart-legend b"), "nº avaliações");
    if (reactChart) reactChart.style.display = "none";
    if (!custom) {
      custom = document.createElement("div");
      custom.className = "branch-bars nps-patch-chart";
      panel.append(custom);
    }

    const rows = selectedCompanies().map(branchStats).sort((a, b) => (b.nps ?? -Infinity) - (a.nps ?? -Infinity));
    const signature = rows.map((item) => `${item.id}:${item.reviews}:${item.nps}`).join("|");
    if (custom.dataset.signature !== signature) {
      custom.dataset.signature = signature;
      custom.replaceChildren(...rows.map(createChartRow));
    }
  }

  function updateMethodology() {
    const grid = document.querySelector(".method-modal .formula-grid");
    if (!grid || grid.querySelector("[data-nps-method]")) return;
    const article = document.createElement("article");
    article.dataset.npsMethod = "true";
    article.innerHTML = '<span>08</span><div><strong>NPS estimado — Google</strong><p>Avaliações públicas de 12/08/2025 a 12/08/2026: 5 estrelas = promotor; 4 = neutro; 1 a 3 = detrator. NPS estimado = % promotores − % detratores. Boa Vizinhança está sem perfil Google identificável.</p></div>';
    grid.append(article);
  }

  function updateCoverage() {
    const item = [...document.querySelectorAll(".coverage-strip > div")].find((div) => normalize(div.querySelector("span")?.textContent) === "INDICADORES EM IMPLANTACAO");
    if (item) {
      setText(item.querySelector("span"), "COBERTURA ATUAL");
      setText(item.querySelector("strong"), "17 postos · Jan–Jul/26");
    }
  }

  function captureOpenFilters() {
    document.querySelectorAll(".multi-select.is-open").forEach((filter) => {
      const label = normalize(filter.querySelector(".filter-label")?.textContent);
      const checked = [...filter.querySelectorAll(".check-option input:checked")].map((input) => input.closest("label"));
      if (label === "CIDADE") {
        selectedCities = checked.map((option) => normalize(option.querySelector("strong")?.textContent)).filter(Boolean);
      }
      if (label === "POSTO / FILIAL") {
        const visibleCities = new Set([...filter.querySelectorAll(".check-option small")].map((item) => normalize(item.textContent)));
        const keep = selectedCompanyIds.filter((id) => {
          const company = companies.find((item) => item.id === id);
          return company && !visibleCities.has(company.city);
        });
        const visibleSelected = checked.map((option) => companyByShortName.get(normalize(option.querySelector("strong")?.textContent))?.id).filter(Boolean);
        selectedCompanyIds = [...new Set([...keep, ...visibleSelected])];
      }
    });
  }

  function exportNps(event) {
    const card = findNpsCard();
    if (!card?.classList.contains("selected")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rows = selectedCompanies().map(branchStats);
    const header = ["posto", "cidade", "periodo", "avaliacoes", "media_estrelas", "promotores", "neutros", "detratores", "nps_estimado_google"];
    const body = rows.map((item) => [item.name, item.city, "12/08/2025 a 12/08/2026", item.reviews, item.averageStars?.toFixed(2) ?? "", item.promoters ?? "", item.neutrals ?? "", item.detractors ?? "", item.nps?.toFixed(1) ?? ""]);
    const csv = [header, ...body].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nps-estimado-google-12-meses.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      captureOpenFilters();
      updateCard();
      updatePanel();
      updateMethodology();
      updateCoverage();
    });
  }

  document.addEventListener("change", () => setTimeout(apply, 0), true);
  document.addEventListener("click", (event) => {
    if (event.target.closest(".filters-heading button")) {
      selectedCities = [...allCities];
      selectedCompanyIds = companies.map((company) => company.id);
    } else {
      captureOpenFilters();
    }
    if (event.target.closest(".primary-button")) exportNps(event);
    setTimeout(apply, 0);
  }, true);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  apply();
})();
