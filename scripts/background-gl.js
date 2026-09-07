/* ------------------------------------------------------------------
   Fondo animado en WebGL
   Malla de gradientes (azul → blanco → violeta → lavanda) evaluada
   sobre coordenadas deformadas por ruido fbm con domain warping, así
   que la composición se mantiene pero fluye y se deforma sin parar.

   Uso:
     <canvas class="bg-canvas"></canvas>
     new CodexBackground(document.querySelector('.bg-canvas'));

   Si no hay WebGL, el canvas se oculta y queda el degradado CSS.
------------------------------------------------------------------ */

const VERTEX_SHADER = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // 0..1, suavizado
uniform float uGrain;
uniform float uDark;    // 0 = claro, 1 = oscuro (se interpola al cambiar)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Cada color tiene su equivalente nocturno; uDark cruza entre los dos.
vec3 tone(vec3 day, vec3 night) { return mix(day, night, uDark); }

// Un color puesto en la composición, con caída gaussiana.
void splat(inout vec3 col, inout float total, vec2 p, vec2 at, float r, vec3 c, float k) {
  vec2 d = (p - at) * vec2(1.0, 0.82);
  float w = exp(-dot(d, d) / (r * r)) * k;
  col += c * w;
  total += w;
}

vec3 palette(vec2 p, float t) {
  vec3 col = vec3(0.0);
  float total = 0.0;

  // Composición base: azules a la izquierda, violeta y lavanda a la derecha.
  splat(col, total, p, vec2(0.02, 0.00), 0.52, tone(vec3(0.153, 0.263, 0.941), vec3(0.035, 0.055, 0.243)), 1.0);
  splat(col, total, p, vec2(-0.04, 0.42), 0.44, tone(vec3(0.290, 0.427, 0.965), vec3(0.055, 0.086, 0.302)), 1.0);
  splat(col, total, p, vec2(0.00, 0.88), 0.46, tone(vec3(0.365, 0.482, 0.953), vec3(0.075, 0.106, 0.345)), 1.0);
  splat(col, total, p, vec2(0.24, 0.18), 0.30, tone(vec3(0.541, 0.706, 0.976), vec3(0.118, 0.180, 0.463)), 0.9);
  splat(col, total, p, vec2(0.16, 0.62), 0.30, tone(vec3(0.592, 0.737, 0.973), vec3(0.133, 0.196, 0.478)), 0.9);
  splat(col, total, p, vec2(0.80, 0.40), 0.46, tone(vec3(0.545, 0.486, 0.949), vec3(0.145, 0.114, 0.388)), 1.0);
  splat(col, total, p, vec2(1.04, 1.02), 0.62, tone(vec3(0.867, 0.824, 0.988), vec3(0.259, 0.216, 0.510)), 1.5);
  splat(col, total, p, vec2(1.02, 0.48), 0.34, tone(vec3(0.773, 0.718, 0.976), vec3(0.196, 0.165, 0.443)), 0.9);
  splat(col, total, p, vec2(0.56, 1.10), 0.42, tone(vec3(0.616, 0.592, 0.965), vec3(0.165, 0.145, 0.412)), 0.9);

  // Nube violeta oscura, arriba a la derecha: deriva a su propio ritmo.
  vec2 blob = vec2(0.68 + 0.035 * sin(t * 0.21), 0.03 + 0.025 * cos(t * 0.17));
  splat(col, total, p, blob, 0.27, tone(vec3(0.302, 0.235, 0.796), vec3(0.063, 0.043, 0.196)), 1.8);

  return col / max(total, 0.0001);
}

