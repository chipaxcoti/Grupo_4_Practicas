const CLAVE_SESION = "sesionTechSolve";
const CLAVE_TICKETS = "techsolveTickets";

function resolverURL(ruta) {
    return window.location.pathname.includes("/pages/")
        ? `../${ruta}`
        : ruta;
}

function obtenerSesion() {
    const sesion = localStorage.getItem(CLAVE_SESION);
    return sesion ? JSON.parse(sesion) : null;
}

async function obtenerDatos() {
    const respuesta = await fetch(resolverURL("data/datos.json"));

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar datos.json: ${respuesta.status}`);
    }

    return respuesta.json();
}

function obtenerTickets() {
    const tickets = localStorage.getItem(CLAVE_TICKETS);
    return tickets ? JSON.parse(tickets) : null;
}

async function cargarTickets() {
    let tickets = obtenerTickets();

    if (!tickets) {
        const datos = await obtenerDatos();
        tickets = datos.tickets || [];
        localStorage.setItem(CLAVE_TICKETS, JSON.stringify(tickets));
    }

    return tickets;
}

function guardarTickets(tickets) {
    localStorage.setItem(CLAVE_TICKETS, JSON.stringify(tickets));
}

function crearMenu() {
    const nav = document.querySelector("nav");

    if (!nav) return;

    const sesion = obtenerSesion();
    const paginaActual = window.location.pathname.split("/").pop() || "index.html";

    const enlaces = [
        { texto: "Inicio", ruta: "index.html", siempre: true },
        { texto: "Registrar Ticket", ruta: "pages/registrar-ticket.html", protegido: true },
        { texto: "Mis Tickets", ruta: "pages/mis-tickets.html", protegido: true },
        { texto: "Panel Técnico", ruta: "pages/panel-tecnico.html", tecnico: true },
        { texto: "Iniciar sesión", ruta: "pages/login.html", invitado: true }
    ];

    nav.innerHTML = "";
    const lista = document.createElement("ul");

    enlaces.forEach(enlace => {
        if (enlace.ruta === "index.html" && sesion) return;
        if (enlace.protegido && !sesion) return;
        if (enlace.tecnico && (!sesion || sesion.rol !== "tecnico")) return;
        if (enlace.invitado && sesion) return;

        const item = document.createElement("li");
        const link = document.createElement("a");

        link.href = resolverURL(enlace.ruta);
        link.textContent = enlace.texto;

        if (paginaActual === enlace.ruta.split("/").pop()) {
            link.classList.add("active");
        }

        item.appendChild(link);
        lista.appendChild(item);
    });

    if (sesion) {
        const item = document.createElement("li");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.textContent = "Cerrar sesión";
        boton.className = "boton secondary";

        boton.addEventListener("click", () => {
            localStorage.removeItem(CLAVE_SESION);
            window.location.href = resolverURL("index.html");
        });

        item.appendChild(boton);
        lista.appendChild(item);
    }

    nav.appendChild(lista);
}

function controlarAcceso() {
    const sesion = obtenerSesion();
    const pagina = window.location.pathname.split("/").pop();

    if (
        ["registrar-ticket.html", "mis-tickets.html", "panel-tecnico.html"]
            .includes(pagina) &&
        !sesion
    ) {
        window.location.href = resolverURL("pages/login.html");
        return false;
    }

    if (pagina === "panel-tecnico.html" && sesion.rol !== "tecnico") {
        window.location.href = resolverURL("pages/mis-tickets.html");
        return false;
    }

    return true;
}

async function configurarLogin() {
    const formulario = document.querySelector("#login-form");

    if (!formulario) return;

    formulario.addEventListener("submit", async event => {
        event.preventDefault();

        const usuarioIngresado = document
            .querySelector("#usuario")
            .value
            .trim();

        const passwordIngresada = document.querySelector("#password").value;
        const mensaje = document.querySelector("#login-message");

        try {
            const datos = await obtenerDatos();

            const usuario = datos.usuarios.find(
                item =>
                    item.usuario === usuarioIngresado &&
                    item.password === passwordIngresada
            );

            if (!usuario) {
                mensaje.textContent = "Usuario o contraseña incorrectos.";
                mensaje.className = "error-message";
                return;
            }

            localStorage.setItem(
                CLAVE_SESION,
                JSON.stringify({
                    id: usuario.id,
                    usuario: usuario.usuario,
                    nombre: usuario.nombre,
                    rol: usuario.rol
                })
            );

            window.location.href = usuario.rol === "tecnico"
                ? "panel-tecnico.html"
                : "mis-tickets.html";
        } catch (error) {
            console.error(error);
            mensaje.textContent = "No se pudieron cargar los datos.";
            mensaje.className = "error-message";
        }
    });
}

async function mostrarMisTickets() {
    const tabla = document.querySelector("#ticketsTableBody");

    if (!tabla) return;

    const sesion = obtenerSesion();
    let tickets = await cargarTickets();

    if (sesion.rol !== "tecnico") {
        tickets = tickets.filter(ticket => ticket.usuarioId === sesion.id);
    }

    tabla.innerHTML = "";

    tickets.forEach(ticket => {
        const fila = document.createElement("tr");

        [
            ticket.id,
            ticket.categoria,
            ticket.descripcion,
            ticket.estado,
            ticket.prioridad
        ].forEach(valor => {
            const celda = document.createElement("td");
            celda.textContent = valor ?? "";
            fila.appendChild(celda);
        });

        tabla.appendChild(fila);
    });

    if (tickets.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 5;
        celda.textContent = "No hay tickets para mostrar.";
        fila.appendChild(celda);
        tabla.appendChild(fila);
    }
}

async function configurarRegistroTicket() {
    const formulario =
        document.querySelector("#registrar-ticket-form") ||
        document.querySelector("#ticket-form");

    if (!formulario) return;

    formulario.addEventListener("submit", async event => {
        event.preventDefault();

        const sesion = obtenerSesion();
        const categoria = formulario.querySelector("[name='categoria']");
        const descripcion = formulario.querySelector("[name='descripcion']");
        const prioridad = formulario.querySelector("[name='prioridad']");

        const tickets = await cargarTickets();

        const numeros = tickets
    .map(ticket => {
        const coincidencia = String(ticket.id).match(/^TS(\d{3})$/);
        return coincidencia ? Number(coincidencia[1]) : 0;
    });

const siguienteId = Math.max(0, ...numeros) + 1;

const nuevoTicket = {
    id: `TS${String(siguienteId).padStart(3, "0")}`,
    usuarioId: sesion.id,
    categoria: categoria.value.trim(),
    descripcion: descripcion.value.trim(),
    estado: "Abierto",
    prioridad: prioridad ? prioridad.value : "Media",
    tecnicoId: null
};

        tickets.push(nuevoTicket);
        guardarTickets(tickets);

        formulario.reset();
        alert("Ticket registrado correctamente.");
        window.location.href = "mis-tickets.html";
    });
}

async function iniciarAplicacion() {
    crearMenu();

    if (!controlarAcceso()) return;

    await configurarLogin();
    await configurarRegistroTicket();
    await mostrarMisTickets();
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarAplicacion().catch(error => {
        console.error("Error de aplicación:", error);
    });
});