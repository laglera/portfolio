/* ------------------------------------------------------------------
   Hobbies en la portada: rellena los huecos de la rejilla con los
   seis primeros de window.HOBBIES (scripts/hobbies-data.js). El
   botón "Ver todo" es un enlace a hobbies.html.
------------------------------------------------------------------ */

(function () {
  "use strict";

  const HOBBIES = window.HOBBIES || [];
  const section = document.querySelector(".hobbies");
  if (!section) return;

  const slots = section.querySelectorAll(".hobbies__slot");

  const idioma = () => (window.i18n ? window.i18n.lang : "es");
  const titulo = (h) => (idioma() === "en" && h.titleEn ? h.titleEn : h.title || "");

  function pintarHuecos() {
    slots.forEach(function (slot, i) {
      const h = HOBBIES[i];
      slot.textContent = "";
      if (!h) return;

      const img = document.createElement("img");
      img.src = h.image;
      img.alt = titulo(h);
      img.loading = "lazy";
      img.decoding = "async";
      slot.appendChild(img);

      if (titulo(h)) {
        const cap = document.createElement("span");
        cap.className = "hobbies__caption";
        cap.textContent = titulo(h);
        slot.appendChild(cap);
      }
    });
  }

  pintarHuecos();
  document.addEventListener("langchange", pintarHuecos);
})();
