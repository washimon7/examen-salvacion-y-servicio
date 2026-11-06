(() => {
  const NIVELES = [
    { id: "facil", nombre: "Fácil", color: "var(--facil)", desc: "Ideas centrales, lemas y hechos principales del libro." },
    { id: "medio", nombre: "Medio", color: "var(--medio)", desc: "Nombres, fechas, listas y citas específicas." },
    { id: "dificil", nombre: "Difícil", color: "var(--dificil)", desc: "Cifras, secuencias y detalles finos." },
  ];
  const LETRAS = ["A", "B", "C", "D", "E"];
  const EXAMENES_POR_NIVEL = 5;

  const $ = (sel) => document.querySelector(sel);
  const pantallas = {
    inicio: $("#pantalla-inicio"),
    quiz: $("#pantalla-quiz"),
    resultado: $("#pantalla-resultado"),
  };
  const dlg = $("#dlg-inicio");
  const dlgConfirmar = $("#dlg-confirmar");
  const chkMostrar = $("#chk-mostrar");

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

  // ---------- Inicio ----------
  function pintarInicio() {
    const cont = $("#niveles");
    cont.replaceChildren();
    for (const nivel of NIVELES) {
      const caja = document.createElement("div");
      caja.className = "nivel";
      caja.style.setProperty("--color", nivel.color);
      const h = document.createElement("h2");
      h.textContent = nivel.nombre;
      const p = document.createElement("p");
      p.textContent = nivel.desc;
      const lista = document.createElement("div");
      lista.className = "lista-examenes";
      for (let n = 1; n <= EXAMENES_POR_NIVEL; n++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn-examen";
        b.setAttribute("aria-label", `Examen ${n}`);
        const palabra = document.createElement("span");
        palabra.className = "pal"; // se oculta en el celular
        palabra.textContent = "Examen ";
        b.append(palabra, String(n));
        b.disabled = !buscar(nivel.id, n);
        b.addEventListener("click", () => abrirDialogo(nivel, n));
        lista.append(b);
      }
      caja.append(h, p, lista);
      cont.append(caja);
    }
  }

  // ---------- Diálogo del switch ----------
  function textoAyuda() {
    return chkMostrar.checked
      ? "Activado: verás al instante si acertaste y la explicación con la página del libro."
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
    const preguntas = examen.preguntas.map(([q, correcta, incorrectas, explicacion]) => {
      const opciones = barajar([correcta, ...incorrectas]);
      return { q, opciones, correcta: opciones.indexOf(correcta), explicacion };
    });
    estado = {
      nivel,
      numero,
      mostrar,
      preguntas,
      respuestas: preguntas.map(() => null),
      actual: 0,
    };
    $("#quiz-titulo").textContent = `Nivel ${nivel.nombre} · Examen ${numero}`;
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
    $("#pregunta-texto").textContent = p.q;

    const cont = $("#opciones");
    cont.replaceChildren();
    p.opciones.forEach((texto, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opcion";
      b.disabled = bloqueada;
      const letra = document.createElement("span");
      letra.className = "letra";
      letra.textContent = LETRAS[i];
      const t = document.createElement("span");
      t.textContent = texto;
      b.append(letra, t);
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
    if (bloqueada) {
      exp.replaceChildren();
      const titulo = document.createElement("b");
      titulo.textContent = elegida === p.correcta ? "¡Correcto!" : `Incorrecto. La respuesta es ${LETRAS[p.correcta]}.`;
      exp.append(titulo, p.explicacion);
    }

    $("#btn-anterior").disabled = actual === 0;
    const ultima = actual === preguntas.length - 1;
    $("#btn-siguiente").hidden = ultima;
    $("#btn-finalizar").hidden = !ultima;
    pintarMapa();
  }

  function pintarMapa() {
    const { preguntas, respuestas, actual, mostrar } = estado;
    const mapa = $("#mapa");
    mapa.replaceChildren();
    preguntas.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
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
    if (pantallas.quiz.hidden || dlg.open || dlgConfirmar.open || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const idx = "abcde".indexOf(k);
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
    const { preguntas, respuestas } = estado;
    const cont = $("#revision");
    cont.replaceChildren();
    preguntas.forEach((p, i) => {
      const elegida = respuestas[i];
      const acierto = elegida === p.correcta;
      const item = document.createElement("div");
      item.className = `rev-item ${acierto ? "ok" : "mal"}`;
      const h = document.createElement("h3");
      h.textContent = `${i + 1}. ${p.q}`;
      item.append(h);
      const linea = (etq, txt) => {
        const par = document.createElement("p");
        const s = document.createElement("span");
        s.className = "etq";
        s.textContent = `${etq}: `;
        par.append(s, txt);
        return par;
      };
      item.append(
        linea("Tu respuesta", elegida === null ? "Sin responder" : `${LETRAS[elegida]}. ${p.opciones[elegida]}`),
        linea("Correcta", `${LETRAS[p.correcta]}. ${p.opciones[p.correcta]}`),
        linea("Explicación", p.explicacion),
      );
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
