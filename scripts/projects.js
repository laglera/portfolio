/* ------------------------------------------------------------------
   Rejilla de proyectos: diálogo de detalle

   Las casillas no llevan texto: cada <li> guarda los datos en
   atributos data-* y el diálogo se rellena con los de la que se pulsa.
   Al ser <button> y no <a href="#">, pulsar una no salta al inicio.
------------------------------------------------------------------ */

(function () {
  "use strict";

  const section = document.querySelector(".projects");
  if (!section) return;

  const grid = section.querySelector(".projects__grid");
  const ETIQUETAS = {
    es: { web: "Web", ios: "iOS", escritorio: "Escritorio" },
    en: { web: "Web", ios: "iOS", escritorio: "Desktop" },
  };

  const idioma = () => (window.i18n ? window.i18n.lang : "es");
  const t = (clave, fallback) => (window.i18n ? window.i18n.t(clave) : fallback);

  // Título y resumen tienen versión inglesa en data-*-en.
  function campo(card, nombre) {
    const en = card.dataset[nombre + "En"];
    return idioma() === "en" && en ? en : card.dataset[nombre] || "";
  }

  // El nombre del proyecto sólo existe para lectores de pantalla.
  function etiquetarCasillas() {
    grid.querySelectorAll(".project").forEach(function (card) {
      const box = card.querySelector(".project__box");
      if (box) box.setAttribute("aria-label", t("projects.open", "Ver detalles de") + " " + campo(card, "title"));
    });
  }

  etiquetarCasillas();
  document.addEventListener("langchange", etiquetarCasillas);

  const dialog = document.querySelector(".project-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const elTitle = dialog.querySelector(".project-dialog__title");
  const elTags = dialog.querySelector(".project-dialog__tags");
  const elSummary = dialog.querySelector(".project-dialog__summary");
  const elStack = dialog.querySelector(".project-dialog__stack");
  const elActions = dialog.querySelector(".project-dialog__actions");

  let lastFocused = null;

  function fill(card) {
    const d = card.dataset;

    const titulo = campo(card, "title");
    const resumen = campo(card, "summary");
    const etiquetas = ETIQUETAS[idioma()] || ETIQUETAS.es;

    elTitle.textContent = titulo || "Proyecto";

    const tags = (d.tags || "")
      .split(/\s+/)
      .filter(Boolean)
      .map(function (tag) {
        return etiquetas[tag] || tag;
      });
    elTags.textContent = [d.year, tags.join(" · ")].filter(Boolean).join(" — ");

    elSummary.textContent = resumen;
    elSummary.hidden = !resumen;

    elStack.textContent = "";
    (d.stack || "")
      .split(",")
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean)
      .forEach(function (tech) {
        const li = document.createElement("li");
        li.textContent = tech;
        elStack.appendChild(li);
      });

    // Los enlaces sólo aparecen si el proyecto los tiene.
    elActions.textContent = "";
    if (d.url) elActions.appendChild(link(d.url, t("project.view", "Ver proyecto"), true));
    if (d.repo) elActions.appendChild(link(d.repo, t("project.code", "Codigo"), false));

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.textContent = t("project.close", "Cerrar");
    cerrar.setAttribute("data-project-close", "");
    elActions.appendChild(cerrar);
  }

  function link(href, text, primary) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (primary) a.className = "is-primary";
    return a;
  }

  function open(card) {
    lastFocused = document.activeElement;
    fill(card);
    dialog.showModal();
    // Sin esto showModal() enfoca el botón de cerrar y se ve su anillo
    // de foco nada más abrir.
    dialog.focus();
  }

  function close() {
    if (dialog.classList.contains("is-closing")) return;

    const finish = function () {
      dialog.classList.remove("is-closing");
      dialog.close();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();

    dialog.classList.add("is-closing");
    let settled = false;
    const once = function () {
      if (settled) return;
      settled = true;
      dialog.removeEventListener("animationend", once);
      finish();
    };
    dialog.addEventListener("animationend", once);
    setTimeout(once, 250);
  }

  grid.addEventListener("click", function (event) {
    const box = event.target.closest(".project__box");
    if (!box) return;
    const card = box.closest(".project");
    if (card) open(card);
  });

  // Los botones de cerrar del pie se recrean en cada apertura.
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) return close();          // clic en el backdrop
    if (event.target.closest("[data-project-close]")) close();
  });

  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    close();
  });
})();
