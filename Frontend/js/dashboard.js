const API_BASE_URL = "https://crm-c40k.onrender.com";

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
                <td colspan="10" class="text-center text-muted py-4">Cargando tickets...</td>
            </tr>
        `;
    }

    try {
        const response = await fetch(TICKETS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible cargar los tickets.");
        }

        const tickets = Array.isArray(data.tickets) ? data.tickets : [];

        renderSummary(tickets);
        renderTicketsTable(tickets);
    } catch (error) {
        console.error("Error cargando tickets:", error);

        if (ticketsTableBody) {
            ticketsTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center text-danger py-4">${escapeHtml(error.message)}</td>
                </tr>
            `;
        }

        renderSummary([]);
    }
}

function renderSummary(tickets) {
    const totalTickets = tickets.length;

    const ticketsAbiertos = tickets.filter((ticket) => {
        const estado = String(ticket.estadoNombre || "").toLowerCase();
        return !ticket.isCompleted && estado !== "completado";
    }).length;

    const ticketsCompletados = tickets.filter((ticket) => {
        const estado = String(ticket.estadoNombre || "").toLowerCase();
        return ticket.isCompleted || estado === "completado";
    }).length;

    const ticketsAltaPrioridad = tickets.filter((ticket) => {
        const prioridad = String(ticket.prioridad || "").toLowerCase();
        return ["alta", "critica", "crítica"].includes(prioridad);
    }).length;

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
                <td colspan="10" class="text-center text-muted py-4">No hay tickets registrados.</td>
            </tr>
        `;
        return;
    }

    const ticketsOrdenados = [...tickets].sort((a, b) => {
        const numeroA = Number(a.numeroTicket || 0);
        const numeroB = Number(b.numeroTicket || 0);
        return numeroB - numeroA;
    });

    ticketsTableBody.innerHTML = ticketsOrdenados.map((ticket) => `
        <tr>
            <td>${escapeHtml(ticket.numeroTicket || "")}</td>
            <td>${escapeHtml(ticket.titulo || "")}</td>
            <td>${escapeHtml(ticket.clienteNombre || "No asignado")}</td>
            <td>${escapeHtml(ticket.areaName || ticket.areaNombre || "No asignada")}</td>
            <td>${escapeHtml(ticket.empleadoNombre || ticket.employeeName || "No asignado")}</td>
            <td>${renderEstado(ticket)}</td>
            <td>${renderPrioridad(ticket.prioridad)}</td>
            <td>${renderArchivo(ticket)}</td>
            <td>${formatDate(ticket.createdAt, true)}</td>
            <td>${formatDate(ticket.expirationDate || ticket.fechaVencimiento, false)}</td>
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
    if (valor === "critica" || valor === "crítica") clase = "bg-danger";

    return `<span class="badge ${clase} text-uppercase">${escapeHtml(valor)}</span>`;
}

function renderArchivo(ticket) {
    const archivo = getTicketFile(ticket);

    if (!archivo || !archivo.enlace) {
        return `<span class="text-muted">Sin archivo</span>`;
    }

    return `
        <a
            href="${escapeHtml(archivo.enlace)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-secondary btn-sm"
        >
            <i class="fa-solid fa-paperclip me-1"></i>Ver
        </a>
    `;
}

function getTicketFile(ticket) {
    if (!ticket) return null;

    const archivo =
        ticket.archivoAdjunto ||
        ticket.archivo ||
        ticket.attachment ||
        ticket.file ||
        null;

    if (!archivo) return null;

    if (typeof archivo === "string") {
        return {
            nombre: "Archivo adjunto",
            tipo: "",
            enlace: archivo
        };
    }

    return {
        nombre:
            archivo.nombre ||
            archivo.name ||
            archivo.originalName ||
            archivo.originalname ||
            "Archivo adjunto",

        tipo:
            archivo.tipo ||
            archivo.mimeType ||
            archivo.mimetype ||
            "Archivo",

        enlace:
            archivo.webViewLink ||
            archivo.enlaceVisualizacion ||
            archivo.url ||
            archivo.link ||
            archivo.enlace ||
            ""
    };
}

function parseDateValue(valor) {
    if (!valor) return null;

    let fecha = null;

    if (typeof valor === "object" && typeof valor.seconds === "number") {
        fecha = new Date(valor.seconds * 1000);
    } else if (typeof valor === "object" && typeof valor._seconds === "number") {
        fecha = new Date(valor._seconds * 1000);
    } else if (valor instanceof Date) {
        fecha = valor;
    } else {
        fecha = new Date(valor);
    }

    if (isNaN(fecha.getTime())) {
        return null;
    }

    return fecha;
}

function formatDate(valor, incluirHora = false) {
    const fecha = parseDateValue(valor);

    if (!fecha) return "Sin fecha";

    if (incluirHora) {
        return fecha.toLocaleString("es-CR");
    }

    return fecha.toLocaleDateString("es-CR");
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