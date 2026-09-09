/* ------------------------------------------------------------------
   Stack tecnológico: entrada escalonada

   Las píldoras arrancan ocultas y aparecen una detrás de otra la
   primera vez que la sección entra en pantalla. El retardo se guarda
   en --retardo y lo consume la transición de styles/stack.css.

   Si no hay IntersectionObserver la sección se queda tal cual, ya
   visible: la clase .is-armed sólo se pone cuando vamos a animar.
------------------------------------------------------------------ */

(function () {
  "use strict";

  const section = document.querySelector(".stack");
  if (!section) return;

  if (
    typeof IntersectionObserver !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  // El retardo se reinicia en cada grupo para que las filas no se
  // desincronicen a medida que se baja.
  section.querySelectorAll(".stack__group").forEach(function (grupo) {
    grupo.querySelectorAll(".tech").forEach(function (tech, i) {
      tech.style.setProperty("--retardo", (i * 0.045).toFixed(3) + "s");
    });
  });

  section.classList.add("is-armed");

  function revelar() {
    clearTimeout(seguro);
    observer.disconnect();
    section.classList.add("is-visible");
  }

  const observer = new IntersectionObserver(
    function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) revelar();
    },
    { threshold: 0.15 }
  );

  observer.observe(section);

  // Red de seguridad: si el observador no llega a disparar (pestaña en
  // segundo plano, captura automática...) las píldoras se muestran igual.
  const seguro = setTimeout(revelar, 2000);
})();
