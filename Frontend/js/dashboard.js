const API_BASE_URL = "https://crm-hyb1.onrender.com";

const TICKETS_URL = `${API_BASE_URL}/tickets`;

document.addEventListener("DOMContentLoaded", () => {
    loadUserData();
    loadTickets();

    const btnRecargarTickets = document.getElementById("btnRecargarTickets");

    if (btnRecargarTickets) {
        btnRecargarTickets.addEventListener("click", loadTickets);
    }
});

function loadUserData() {
    const nombreUsuario = document.getElementById("nombreUsuario");
    const usuarioGuardado = localStorage.getItem("usuarioCRM");

    if (!nombreUsuario) return;

    if (!usuarioGuardado) {
        nombreUsuario.textContent = "Usuario";
        return;
    }

    try {
        const usuario = JSON.parse(usuarioGuardado);
        nombreUsuario.textContent = usuario.nombre || usuario.correo || "Usuario";
    } catch (error) {
        console.error("Error al leer usuario guardado:", error);
        nombreUsuario.textContent = "Usuario";
    }
}

async function loadTickets() {
    const ticketsTableBody = document.getElementById("ticketsTableBody");

    if (ticketsTableBody) {
        ticketsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">Cargando tickets...</td>
            </tr>
        `;
    }

    try {
        const response = await fetch(TICKETS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible cargar los tickets.");
        }

        const tickets = data.tickets || [];

        renderSummary(tickets);
        renderTicketsTable(tickets);
    } catch (error) {
        console.error("Error cargando tickets:", error);

        if (ticketsTableBody) {
            ticketsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">${error.message}</td>
                </tr>
            `;
        }

        renderSummary([]);
    }
}

function renderSummary(tickets) {
    const totalTickets = tickets.length;
    const ticketsAbiertos = tickets.filter((ticket) => !ticket.isCompleted).length;
    const ticketsCompletados = tickets.filter((ticket) => ticket.isCompleted).length;
    const ticketsAltaPrioridad = tickets.filter((ticket) =>
        ["alta", "critica"].includes(String(ticket.prioridad).toLowerCase())
    ).length;

    setText("totalTickets", totalTickets);
    setText("ticketsAbiertos", ticketsAbiertos);
    setText("ticketsCompletados", ticketsCompletados);
    setText("ticketsAltaPrioridad", ticketsAltaPrioridad);
}

function renderTicketsTable(tickets) {
    const ticketsTableBody = document.getElementById("ticketsTableBody");
    if (!ticketsTableBody) return;

    if (!tickets.length) {
        ticketsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">No hay tickets registrados.</td>
            </tr>
        `;
        return;
    }

    ticketsTableBody.innerHTML = tickets.map((ticket) => `
        <tr>
            <td>${escapeHtml(ticket.numeroTicket || "")}</td>
            <td>${escapeHtml(ticket.titulo || "")}</td>
            <td>${escapeHtml(ticket.clienteNombre || "")}</td>
            <td>${escapeHtml(ticket.empresaNombre || "")}</td>
            <td>${renderEstado(ticket)}</td>
            <td>${renderPrioridad(ticket.prioridad)}</td>
            <td>${formatDate(ticket.createdAt)}</td>
            <td>${formatDate(ticket.expirationDate)}</td>
        </tr>
    `).join("");
}

function renderEstado(ticket) {
    const texto = ticket.estadoNombre || (ticket.isCompleted ? "Completado" : "Abierto");
    const clase = ticket.isCompleted ? "bg-success" : "bg-warning text-dark";

    return `<span class="badge ${clase}">${escapeHtml(texto)}</span>`;
}

function renderPrioridad(prioridad) {
    const valor = String(prioridad || "media").toLowerCase();

    let clase = "bg-secondary";

    if (valor === "baja") clase = "bg-info text-dark";
    if (valor === "media") clase = "bg-primary";
    if (valor === "alta") clase = "bg-warning text-dark";
    if (valor === "critica") clase = "bg-danger";

    return `<span class="badge ${clase} text-uppercase">${escapeHtml(valor)}</span>`;
}

function formatDate(valor) {
    if (!valor) return "Sin fecha";

    let fecha = null;

    if (typeof valor === "object" && typeof valor.seconds === "number") {
        fecha = new Date(valor.seconds * 1000);
    } else {
        fecha = new Date(valor);
    }

    if (isNaN(fecha.getTime())) {
        return "Fecha inválida";
    }

    return fecha.toLocaleString("es-CR");
}

function setText(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}