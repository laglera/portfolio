/* ------------------------------------------------------------------
   Modal de contacto

   Sin backend: el formulario compone un mailto: con lo que escribe el
   visitante y lo abre en su cliente de correo. Si eso falla (webmail
   sin protocolo registrado), la pantalla de confirmación deja el texto
   a mano para copiarlo.
------------------------------------------------------------------ */

(function () {
  "use strict";

  // Se monta en dos trozos para que los scrapers de spam no lo lean directo.
  const MAIL_USER = "alejandro.web00";
  const MAIL_HOST = "gmail.com";
  const CONTACT_EMAIL = MAIL_USER + "@" + MAIL_HOST;

  const dialog = document.querySelector(".contact-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const form = dialog.querySelector(".contact-form");
  const done = dialog.querySelector(".contact-done");
  const head = dialog.querySelector(".contact-dialog__head");
  const doneMail = dialog.querySelector("[data-contact-email]");
  const openers = document.querySelectorAll("[data-contact-open]");

  if (doneMail) {
    doneMail.textContent = CONTACT_EMAIL;
    doneMail.href = "mailto:" + CONTACT_EMAIL;
  }

  let lastFocused = null;

  function showForm() {
    form.hidden = false;
    head.hidden = false;
    done.hidden = true;
    form.classList.remove("was-validated");
  }

  function open() {
    lastFocused = document.activeElement;
    showForm();
    dialog.showModal();
    // showModal() enfoca el primer control; preferimos el campo de nombre.
    const first = form.querySelector("input, textarea");
    if (first) first.focus();
  }

  function close() {
    if (dialog.classList.contains("is-closing")) return;

    const finish = function () {
      dialog.classList.remove("is-closing");
      dialog.close();
      form.reset();
      showForm();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return finish();

    dialog.classList.add("is-closing");
    let settled = false;
    const once = function () {
      if (settled) return;
      settled = true;
      dialog.removeEventListener("animationend", once);
      finish();
    };
    dialog.addEventListener("animationend", once);
    setTimeout(once, 250); // por si la animación no llega a dispararse
  }

  openers.forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      open();
    });
  });

  dialog.querySelectorAll("[data-contact-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });

  // ESC: lo intercepta el navegador, así que animamos nosotros la salida.
  dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    close();
  });

  // Click en el backdrop (el propio <dialog> ocupa toda la pantalla).
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) close();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      const invalid = form.querySelector(":invalid");
      if (invalid) invalid.focus();
      return;
    }

    // Honeypot: si viene relleno es un bot. Fingimos éxito y no enviamos.
    if (form.elements.website && form.elements.website.value) {
      showDone();
      return;
    }

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const subject = form.elements.subject.value.trim();
    const message = form.elements.message.value.trim();

    const body =
      message + "\n\n—\n" + name + (email ? " <" + email + ">" : "");

    const href =
      "mailto:" +
      CONTACT_EMAIL +
      "?subject=" +
      encodeURIComponent(subject || "Contacto desde el portfolio") +
      "&body=" +
      encodeURIComponent(body);

    window.location.href = href;
    showDone();
  });

  function showDone() {
    form.hidden = true;
    head.hidden = true;
    done.hidden = false;
    const btn = done.querySelector("button");
    if (btn) btn.focus();
  }
})();
