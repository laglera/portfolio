/* ------------------------------------------------------------------
   Modal de contacto

   El formulario se envía a Web3Forms (https://web3forms.com), que reenvía
   el mensaje al correo asociado a la access key. La key es pública por
   diseño: solo permite enviar al buzón registrado. Si el envío falla,
   se muestra el email para escribir a mano.
------------------------------------------------------------------ */

(function () {
  "use strict";

  // Se monta en dos trozos para que los scrapers de spam no lo lean directo.
  const MAIL_USER = "alejandro.web00";
  const MAIL_HOST = "gmail.com";
  const CONTACT_EMAIL = MAIL_USER + "@" + MAIL_HOST;

  const WEB3FORMS_URL = "https://api.web3forms.com/submit";
  const WEB3FORMS_KEY = "651c1b03-1b84-49bf-838b-c5dba49a0801";

  const dialog = document.querySelector(".contact-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const form = dialog.querySelector(".contact-form");
  const done = dialog.querySelector(".contact-done");
  const head = dialog.querySelector(".contact-dialog__head");
  const errorNote = dialog.querySelector(".contact-dialog__note--error");
  const submitBtn = form.querySelector('[type="submit"]');
  const openers = document.querySelectorAll("[data-contact-open]");

  dialog.querySelectorAll("[data-contact-email]").forEach(function (a) {
    a.textContent = CONTACT_EMAIL;
    a.href = "mailto:" + CONTACT_EMAIL;
  });

  function t(key, fallback) {
    return window.i18n ? window.i18n.t(key) : fallback;
  }

  let lastFocused = null;

  function showForm() {
    form.hidden = false;
    head.hidden = false;
    done.hidden = true;
    if (errorNote) errorNote.hidden = true;
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

  function setSending(sending) {
    submitBtn.disabled = sending;
    submitBtn.textContent = sending
      ? t("contact.sending", "Enviando...")
      : t("contact.send", "Enviar");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitBtn.disabled) return;
    if (errorNote) errorNote.hidden = true;

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

    const payload = {
      access_key: WEB3FORMS_KEY,
      subject: "[Portfolio] " + (subject || t("contact.mail.subject", "Contacto desde el portfolio")),
      from_name: name,
      name: name,
      email: email,
      message: message,
    };

    setSending(true);
    try {
      const response = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.success) {
        throw new Error(result.message || "HTTP " + response.status);
      }
      form.reset();
      showDone();
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      if (errorNote) errorNote.hidden = false;
    } finally {
      setSending(false);
    }
  });

  function showDone() {
    form.hidden = true;
    head.hidden = true;
    done.hidden = false;
    const btn = done.querySelector("button");
    if (btn) btn.focus();
  }
})();
