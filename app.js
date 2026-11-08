(() => {
  const NIVELES = [
    { id: "facil", nombre: "Fácil", color: "var(--facil)", desc: "Ideas centrales, lemas y hechos principales del libro." },
    { id: "medio", nombre: "Medio", color: "var(--medio)", desc: "Nombres, fechas, listas y citas específicas." },
    { id: "dificil", nombre: "Difícil", color: "var(--dificil)", desc: "Cifras, secuencias y detalles finos." },
  ];
  const LETRAS = ["A", "B", "C", "D"];
  const EXAMENES_POR_NIVEL = 7;
  const DESFASE_PDF = 3; // página impresa del libro = página del PDF + 3

  // El libro no numera los capítulos: se numeran por orden, como en el simulacro («Según el capítulo 1…»).
  // [número, título, primera página, última página]; el 0 es la Declaración de Misión.
  const CAPITULOS = [
    [0, "Declaración de Misión del Ministerio Joven", 7, 8],
    [1, "El Ministerio Joven y el mensaje de Elías", 9, 11],
    [2, "El fundamento bíblico del Ministerio Joven adventista", 12, 24],
    [3, "Un análisis del Ministerio Joven en la Iglesia Adventista", 25, 36],
    [4, "El Ministerio Joven en las iglesias populares", 37, 43],
    [5, "Descubriendo nuestra motivación histórica en el Ministerio Joven", 44, 51],
    [6, "La Escuela Sabática y el Departamento de Jóvenes", 52, 62],
    [7, "La Sociedad de Jóvenes de la Iglesia Adventista", 63, 75],
    [8, "Un departamento separado", 76, 82],
    [9, "Las funciones del Ministerio Joven y el propósito de la Sociedad de Jóvenes", 83, 90],
    [10, "El Ministerio Joven: las expectativas de los dirigentes de la iglesia y la percepción de los otros departamentos", 91, 105],
    [11, "El Ministerio Joven: antes y ahora", 106, 110],
    [12, "¿Conducción divina o presión mundana?", 111, 126],
    [13, "Tendencias preocupantes en el Ministerio de los Menores", 127, 132],
    [14, "La reestructuración y la reconstrucción del Ministerio Joven", 133, 142],
    [15, "La Comisión de Jóvenes de la Asociación General", 143, 148],
    [16, "El Ministerio Joven hoy… y mañana", 149, 154],
    [17, "¿En qué consiste nuestra misión?", 155, 158],
  ];

  const $ = (sel) => document.querySelector(sel);
  const pantallas = {
    inicio: $("#pantalla-inicio"),
    quiz: $("#pantalla-quiz"),
    resultado: $("#pantalla-resultado"),
  };
  const dlg = $("#dlg-inicio");
  const dlgConfirmar = $("#dlg-confirmar");
  const chkMostrar = $("#chk-mostrar");
  const dlgLibro = $("#dlg-libro");

  const examenes = window.EXAMENES || [];
  let seleccion = null; // { nivel, examen } elegido en el diálogo
  let estado = null; // examen en curso

  const buscar = (nivel, numero) => examenes.find((e) => e.nivel === nivel && e.numero === numero);

  function mostrarPantalla(nombre) {
    for (const [k, el] of Object.entries(pantallas)) el.hidden = k !== nombre;
    window.scrollTo(0, 0);
  }

  function barajar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Crea un elemento con clase y contenido. El HTML viene de los archivos de datos (texto propio, no del usuario).
  function el(tag, clase, contenido, html = false) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (contenido != null) e[html ? "innerHTML" : "textContent"] = contenido;
    return e;
  }

  // ---------- Inicio ----------
  function pintarInicio() {
    const cont = $("#niveles");
    cont.replaceChildren();
    for (const nivel of NIVELES) {
      const caja = el("div", "nivel");
      caja.style.setProperty("--color", nivel.color);
      const simulacro = examenes.filter((e) => e.nivel === nivel.id)
        .reduce((n, e) => n + e.preguntas.filter((p) => p.simulacro).length, 0);
      const desc = el("p", null, nivel.desc);
      if (simulacro) desc.append(` Incluye ${simulacro} preguntas del simulacro.`);
      const lista = el("div", "lista-examenes");
      for (let n = 1; n <= EXAMENES_POR_NIVEL; n++) {
        const b = el("button", "btn-examen");
        b.type = "button";
        b.setAttribute("aria-label", `Examen ${n}`);
        b.append(el("span", "pal", "Examen "), String(n)); // «Examen» se oculta en el celular
        b.disabled = !buscar(nivel.id, n);
        b.addEventListener("click", () => abrirDialogo(nivel, n));
        lista.append(b);
      }
      caja.append(el("h2", null, nivel.nombre), desc, lista);
      cont.append(caja);
    }
  }

  // ---------- Diálogo del switch ----------
  function textoAyuda() {
    return chkMostrar.checked
      ? "Activado: al responder verás si acertaste, la explicación, el extracto del libro con la cita resaltada y el capítulo para leer más."
      : "Desactivado: no verás ninguna respuesta mientras rindes el examen.";
  }

  function abrirDialogo(nivel, numero) {
    seleccion = { nivel, numero };
    $("#dlg-titulo").textContent = `Examen ${numero} · Nivel ${nivel.nombre}`;
    chkMostrar.checked = false; // por defecto: no mostrar respuestas
    $("#dlg-ayuda").textContent = textoAyuda();
    dlg.showModal();
  }

  chkMostrar.addEventListener("change", () => {
    $("#dlg-ayuda").textContent = textoAyuda();
  });
  $("#btn-cancelar").addEventListener("click", () => dlg.close());
  $("#btn-comenzar").addEventListener("click", () => {
    dlg.close();
    iniciar(seleccion.nivel, seleccion.numero, chkMostrar.checked);
  });

  // ---------- Confirmación dentro de la página ----------
  // No se usa confirm(): la versión publicada en internet no muestra los diálogos del navegador.
  let alConfirmar = null;
  function confirmar(titulo, texto, boton, accion) {
    $("#conf-titulo").textContent = titulo;
    $("#conf-texto").textContent = texto;
    $("#conf-si").textContent = boton;
    alConfirmar = accion;
    dlgConfirmar.showModal();
  }
  $("#conf-no").addEventListener("click", () => dlgConfirmar.close());
  $("#conf-si").addEventListener("click", () => {
    const accion = alConfirmar;
    alConfirmar = null;
    dlgConfirmar.close();
    if (accion) accion();
  });

  // ---------- Examen ----------
  function iniciar(nivel, numero, mostrar) {
    const examen = buscar(nivel.id, numero);
    const preguntas = examen.preguntas.map((p) => {
      // Cuatro alternativas: la correcta y tres incorrectas (si hay cuatro, se eligen tres al azar).
      const opciones = barajar([p.ok, ...barajar(p.mal).slice(0, 3)]);
      const final = opciones.findIndex((o) => /^(ninguna|todas) de las anteriores/i.test(o));
      if (final >= 0) opciones.push(...opciones.splice(final, 1)); // «Ninguna de las anteriores» va al final
      return { ...p, opciones, correcta: opciones.indexOf(p.ok) };
    });
    estado = {
      nivel,
      numero,
      mostrar,
      preguntas,
      respuestas: preguntas.map(() => null),
      actual: 0,
    };
    $("#quiz-titulo").replaceChildren(el("span", "pal-nivel", "Nivel "), `${nivel.nombre} · Examen ${numero}`); // «Nivel» se oculta en el celular
    const badge = $("#quiz-modo");
    badge.textContent = mostrar ? "Con respuestas" : "Sin respuestas";
    badge.classList.toggle("con-respuestas", mostrar);
    mostrarPantalla("quiz");
    pintarPregunta();
  }

  function pintarPregunta() {
    const { preguntas, respuestas, actual, mostrar } = estado;
    const p = preguntas[actual];
    const elegida = respuestas[actual];
    const bloqueada = mostrar && elegida !== null;

    $("#quiz-contador").textContent = `Pregunta ${actual + 1} de ${preguntas.length}`;
    $("#progreso-relleno").style.width = `${((actual + 1) / preguntas.length) * 100}%`;
    const etiqueta = $("#pregunta-simulacro");
    etiqueta.hidden = !p.simulacro;
    if (p.simulacro) etiqueta.textContent = `Simulacro APC 11/10/2026 · pregunta ${p.simulacro}${p.simulacro === 21 ? " (plus)" : ""}`;
    $("#pregunta-texto").textContent = p.q;

    const cont = $("#opciones");
    cont.replaceChildren();
    p.opciones.forEach((texto, i) => {
      const b = el("button", "opcion");
      b.type = "button";
      b.disabled = bloqueada;
      b.append(el("span", "letra", LETRAS[i]), el("span", null, texto));
      if (bloqueada) {
        if (i === p.correcta) b.classList.add(i === elegida ? "ok" : "revelar");
        else if (i === elegida) b.classList.add("mal");
      } else if (i === elegida) {
        b.classList.add("sel");
      }
      b.addEventListener("click", () => responder(i));
      cont.append(b);
    });

    const exp = $("#explicacion");
    exp.hidden = !bloqueada;
    exp.replaceChildren();
    if (bloqueada) {
      const acierto = elegida === p.correcta;
      exp.append(
        el("p", `veredicto ${acierto ? "ok" : "mal"}`, acierto ? "¡Correcto!" : `Incorrecto. La respuesta correcta es la ${LETRAS[p.correcta]}.`),
        ficha(p),
      );
    } else if (mostrar) {
      precargar(p); // el recorte ya estará descargado cuando responda
    }

    $("#btn-anterior").disabled = actual === 0;
    const ultima = actual === preguntas.length - 1;
    $("#btn-siguiente").hidden = ultima;
    $("#btn-finalizar").hidden = !ultima;
    pintarMapa();
  }

  // ---------- Ficha de la respuesta (como en la guía del simulacro) ----------
  const recorte = (p, k) => `recortes/${p.id}-${k + 1}.png`;

  function precargar(p) {
    (p.cita || []).forEach((_, k) => { new Image().src = recorte(p, k); });
  }

  function capitulo(pagina) {
    return CAPITULOS.find(([, , a, b]) => pagina >= a && pagina <= b);
  }

  function seccion(clase, titulo, contenido, html = true) {
    const s = el("section", `bloque ${clase}`);
    s.append(el("h3", null, titulo), el("div", "cuerpo", contenido, html));
    return s;
  }

  function ficha(p) {
    const f = el("div", "ficha");
    f.append(seccion("por", "Explicación", p.por));

    if (p.cita && p.cita.length) {
      const fig = el("figure", "libro");
      const cab = el("figcaption", null, "Lo dice el libro");
      cab.append(el("span", "ampliar", "Toca la imagen para ampliarla"));
      fig.append(cab);
      p.cita.forEach(([pagina], k) => {
        const img = el("img");
        img.src = recorte(p, k);
        img.alt = `Extracto de la página ${pagina} del libro, con la cita resaltada.`;
        img.loading = "lazy";
        img.decoding = "async";
        const pie = `Libro, p. ${pagina} · PDF, p. ${pagina - DESFASE_PDF}`;
        img.addEventListener("click", () => ampliar(img, pie));
        fig.append(img, el("p", "pagina", pie));
      });
      f.append(fig);
    }

    if (p.ojo) f.append(seccion("ojo", "Ojo", p.ojo));

    const pie = el("div", "pie");
    if (p.recordar) pie.append(seccion("recordar", "Para recordar", p.recordar));
    const cap = p.cita && p.cita.length ? capitulo(p.cita[0][0]) : null;
    if (cap) {
      const [n, titulo, a, b] = cap;
      const nombre = n === 0 ? titulo : `Capítulo ${n}: «${titulo}»`;
      pie.append(seccion("leer", "Para leer más",
        `${nombre}, pp. ${a}-${b} del libro (pp. ${a - DESFASE_PDF}-${b - DESFASE_PDF} del PDF).`, false));
    }
    if (pie.childElementCount) f.append(pie);
    return f;
  }

  // En el celular el extracto se ve pequeño: al tocarlo se abre a todo el ancho de la pantalla.
  function ampliar(img, pie) {
    $("#visor-img").src = img.src;
    $("#visor-img").alt = img.alt;
    $("#visor-texto").textContent = pie;
    dlgLibro.showModal();
  }
  $("#visor-cerrar").addEventListener("click", () => dlgLibro.close());
  dlgLibro.addEventListener("click", (e) => { if (e.target === dlgLibro || e.target.id === "visor-img") dlgLibro.close(); });

  function pintarMapa() {
    const { preguntas, respuestas, actual, mostrar } = estado;
    const mapa = $("#mapa");
    mapa.replaceChildren();
    preguntas.forEach((p, i) => {
      const b = el("button", null, String(i + 1));
      b.type = "button";
      if (respuestas[i] !== null) {
        if (mostrar) b.classList.add(respuestas[i] === p.correcta ? "ok" : "mal");
        else b.classList.add("respondida");
      }
      if (i === actual) b.classList.add("actual");
      b.addEventListener("click", () => irA(i));
      mapa.append(b);
    });
  }

  function responder(i) {
    if (estado.mostrar && estado.respuestas[estado.actual] !== null) return;
    estado.respuestas[estado.actual] = i;
    pintarPregunta();
  }

  function irA(i) {
    if (i < 0 || i >= estado.preguntas.length) return;
    estado.actual = i;
    pintarPregunta();
  }

  $("#btn-anterior").addEventListener("click", () => irA(estado.actual - 1));
  $("#btn-siguiente").addEventListener("click", () => irA(estado.actual + 1));
  $("#btn-finalizar").addEventListener("click", () => {
    const sin = estado.respuestas.filter((r) => r === null).length;
    if (sin === 0) return mostrarResultado();
    confirmar(
      "¿Finalizar el examen?",
      `Te ${sin === 1 ? "falta 1 pregunta" : `faltan ${sin} preguntas`} sin responder. Las que no respondas cuentan como no acertadas.`,
      "Finalizar",
      mostrarResultado,
    );
  });
  $("#btn-salir").addEventListener("click", () => {
    confirmar("¿Salir del examen?", "Se perderá tu avance en este examen.", "Salir", volverInicio);
  });

  document.addEventListener("keydown", (e) => {
    if (pantallas.quiz.hidden || dlg.open || dlgConfirmar.open || dlgLibro.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const idx = "abcd".indexOf(k);
    if (idx >= 0) responder(idx);
    else if (k === "arrowleft") irA(estado.actual - 1);
    else if (k === "arrowright") irA(estado.actual + 1);
  });

  // ---------- Resultado ----------
  function mostrarResultado() {
    const { preguntas, respuestas, mostrar } = estado;
    const aciertos = preguntas.filter((p, i) => respuestas[i] === p.correcta).length;
    const total = preguntas.length;
    const pct = Math.round((aciertos / total) * 100);

    $("#res-titulo").textContent = `Nivel ${estado.nivel.nombre} · Examen ${estado.numero}`;
    $("#res-nota").textContent = `${aciertos} / ${total}`;
    $("#res-porcentaje").textContent = `${pct}% de aciertos`;
    $("#res-mensaje").textContent =
      pct >= 90 ? "Excelente dominio del libro." :
      pct >= 70 ? "Muy bien. Repasa los temas donde fallaste." :
      pct >= 50 ? "Vas por buen camino; conviene otra lectura de los capítulos clave." :
      "Necesitas repasar el libro con más detalle antes del examen.";

    const btnRev = $("#btn-revisar");
    btnRev.textContent = mostrar ? "Ver revisión completa" : "Revisar mis respuestas ahora";
    btnRev.disabled = false;
    $("#revision").hidden = true;
    $("#revision").replaceChildren();
    mostrarPantalla("resultado");
  }

  function pintarRevision() {
    const { preguntas, respuestas, mostrar } = estado;
    const cont = $("#revision");
    cont.replaceChildren();
    preguntas.forEach((p, i) => {
      const elegida = respuestas[i];
      const acierto = elegida === p.correcta;
      const item = el("div", `rev-item ${acierto ? "ok" : "mal"}`);
      item.append(el("h3", null, `${i + 1}. ${p.q}`));
      const linea = (etq, txt, html = false) => {
        const par = el("p");
        par.append(el("span", "etq", `${etq}: `), el("span", null, txt, html));
        return par;
      };
      item.append(
        linea("Tu respuesta", elegida === null ? "Sin responder" : `${LETRAS[elegida]}. ${p.opciones[elegida]}`),
        linea("Correcta", `${LETRAS[p.correcta]}. ${p.opciones[p.correcta]}`),
      );
      // La ficha completa (extracto del libro, capítulo…) solo se muestra si se activó «¿Mostrarte las respuestas?».
      item.append(mostrar ? ficha(p) : linea("Explicación", p.por, true));
      cont.append(item);
    });
    cont.hidden = false;
  }

  $("#btn-revisar").addEventListener("click", () => {
    pintarRevision();
    $("#btn-revisar").disabled = true;
    $("#revision").scrollIntoView({ behavior: "smooth" });
  });
  $("#btn-repetir").addEventListener("click", () => iniciar(estado.nivel, estado.numero, estado.mostrar));
  $("#btn-inicio").addEventListener("click", volverInicio);

  function volverInicio() {
    estado = null;
    mostrarPantalla("inicio");
  }

  pintarInicio();
})();
