(() => {
  const CURRENT = "5,26%";
  const PREVIOUS = "5,02%";
  const DELTA = "+0,24 P.P.";

  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function setFoot(span, label, value, className) {
    if (!span) return;
    let textNode = [...span.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNode) {
      textNode = document.createTextNode("");
      span.prepend(textNode);
    }
    textNode.nodeValue = `${label} `;
    let detail = span.querySelector("b");
    if (!detail) {
      detail = document.createElement("b");
      span.append(detail);
    }
    setText(detail, value);
    detail.className = className;
  }

  function updateCard() {
    const card = [...document.querySelectorAll(".kpi-card")].find(
      (item) => normalize(item.querySelector("h3")?.textContent || "") === "TURNOVER",
    );
    if (!card) return;

    card.classList.remove("is-pending");
    const indicator = card.querySelector(".kpi-top i");
    if (indicator) indicator.className = "bad";
    setText(card.querySelector(":scope > strong"), CURRENT);

    const foot = card.querySelectorAll(".kpi-foot span");
    setFoot(foot[0], `2025 ${PREVIOUS}`, DELTA, "negative");
    setFoot(foot[1], "CN SOBRAL + TERESINA · JAN–JUL", "FORTALEZA PENDENTE", "muted");
  }

  function updateTurnoverPanel() {
    const title = document.querySelector(".panel-header h3");
    if (!title || normalize(title.textContent) !== "TURNOVER") return;
    const empty = document.querySelector(".empty-chart");
    if (!empty) return;
    setText(empty.querySelector("strong"), "DADO CONSOLIDADO DO CN SOBRAL + TERESINA.");
    setText(empty.querySelector("span"), "JAN–JUL/26 · SEM RATEIO POR POSTO · FORTALEZA PENDENTE.");
  }

  let scheduled = false;
  function apply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateCard();
      updateTurnoverPanel();
    });
  }

  document.addEventListener("click", () => setTimeout(apply, 0), true);
  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  apply();
})();
