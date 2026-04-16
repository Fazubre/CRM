const TICKETS_URL = "http://localhost:3000/tickets";

let mensajeTablaVacia = "No hay tickets registrados.";
let modalAgregarTicket = null;
let modalVerTicket = null;
let modalEditarTicket = null;
let ticketsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadModalsHtml();
        initializeModals();
        loadUserData();
        setupEvents();
        await loadTickets();
    } catch (error) {
        console.error("Error inicializando la vista de tickets:", error);

        Swal.fire({
            icon: "error",
            title: "Error inicial",
            text: error.message || "No fue posible cargar la pantalla de tickets."
        });
    }
});

async function loadModalsHtml() {
    const modales = [
        {
            contenedorId: "contenedorModalTicket",
            ruta: "./components/modal-add-ticket.html"
        },
        {
            contenedorId: "contenedorModalVerTicket",
            ruta: "./components/modal-view-ticket.html"
        },
        {
            contenedorId: "contenedorModalEditarTicket",
            ruta: "./components/modal-edit-ticket.html"
        }
    ];

    for (const modal of modales) {
        const contenedor = document.getElementById(modal.contenedorId);

        if (!contenedor) {
            throw new Error(`No existe el contenedor ${modal.contenedorId}.`);
        }

        const response = await fetch(modal.ruta);

        if (!response.ok) {
            throw new Error(`No fue posible cargar ${modal.ruta}.`);
        }

        contenedor.innerHTML = await response.text();
    }
}

function initializeModals() {
    const modalAgregarElement = document.getElementById("modalAgregarTicket");
    const modalVerElement = document.getElementById("modalVerTicket");
    const modalEditarElement = document.getElementById("modalEditarTicket");

    if (modalAgregarElement) {
        modalAgregarTicket = new bootstrap.Modal(modalAgregarElement);

        modalAgregarElement.addEventListener("hidden.bs.modal", () => {
            resetTicketForm();
        });
    }

    if (modalVerElement) {
        modalVerTicket = new bootstrap.Modal(modalVerElement);
    }

    if (modalEditarElement) {
        modalEditarTicket = new bootstrap.Modal(modalEditarElement);

        modalEditarElement.addEventListener("hidden.bs.modal", () => {
            resetEditTicketForm();
        });
    }
}

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
        console.error("Error leyendo usuario guardado:", error);
        nombreUsuario.textContent = "Usuario";
    }
}

function setupEvents() {
    const btnNuevoTicket = document.getElementById("btnNuevoTicket");
    const btnRecargarTickets = document.getElementById("btnRecargarTickets");
    const formAgregarTicket = document.getElementById("formAgregarTicket");
    const formEditarTicket = document.getElementById("formEditarTicket");

    if (btnNuevoTicket) {
        btnNuevoTicket.addEventListener("click", () => {
            openTicketModal();
        });
    }

    if (btnRecargarTickets) {
        btnRecargarTickets.addEventListener("click", async () => {
            await loadTickets();
        });
    }

    if (formAgregarTicket) {
        formAgregarTicket.addEventListener("submit", async (event) => {
            event.preventDefault();
            await submitTicketForm();
        });
    }

    if (formEditarTicket) {
        formEditarTicket.addEventListener("submit", async (event) => {
            event.preventDefault();
            await submitEditTicketForm();
        });
    }

    $(document).on("click", ".btn-ver-ticket", function () {
        const id = $(this).data("id");
        const ticket = findTicketById(id);

        if (!ticket) {
            Swal.fire({
                icon: "warning",
                title: "Ticket no encontrado",
                text: "No fue posible encontrar el ticket seleccionado."
            });
            return;
        }

        openViewTicketModal(ticket);
    });

    $(document).on("click", ".btn-editar-ticket", function () {
        const id = $(this).data("id");
        const ticket = findTicketById(id);

        if (!ticket) {
            Swal.fire({
                icon: "warning",
                title: "Ticket no encontrado",
                text: "No fue posible encontrar el ticket seleccionado."
            });
            return;
        }

        openEditTicketModal(ticket);
    });
}

