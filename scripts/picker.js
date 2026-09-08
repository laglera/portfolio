/* ------------------------------------------------------------------
   Menú desplegable de los botones del header

   Mecánica común al selector de tema y al de idioma: abrir, cerrar,
   recorrer con las flechas y marcar la opción activa.

   Uso:
     const picker = createPicker(document.querySelector(".picker"), {
       attr: "data-theme-pref",          // atributo que identifica la opción
       onSelect(valor) { ... },
     });
     picker.check("dark");               // marca una opción sin dispararla
------------------------------------------------------------------ */

function createPicker(root, options) {
  const button = root.querySelector(".picker__button");
  const menu = root.querySelector(".picker__menu");
  const items = Array.from(menu.querySelectorAll("[" + options.attr + "]"));
  const value = (el) => el.getAttribute(options.attr);

  function open() {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const checked = items.find((i) => i.getAttribute("aria-checked") === "true");
    (checked || items[0]).focus();
  }

  function close(refocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (refocus) button.focus();
  }

  button.addEventListener("click", function () {
    if (menu.hidden) open();
    else close(true);
  });

  menu.addEventListener("click", function (event) {
    const item = event.target.closest("[" + options.attr + "]");
    if (!item) return;
    options.onSelect(value(item));
    close(true);
  });

  root.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !menu.hidden) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (menu.hidden) {
      event.preventDefault();
      open();
      return;
    }
    const i = items.indexOf(document.activeElement);
    if (i === -1) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(i + step + items.length) % items.length].focus();
  });

  document.addEventListener("pointerdown", function (event) {
    if (!root.contains(event.target)) close(false);
  });

  root.addEventListener("focusout", function (event) {
    if (!root.contains(event.relatedTarget)) close(false);
  });

  return {
    check: function (active) {
      items.forEach(function (item) {
        item.setAttribute("aria-checked", String(value(item) === active));
      });
    },
    close: close,
  };
}

if (typeof window !== "undefined") window.createPicker = createPicker;
