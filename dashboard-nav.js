(() => {
  function addLink() {
    const actions = document.querySelector(".header-actions");
    if (!actions || actions.querySelector("[data-dre-link]")) return;
    const link = document.createElement("a");
    link.href = "./dre.html?v=1";
    link.target = "_blank";
    link.rel = "noopener";
    link.dataset.dreLink = "true";
    link.className = "ghost-button";
    link.textContent = "Resumo DRE";
    link.style.textDecoration = "none";
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    actions.prepend(link);
  }
  new MutationObserver(addLink).observe(document.documentElement, { childList: true, subtree: true });
  addLink();
})();