function findTicketById(id) {
    return ticketsCache.find((ticket) => String(ticket.id) === String(id)) || null;
}

function openTicketModal() {
    resetTicketForm();
    setUsuarioIdActual();

    if (modalAgregarTicket) {
        modalAgregarTicket.show();
    }
}

function openViewTicketModal(ticket) {
    fillViewTicketModal(ticket);

    if (modalVerTicket) {
        modalVerTicket.show();
    }
}

function openEditTicketModal(ticket) {
    fillEditTicketForm(ticket);

    if (modalEditarTicket) {
        modalEditarTicket.show();
    }
}

function fillViewTicketModal(ticket) {
    setTextValue("verNumeroTicket", ticket.numeroTicket || "-");
    setTextValue("verEstado", ticket.estadoNombre || (ticket.isCompleted ? "Completado" : "Abierto"));
    setTextValue("verTitulo", ticket.titulo || "-");

    const descripcion = document.getElementById("verDescripcion");
    if (descripcion) {
        descripcion.value = ticket.descripcion || "Sin descripción";
    }

    setTextValue("verPrioridad", capitalizeText(ticket.prioridad || "media"));
    setTextValue("verVencimiento", formatDate(ticket.expirationDate));
    setTextValue("verCliente", ticket.clienteNombre || "No asignado");
    setTextValue("verEmpresa", ticket.empresaNombre || "No asignada");
    setTextValue("verArea", ticket.areaName || "No asignada");
    setTextValue("verCreadoPor", ticket.usuarioNombre || "Usuario");
    setTextValue("verFechaCreacion", formatDateTime(ticket.createdAt));
    setTextValue("verFechaActualizacion", formatDateTime(ticket.updatedAt));
}

function fillEditTicketForm(ticket) {
    const idInput = document.getElementById("editarTicketId");
    const numeroInput = document.getElementById("editarNumeroTicket");
    const estadoInput = document.getElementById("editarEstado");
    const tituloInput = document.getElementById("editarTitulo");
    const descripcionInput = document.getElementById("editarDescripcion");
    const prioridadInput = document.getElementById("editarPrioridad");
    const fechaInput = document.getElementById("editarFechaVencimiento");

    if (idInput) idInput.value = ticket.id || "";
    if (numeroInput) numeroInput.value = ticket.numeroTicket || "";
    if (estadoInput) {
        estadoInput.value = ticket.isCompleted ? "completado" : "abierto";
    }
    if (tituloInput) tituloInput.value = ticket.titulo || "";
    if (descripcionInput) descripcionInput.value = ticket.descripcion || "";
    if (prioridadInput) prioridadInput.value = ticket.prioridad || "media";
    if (fechaInput) fechaInput.value = formatDateForInput(ticket.expirationDate);

    hideEditFormAlert();

    const form = document.getElementById("formEditarTicket");
    if (form) {
        form.classList.remove("was-validated");
    }
}

function resetTicketForm() {
    const form = document.getElementById("formAgregarTicket");
    const alerta = document.getElementById("alertaFormularioTicket");

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    if (alerta) {
        alerta.classList.add("d-none");
        alerta.textContent = "";
    }

    setUsuarioIdActual();
}

function resetEditTicketForm() {
    const form = document.getElementById("formEditarTicket");
    const alerta = document.getElementById("alertaFormularioEditarTicket");

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    if (alerta) {
        alerta.classList.add("d-none");
        alerta.textContent = "";
    }
}

function setUsuarioIdActual() {
    const inputUsuarioId = document.getElementById("usuarioId");
    if (!inputUsuarioId) return;

    inputUsuarioId.value = getUsuarioIdActual();
}

