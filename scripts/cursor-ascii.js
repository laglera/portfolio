/* ------------------------------------------------------------------
   Overlay ASCII que reacciona al puntero
   Rejilla de caracteres pequeños muy separados. Al pasar el cursor,
   cada celda recibe una energía según su distancia (medida en celdas,
   no en píxeles) y esa energía se va gastando con el tiempo.

   El carácter dibujado depende de la energía que le queda:
       mucha  ->  o        (núcleo, recién encendido)
       media  ->  >
       poca   ->  -  _     (a punto de apagarse)

   La opacidad nunca cambia: la celda se apaga de golpe al gastarse.

   Uso:
     <canvas class="ascii-field"></canvas>
     new AsciiCursorField(document.querySelector('.ascii-field'));
------------------------------------------------------------------ */

class AsciiCursorField {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.opts = Object.assign(
      {
        cellW: 10,          // ancho de celda en px
        cellH: 13,          // alto de celda en px
        fontSize: 9,        // glifos pequeños dentro de celdas anchas
        radius: 2.8,        // radio del halo EN CELDAS
        lifetime: 1100,     // ms que vive una celda encendida a tope
        alpha: 0.34,        // opacidad única, no se atenúa
        density: 0.62,      // fracción de celdas que llegan a encenderse
        color: "255, 255, 255",
        // Escala de caracteres por energía restante, de más a menos.
        ramp: [
          { min: 0.72, chars: ["o"] },
          { min: 0.32, chars: [">"] },
          { min: 0.0, chars: ["-", "_"] },
        ],
        jitter: 0.2,        // irregularidad del borde del halo
        safeSelector: null, // zonas a proteger (textos, botones)
        // Sobre esas zonas el efecto no se corta: sigue pasando por
        // detrás con esta fracción de la opacidad, para no competir
        // con el texto pero mantener el halo continuo.
        safeFade: 0.5,
        safePad: 2,         // margen alrededor de cada línea de texto
      },
      options
    );

    this.cols = 0;
    this.rows = 0;
    this.grid = null;       // instante de apagado por celda
    this.born = null;       // instante de encendido por celda
    this.noise = null;
    this.variant = null;
    this.sparse = null;
    this.pointer = null;
    this.rafId = null;
    this.running = false;
    this.safeRects = [];

    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._tick = this._tick.bind(this);

    this.resize();

