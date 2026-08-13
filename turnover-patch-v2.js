(() => {
  window.__TURNOVER_PATCH_VERSION__ = 5;
  const CURRENT = "6,78%";
  const PREVIOUS = "6,19%";
  const DELTA = "+0,59 P.P.";

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
    const card = [...document.querySelectorAll(".kpi-card")].find((item) => normalize(item.querySelector("h3")?.textContent || "") === "TURNOVER");
    if (!card) return;
    card.classList.remove("is-pending");
    const indicator = card.querySelector(".kpi-top i");
    if (indicator) indicator.className = "bad";
    setText(card.querySelector(":scope > strong"), CURRENT);
    const foot = card.querySelectorAll(".kpi-foot span");
    setFoot(foot[0], `2025 ${PREVIOUS}`, DELTA, "negative");
    setFoot(foot[1], "CN SOBRAL + TERESINA + FORTALEZA", "JAN–JUL", "muted");
  }

  function updateTurnoverPanel() {
    const title = document.querySelector(".panel-header h3");
    if (!title || normalize(title.textContent) !== "TURNOVER") return;
    const empty = document.querySelector(".empty-chart");
    if (!empty) return;
    setText(empty.querySelector("strong"), "DADO CONSOLIDADO DOS CNs SOBRAL + TERESINA + FORTALEZA.");
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
