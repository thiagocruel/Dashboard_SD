(() => {
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
  };

  const root = document.getElementById("root");
  if (!root) return;

  applyCopyUpdates();
  new MutationObserver(applyCopyUpdates).observe(root, {
    childList: true,
    subtree: true,
  });
})();