function getUsuarioActual() {
    const usuarioGuardado = localStorage.getItem("usuarioCRM");

    if (!usuarioGuardado) return null;

    try {
        return JSON.parse(usuarioGuardado);
    } catch (error) {
        console.error("Error obteniendo usuario actual:", error);
        return null;
    }
}

function getUsuarioIdActual() {
    const usuario = getUsuarioActual();

    if (!usuario) return "";

    return usuario.id || usuario.usuarioId || usuario.google_id || "";
}

async function submitTicketForm() {
    const form = document.getElementById("formAgregarTicket");
    const btnGuardar = document.getElementById("btnGuardarTicket");

    if (!form || !btnGuardar) return;

    hideFormAlert();

    const payload = buildTicketPayload();

    if (!payload.titulo) {
        form.classList.add("was-validated");
        showFormAlert("Debe ingresar el título del ticket.");
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...`;

        const response = await fetch(TICKETS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible crear el ticket.");
        }

        if (modalAgregarTicket) {
            modalAgregarTicket.hide();
        }

        await loadTickets();

        Swal.fire({
            icon: "success",
            title: "Ticket creado",
            text: "El ticket fue creado correctamente."
        });
    } catch (error) {
        console.error("Error creando ticket:", error);
        showFormAlert(error.message || "No fue posible crear el ticket.");
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Ticket`;
    }
}

