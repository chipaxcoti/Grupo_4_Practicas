function resolverURL(path) {
    const dentroDePages = window.location.pathname.includes("/pages/");
    return dentroDePages ? "../" + path : path;
}

async function cargarTickets() {
    const tabla = document.getElementById("ticketsTableBody");
    if (!tabla) return;

    const guardados = localStorage.getItem("techsolveTickets");
    let tickets;

    if (guardados !== null) {
        tickets = JSON.parse(guardados);
    } else {
        const respuesta = await fetch(resolverURL("data/datos.json"));

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los tickets");
        }

        tickets = await respuesta.json();
    }

    const panel = document.getElementById("historialPanel");
    const selector = document.getElementById("selectorTicket");
    const formulario = document.getElementById("editarTicketForm");
    const categoria = document.getElementById("editarCategoria");
    const descripcion = document.getElementById("editarDescripcion");
    const mensaje = document.getElementById("mensajeEdicion");

    // Debe ser empleado y dueño del ticket.
    function puedeEditar(ticket) {
        return localStorage.getItem("techsolveRol") === "empleado"
            && ticket.usuario === localStorage.getItem("techsolveUser");
    }

    function mostrarTickets() {
        tabla.innerHTML = "";
        selector.innerHTML = "";

        tickets.forEach(function (ticket) {
            const fila = tabla.insertRow();

            const columnas = [
                ticket.id,
                ticket.categoria,
                ticket.descripcion,
                ticket.estado,
                ticket.prioridad
            ];

            columnas.forEach(function (valor) {
                fila.insertCell().textContent = valor;
            });

            // Solo ofrece para editar los tickets propios.
            if (puedeEditar(ticket)) {
                selector.add(new Option(
                    ticket.id + " - " + ticket.descripcion,
                    ticket.id
                ));
            }
        });

        formulario.hidden = selector.options.length === 0;
        selector.disabled = formulario.hidden;

        mensaje.textContent = formulario.hidden
            ? "No tenés tickets disponibles para editar."
            : "";
    }

    function completarFormulario() {
        const ticket = tickets.find(function (ticket) {
            return ticket.id === selector.value;
        });

        if (!ticket || !puedeEditar(ticket)) return;

        categoria.value = ticket.categoria;
        descripcion.value = ticket.descripcion;
        mensaje.textContent = "";
    }

    document.getElementById("historialTicketsButton")
        .addEventListener("click", function () {
            panel.hidden = !panel.hidden;
        });

    selector.addEventListener("change", completarFormulario);

    formulario.addEventListener("submit", function (event) {
        event.preventDefault();

        const ticket = tickets.find(function (ticket) {
            return ticket.id === selector.value;
        });

        // Comprueba nuevamente el permiso antes de guardar.
        if (!ticket || !puedeEditar(ticket)) {
            mensaje.textContent = "No podés editar este ticket.";
            return;
        }

        if (!categoria.value.trim() || !descripcion.value.trim()) {
            mensaje.textContent = "Completá categoría y descripción.";
            return;
        }

        // Modifica únicamente estos dos datos.
        ticket.categoria = categoria.value.trim();
        ticket.descripcion = descripcion.value.trim();

        localStorage.setItem("techsolveTickets", JSON.stringify(tickets));

        mostrarTickets();
        selector.value = ticket.id;
        completarFormulario();

        mensaje.textContent = "Cambios guardados correctamente.";
    });

    mostrarTickets();
    completarFormulario();
}

cargarTickets().catch(function (error) {
    console.error(error);

    const tabla = document.getElementById("ticketsTableBody");
    if (tabla) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5">No se pudieron cargar los tickets.</td>
            </tr>
        `;
    }
});