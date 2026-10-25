/* =========================================================
   OmniRoute · Lógica de la demo
   Simula cómo un enrutador inteligente analiza una petición,
   elige el modelo de IA más adecuado y usa rutas alternativas
   cuando un proveedor está caído.
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     1. DATOS
     --------------------------------------------------------- */

  /** Modelos disponibles y sus puntos fuertes. */
  const MODELS = {
    claude: {
      name: 'Claude',
      provider: 'Anthropic',
      logo: 'claude.jpeg',
      color: '#ff8a65',
      strength: 'programación: escribe código complejo, limpio y bien explicado',
      latency: [520, 860],
    },
    perplexity: {
      name: 'Perplexity',
      provider: 'Perplexity AI',
      logo: 'perplexity.png',
      color: '#2dd4e8',
      strength: 'investigación web: busca información actual y cita sus fuentes',
      latency: [640, 980],
    },
    gemini: {
      name: 'Gemini',
      provider: 'Google',
      logo: 'gemini.avif',
      color: '#7c9cff',
      strength: 'razonamiento lógico: resuelve problemas paso a paso',
      latency: [480, 820],
    },
    chatgpt: {
      name: 'ChatGPT',
      provider: 'OpenAI',
      logo: 'chatgpt.jpg',
      color: '#19c37d',
      strength: 'creatividad y uso general: es el más versátil y equilibrado',
      latency: [420, 760],
    },
  };

  /**
   * Tipos de tarea. Cada uno tiene:
   *  - route: orden de preferencia de modelos (el primero es el ideal; el resto, rutas alternativas)
   *  - words: palabras clave (sin tildes) con su peso
   *  - phrases: expresiones de varias palabras
   */
  const CATEGORIES = {
    code: {
      label: 'Programación',
      icon: '</>',
      route: ['claude', 'chatgpt', 'gemini', 'perplexity'],
      words: {
        javascript: 2, python: 2, java: 2, html: 2, css: 2, sql: 2, typescript: 2, c: 0.5,
        codigo: 2, programa: 1.5, programar: 2, programacion: 2, funcion: 1.5, funciones: 1.5,
        bucle: 2, bucles: 2, for: 1.5, while: 1.5, loop: 2, variable: 1.5, variables: 1.5,
        array: 2, arreglo: 1.5, bug: 2, depurar: 2, compilar: 2, algoritmo: 1, script: 1.5,
        api: 1.5, clase: 0.5, objeto: 0.5, consola: 1, console: 2, terminal: 1, git: 2,
      },
      phrases: { 'pagina web': 1.5, 'error en mi codigo': 2 },
    },
    research: {
      label: 'Investigación web',
      icon: '🌐',
      route: ['perplexity', 'gemini', 'chatgpt', 'claude'],
      words: {
        busca: 2, buscar: 2, buscame: 2, encuentra: 1.5, noticias: 2, noticia: 2, recientes: 1.5,
        reciente: 1.5, ultimas: 1.5, ultimo: 1, actual: 1, actuales: 1, hoy: 1, fuentes: 2, fuente: 2,
        cita: 2, citas: 1.5, investiga: 2, investigacion: 2, estadisticas: 1.5, datos: 1, web: 1.5,
        internet: 1.5, articulo: 1.5, articulos: 1.5, referencias: 2, quien: 0.5, cuando: 0.5,
      },
      phrases: { 'informacion sobre': 1.5, 'que paso': 1, 'segun expertos': 1.5 },
    },
    reasoning: {
      label: 'Razonamiento lógico',
      icon: '🧠',
      route: ['gemini', 'claude', 'chatgpt', 'perplexity'],
      words: {
        si: 0.5, entonces: 1, logica: 2, logico: 2, razona: 2, razonamiento: 2, deduce: 2, deducir: 2,
        concluir: 2, conclusion: 1.5, problema: 1.5, resolver: 1.5, resuelve: 2, acertijo: 2,
        calcula: 2, calcular: 2, cuanto: 1, cuantos: 1, cuantas: 1, matematicas: 1.5, ecuacion: 2,
        demuestra: 2, porque: 0.5, analiza: 1, compara: 1, todos: 0.5, algunos: 0.5, probabilidad: 2,
      },
      phrases: { 'paso a paso': 1.5, 'por que': 0.5, 'se puede concluir': 2 },
    },
    creative: {
      label: 'Creatividad / general',
      icon: '✨',
      route: ['chatgpt', 'claude', 'gemini', 'perplexity'],
      words: {
        escribe: 1.5, poema: 2.5, poesia: 2.5, cuento: 2.5, historia: 1.5, inventa: 2, imagina: 2,
        crea: 1.5, idea: 1.5, ideas: 2, cancion: 2.5, rima: 2, slogan: 2, eslogan: 2, creativo: 2,
        creativa: 2, personaje: 2, redacta: 1.5, chiste: 2, titulo: 1, nombre: 0.5, dibujo: 1,
      },
      phrases: { 'lluvia de ideas': 2, 'dame ideas': 2 },
    },
  };

  /** Ejemplos preparados (al menos uno por modelo). */
  const EXAMPLES = [
    {
      label: 'Bucle for',
      icon: '</>',
      prompt: 'Explícame cómo funciona un bucle for en JavaScript.',
      response:
`Un bucle "for" repite un bloque de código varias veces.
Tiene 3 partes: inicio ; condición ; paso.

for (let i = 1; i <= 5; i++) {
  console.log("Vuelta número " + i);
}

1) let i = 1   → empezamos a contar en 1.
2) i <= 5      → repetimos mientras sea verdad.
3) i++         → sumamos 1 en cada vuelta.

Resultado en consola:
Vuelta número 1 … hasta … Vuelta número 5 ✅`,
    },
    {
      label: 'Noticias con fuentes',
      icon: '🌐',
      prompt: 'Busca las noticias más recientes sobre energía solar y cita tus fuentes.',
      response:
`Resumen de tendencias recientes en energía solar:

• Los paneles son cada vez más eficientes y baratos.
• Crecen las instalaciones en tejados de casas y escuelas.
• Se investigan baterías para guardar la energía por la noche.

Fuentes citadas (ejemplo):
[1] Agencia Internacional de Energía – informe anual
[2] Revista de divulgación científica – sección energía
[3] Portal de noticias tecnológicas – artículo de esta semana

ℹ️ En un sistema real, cada número enlazaría a la página original
para que puedas comprobar la información.`,
    },
    {
      label: 'Acertijo lógico',
      icon: '🧠',
      prompt: 'Si todos los robots de mi escuela usan baterías y algunas cosas con baterías pueden volar, ¿se puede concluir que algunos robots vuelan?',
      response:
`No, no se puede concluir. Vamos paso a paso:

1. Todos los robots usan baterías.
   → Los robots están dentro del grupo "cosas con baterías".
2. Algunas cosas con baterías vuelan.
   → Pero no sabemos CUÁLES (pueden ser drones).
3. Nada nos dice que esas cosas voladoras sean robots
   de tu escuela.

Conclusión: "algunos robots vuelan" NO se deduce.
Es un error lógico típico: compartir una característica
(tener baterías) no significa compartir todas. 🧩`,
    },
    {
      label: 'Poema creativo',
      icon: '✨',
      prompt: 'Escribe un poema corto sobre el océano para leerlo en clase.',
      response:
`"El gran azul"

El océano canta en voz bajita,
con olas que suben y bajan sin prisa;
guarda ballenas, secretos y sal,
y un cielo entero en su cristal.

Si lo escuchas desde la orilla,
te cuenta historias de arena amarilla;
cuídalo hoy, que es de todos,
el corazón azul del mundo. 🌊`,
    },
  ];

  /** Respuestas genéricas para peticiones escritas por el usuario. */
  const GENERIC_RESPONSES = {
    code: (p) =>
`(Respuesta de demostración)

Petición: "${p}"

Así lo abordaría como experto en programación:
1. Entender qué debe hacer el código.
2. Dividir el problema en partes pequeñas.
3. Escribir un ejemplo limpio y comentado:

// ejemplo
function saludar(nombre) {
  return "Hola, " + nombre + "!";
}

4. Explicar cada línea y cómo probarla. ✅`,
    research: (p) =>
`(Respuesta de demostración)

Petición: "${p}"

Así lo abordaría como buscador con fuentes:
• Buscar en varias páginas web fiables y actuales.
• Resumir lo más importante en pocas líneas.
• Añadir fuentes numeradas [1] [2] [3] para comprobarlas.

Recuerda: verifica siempre las fuentes antes de usarlas
en un trabajo de clase. 🔎`,
    reasoning: (p) =>
`(Respuesta de demostración)

Petición: "${p}"

Así lo abordaría con razonamiento lógico:
1. Identificar los datos que tenemos.
2. Separar lo que sabemos de lo que suponemos.
3. Avanzar paso a paso, comprobando cada deducción.
4. Llegar a una conclusión y revisar si tiene sentido. 🧩`,
    creative: (p) =>
`(Respuesta de demostración)

Petición: "${p}"

Así lo abordaría como modelo creativo y generalista:
• Proponer varias ideas originales.
• Elegir un tono adecuado (divertido, formal, poético…).
• Escribir una versión y ofrecer alternativas
  para que tú elijas la que más te guste. ✨`,
  };

  const STEPS = ['Recepción', 'Análisis', 'Selección', 'Envío', 'Respuesta'];
  const MODEL_KEYS = Object.keys(MODELS);
  const ABORT = Symbol('abort');

  /* ---------------------------------------------------------
     2. ESTADO Y REFERENCIAS AL DOM
     --------------------------------------------------------- */
  const state = {
    running: false,
    runId: 0,
    speed: 1,
    exampleIndex: 0,
    online: Object.fromEntries(MODEL_KEYS.map((k) => [k, true])),
    counts: Object.fromEntries(MODEL_KEYS.map((k) => [k, 0])),
    timerStart: 0,
    timerRAF: 0,
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const el = {
    prompt: $('#prompt'),
    chips: $('#exampleChips'),
    btnRun: $('#btnRun'),
    btnReset: $('#btnReset'),
    btnNext: $('#btnNextExample'),
    btnOutage: $('#btnOutage'),
    btnRestore: $('#btnRestore'),
    btnClearLog: $('#btnClearLog'),
    speed: $('#speedControl'),
    switches: $$('#providerList input[type="checkbox"]'),
    sysStatus: $('#sysStatus'),
    sysStatusText: $('#sysStatusText'),
    stage: $('#stage'),
    svg: $('#links'),
    core: $('#core'),
    coreStatus: $('#coreStatus'),
    nodeUser: $('#nodeUser'),
    nodeOutput: $('#nodeOutput'),
    userPreview: $('#userPreview'),
    outputPreview: $('#outputPreview'),
    pipeline: $$('#pipeline li'),
    timer: $('#timer'),
    analysis: $('#analysis'),
    verdict: $('#analysisVerdict'),
    bars: $$('.bar'),
    keywords: $('#keywords'),
    log: $('#log'),
    summary: $('#summary'),
    responseBox: $('.response-box'),
    rfLogo: $('#rfLogo'),
    rfName: $('#rfName'),
    responseText: $('#responseText'),
    whyText: $('#whyText'),
    routeTrace: $('#routeTrace'),
    cards: Object.fromEntries(MODEL_KEYS.map((k) => [k, $(`#model-${k}`)])),
  };

  /* ---------------------------------------------------------
     3. UTILIDADES
     --------------------------------------------------------- */

  /** Espera (escalada por la velocidad). Se cancela si se reinicia el flujo. */
  const wait = (ms) => {
    const id = state.runId;
    return new Promise((resolve, reject) => {
      setTimeout(() => (id === state.runId ? resolve() : reject(ABORT)), ms * state.speed);
    });
  };

  const checkAlive = (id) => {
    if (id !== state.runId) throw ABORT;
  };

  const normalize = (str) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const escapeHTML = (str) =>
    str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const randomBetween = ([min, max]) => Math.round(min + Math.random() * (max - min));

  const timeNow = () => new Date().toLocaleTimeString('es-ES', { hour12: false });

  /* ---------------------------------------------------------
     4. ANÁLISIS DE LA PETICIÓN
     --------------------------------------------------------- */

  /** Puntúa la petición para cada tipo de tarea según sus palabras clave. */
  function analyzePrompt(prompt) {
    const text = normalize(prompt);
    const tokens = text.match(/[a-z0-9+#ñ]+/g) || [];
    const scores = {};
    const found = {};

    for (const [key, cat] of Object.entries(CATEGORIES)) {
      let score = 0;
      const hits = new Set();
      for (const t of tokens) {
        if (cat.words[t]) {
          score += cat.words[t];
          hits.add(t);
        }
      }
      for (const [phrase, w] of Object.entries(cat.phrases)) {
        if (text.includes(phrase)) {
          score += w;
          hits.add(phrase);
        }
      }
      scores[key] = score;
      found[key] = [...hits];
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    let category = 'creative';
    let generic = total === 0;
    if (!generic) {
      category = Object.keys(scores).reduce((best, k) => (scores[k] > scores[best] ? k : best), 'code');
    }

    // Porcentajes de confianza (suavizados para que ninguna barra quede vacía)
    const confidence = {};
    for (const k of Object.keys(scores)) {
      confidence[k] = generic
        ? (k === 'creative' ? 64 : 12)
        : Math.round(((scores[k] + 0.25) / (total + 1)) * 100);
    }

    return { category, generic, confidence, keywords: found[category], allKeywords: found };
  }

  /** Devuelve el modelo elegido según la ruta de la categoría y el estado de los proveedores. */
  function pickRoute(category) {
    const route = CATEGORIES[category].route;
    const failed = [];
    for (let i = 0; i < route.length; i++) {
      if (state.online[route[i]]) return { model: route[i], failed, position: i };
      failed.push(route[i]);
    }
    return { model: null, failed, position: -1 };
  }

  /* ---------------------------------------------------------
     5. CONEXIONES SVG ANIMADAS
     --------------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LINK_KEYS = ['user', ...MODEL_KEYS, 'output'];
  const links = {};

  function createLinks() {
    const group = document.createElementNS(SVG_NS, 'g');
    for (const key of LINK_KEYS) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.classList.add('link');
      path.dataset.key = key;
      group.appendChild(path);
      links[key] = path;
    }
    el.svg.appendChild(group);
  }

  function centerOf(node, base) {
    const r = node.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
  }

  /** Recalcula las rutas cada vez que cambia el tamaño del escenario. */
  function drawLinks() {
    const base = el.stage.getBoundingClientRect();
    el.svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    const core = centerOf(el.core, base);

    const user = centerOf(el.nodeUser, base);
    links.user.setAttribute('d', `M ${user.x} ${user.y} L ${core.x} ${core.y}`);

    const out = centerOf(el.nodeOutput, base);
    links.output.setAttribute('d', `M ${core.x} ${core.y} L ${out.x} ${out.y}`);

    for (const key of MODEL_KEYS) {
      const m = centerOf(el.cards[key], base);
      // Curva tipo "circuito": sale horizontal del núcleo y entra vertical a la tarjeta
      links[key].setAttribute('d', `M ${core.x} ${core.y} Q ${m.x} ${core.y} ${m.x} ${m.y}`);
    }
  }

  /** Anima un "paquete de datos" luminoso a lo largo de una conexión. */
  function animatePacket(key, { duration = 900, reverse = false, color = '#4cd7ff' } = {}) {
    const id = state.runId;
    const path = links[key];
    const g = document.createElementNS(SVG_NS, 'g');
    const halo = document.createElementNS(SVG_NS, 'circle');
    const dot = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('r', '11');
    halo.setAttribute('fill', color);
    halo.classList.add('packet-halo');
    dot.setAttribute('r', '5');
    dot.classList.add('packet-core');
    dot.style.filter = `drop-shadow(0 0 6px ${color})`;
    g.append(halo, dot);
    el.svg.appendChild(g);

    const total = path.getTotalLength();
    const time = duration * state.speed;
    const start = performance.now();

    return new Promise((resolve, reject) => {
      const frame = (now) => {
        if (id !== state.runId) {
          g.remove();
          reject(ABORT);
          return;
        }
        const t = Math.min((now - start) / time, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const p = path.getPointAtLength(total * (reverse ? 1 - eased : eased));
        g.setAttribute('transform', `translate(${p.x} ${p.y})`);
        if (t < 1) requestAnimationFrame(frame);
        else {
          g.remove();
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  /* ---------------------------------------------------------
     6. REGISTRO DE EVENTOS
     --------------------------------------------------------- */
  const LOG_ICONS = { info: 'ℹ️', step: '▸', success: '✅', warn: '⚠️', error: '⛔' };

  function log(type, html, detail = '') {
    const li = document.createElement('li');
    li.className = `log-item log-item--${type}`;
    li.innerHTML =
      `<time>${timeNow()}</time>` +
      `<span class="log-text">${LOG_ICONS[type] || ''} ${html}</span>` +
      (detail ? `<small>${detail}</small>` : '');
    el.log.appendChild(li);
    while (el.log.children.length > 120) el.log.firstElementChild.remove();
    el.log.scrollTop = el.log.scrollHeight;
  }

  /* ---------------------------------------------------------
     7. ACTUALIZACIONES VISUALES
     --------------------------------------------------------- */
  function setStep(index, status = 'active') {
    el.pipeline.forEach((li, i) => {
      li.classList.remove('is-active', 'is-done', 'is-error');
      if (i < index) li.classList.add('is-done');
      if (i === index) li.classList.add(status === 'error' ? 'is-error' : status === 'done' ? 'is-done' : 'is-active');
    });
  }

  function setCore(text, mode = '') {
    el.coreStatus.textContent = text;
    el.core.classList.remove('is-busy', 'is-success', 'is-warn', 'is-error');
    if (mode) mode.split(' ').forEach((m) => el.core.classList.add(`is-${m}`));
  }

  function setLink(key, ...classes) {
    links[key].classList.remove('is-active', 'is-return', 'is-dim', 'is-fail');
    classes.forEach((c) => links[key].classList.add(c));
  }

  function setCard(key, ...classes) {
    const card = el.cards[key];
    card.classList.remove('is-scanning', 'is-selected', 'is-processing', 'is-dim', 'is-failed');
    classes.forEach((c) => card.classList.add(c));
  }

  function setBars(confidence = null, top = null) {
    el.bars.forEach((bar) => {
      const cat = bar.dataset.cat;
      const pct = confidence ? confidence[cat] : 0;
      bar.querySelector('.bar-fill').style.width = `${pct}%`;
      bar.querySelector('.bar-pct').textContent = `${pct}%`;
      bar.classList.toggle('is-top', cat === top);
    });
  }

  function startTimer() {
    state.timerStart = performance.now();
    const tick = () => {
      const s = (performance.now() - state.timerStart) / 1000;
      el.timer.textContent = `${s.toFixed(1).padStart(4, '0')} s`;
      state.timerRAF = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(state.timerRAF);
    tick();
  }

  function stopTimer() {
    cancelAnimationFrame(state.timerRAF);
    return (performance.now() - state.timerStart) / 1000;
  }

  function logoHTML(key) {
    const m = MODELS[key];
    return `<img src="${m.logo}" alt="Logo de ${m.name}">`;
  }

  function setRunningUI(running) {
    el.btnRun.disabled = running;
    el.btnOutage.disabled = running;
    el.btnNext.disabled = running;
    el.btnRun.textContent = running ? '⏳ Simulando…' : '▶ Ejecutar simulación';
    $$('.chip', el.chips).forEach((c) => (c.disabled = running));
  }

  /** Limpia el escenario visual (no toca el estado de los proveedores ni el registro). */
  function clearVisuals() {
    setStep(-1);
    setCore('En espera');
    LINK_KEYS.forEach((k) => setLink(k));
    MODEL_KEYS.forEach((k) => setCard(k));
    $$('g', el.svg).slice(1).forEach((g) => g.remove()); // paquetes huérfanos
    el.nodeUser.classList.remove('is-lit');
    el.nodeOutput.classList.remove('is-lit', 'is-error');
    el.outputPreview.textContent = 'Esperando…';
    el.analysis.classList.remove('is-active');
    el.verdict.textContent = 'Sin analizar';
    el.verdict.classList.remove('is-set');
    setBars();
    el.keywords.innerHTML = '<span class="kw-empty">Las palabras clave detectadas aparecerán aquí.</span>';
    el.summary.innerHTML = '';
    el.responseBox.classList.remove('is-lit');
    el.rfLogo.innerHTML = '?';
    el.rfName.textContent = '—';
    el.responseText.classList.remove('is-typing');
    el.responseText.textContent = 'Ejecuta una simulación para ver aquí la respuesta del modelo elegido.';
    el.whyText.innerHTML = '<p>Cuando ejecutes una simulación, aquí te explicaremos qué detectó OmniRoute y por qué eligió ese modelo.</p>';
    el.routeTrace.innerHTML = '';
    el.timer.textContent = '00.0 s';
    cancelAnimationFrame(state.timerRAF);
    MODEL_KEYS.forEach((k) => {
      el.cards[k].querySelector('.mc-latency').textContent = '— ms';
      el.cards[k].querySelector('.mc-status').textContent = state.online[k] ? 'En línea' : 'Caído';
    });
  }

  /** Escribe un texto con efecto máquina de escribir (duración máxima ≈ 2,5 s). */
  async function typeText(target, text) {
    const id = state.runId;
    target.textContent = '';
    target.classList.add('is-typing');
    const steps = 110;
    const chunk = Math.max(1, Math.ceil(text.length / steps));
    for (let i = 0; i < text.length; i += chunk) {
      checkAlive(id);
      target.textContent = text.slice(0, i + chunk);
      target.scrollTop = target.scrollHeight;
      await wait(18);
    }
    target.textContent = text;
    target.classList.remove('is-typing');
  }

  /* ---------------------------------------------------------
     8. PROVEEDORES (CAÍDAS)
     --------------------------------------------------------- */
  function setProvider(key, online, { silent = false } = {}) {
    state.online[key] = online;
    const card = el.cards[key];
    card.classList.toggle('is-down', !online);
    card.querySelector('.mc-status').textContent = online ? 'En línea' : 'Caído';

    const sw = el.switches.find((s) => s.dataset.model === key);
    sw.checked = online;
    const label = sw.closest('.provider-switch');
    label.classList.toggle('is-off', !online);
    label.querySelector('.ps-state').textContent = online ? 'En línea' : 'Caído';

    links[key].classList.toggle('is-down', !online);
    updateSystemStatus();

    if (!silent) {
      if (online) log('success', `<b>${MODELS[key].name}</b> vuelve a estar en línea.`);
      else log('warn', `<b>${MODELS[key].name}</b> está caído (simulación de fallo).`, 'OmniRoute lo evitará y buscará una ruta alternativa.');
    }
  }

  function updateSystemStatus() {
    const up = MODEL_KEYS.filter((k) => state.online[k]).length;
    el.sysStatusText.textContent = `${up}/${MODEL_KEYS.length} proveedores en línea`;
    el.sysStatus.classList.toggle('is-warn', up > 0 && up < MODEL_KEYS.length);
    el.sysStatus.classList.toggle('is-error', up === 0);
  }

  /* ---------------------------------------------------------
     9. SIMULACIÓN PRINCIPAL
     --------------------------------------------------------- */
  async function runSimulation() {
    if (state.running) return;
    const prompt = el.prompt.value.trim();
    if (!prompt) {
      el.prompt.classList.remove('shake');
      void el.prompt.offsetWidth; // reinicia la animación
      el.prompt.classList.add('shake');
      el.prompt.focus();
      log('warn', 'Escribe una petición o elige un ejemplo antes de ejecutar la simulación.');
      return;
    }

    clearVisuals();
    const id = ++state.runId;
    state.running = true;
    setRunningUI(true);
    startTimer();
    const safePrompt = escapeHTML(prompt);

    try {
      /* ---- Etapa 1 · Recepción ---- */
      setStep(0);
      log('step', `Etapa 1 · ${STEPS[0]}`);
      el.userPreview.textContent = `“${prompt}”`;
      el.nodeUser.classList.add('is-lit');
      setCore('Recibiendo…', 'busy');
      setLink('user', 'is-active');
      log('info', `Petición recibida: <b>“${safePrompt}”</b>`, `${prompt.length} caracteres · entrada única para todos los modelos.`);
      await animatePacket('user', { duration: 1000 });
      setLink('user');
      await wait(250);

      /* ---- Etapa 2 · Análisis ---- */
      setStep(1);
      log('step', `Etapa 2 · ${STEPS[1]}`);
      setCore('Analizando…', 'busy');
      el.analysis.classList.add('is-active');
      log('info', 'Leyendo la petición y buscando palabras clave…');
      const result = analyzePrompt(prompt);
      await wait(500);

      el.keywords.innerHTML = '';
      const kwList = result.keywords.length ? result.keywords : [];
      if (!kwList.length) {
        el.keywords.innerHTML = '<span class="kw-empty">No se detectaron palabras clave claras → se usará el modelo generalista.</span>';
      }
      for (const kw of kwList) {
        checkAlive(id);
        const span = document.createElement('span');
        span.className = 'kw';
        span.textContent = kw;
        el.keywords.appendChild(span);
        await wait(160);
      }
      setBars(result.confidence, result.category);
      await wait(900);

      const cat = CATEGORIES[result.category];
      el.verdict.textContent = `${cat.icon} ${cat.label}`;
      el.verdict.classList.add('is-set');
      log(
        'info',
        `Tipo de tarea detectado: <b>${cat.label}</b> (${result.confidence[result.category]}% de confianza).`,
        kwList.length ? `Pistas: ${kwList.map(escapeHTML).join(', ')}` : 'Sin pistas claras: se asume tarea general/creativa.'
      );
      await wait(400);

      /* ---- Etapa 3 · Selección ---- */
      setStep(2);
      log('step', `Etapa 3 · ${STEPS[2]}`);
      setCore('Comprobando…', 'busy');
      log('info', 'Comprobando el estado de los proveedores (health check)…');
      MODEL_KEYS.forEach((k) => setCard(k, 'is-scanning'));
      await wait(900);
      MODEL_KEYS.forEach((k) => setCard(k));
      const up = MODEL_KEYS.filter((k) => state.online[k]);
      const down = MODEL_KEYS.filter((k) => !state.online[k]);
      log(
        down.length ? 'warn' : 'success',
        `${up.length} en línea${down.length ? ` · ${down.length} caído(s): <b>${down.map((k) => MODELS[k].name).join(', ')}</b>` : ' · todos operativos'}.`
      );
      log('info', `Ruta preferida para ${cat.label}: ${cat.route.map((k) => MODELS[k].name).join(' → ')}`);
      await wait(400);

      const route = pickRoute(result.category);

      // Intentos fallidos: el modelo ideal (y quizá otros) están caídos
      for (const f of route.failed) {
        checkAlive(id);
        setCore('Ruta bloqueada', 'busy warn');
        setLink(f, 'is-fail');
        setCard(f, 'is-failed');
        log('warn', `<b>${MODELS[f].name}</b> no responde. Ruta bloqueada → buscando alternativa…`);
        await wait(1100);
        setLink(f);
        setCard(f);
      }

      // Ningún modelo disponible
      if (!route.model) {
        setStep(2, 'error');
        setCore('Sin rutas', 'error');
        el.nodeOutput.classList.add('is-error');
        el.outputPreview.textContent = 'Error: sin proveedores';
        log('error', 'Todos los proveedores están caídos. No hay ninguna ruta disponible.');
        const total = stopTimer();
        renderError(cat, total);
        return;
      }

      const chosen = route.model;
      const m = MODELS[chosen];
      MODEL_KEYS.forEach((k) => {
        if (k !== chosen) {
          setCard(k, 'is-dim');
          setLink(k, 'is-dim');
        }
      });
      setCard(chosen, 'is-selected');
      setCore(`→ ${m.name}`, route.position > 0 ? 'busy warn' : 'busy');
      log(
        route.position > 0 ? 'warn' : 'success',
        route.position > 0
          ? `Ruta alternativa activada: <b>${m.name}</b> (opción nº ${route.position + 1}).`
          : `Modelo seleccionado: <b>${m.name}</b> — el ideal para esta tarea.`,
        `Especialidad: ${m.strength}.`
      );
      await wait(700);

      /* ---- Etapa 4 · Envío ---- */
      setStep(3);
      log('step', `Etapa 4 · ${STEPS[3]}`);
      setCore('Enviando…', 'busy');
      setLink(chosen, 'is-active');
      log('info', `Enviando la petición a <b>${m.name}</b> (${m.provider})…`);
      await animatePacket(chosen, { duration: 1100, color: m.color });

      setCard(chosen, 'is-selected', 'is-processing');
      el.cards[chosen].querySelector('.mc-status').textContent = 'Procesando…';
      setCore(`${m.name} piensa…`, 'busy');
      const latency = randomBetween(m.latency);
      await wait(latency + 300);
      el.cards[chosen].querySelector('.mc-status').textContent = 'En línea';
      el.cards[chosen].querySelector('.mc-latency').textContent = `${latency} ms`;
      setCard(chosen, 'is-selected');

      setLink(chosen, 'is-active', 'is-return');
      log('success', `Respuesta recibida de <b>${m.name}</b> en ${latency} ms.`);
      await animatePacket(chosen, { duration: 1000, reverse: true, color: '#b06bff' });
      setLink(chosen, 'is-dim');

      /* ---- Etapa 5 · Respuesta ---- */
      setStep(4);
      log('step', `Etapa 5 · ${STEPS[4]}`);
      setCore('Entregando…', 'busy');
      setLink('output', 'is-active');
      await animatePacket('output', { duration: 800, color: '#22e39b' });
      setLink('output');
      el.nodeOutput.classList.add('is-lit');
      el.outputPreview.textContent = `Respuesta de ${m.name} ✓`;
      setCore('Completado', 'success');

      state.counts[chosen] += 1;
      el.cards[chosen].querySelector('.mc-count').textContent = state.counts[chosen];

      const example = EXAMPLES.find((e) => e.prompt === prompt);
      const responseText = example ? example.response : GENERIC_RESPONSES[result.category](prompt);

      el.rfLogo.innerHTML = logoHTML(chosen);
      el.rfName.textContent = m.name;
      el.responseBox.classList.add('is-lit');
      renderExplanation(result, route);
      await typeText(el.responseText, responseText);

      const total = stopTimer();
      setStep(5);
      renderSummary(result, route, latency, total);
      log('success', `Simulación completada en ${total.toFixed(1)} s. ¡Petición entregada!`);
    } catch (err) {
      if (err !== ABORT) {
        console.error(err);
        log('error', 'Ocurrió un error inesperado en la simulación.');
      }
    } finally {
      if (id === state.runId) {
        state.running = false;
        setRunningUI(false);
      }
    }
  }

  /* ---------------------------------------------------------
     10. EXPLICACIÓN Y RESUMEN
     --------------------------------------------------------- */
  function renderExplanation(result, route) {
    const cat = CATEGORIES[result.category];
    const chosen = MODELS[route.model];
    const ideal = MODELS[cat.route[0]];
    const kws = result.keywords.map((k) => `<b>${escapeHTML(k)}</b>`).join(', ');

    let html = result.generic
      ? `<p>1️⃣ No encontré palabras clave de una especialidad concreta, así que traté tu petición como una tarea <b>general o creativa</b>.</p>`
      : `<p>1️⃣ Detecté que es una tarea de <b>${cat.label}</b> gracias a pistas como ${kws}.</p>`;

    if (route.position === 0) {
      html += `<p>2️⃣ Por eso OmniRoute eligió a <b>${chosen.name}</b>, cuyo punto fuerte es la ${chosen.strength}.</p>`;
    } else {
      const failedNames = route.failed.map((k) => `<b>${MODELS[k].name}</b>`).join(' y ');
      html += `<p>2️⃣ El modelo ideal habría sido <b>${ideal.name}</b>.</p>`;
      html += `<p class="why-alert">⚠️ Pero ${failedNames} estaba${route.failed.length > 1 ? 'n' : ''} caído${route.failed.length > 1 ? 's' : ''}. OmniRoute activó la <b>ruta alternativa</b> y envió la petición a <b>${chosen.name}</b>, la siguiente mejor opción (${chosen.strength}). ¡Tu pregunta no se perdió!</p>`;
    }
    html += `<p class="why-tip">💬 Moraleja: no existe una IA “mejor para todo”; elegir la herramienta adecuada para cada tarea da mejores resultados.</p>`;
    el.whyText.innerHTML = html;

    // Recorrido visual
    const parts = [{ t: '👤 Tú' }, { t: '◎ OmniRoute' }];
    route.failed.forEach((k) => parts.push({ t: MODELS[k].name, c: 'rt-fail' }));
    parts.push({ t: `${chosen.name} ✓`, c: 'rt-ok' }, { t: '👤 Tú' });
    el.routeTrace.innerHTML = parts
      .map((p, i) => `${i ? '<li class="rt-arrow" aria-hidden="true">→</li>' : ''}<li class="${p.c || ''}">${p.t}</li>`)
      .join('');
  }

  function renderSummary(result, route, latency, total) {
    const cat = CATEGORIES[result.category];
    const chips = [
      `Tarea: <b>${cat.label}</b>`,
      `Modelo: <b>${MODELS[route.model].name}</b>`,
      `Latencia: <b>${latency} ms</b>`,
      `Total: <b>${total.toFixed(1)} s</b>`,
    ];
    let html = chips.map((c) => `<span class="sum-chip">${c}</span>`).join('');
    if (route.position > 0) html += `<span class="sum-chip sum-chip--warn">Ruta: <b>alternativa</b></span>`;
    el.summary.innerHTML = html;
  }

  function renderError(cat, total) {
    el.responseText.textContent = 'No se pudo generar una respuesta: ningún proveedor está disponible.';
    el.whyText.innerHTML =
      `<p>1️⃣ La petición era de tipo <b>${cat.label}</b>.</p>` +
      `<p class="why-error">⛔ OmniRoute probó todas las rutas (${cat.route.map((k) => MODELS[k].name).join(' → ')}) y todas estaban caídas.</p>` +
      `<p class="why-tip">💡 Activa al menos un proveedor en el panel de control y vuelve a intentarlo.</p>`;
    el.summary.innerHTML = `<span class="sum-chip sum-chip--warn">Estado: <b>sin rutas</b></span><span class="sum-chip">Total: <b>${total.toFixed(1)} s</b></span>`;
    el.routeTrace.innerHTML = cat.route
      .map((k, i) => `${i ? '<li class="rt-arrow" aria-hidden="true">→</li>' : ''}<li class="rt-fail">${MODELS[k].name}</li>`)
      .join('');
  }

  /* ---------------------------------------------------------
     11. CONTROLES
     --------------------------------------------------------- */
  function resetFlow() {
    state.runId++; // cancela cualquier simulación en curso
    state.running = false;
    setRunningUI(false);
    clearVisuals();
    el.userPreview.textContent = el.prompt.value.trim() ? `“${el.prompt.value.trim()}”` : 'Escribe o elige un ejemplo…';
    log('info', 'Flujo reiniciado. OmniRoute está listo para una nueva petición.');
  }

  function renderExampleChips() {
    el.chips.innerHTML = EXAMPLES.map(
      (ex, i) => `<button type="button" class="chip" data-index="${i}" title="${escapeHTML(ex.prompt)}"><span aria-hidden="true">${escapeHTML(ex.icon)}</span>${ex.label}</button>`
    ).join('');
  }

  function loadExample(index, { announce = true } = {}) {
    if (state.running) return;
    state.exampleIndex = (index + EXAMPLES.length) % EXAMPLES.length;
    const ex = EXAMPLES[state.exampleIndex];
    el.prompt.value = ex.prompt;
    el.userPreview.textContent = `“${ex.prompt}”`;
    $$('.chip', el.chips).forEach((c, i) => c.classList.toggle('is-active', i === state.exampleIndex));
    if (announce) log('info', `Ejemplo cargado: <b>${ex.label}</b>. Pulsa “Ejecutar simulación”.`);
  }

  function simulateIdealOutage() {
    if (state.running) return;
    if (!el.prompt.value.trim()) loadExample(state.exampleIndex, { announce: false });
    const { category } = analyzePrompt(el.prompt.value);
    const target = CATEGORIES[category].route.find((k) => state.online[k]);
    if (!target) {
      log('error', 'Todos los proveedores ya están caídos. Pulsa “Restaurar todos”.');
      return;
    }
    log('warn', `⚡ Simulando caída de <b>${MODELS[target].name}</b>, el modelo que OmniRoute elegiría ahora…`);
    setProvider(target, false);
    runSimulation();
  }

  function bindEvents() {
    el.btnRun.addEventListener('click', runSimulation);
    el.btnReset.addEventListener('click', resetFlow);
    el.btnNext.addEventListener('click', () => loadExample(state.exampleIndex + 1));
    el.btnOutage.addEventListener('click', simulateIdealOutage);
    el.btnClearLog.addEventListener('click', () => {
      el.log.innerHTML = '';
      log('info', 'Registro limpiado.');
    });
    el.btnRestore.addEventListener('click', () => {
      const wasDown = MODEL_KEYS.filter((k) => !state.online[k]);
      MODEL_KEYS.forEach((k) => setProvider(k, true, { silent: true }));
      log('success', wasDown.length ? 'Todos los proveedores restaurados.' : 'Todos los proveedores ya estaban en línea.');
    });

    el.chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) loadExample(Number(chip.dataset.index));
    });

    el.switches.forEach((sw) =>
      sw.addEventListener('change', () => setProvider(sw.dataset.model, sw.checked))
    );

    el.speed.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-speed]');
      if (!btn) return;
      state.speed = Number(btn.dataset.speed);
      $$('button', el.speed).forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-checked', String(active));
      });
    });

    el.prompt.addEventListener('input', () => {
      const v = el.prompt.value.trim();
      if (!state.running) el.userPreview.textContent = v ? `“${v}”` : 'Escribe o elige un ejemplo…';
      $$('.chip', el.chips).forEach((c, i) => c.classList.toggle('is-active', EXAMPLES[i].prompt === el.prompt.value));
    });
    el.prompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runSimulation();
      }
    });
    el.prompt.addEventListener('animationend', () => el.prompt.classList.remove('shake'));

    // Si un logo no carga, se muestra la inicial del modelo
    $$('img').forEach((img) =>
      img.addEventListener('error', () => {
        const name = (img.alt || '?').replace('Logo de ', '');
        const span = document.createElement('span');
        span.className = 'logo-fallback';
        span.textContent = name.charAt(0) || '?';
        img.replaceWith(span);
      }, { once: true })
    );

    new ResizeObserver(drawLinks).observe(el.stage);
    window.addEventListener('load', drawLinks);
  }

  /* ---------------------------------------------------------
     12. INICIO
     --------------------------------------------------------- */
  function init() {
    createLinks();
    renderExampleChips();
    bindEvents();
    loadExample(0, { announce: false });
    drawLinks();
    log('success', 'Sistema OmniRoute iniciado. 4 proveedores conectados.');
    log('info', 'Elige un ejemplo o escribe tu propia petición y pulsa <b>Ejecutar simulación</b>.');
  }

  init();
})();
