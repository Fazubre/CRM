const API_BASE_URL = "https://crm-c40k.onrender.com";

const TICKETS_URL = `${API_BASE_URL}/tickets`;
const EMPLEADOS_URL = `${API_BASE_URL}/employees`;
const CLIENTES_URL = `${API_BASE_URL}/clients`;
const AREAS_URL = `${API_BASE_URL}/areas`;

let mensajeTablaVacia = "No hay tickets registrados.";
let modalAgregarTicket = null;
let modalVerTicket = null;
let modalEditarTicket = null;

let ticketsCache = [];
let empleadosCache = [];
let clientesCache = [];
let areasCache = [];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "text/plain"
];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadModalsHtml();
        initializeModals();
        loadUserData();
        setupEvents();
        setupFormChangeEvents();

        await loadEmployees();
        await loadClients();
        await loadAreas();
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
            ruta: "./components/Tickets/modal-add-ticket.html"
        },
        {
            contenedorId: "contenedorModalVerTicket",
            ruta: "./components/Tickets/modal-view-ticket.html"
        },
        {
            contenedorId: "contenedorModalEditarTicket",
            ruta: "./components/Tickets/modal-edit-ticket.html"
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
            await loadEmployees();
            await loadClients();
            await loadAreas();
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

function setupFormChangeEvents() {
    const campos = [
        "titulo",
        "clienteAsignado",
        "areaAsignada",
        "empleadoAsignado",
        "fechaVencimiento",
        "archivoAdjunto",
        "editarTitulo",
        "editarClienteAsignado",
        "editarAreaAsignada",
        "editarEmpleadoAsignado",
        "editarFechaVencimiento",
        "editarArchivoAdjunto"
    ];

    campos.forEach((id) => {
        const campo = document.getElementById(id);

        if (!campo) return;

        campo.addEventListener("input", () => {
            hideFormAlert();
            hideEditFormAlert();
            campo.classList.remove("is-invalid");
        });

        campo.addEventListener("change", () => {
            hideFormAlert();
            hideEditFormAlert();
            campo.classList.remove("is-invalid");
        });
    });
}

async function loadEmployees() {
    try {
        const response = await fetch(EMPLEADOS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener los empleados.");
        }

        empleadosCache = data.employees || data.empleados || [];
        fillEmployeeSelects();
    } catch (error) {
        console.error("Error cargando empleados:", error);
        empleadosCache = [];
        fillEmployeeSelects();
    }
}

async function loadClients() {
    try {
        const response = await fetch(CLIENTES_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener los clientes.");
        }

        clientesCache = data.clients || data.clientes || [];
        fillClientSelects();
    } catch (error) {
        console.error("Error cargando clientes:", error);
        clientesCache = [];
        fillClientSelects();
    }
}

async function loadAreas() {
    try {
        const response = await fetch(AREAS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener las áreas.");
        }

        areasCache = data.areas || data.areasData || [];
        fillAreaSelects();
    } catch (error) {
        console.error("Error cargando áreas:", error);
        areasCache = [];
        fillAreaSelects();
    }
}

function fillEmployeeSelects() {
    const selectAgregar = document.getElementById("empleadoAsignado");
    const selectEditar = document.getElementById("editarEmpleadoAsignado");

    const opciones = `
        <option value="">Seleccione un empleado</option>
        ${empleadosCache.map((empleado) => {
            const id = empleado.id || empleado.employeeId || "";
            const nombre = empleado.nombre || empleado.name || empleado.correo || empleado.email || "Empleado";

            return `<option value="${escapeHtml(id)}">${escapeHtml(nombre)}</option>`;
        }).join("")}
    `;

    if (selectAgregar) selectAgregar.innerHTML = opciones;
    if (selectEditar) selectEditar.innerHTML = opciones;
}

function fillClientSelects() {
    const selectAgregar = document.getElementById("clienteAsignado");
    const selectEditar = document.getElementById("editarClienteAsignado");

    const opciones = `
        <option value="">Seleccione un cliente</option>
        ${clientesCache.map((cliente) => {
            const id = String(
                cliente._cliente_id ||
                cliente.id ||
                cliente.clienteId ||
                cliente.clientId ||
                ""
            );

            const nombre = String(
                cliente.nombre ||
                cliente.name ||
                cliente.clienteNombre ||
                cliente.email ||
                "Cliente"
            );

            return `
                <option value="${escapeHtml(id)}" data-cliente-id="${escapeHtml(id)}" data-cliente-nombre="${escapeHtml(nombre)}">
                    ${escapeHtml(nombre)}
                </option>
            `;
        }).join("")}
    `;

    if (selectAgregar) selectAgregar.innerHTML = opciones;
    if (selectEditar) selectEditar.innerHTML = opciones;
}
function fillAreaSelects() {
    const selectAgregar = document.getElementById("areaAsignada");
    const selectEditar = document.getElementById("editarAreaAsignada");

    const opciones = `
        <option value="">Seleccione un área</option>
        ${areasCache.map((area) => {
            const id = area.id || area.areaId || "";
            const nombre = area.nombre || area.name || area.areaName || "Área";

            return `<option value="${escapeHtml(id)}">${escapeHtml(nombre)}</option>`;
        }).join("")}
    `;

    if (selectAgregar) selectAgregar.innerHTML = opciones;
    if (selectEditar) selectEditar.innerHTML = opciones;
}

function findTicketById(id) {
    return ticketsCache.find((ticket) => String(ticket.id) === String(id)) || null;
}

function openTicketModal() {
    resetTicketForm();
    setUsuarioIdActual();

    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();

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
    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();
    fillEditTicketForm(ticket);

    if (modalEditarTicket) {
        modalEditarTicket.show();
    }
}

function fillEditTicketFile(ticket) {
    const archivoDisponible = document.getElementById(
        "editarArchivoDisponible"
    );

    const archivoSinAdjunto = document.getElementById(
        "editarArchivoSinAdjunto"
    );

    const archivoNombre = document.getElementById(
        "editarArchivoActualNombre"
    );

    const archivoTipo = document.getElementById(
        "editarArchivoActualTipo"
    );

    const archivoEnlace = document.getElementById(
        "editarArchivoActualEnlace"
    );

    const archivoInput = document.getElementById(
        "editarArchivoAdjunto"
    );

    if (archivoInput) {
        archivoInput.value = "";
        archivoInput.classList.remove("is-invalid");
    }

    const archivo = getTicketFile(ticket);

    if (!archivo || !archivo.enlace) {
        archivoDisponible?.classList.add("d-none");
        archivoSinAdjunto?.classList.remove("d-none");

        if (archivoEnlace) {
            archivoEnlace.removeAttribute("href");
        }

        return;
    }

    archivoDisponible?.classList.remove("d-none");
    archivoSinAdjunto?.classList.add("d-none");

    if (archivoNombre) {
        archivoNombre.textContent = archivo.nombre;
    }

    if (archivoTipo) {
        archivoTipo.textContent = archivo.tipo;
    }

    if (archivoEnlace) {
        archivoEnlace.href = archivo.enlace;
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

    setTextValue("verCliente", ticket.clienteNombre || "No asignado");
    setTextValue("verArea", ticket.areaName || ticket.areaNombre || "No asignada");
    setTextValue("verEmpleadoAsignado", getEmployeeName(ticket));
    setTextValue("verPrioridad", capitalizeText(ticket.prioridad || "media"));
    setTextValue("verVencimiento", formatDate(ticket.expirationDate || ticket.fechaVencimiento));
    setTextValue("verCreadoPor", ticket.usuarioNombre || "Usuario");
    setTextValue("verFechaCreacion", formatDateTime(ticket.createdAt));
    setTextValue("verFechaActualizacion", formatDateTime(ticket.updatedAt));
    fillViewTicketFile(ticket);
}

function fillEditTicketForm(ticket) {
    const idInput = document.getElementById("editarTicketId");
    const numeroInput = document.getElementById("editarNumeroTicket");
    const estadoInput = document.getElementById("editarEstado");
    const tituloInput = document.getElementById("editarTitulo");
    const descripcionInput = document.getElementById("editarDescripcion");
    const clienteInput = document.getElementById("editarClienteAsignado");
    const areaInput = document.getElementById("editarAreaAsignada");
    const empleadoInput = document.getElementById("editarEmpleadoAsignado");
    const prioridadInput = document.getElementById("editarPrioridad");
    const fechaInput = document.getElementById("editarFechaVencimiento");

    if (idInput) idInput.value = ticket.id || "";
    if (numeroInput) numeroInput.value = ticket.numeroTicket || "";

    if (estadoInput) {
        estadoInput.value = ticket.isCompleted ? "completado" : "abierto";
    }

    if (tituloInput) tituloInput.value = ticket.titulo || "";
    if (descripcionInput) descripcionInput.value = ticket.descripcion || "";
    if (clienteInput) clienteInput.value = ticket.clienteId || "";
    if (areaInput) areaInput.value = ticket.areaId || "";
    if (empleadoInput) empleadoInput.value = ticket.empleadoId || ticket.employeeId || "";
    if (prioridadInput) prioridadInput.value = ticket.prioridad || "media";

    if (fechaInput) {
        fechaInput.value = formatDateForInput(ticket.expirationDate || ticket.fechaVencimiento);
    }
    fillEditTicketFile(ticket);

    hideEditFormAlert();

    const form = document.getElementById("formEditarTicket");

    if (form) {
        form.classList.remove("was-validated");
    }
}

function resetTicketForm() {
    const form = document.getElementById("formAgregarTicket");
    const alerta = document.getElementById("alertaFormularioTicket");
    const archivoInput = document.getElementById("archivoAdjunto");

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    if (archivoInput) {
        archivoInput.value = "";
        archivoInput.classList.remove("is-invalid");
    }

    if (alerta) {
        alerta.classList.add("d-none");
        alerta.textContent = "";
    }

    setSelectValue("empleadoAsignado", "");
    setSelectValue("clienteAsignado", "");
    setSelectValue("areaAsignada", "");

    setUsuarioIdActual();
}

function resetEditTicketForm() {
    const form = document.getElementById("formEditarTicket");

    const alerta = document.getElementById(
        "alertaFormularioEditarTicket"
    );

    const archivoInput = document.getElementById(
        "editarArchivoAdjunto"
    );

    const archivoDisponible = document.getElementById(
        "editarArchivoDisponible"
    );

    const archivoSinAdjunto = document.getElementById(
        "editarArchivoSinAdjunto"
    );

    const enlaceArchivo = document.getElementById(
        "editarArchivoActualEnlace"
    );

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    if (archivoInput) {
        archivoInput.value = "";
        archivoInput.classList.remove("is-invalid");
    }

    if (archivoDisponible) {
        archivoDisponible.classList.add("d-none");
    }

    if (archivoSinAdjunto) {
        archivoSinAdjunto.classList.remove("d-none");
    }

    if (enlaceArchivo) {
        enlaceArchivo.removeAttribute("href");
    }

    if (alerta) {
        alerta.classList.add("d-none");
        alerta.textContent = "";
    }

    setSelectValue("editarEmpleadoAsignado", "");
    setSelectValue("editarClienteAsignado", "");
    setSelectValue("editarAreaAsignada", "");
}

function getTicketFile(ticket) {
    if (!ticket) return null;

    const archivo =
        ticket.archivoAdjunto ||
        ticket.archivo ||
        ticket.attachment ||
        ticket.file ||
        null;

    if (!archivo) {
        return null;
    }

    if (typeof archivo === "string") {
        return {
            id: "",
            nombre: "Archivo adjunto",
            tipo: "",
            enlace: archivo
        };
    }

    return {
        id:
            archivo.id ||
            archivo.fileId ||
            archivo.googleDriveId ||
            "",

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
            "Archivo de Google Drive",

        enlace:
            archivo.webViewLink ||
            archivo.enlaceVisualizacion ||
            archivo.url ||
            archivo.link ||
            ""
    };
}

function fillViewTicketFile(ticket) {
    const archivoDisponible = document.getElementById(
        "verArchivoDisponible"
    );

    const archivoSinAdjunto = document.getElementById(
        "verArchivoSinAdjunto"
    );

    const archivoNombre = document.getElementById(
        "verArchivoNombre"
    );

    const archivoTipo = document.getElementById(
        "verArchivoTipo"
    );

    const archivoEnlace = document.getElementById(
        "verArchivoEnlace"
    );

    const archivo = getTicketFile(ticket);

    if (!archivo || !archivo.enlace) {
        archivoDisponible?.classList.add("d-none");
        archivoSinAdjunto?.classList.remove("d-none");

        if (archivoEnlace) {
            archivoEnlace.removeAttribute("href");
        }

        return;
    }

    archivoDisponible?.classList.remove("d-none");
    archivoSinAdjunto?.classList.add("d-none");

    if (archivoNombre) {
        archivoNombre.textContent = archivo.nombre;
    }

    if (archivoTipo) {
        archivoTipo.textContent = archivo.tipo;
    }

    if (archivoEnlace) {
        archivoEnlace.href = archivo.enlace;
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
    const archivoInput = document.getElementById("archivoAdjunto");

    if (!form || !btnGuardar) return;

    hideFormAlert();
    const payload = buildTicketPayload();
    const archivo = archivoInput?.files?.[0] || null;

    if (!payload.titulo) {
        form.classList.add("was-validated");
        showFormAlert("Debe ingresar el título del ticket.");
        return;
    }

    if (!payload.clienteId) {
        showFormAlert("Debe seleccionar un cliente.");
        return;
    }

    if (!payload.areaId) {
        showFormAlert("Debe seleccionar un área.");
        return;
    }

    if (!payload.empleadoId) {
        showFormAlert("Debe asignar un empleado.");
        return;
    }

    const validacionArchivo = validateTicketFile(archivo);

    if (!validacionArchivo.valido) {
        archivoInput?.classList.add("is-invalid");
        showFormAlert(validacionArchivo.mensaje);
        return;
    }

    archivoInput?.classList.remove("is-invalid");

    try {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin me-2"></i>
            Guardando...
        `;

        const formData = new FormData();

        Object.entries(payload).forEach(([clave, valor]) => {
            if (valor !== null && valor !== undefined) {
                formData.append(clave, String(valor));
            }
        });

        if (archivo) {
            formData.append("archivo", archivo);
        }

        const response = await fetch(TICKETS_URL, {
            method: "POST",
            body: formData
        });

        const contentType = response.headers.get("content-type") || "";

        const data = contentType.includes("application/json")
            ? await response.json()
            : {
                ok: false,
                mensaje: await response.text()
            };

        if (!response.ok || !data.ok) {
            throw new Error(
                data.mensaje || "No fue posible crear el ticket."
            );
        }

        if (modalAgregarTicket) {
            modalAgregarTicket.hide();
        }

        await loadTickets();

        Swal.fire({
            icon: "success",
            title: "Ticket creado",
            text: archivo
                ? "El ticket y su archivo fueron guardados correctamente."
                : "El ticket fue creado correctamente."
        });
    } catch (error) {
        console.error("Error creando ticket:", error);

        showFormAlert(
            error.message || "No fue posible crear el ticket."
        );
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `
            <i class="fa-solid fa-floppy-disk me-2"></i>
            Guardar Ticket
        `;
    }
}

async function submitEditTicketForm() {
    const form = document.getElementById("formEditarTicket");
    const btnActualizar = document.getElementById("btnActualizarTicket");
    const ticketId = document.getElementById("editarTicketId")?.value || "";
    const archivoInput = document.getElementById("editarArchivoAdjunto");

    const archivo = archivoInput?.files?.[0] || null;
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
    if (!payload.clienteId) {
    showEditFormAlert("Debe seleccionar un cliente.");
    return;
    }

    if (!payload.areaId) {
        showEditFormAlert("Debe seleccionar un área.");
        return;
    }

    if (!payload.empleadoId) {
        showEditFormAlert("Debe asignar un empleado.");
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

        const validacionArchivo = validateTicketFile(archivo);

        if (!validacionArchivo.valido) {
            archivoInput?.classList.add("is-invalid");
            showEditFormAlert(validacionArchivo.mensaje);
            return;
        }

        archivoInput?.classList.remove("is-invalid");

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

    const usuarioId =
        document.getElementById("usuarioId")?.value.trim() || "";

    const titulo =
        document.getElementById("titulo")?.value.trim() || "";

    const descripcion =
        document.getElementById("descripcion")?.value.trim() || "";

    const prioridad =
        document.getElementById("prioridad")?.value || "media";

    const fechaVencimiento =
        document.getElementById("fechaVencimiento")?.value || "";

    const empleadoSelect =
        document.getElementById("empleadoAsignado");

    const empleadoId =
        empleadoSelect?.value.trim() || "";

    const clienteSelect =
        document.getElementById("clienteAsignado");

    const clienteOption =
        clienteSelect?.options?.[clienteSelect.selectedIndex];

    const clienteId =
        clienteSelect?.value.trim() ||
        clienteOption?.dataset?.clienteId ||
        "";

    const clienteNombre =
        clienteOption?.dataset?.clienteNombre ||
        getClientNameById(clienteId);

    const areaSelect =
        document.getElementById("areaAsignada");

    const areaId =
        areaSelect?.value.trim() || "";

    return {
        usuarioId,
        usuarioNombre:
            usuario?.nombre ||
            usuario?.correo ||
            "Usuario",

        titulo,
        descripcion,
        prioridad,
        fechaVencimiento,

        empleadoId,
        empleadoNombre: getEmployeeNameById(empleadoId),

        clienteId,
        clienteNombre,

        areaId,
        areaName: getAreaNameById(areaId)
    };
}

function buildEditTicketPayload() {
    const empleadoId = document.getElementById("editarEmpleadoAsignado")?.value.trim() || "";
    const clienteId = document.getElementById("editarClienteAsignado")?.value.trim() || "";
    const areaId = document.getElementById("editarAreaAsignada")?.value.trim() || "";

    return {
        titulo: document.getElementById("editarTitulo")?.value.trim() || "",
        descripcion: document.getElementById("editarDescripcion")?.value.trim() || "",
        prioridad: document.getElementById("editarPrioridad")?.value || "media",
        estado: document.getElementById("editarEstado")?.value || "abierto",
        fechaVencimiento: document.getElementById("editarFechaVencimiento")?.value || null,
        empleadoId,
        empleadoNombre: getEmployeeNameById(empleadoId),
        clienteId,
        clienteNombre: getClientNameById(clienteId),
        areaId,
        areaName: getAreaNameById(areaId)
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
            <td>${escapeHtml(ticket.areaName || ticket.areaNombre || "No asignada")}</td>
            <td>${escapeHtml(getEmployeeName(ticket))}</td>
            <td>${renderEstado(ticket)}</td>
            <td>${renderPrioridad(ticket.prioridad)}</td>
            <td>${formatDate(ticket.expirationDate || ticket.fechaVencimiento)}</td>
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

function getEmployeeName(ticket) {
    if (ticket.empleadoNombre) return ticket.empleadoNombre;
    if (ticket.employeeName) return ticket.employeeName;

    const empleadoId =
        ticket.empleadoId ||
        ticket.employeeId ||
        ticket.assignedEmployeeId ||
        "";

    if (!empleadoId) return "No asignado";

    return getEmployeeNameById(empleadoId);
}

function getEmployeeNameById(empleadoId) {
    if (!empleadoId) return "No asignado";

    const empleado = empleadosCache.find((item) => {
        const id = item.id || item.employeeId || "";
        return String(id) === String(empleadoId);
    });

    if (!empleado) return "No asignado";

    return empleado.nombre || empleado.name || empleado.correo || empleado.email || "Empleado";
}

function getClientNameById(clienteId) {
    if (!clienteId) return "No asignado";

    const cliente = clientesCache.find((item) => {
        const id = String(
            item._cliente_id ||
            item.id ||
            item.clienteId ||
            item.clientId ||
            ""
        );

        return id === String(clienteId);
    });

    if (!cliente) return "No asignado";

    return (
        cliente.nombre ||
        cliente.name ||
        cliente.clienteNombre ||
        cliente.email ||
        "Cliente"
    );
}
function getAreaNameById(areaId) {
    if (!areaId) return "No asignada";

    const area = areasCache.find((item) => {
        const id = item.id || item.areaId || "";
        return String(id) === String(areaId);
    });

    if (!area) return "No asignada";

    return area.nombre || area.name || area.areaName || "Área";
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

function setSelectValue(id, value) {
    const element = document.getElementById(id);

    if (!element) return;

    element.value = value || "";
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

function validateTicketFile(archivo) {
    if (!archivo) {
        return {
            valido: true,
            mensaje: ""
        };
    }

    if (archivo.size > MAX_FILE_SIZE) {
        return {
            valido: false,
            mensaje: "El archivo no puede superar los 10 MB."
        };
    }

    if (!ALLOWED_FILE_TYPES.includes(archivo.type)) {
        return {
            valido: false,
            mensaje: "El formato del archivo seleccionado no está permitido."
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}