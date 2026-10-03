/* ------------------------------------------------------------------
   Traducción de la página (español / inglés)

   Cada texto traducible lleva data-i18n="clave" y se sustituye su
   contenido. Para atributos (aria-label, placeholder) se usa
   data-i18n-attr="atributo:clave, otro:clave".

   Los proyectos son un caso aparte: sus textos viven en data-* del
   <li> y el diálogo los lee según el idioma activo (data-summary /
   data-summary-en).
------------------------------------------------------------------ */

(function () {
  "use strict";

  const TEXTOS = {
    es: {
      "hero.role": "Programador",
      "hero.language": "Idioma",
      "hero.theme": "Tema",

      "theme.light": "Claro",
      "theme.dark": "Oscuro",
      "theme.system": "Sistema",

      "lang.es": "Español",
      "lang.en": "Inglés",

      "hero.age": "22 años, viviendo en",
      "hero.country": "España",
      "hero.studies.2": "Construyo mis propios",
      "hero.studies.projects": "proyectos",
      "hero.studies.3": "en mi tiempo libre y me dedico a mis otros",
      "hero.studies.hobbies": "hobbies",
      "hero.selftaught": "De manera autodidacta, me gusta aprender sobre Big Data y Machine Learning.",
      "hero.open.1": "Estoy abierto a nuevas oportunidades, siéntete libre de contactarme por",
      "hero.open.email": "email",
      "hero.open.2": ", o buscándome en",

      "stack.title": "Stack tecnológico.",
      "stack.sub": "Lo que uso a diario, entre la carrera y lo que construyo por mi cuenta.",
      "stack.languages": "Lenguajes",
      "stack.frameworks": "Frameworks",
      "stack.data": "Datos y ML",
      "stack.platforms": "Plataformas",
      "stack.tools": "Herramientas",

      "hobbies.title": "Hobbies.",
      "hobbies.viewAll": "View all",

      "projects.title": "Proyectos.",
      "projects.open": "Ver detalles de",
      "project.view": "Ver proyecto",
      "project.code": "Código",
      "project.close": "Cerrar",

      "contact.title": "Hablemos",
      "contact.sub": "Cuéntame en qué puedo ayudarte y te respondo pronto.",
      "contact.close": "Cerrar",
      "contact.name": "Nombre",
      "contact.name.ph": "Cómo te llamas",
      "contact.name.err": "Escribe tu nombre.",
      "contact.email": "Email",
      "contact.email.ph": "tu@email.com",
      "contact.email.err": "Revisa el formato del email.",
      "contact.subject": "Asunto",
      "contact.subject.ph": "Oportunidad, proyecto, duda...",
      "contact.subject.err": "Indica un asunto.",
      "contact.message": "Mensaje",
      "contact.message.ph": "Cuéntame los detalles",
      "contact.message.err": "El mensaje no puede estar vacío.",
      "contact.hp": "No rellenar",
      "contact.cancel": "Cancelar",
      "contact.send": "Enviar",
      "contact.sending": "Enviando...",
      "contact.error": "No se pudo enviar el mensaje. Vuelve a intentarlo o escríbeme a",
      "contact.done": "¡Gracias!",
      "contact.done.text": "Mensaje enviado. Te responderé lo antes posible.",
      "contact.mail.subject": "Contacto desde el portfolio",
    },

    en: {
      "hero.role": "Developer",
      "hero.language": "Language",
      "hero.theme": "Theme",

      "theme.light": "Light",
      "theme.dark": "Dark",
      "theme.system": "System",

      "lang.es": "Spanish",
      "lang.en": "English",

      "hero.age": "22 years old, living in",
      "hero.country": "Spain",
      "hero.studies.2": "I build my own",
      "hero.studies.projects": "projects",
      "hero.studies.3": "in my free time and spend the rest on my other",
      "hero.studies.hobbies": "hobbies",
      "hero.selftaught": "Self-taught, I enjoy learning about Big Data and Machine Learning.",
      "hero.open.1": "I am open to new opportunities, feel free to reach me by",
      "hero.open.email": "email",
      "hero.open.2": ", or find me on",

      "stack.title": "Tech stack.",
      "stack.sub": "What I use day to day, between university and what I build on my own.",
      "stack.languages": "Languages",
      "stack.frameworks": "Frameworks",
      "stack.data": "Data & ML",
      "stack.platforms": "Platforms",
      "stack.tools": "Tools",

      "hobbies.title": "Hobbies.",
      "hobbies.viewAll": "View all",

      "projects.title": "Projects.",
      "projects.open": "See details of",
      "project.view": "View project",
      "project.code": "Code",
      "project.close": "Close",

      "contact.title": "Let's talk",
      "contact.sub": "Tell me what I can help you with and I'll reply soon.",
      "contact.close": "Close",
      "contact.name": "Name",
      "contact.name.ph": "Your name",
      "contact.name.err": "Please enter your name.",
      "contact.email": "Email",
      "contact.email.ph": "you@email.com",
      "contact.email.err": "Check the email format.",
      "contact.subject": "Subject",
      "contact.subject.ph": "Opportunity, project, question...",
      "contact.subject.err": "Please add a subject.",
      "contact.message": "Message",
      "contact.message.ph": "Tell me the details",
      "contact.message.err": "The message cannot be empty.",
      "contact.hp": "Do not fill in",
      "contact.cancel": "Cancel",
      "contact.send": "Send",
      "contact.sending": "Sending...",
      "contact.error": "The message couldn't be sent. Try again or write to me at",
      "contact.done": "Thanks!",
      "contact.done.text": "Message sent. I'll get back to you as soon as possible.",
      "contact.mail.subject": "Contact from the portfolio",
    },
  };

  const IDIOMAS = ["es", "en"];

  function detect() {
    let saved = null;
    try { saved = localStorage.getItem("lang"); } catch (e) {}
    if (IDIOMAS.indexOf(saved) !== -1) return saved;
    // Sin preferencia guardada, se sigue al navegador.
    const nav = (navigator.language || "es").slice(0, 2).toLowerCase();
    return IDIOMAS.indexOf(nav) !== -1 ? nav : "es";
  }

  let lang = detect();

  function t(key) {
    return (TEXTOS[lang] && TEXTOS[lang][key]) || TEXTOS.es[key] || key;
  }

  function translate() {
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });

    // data-i18n-attr="aria-label:hero.language, placeholder:contact.name.ph"
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(",").forEach(function (par) {
        const trozos = par.split(":");
        if (trozos.length !== 2) return;
        el.setAttribute(trozos[0].trim(), t(trozos[1].trim()));
      });
    });

    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
  }

  function setLang(next) {
    if (IDIOMAS.indexOf(next) === -1) return;
    lang = next;
    try { localStorage.setItem("lang", next); } catch (e) {}
    if (picker) picker.check(next);
    translate();
  }

  // API para el resto de scripts (diálogos de contacto y proyectos).
  window.i18n = {
    t: t,
    get lang() { return lang; },
    set: setLang,
  };

  let picker = null;
  const root = document.querySelector(".lang-picker");
  if (root && typeof window.createPicker === "function") {
    picker = window.createPicker(root, {
      attr: "data-lang",
      onSelect: setLang,
    });
    picker.check(lang);
  }

  translate();
})();