void main() {
  // Y hacia abajo, para que la composición se lea igual que en CSS.
  vec2 uv = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime;

  // Domain warping: dos pasadas de fbm desplazan las coordenadas, que es
  // lo que convierte una malla estática en algo que fluye.
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t * 0.09)),
                fbm(p * 1.4 + vec2(5.2, 1.3) - t * 0.07));

  vec2 r = vec2(fbm(p * 1.7 + 2.2 * q + vec2(1.7, 9.2) + t * 0.10),
                fbm(p * 1.7 + 2.2 * q + vec2(8.3, 2.8) - t * 0.09));

  float f = fbm(p * 2.0 + 3.0 * r);

  // El puntero empuja el campo suavemente.
  vec2 toMouse = uv - uMouse;
  float grab = exp(-dot(toMouse, toMouse) * 6.0);

  vec2 warped = uv
    + (r - 0.5) * 0.09
    + (q - 0.5) * 0.04
    - toMouse * grab * 0.045;

  vec3 col = palette(warped, t);

  // Luz difusa que barre el centro-izquierda, también deformada.
  vec2 lightAt = vec2(0.33 + 0.025 * sin(t * 0.13), 0.46 + 0.04 * cos(t * 0.11));
  vec2 ld = (warped - lightAt) * vec2(2.7, 0.95);
  float light = exp(-dot(ld, ld) * 5.0);
  vec2 ld2 = (warped - lightAt - vec2(0.05, -0.24)) * vec2(4.2, 2.2);
  light += 0.5 * exp(-dot(ld2, ld2) * 6.0);
  vec3 lightTint = tone(vec3(1.0), vec3(0.70, 0.76, 1.0));
  col = mix(col, lightTint, clamp(light, 0.0, 1.0) * mix(0.72, 0.34, uDark));

  // El ruido final marca las vetas claras y oscuras del degradado.
  col += (f - 0.5) * 0.05;

  // Filamentos: el mismo ruido muestreado con las coordenadas muy
  // estiradas en diagonal, que es lo que da el aspecto de fibra.
  vec2 fp = vec2(warped.x * aspect, warped.y) + (r - 0.5) * 0.25;
  float ca = 0.82, sa = 0.57;
  vec2 rot = vec2(fp.x * ca + fp.y * sa, -fp.x * sa + fp.y * ca);
  float fibers = fbm(vec2(rot.x * 2.2, rot.y * 15.0) + vec2(t * 0.06, 0.0));
  float fibers2 = fbm(vec2(rot.x * 3.5, rot.y * 26.0) - vec2(t * 0.04, 0.0));
  col += (fibers - 0.5) * 0.085 + (fibers2 - 0.5) * 0.05;

  // Grano fijo, como la textura de la referencia.
  col += (hash(gl_FragCoord.xy) - 0.5) * uGrain;

  gl_FragColor = vec4(col, 1.0);
}
`;

class CodexBackground {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.opts = Object.assign({ speed: 1, grain: 0.05, maxDpr: 1.5, dark: false }, options);

    this.gl =
      canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      canvas.getContext("experimental-webgl", { antialias: false, alpha: false });

    if (!this.gl) {
      canvas.style.display = "none";
      this.supported = false;
      return;
    }

    this.supported = true;
    this.mouse = { x: 0.5, y: 0.5 };
    this.target = { x: 0.5, y: 0.5 };
    this.start = performance.now();
    this.dark = this.opts.dark ? 1 : 0;
    this.darkTarget = this.dark;

    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._frame = this._frame.bind(this);

    this._build();
    this.resize();

    window.addEventListener("resize", this._onResize);
    window.addEventListener("pointermove", this._onPointerMove, { passive: true });

    this.rafId = requestAnimationFrame(this._frame);
  }

  _build() {
    const gl = this.gl;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    this.program = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(program, "uRes");
    this.uTime = gl.getUniformLocation(program, "uTime");
    this.uMouse = gl.getUniformLocation(program, "uMouse");
    this.uDark = gl.getUniformLocation(program, "uDark");
    gl.uniform1f(gl.getUniformLocation(program, "uGrain"), this.opts.grain);
  }

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
    if (!this.supported) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    const { w, h } = this._measure();

    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
  }

  _onResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => this.resize(), 120);
  }

  _onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.target.x = (event.clientX - rect.left) / rect.width;
    this.target.y = (event.clientY - rect.top) / rect.height;
  }

  render(seconds) {
    const gl = this.gl;
    gl.uniform1f(this.uTime, seconds * this.opts.speed);
    gl.uniform2f(this.uMouse, this.mouse.x, this.mouse.y);
    gl.uniform1f(this.uDark, this.dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Cambio de tema: la paleta cruza poco a poco, no de golpe.
  setDark(on, instant = false) {
    this.darkTarget = on ? 1 : 0;
    if (instant) this.dark = this.darkTarget;
  }

  _frame() {
    // El puntero se persigue con retardo para que el empuje sea elástico.
    this.mouse.x += (this.target.x - this.mouse.x) * 0.045;
    this.mouse.y += (this.target.y - this.mouse.y) * 0.045;
    this.dark += (this.darkTarget - this.dark) * 0.06;

    this.render((performance.now() - this.start) / 1000);
    this.rafId = requestAnimationFrame(this._frame);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("pointermove", this._onPointerMove);
  }
}

if (typeof window !== "undefined") window.CodexBackground = CodexBackground;