async function submitEditTicketForm() {
    const form = document.getElementById("formEditarTicket");
    const btnActualizar = document.getElementById("btnActualizarTicket");
    const ticketId = document.getElementById("editarTicketId")?.value || "";

    if (!form || !btnActualizar) return;

    hideEditFormAlert();

    const payload = buildEditTicketPayload();

    if (!ticketId) {
        showEditFormAlert("No se encontró el id del ticket.");
        return;
    }

    if (!payload.titulo) {
        form.classList.add("was-validated");
        showEditFormAlert("Debe ingresar el título del ticket.");
        return;
    }

    try {
        btnActualizar.disabled = true;
        btnActualizar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...`;

        const response = await fetch(`${TICKETS_URL}/${encodeURIComponent(ticketId)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible actualizar el ticket.");
        }

        if (modalEditarTicket) {
            modalEditarTicket.hide();
        }

        await loadTickets();

        Swal.fire({
            icon: "success",
            title: "Ticket actualizado",
            text: "Los cambios fueron guardados correctamente."
        });
    } catch (error) {
        console.error("Error actualizando ticket:", error);
        showEditFormAlert(error.message || "No fue posible actualizar el ticket.");
    } finally {
        btnActualizar.disabled = false;
        btnActualizar.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`;
    }
}

function buildTicketPayload() {
    const usuario = getUsuarioActual();

    return {
        usuarioId: document.getElementById("usuarioId")?.value.trim() || "",
        usuarioNombre: usuario?.nombre || usuario?.correo || "Usuario",
        titulo: document.getElementById("titulo")?.value.trim() || "",
        descripcion: document.getElementById("descripcion")?.value.trim() || "",
        prioridad: document.getElementById("prioridad")?.value || "media",
        fechaVencimiento: document.getElementById("fechaVencimiento")?.value || null
    };
}

function buildEditTicketPayload() {
    return {
        titulo: document.getElementById("editarTitulo")?.value.trim() || "",
        descripcion: document.getElementById("editarDescripcion")?.value.trim() || "",
        prioridad: document.getElementById("editarPrioridad")?.value || "media",
        estado: document.getElementById("editarEstado")?.value || "abierto",
        fechaVencimiento: document.getElementById("editarFechaVencimiento")?.value || null
    };
}

function showFormAlert(message) {
    const alerta = document.getElementById("alertaFormularioTicket");
    if (!alerta) return;

    alerta.textContent = message;
    alerta.classList.remove("d-none");
}

function hideFormAlert() {
    const alerta = document.getElementById("alertaFormularioTicket");
    if (!alerta) return;

    alerta.textContent = "";
    alerta.classList.add("d-none");
}

function showEditFormAlert(message) {
    const alerta = document.getElementById("alertaFormularioEditarTicket");
    if (!alerta) return;

    alerta.textContent = message;
    alerta.classList.remove("d-none");
}

function hideEditFormAlert() {
    const alerta = document.getElementById("alertaFormularioEditarTicket");
    if (!alerta) return;

    alerta.textContent = "";
    alerta.classList.add("d-none");
}

async function loadTickets() {
    const tbody = document.getElementById("ticketsTableBody");

    if (!tbody) return;

    try {
        destroyDataTable();

        tbody.innerHTML = "";

        const response = await fetch(TICKETS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener los tickets.");
        }

        const tickets = Array.isArray(data.tickets) ? data.tickets : [];
        ticketsCache = tickets;

        renderTickets(tickets);

        mensajeTablaVacia = "No hay tickets registrados.";
        initDataTable();
    } catch (error) {
        console.error("Error cargando tickets:", error);

        ticketsCache = [];
        destroyDataTable();
        tbody.innerHTML = "";

        mensajeTablaVacia = error.message || "No fue posible cargar los tickets.";
        initDataTable();
    }
}

function renderTickets(tickets) {
    const tbody = document.getElementById("ticketsTableBody");

    if (!tbody) return;

    if (!tickets.length) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML = tickets.map((ticket) => `
        <tr>
            <td>${escapeHtml(ticket.id || "")}</td>
            <td>${escapeHtml(ticket.numeroTicket || "")}</td>
            <td>${escapeHtml(ticket.titulo || "")}</td>
            <td>${escapeHtml(ticket.clienteNombre || "No asignado")}</td>
            <td>${escapeHtml(ticket.empresaNombre || "No asignada")}</td>
            <td>${escapeHtml(ticket.areaName || "No asignada")}</td>
            <td>${renderEstado(ticket)}</td>
            <td>${renderPrioridad(ticket.prioridad)}</td>
            <td>${formatDate(ticket.expirationDate)}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        class="btn btn-outline-info btn-ver-ticket"
                        data-id="${escapeHtml(ticket.id || "")}">
                        Ver
                    </button>
                    <button
                        type="button"
                        class="btn btn-outline-warning btn-editar-ticket"
                        data-id="${escapeHtml(ticket.id || "")}">
                        Editar
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function destroyDataTable() {
    if ($.fn.DataTable.isDataTable("#tablaTickets")) {
        $("#tablaTickets").DataTable().destroy();
    }
}

function initDataTable() {
    $("#tablaTickets").DataTable({
        responsive: true,
        autoWidth: false,
        pageLength: 10,
        order: [[1, "desc"]],
        language: {
            emptyTable: mensajeTablaVacia,
            search: "Buscar:",
            lengthMenu: "Mostrar _MENU_ registros",
            zeroRecords: "No se encontraron registros",
            info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
            infoEmpty: "No hay registros disponibles",
            infoFiltered: "(filtrado de _MAX_ registros totales)",
            paginate: {
                previous: "Anterior",
                next: "Siguiente"
            }
        }
    });
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

function parseDateValue(valor) {
    if (!valor) return null;

    let fecha = null;

    if (typeof valor === "object" && typeof valor.seconds === "number") {
        fecha = new Date(valor.seconds * 1000);
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

function formatDate(valor) {
    const fecha = parseDateValue(valor);

    if (!fecha) return "Sin fecha";

    return fecha.toLocaleDateString("es-CR");
}

function formatDateTime(valor) {
    const fecha = parseDateValue(valor);

    if (!fecha) return "Sin fecha";

    return fecha.toLocaleString("es-CR");
}

function formatDateForInput(valor) {
    const fecha = parseDateValue(valor);

    if (!fecha) return "";

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setTextValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = value || "-";
}

function capitalizeText(text) {
    const value = String(text || "").trim();

    if (!value) return "-";

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}