    window.addEventListener("resize", this._onResize);
    window.addEventListener("scroll", this._onResize, { passive: true });
    window.addEventListener("pointermove", this._onPointerMove, { passive: true });
    window.addEventListener("pointerleave", this._onPointerLeave, { passive: true });
  }

  /* --- rejilla ---------------------------------------------------- */

  _measure() {
    if (getComputedStyle(this.canvas).position === "fixed") {
      return { w: window.innerWidth, h: window.innerHeight };
    }
    const host = this.canvas.parentElement || document.body;
    const rect = host.getBoundingClientRect();
    return {
      w: Math.round(rect.width) || window.innerWidth,
      h: Math.round(rect.height) || window.innerHeight,
    };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { w, h } = this._measure();

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.width = w;
    this.height = h;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.font = `${this.opts.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    this.cols = Math.ceil(w / this.opts.cellW) + 1;
    this.rows = Math.ceil(h / this.opts.cellH) + 1;

    const size = this.cols * this.rows;
    const previousGrid = this.grid;
    const previousBorn = this.born;
    this.grid = new Float64Array(size);
    this.born = new Float64Array(size);
    if (previousGrid && previousGrid.length === size) {
      this.grid.set(previousGrid);
      this.born.set(previousBorn);
    }

    // Ruidos fijos por celda: deforman el borde del halo y eligen entre
    // las variantes de un mismo nivel (- o _), sin parpadeos.
    this.noise = new Float32Array(size);
    this.variant = new Float32Array(size);
    this.sparse = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const a = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
      const b = Math.sin(i * 78.233 + 1.7182) * 24634.6345;
      const c = Math.sin(i * 39.3467 + 9.0912) * 19367.4517;
      this.noise[i] = a - Math.floor(a);
      this.variant[i] = b - Math.floor(b);
      this.sparse[i] = c - Math.floor(c);
    }

    this._collectSafeRects();
  }

  /* Rectángulos protegidos.

     Se miden por línea de texto, no por bloque: el rect de un <section>
     de 720px taparía media pantalla y partiría el halo en seco. Con las
     cajas reales de cada línea el efecto sigue corriendo por los
     márgenes y por el interlineado. */
  _collectSafeRects() {
    if (!this.opts.safeSelector) {
      this.safeRects = [];
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const pad = this.opts.safePad;
    const rects = [];

    const push = (r) => {
      if (!r || r.width <= 0 || r.height <= 0) return;
      rects.push({
        left: r.left - canvasRect.left - pad,
        top: r.top - canvasRect.top - pad,
        right: r.right - canvasRect.left + pad,
        bottom: r.bottom - canvasRect.top + pad,
      });
    };

    // Elementos sin texto propio (iconos, botones): van enteros.
    const ATOMIC = "img, svg, canvas, video, input, textarea, select, button";

    for (const el of document.querySelectorAll(this.opts.safeSelector)) {
      const before = rects.length;

      for (const node of el.querySelectorAll(ATOMIC)) push(node.getBoundingClientRect());
      if (el.matches(ATOMIC)) push(el.getBoundingClientRect());

      // Una caja por línea renderizada de cada nodo de texto.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      });
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) push(r);
      }

      // Sin texto ni elementos atómicos: se protege el bloque entero.
      if (rects.length === before) push(el.getBoundingClientRect());
    }

    this.safeRects = rects.filter(
      (r) => r.right > 0 && r.bottom > 0 && r.left < this.width && r.top < this.height
    );
  }

  // Los rects que cruzan una fila de la rejilla. Filtrar una vez por
  // fila evita recorrer las ~40 cajas de línea en cada celda.
  _rectsForRow(y) {
    const out = [];
    for (let i = 0; i < this.safeRects.length; i++) {
      const r = this.safeRects[i];
      if (y >= r.top && y <= r.bottom) out.push(r);
    }
    return out;
  }

  _isSafeIn(rects, x) {
    for (let i = 0; i < rects.length; i++) {
      if (x >= rects[i].left && x <= rects[i].right) return true;
    }
    return false;
  }

  /* --- entrada ---------------------------------------------------- */

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.resize();
      const now = performance.now();
      if (this.grid.some((v) => v > now)) {
        this.running = false;
        this.start();
      }
    }, 120);
  }

  _onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const next = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (this.pointer) {
      // Un movimiento rápido entrega pocos eventos: se rellena el hueco.
      const dx = next.x - this.pointer.x;
      const dy = next.y - this.pointer.y;
      const dist = Math.hypot(dx, dy);
      const step = this.opts.cellW * 0.9;
      const steps = Math.min(Math.ceil(dist / step), 40);
      for (let s = 1; s <= steps; s++) {
        this.addPoint(this.pointer.x + (dx * s) / steps, this.pointer.y + (dy * s) / steps);
      }
    }

    this.addPoint(next.x, next.y);
    this.pointer = next;
    this.start();
  }

  _onPointerLeave() {
    this.pointer = null;
  }

  /* --- encendido --------------------------------------------------- */

  addPoint(x, y) {
    const { cellW, cellH, radius, jitter, lifetime, density } = this.opts;
    const now = performance.now();

    const cc = x / cellW - 0.5;   // posición del puntero en coordenadas de celda
    const cr = y / cellH - 0.5;
    const reach = Math.ceil(radius) + 1;

    const c0 = Math.max(0, Math.floor(cc) - reach);
    const c1 = Math.min(this.cols - 1, Math.ceil(cc) + reach);
    const r0 = Math.max(0, Math.floor(cr) - reach);
    const r1 = Math.min(this.rows - 1, Math.ceil(cr) + reach);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const index = r * this.cols + c;

        // Sólo una parte de las celdas llega a encenderse: rompe la masa
        // compacta de caracteres y deja el efecto como textura de fondo.
        if (this.sparse[index] > density) continue;

        // Distancia medida en celdas: el halo sale redondo sobre la
        // rejilla, algo más alto que ancho en pantalla.
        const dist = Math.hypot(c - cc, r - cr);
        const localRadius = radius * (1 - jitter * this.noise[index]);
        if (dist > localRadius) continue;

        const energy = 1 - dist / localRadius;
        const until = now + lifetime * energy;
        if (until > this.grid[index]) {
          this.grid[index] = until;
          this.born[index] = now;
        }
      }
    }
  }

  /* --- bucle ------------------------------------------------------ */

  start() {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  _pickChar(energy, index) {
    const ramp = this.opts.ramp;
    for (let i = 0; i < ramp.length; i++) {
      if (energy >= ramp[i].min) {
        const chars = ramp[i].chars;
        return chars.length === 1
          ? chars[0]
          : chars[Math.floor(this.variant[index] * chars.length) % chars.length];
      }
    }
    return ramp[ramp.length - 1].chars[0];
  }

  _tick() {
    const { cellW, cellH, alpha, color, lifetime, safeFade } = this.opts;
    const ctx = this.ctx;
    const now = performance.now();

    ctx.clearRect(0, 0, this.width, this.height);

    const full = `rgba(${color}, ${alpha})`;
    const dimmed = `rgba(${color}, ${alpha * safeFade})`;
    ctx.fillStyle = full;
    let dim = false; // fillStyle sólo se toca al cambiar de zona

    let alive = 0;

    for (let r = 0; r < this.rows; r++) {
      const y = r * cellH + cellH / 2;
      const rowRects = this.safeRects.length ? this._rectsForRow(y) : null;
      for (let c = 0; c < this.cols; c++) {
        const index = r * this.cols + c;
        const until = this.grid[index];
        if (until <= now) continue;

        alive++;

        const x = c * cellW + cellW / 2;

        // Sobre el texto el halo no se interrumpe, sólo pierde fuerza.
        const safe = rowRects !== null && rowRects.length > 0 && this._isSafeIn(rowRects, x);
        if (safe !== dim) {
          dim = safe;
          ctx.fillStyle = safe ? dimmed : full;
        }

        // Energía restante: decide qué carácter toca ahora.
        const energy = (until - now) / lifetime;
        ctx.fillText(this._pickChar(energy, index), x, y);
      }
    }

    this.active = alive;

    if (alive === 0) {
      this.running = false;
      this.rafId = null;
      return;
    }

    this.rafId = requestAnimationFrame(this._tick);
  }

  destroy() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("scroll", this._onResize);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerleave", this._onPointerLeave);
  }
}

if (typeof window !== "undefined") window.AsciiCursorField = AsciiCursorField;
