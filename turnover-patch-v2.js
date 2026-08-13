(() => {
  window.__TURNOVER_PATCH_VERSION__ = 6;
  const GENERAL = "6,78%";
  const FORTALEZA = "8,04%";
  const SOBRAL_TERESINA = "5,26%";

  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const setText = (element, value) => { if (element && element.textContent !== value) element.textContent = value; };

  function setFoot(span, label, value, className) {
    if (!span) return;
    let textNode = [...span.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode) { textNode = document.createTextNode(""); span.prepend(textNode); }
    textNode.nodeValue = `${label} `;
    let detail = span.querySelector("b");
    if (!detail) { detail = document.createElement("b"); span.append(detail); }
    setText(detail, value);
    detail.className = className;
  }

  function updateCard() {
    const card = [...document.querySelectorAll(".kpi-card")].find((item) => normalize(item.querySelector("h3")?.textContent || "").startsWith("TURNOVER"));
    if (!card) return;
    card.classList.remove("is-pending");
    setText(card.querySelector("h3"), "Turnover geral");
    const indicator = card.querySelector(".kpi-top i");
    if (indicator) indicator.className = "bad";
    setText(card.querySelector(":scope > strong"), GENERAL);
    const foot = card.querySelectorAll(".kpi-foot span");
    setFoot(foot[0], "CN Fortaleza", FORTALEZA, "negative");
    setFoot(foot[1], "CN Sobral/Teresina", SOBRAL_TERESINA, "muted");
  }

  function updateTurnoverPanel() {
    const title = document.querySelector(".panel-header h3");
    if (!title || normalize(title.textContent) !== "TURNOVER") return;
    const empty = document.querySelector(".empty-chart");
    if (!empty) return;
    setText(empty.querySelector("strong"), `GERAL ${GENERAL} · CN FORTALEZA ${FORTALEZA} · CN SOBRAL/TERESINA ${SOBRAL_TERESINA}`);
    setText(empty.querySelector("span"), "PERÍODO: JAN–JUL/26.");
  }

  let scheduled = false;
  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; updateCard(); updateTurnoverPanel(); });
  }
  document.addEventListener("click", () => setTimeout(apply, 0), true);
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  apply();
})();
