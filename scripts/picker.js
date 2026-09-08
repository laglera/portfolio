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

  // El menú se despliega con una transición (ver .picker__menu en hero.css).
  // Como parte de [hidden], hay que quitarlo, forzar un reflow y sólo entonces
  // marcar .is-open; al cerrar se espera a que la transición acabe para
  // volver a ocultarlo.
  const SALIDA = 150; // ms, debe cubrir la transición de cierre
  const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  let abierto = false;
  let temporizador = null;

  function open() {
    if (abierto) return;
    abierto = true;
    clearTimeout(temporizador);
    menu.classList.remove("is-closing");
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    const checked = items.find((i) => i.getAttribute("aria-checked") === "true");
    (checked || items[0]).focus();
  }

  function close(refocus) {
    if (!abierto) return;
    abierto = false;
    menu.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    if (refocus) button.focus();

    if (menosMovimiento.matches) {
      menu.hidden = true;
      return;
    }

    menu.classList.add("is-closing");
    temporizador = setTimeout(function () {
      menu.classList.remove("is-closing");
      menu.hidden = true;
    }, SALIDA);
  }

  button.addEventListener("click", function () {
    if (abierto) close(true);
    else open();
  });

  menu.addEventListener("click", function (event) {
    const item = event.target.closest("[" + options.attr + "]");
    if (!item) return;
    options.onSelect(value(item));
    close(true);
  });

  root.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && abierto) {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (!abierto) {
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
