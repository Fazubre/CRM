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
const MAX_FOLDER_FILES = 100;
const MAX_FOLDER_TOTAL_SIZE = 100 * 1024 * 1024;

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

const ALLOWED_FILE_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt"
];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadModalsHtml();

        initializeModals();
        loadUserData();
        setupEvents();
        setupFormChangeEvents();
        setupAttachmentExclusivity();

        await Promise.all([
            loadEmployees(),
            loadClients(),
            loadAreas()
        ]);

        await loadTickets();
    } catch (error) {
        console.error(
            "Error inicializando la vista de tickets:",
            error
        );

        Swal.fire({
            icon: "error",
            title: "Error inicial",
            text:
                error.message ||
                "No fue posible cargar la pantalla de tickets."
        });
    }
});

async function loadModalsHtml() {
    const modales = [
        {
            contenedorId: "contenedorModalTicket",
            ruta:
                "./components/Tickets/modal-add-ticket.html"
        },
        {
            contenedorId: "contenedorModalVerTicket",
            ruta:
                "./components/Tickets/modal-view-ticket.html"
        },
        {
            contenedorId: "contenedorModalEditarTicket",
            ruta:
                "./components/Tickets/modal-edit-ticket.html"
        }
    ];

    for (const modal of modales) {
        const contenedor = document.getElementById(
            modal.contenedorId
        );

        if (!contenedor) {
            throw new Error(
                `No existe el contenedor ${modal.contenedorId}.`
            );
        }

        const response = await fetch(modal.ruta);

        if (!response.ok) {
            throw new Error(
                `No fue posible cargar ${modal.ruta}.`
            );
        }

        contenedor.innerHTML = await response.text();
    }
}

function initializeModals() {
    const modalAgregarElement =
        document.getElementById("modalAgregarTicket");

    const modalVerElement =
        document.getElementById("modalVerTicket");

    const modalEditarElement =
        document.getElementById("modalEditarTicket");

    if (modalAgregarElement) {
        modalAgregarTicket =
            new bootstrap.Modal(modalAgregarElement);

        modalAgregarElement.addEventListener(
            "hidden.bs.modal",
            resetTicketForm
        );
    }

    if (modalVerElement) {
        modalVerTicket =
            new bootstrap.Modal(modalVerElement);
    }

    if (modalEditarElement) {
        modalEditarTicket =
            new bootstrap.Modal(modalEditarElement);

        modalEditarElement.addEventListener(
            "hidden.bs.modal",
            resetEditTicketForm
        );
    }
}

function loadUserData() {
    const nombreUsuario =
        document.getElementById("nombreUsuario");

    const usuario = getUsuarioActual();

    if (!nombreUsuario) {
        return;
    }

    nombreUsuario.textContent =
        usuario?.nombre ||
        usuario?.correo ||
        "Usuario";
}

function setupEvents() {
    document
        .getElementById("btnNuevoTicket")
        ?.addEventListener(
            "click",
            openTicketModal
        );

    document
        .getElementById("btnRecargarTickets")
        ?.addEventListener(
            "click",
            async () => {
                await Promise.all([
                    loadEmployees(),
                    loadClients(),
                    loadAreas()
                ]);

                await loadTickets();
            }
        );

    document
        .getElementById("formAgregarTicket")
        ?.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();

                await submitTicketForm();
            }
        );

    document
        .getElementById("formEditarTicket")
        ?.addEventListener(
            "submit",
            async (event) => {
                event.preventDefault();

                await submitEditTicketForm();
            }
        );

    $(document).on(
        "click",
        ".btn-ver-ticket",
        function () {
            const ticket = findTicketById(
                $(this).data("id")
            );

            if (!ticket) {
                showTicketNotFound();
                return;
            }

            openViewTicketModal(ticket);
        }
    );

    $(document).on(
        "click",
        ".btn-editar-ticket",
        function () {
            const ticket = findTicketById(
                $(this).data("id")
            );

            if (!ticket) {
                showTicketNotFound();
                return;
            }

            openEditTicketModal(ticket);
        }
    );

    $(document).on(
        "click",
        ".btn-eliminar-ticket",
        async function () {
            const ticket = findTicketById(
                $(this).data("id")
            );

            if (!ticket) {
                showTicketNotFound();
                return;
            }

            await deleteTicket(ticket);
        }
    );
}

function showTicketNotFound() {
    Swal.fire({
        icon: "warning",
        title: "Ticket no encontrado",
        text:
            "No fue posible encontrar el ticket seleccionado."
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
        "carpetaAdjunta",

        "editarTitulo",
        "editarClienteAsignado",
        "editarAreaAsignada",
        "editarEmpleadoAsignado",
        "editarFechaVencimiento",
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    ];

    campos.forEach((id) => {
        const campo =
            document.getElementById(id);

        if (!campo) {
            return;
        }

        const limpiarValidacion = () => {
            hideFormAlert();
            hideEditFormAlert();

            campo.classList.remove(
                "is-invalid"
            );
        };

        campo.addEventListener(
            "input",
            limpiarValidacion
        );

        campo.addEventListener(
            "change",
            limpiarValidacion
        );
    });
}

function setupAttachmentExclusivity() {
    setupAttachmentPair(
        "archivoAdjunto",
        "carpetaAdjunta"
    );

    setupAttachmentPair(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );
}

function setupAttachmentPair(
    archivoInputId,
    carpetaInputId
) {
    const archivoInput =
        document.getElementById(
            archivoInputId
        );

    const carpetaInput =
        document.getElementById(
            carpetaInputId
        );

    archivoInput?.addEventListener(
        "change",
        () => {
            if (
                archivoInput.files?.length &&
                carpetaInput
            ) {
                carpetaInput.value = "";

                carpetaInput.classList.remove(
                    "is-invalid"
                );
            }
        }
    );

    carpetaInput?.addEventListener(
        "change",
        () => {
            if (
                carpetaInput.files?.length &&
                archivoInput
            ) {
                archivoInput.value = "";

                archivoInput.classList.remove(
                    "is-invalid"
                );
            }
        }
    );
}

async function fetchCollection(
    url,
    keys,
    errorMessage
) {
    const response = await fetch(url);

    const data =
        await readResponseData(response);

    if (!response.ok || !data.ok) {
        throw new Error(
            data.mensaje ||
            errorMessage
        );
    }

    for (const key of keys) {
        if (Array.isArray(data[key])) {
            return data[key];
        }
    }

    return [];
}

async function loadEmployees() {
    try {
        empleadosCache =
            await fetchCollection(
                EMPLEADOS_URL,
                [
                    "employees",
                    "empleados"
                ],
                "No fue posible obtener los empleados."
            );
    } catch (error) {
        console.error(
            "Error cargando empleados:",
            error
        );

        empleadosCache = [];
    }

    fillEmployeeSelects();
}

async function loadClients() {
    try {
        clientesCache =
            await fetchCollection(
                CLIENTES_URL,
                [
                    "clients",
                    "clientes"
                ],
                "No fue posible obtener los clientes."
            );
    } catch (error) {
        console.error(
            "Error cargando clientes:",
            error
        );

        clientesCache = [];
    }

    fillClientSelects();
}

async function loadAreas() {
    try {
        areasCache =
            await fetchCollection(
                AREAS_URL,
                [
                    "areas",
                    "areasData"
                ],
                "No fue posible obtener las áreas."
            );
    } catch (error) {
        console.error(
            "Error cargando áreas:",
            error
        );

        areasCache = [];
    }

    fillAreaSelects();
}

function fillEmployeeSelects() {
    const opciones = `
        <option value="">
            Seleccione un empleado
        </option>

        ${empleadosCache
            .map((empleado) => {
                const id =
                    empleado.id ||
                    empleado.employeeId ||
                    "";

                const nombre =
                    empleado.nombre ||
                    empleado.name ||
                    empleado.correo ||
                    empleado.email ||
                    "Empleado";

                return `
                    <option
                        value="${escapeHtml(id)}"
                    >
                        ${escapeHtml(nombre)}
                    </option>
                `;
            })
            .join("")}
    `;

    setSelectOptions(
        "empleadoAsignado",
        opciones
    );

    setSelectOptions(
        "editarEmpleadoAsignado",
        opciones
    );
}

function fillClientSelects() {
    const opciones = `
        <option value="">
            Seleccione un cliente
        </option>

        ${clientesCache
            .map((cliente) => {
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
                    <option
                        value="${escapeHtml(id)}"
                        data-cliente-id="${escapeHtml(id)}"
                        data-cliente-nombre="${escapeHtml(nombre)}"
                    >
                        ${escapeHtml(nombre)}
                    </option>
                `;
            })
            .join("")}
    `;

    setSelectOptions(
        "clienteAsignado",
        opciones
    );

    setSelectOptions(
        "editarClienteAsignado",
        opciones
    );
}

function fillAreaSelects() {
    const opciones = `
        <option value="">
            Seleccione un área
        </option>

        ${areasCache
            .map((area) => {
                const id =
                    area.id ||
                    area.areaId ||
                    "";

                const nombre =
                    area.nombre ||
                    area.name ||
                    area.areaName ||
                    "Área";

                return `
                    <option
                        value="${escapeHtml(id)}"
                    >
                        ${escapeHtml(nombre)}
                    </option>
                `;
            })
            .join("")}
    `;

    setSelectOptions(
        "areaAsignada",
        opciones
    );

    setSelectOptions(
        "editarAreaAsignada",
        opciones
    );
}

function setSelectOptions(
    id,
    html
) {
    const select =
        document.getElementById(id);

    if (select) {
        select.innerHTML = html;
    }
}

function findTicketById(id) {
    return (
        ticketsCache.find(
            (ticket) =>
                String(ticket.id) ===
                String(id)
        ) ||
        null
    );
}

function openTicketModal() {
    resetTicketForm();

    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();

    modalAgregarTicket?.show();
}

function openViewTicketModal(ticket) {
    fillViewTicketModal(ticket);

    modalVerTicket?.show();
}

function openEditTicketModal(ticket) {
    fillEmployeeSelects();
    fillClientSelects();
    fillAreaSelects();

    fillEditTicketForm(ticket);

    modalEditarTicket?.show();
}

function fillViewTicketModal(ticket) {
    setTextValue(
        "verNumeroTicket",
        ticket.numeroTicket || "-"
    );

    setTextValue(
        "verEstado",
        ticket.estadoNombre ||
        (
            ticket.isCompleted
                ? "Completado"
                : "Abierto"
        )
    );

    setTextValue(
        "verTitulo",
        ticket.titulo || "-"
    );

    setTextValue(
        "verCliente",
        ticket.clienteNombre ||
        "No asignado"
    );

    setTextValue(
        "verArea",
        ticket.areaName ||
        ticket.areaNombre ||
        "No asignada"
    );

    setTextValue(
        "verEmpleadoAsignado",
        getEmployeeName(ticket)
    );

    setTextValue(
        "verPrioridad",
        capitalizeText(
            ticket.prioridad ||
            "media"
        )
    );

    setTextValue(
        "verVencimiento",
        formatDate(
            ticket.expirationDate ||
            ticket.fechaVencimiento
        )
    );

    setTextValue(
        "verCreadoPor",
        ticket.usuarioNombre ||
        "Usuario"
    );

    setTextValue(
        "verFechaCreacion",
        formatDateTime(
            ticket.createdAt
        )
    );

    setTextValue(
        "verFechaActualizacion",
        formatDateTime(
            ticket.updatedAt
        )
    );

    const descripcion =
        document.getElementById(
            "verDescripcion"
        );

    if (descripcion) {
        descripcion.value =
            ticket.descripcion ||
            "Sin descripción";
    }

    fillViewTicketFile(ticket);
}

function fillEditTicketForm(ticket) {
    setInputValue(
        "editarTicketId",
        ticket.id || ""
    );

    setInputValue(
        "editarNumeroTicket",
        ticket.numeroTicket || ""
    );

    setInputValue(
        "editarEstado",
        ticket.isCompleted
            ? "completado"
            : "abierto"
    );

    setInputValue(
        "editarTitulo",
        ticket.titulo || ""
    );

    setInputValue(
        "editarDescripcion",
        ticket.descripcion || ""
    );

    setInputValue(
        "editarClienteAsignado",
        ticket.clienteId || ""
    );

    setInputValue(
        "editarAreaAsignada",
        ticket.areaId || ""
    );

    setInputValue(
        "editarEmpleadoAsignado",
        ticket.empleadoId ||
        ticket.employeeId ||
        ""
    );

    setInputValue(
        "editarPrioridad",
        ticket.prioridad ||
        "media"
    );

    setInputValue(
        "editarFechaVencimiento",
        formatDateForInput(
            ticket.expirationDate ||
            ticket.fechaVencimiento
        )
    );

    fillEditTicketFile(ticket);
    hideEditFormAlert();

    document
        .getElementById(
            "formEditarTicket"
        )
        ?.classList.remove(
            "was-validated"
        );
}

function fillViewTicketFile(ticket) {
    fillAttachmentDisplay({
        ticket,
        disponibleId:
            "verArchivoDisponible",
        sinAdjuntoId:
            "verArchivoSinAdjunto",
        nombreId:
            "verArchivoNombre",
        tipoId:
            "verArchivoTipo",
        enlaceId:
            "verArchivoEnlace"
    });
}

function fillEditTicketFile(ticket) {
    clearAttachmentInputs(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );

    fillAttachmentDisplay({
        ticket,
        disponibleId:
            "editarArchivoDisponible",
        sinAdjuntoId:
            "editarArchivoSinAdjunto",
        nombreId:
            "editarArchivoActualNombre",
        tipoId:
            "editarArchivoActualTipo",
        enlaceId:
            "editarArchivoActualEnlace"
    });
}

function fillAttachmentDisplay({
    ticket,
    disponibleId,
    sinAdjuntoId,
    nombreId,
    tipoId,
    enlaceId
}) {
    const disponible =
        document.getElementById(
            disponibleId
        );

    const sinAdjunto =
        document.getElementById(
            sinAdjuntoId
        );

    const nombre =
        document.getElementById(
            nombreId
        );

    const tipo =
        document.getElementById(
            tipoId
        );

    const enlace =
        document.getElementById(
            enlaceId
        );

    const adjunto =
        getTicketAttachment(ticket);

    if (!adjunto?.enlace) {
        disponible?.classList.add(
            "d-none"
        );

        sinAdjunto?.classList.remove(
            "d-none"
        );

        enlace?.removeAttribute(
            "href"
        );

        return;
    }

    disponible?.classList.remove(
        "d-none"
    );

    sinAdjunto?.classList.add(
        "d-none"
    );

    if (nombre) {
        nombre.textContent =
            adjunto.nombre;
    }

    if (tipo) {
        tipo.textContent =
            getAttachmentDescription(
                adjunto
            );
    }

    if (enlace) {
        enlace.href =
            adjunto.enlace;

        enlace.target =
            "_blank";

        enlace.rel =
            "noopener noreferrer";

        enlace.innerHTML =
            adjunto.tipoAdjunto ===
            "carpeta"
                ? `
                    <i class="fa-solid fa-folder-open me-2"></i>
                    Abrir carpeta
                `
                : `
                    <i class="fa-solid fa-eye me-2"></i>
                    Ver archivo
                `;
    }
}

function resetTicketForm() {
    const form =
        document.getElementById(
            "formAgregarTicket"
        );

    form?.reset();

    form?.classList.remove(
        "was-validated"
    );

    clearAttachmentInputs(
        "archivoAdjunto",
        "carpetaAdjunta"
    );

    hideFormAlert();

    setSelectValue(
        "empleadoAsignado",
        ""
    );

    setSelectValue(
        "clienteAsignado",
        ""
    );

    setSelectValue(
        "areaAsignada",
        ""
    );

    setUsuarioIdActual();
}

function resetEditTicketForm() {
    const form =
        document.getElementById(
            "formEditarTicket"
        );

    form?.reset();

    form?.classList.remove(
        "was-validated"
    );

    clearAttachmentInputs(
        "editarArchivoAdjunto",
        "editarCarpetaAdjunta"
    );

    hideEditFormAlert();

    document
        .getElementById(
            "editarArchivoDisponible"
        )
        ?.classList.add(
            "d-none"
        );

    document
        .getElementById(
            "editarArchivoSinAdjunto"
        )
        ?.classList.remove(
            "d-none"
        );

    document
        .getElementById(
            "editarArchivoActualEnlace"
        )
        ?.removeAttribute(
            "href"
        );

    setSelectValue(
        "editarEmpleadoAsignado",
        ""
    );

    setSelectValue(
        "editarClienteAsignado",
        ""
    );

    setSelectValue(
        "editarAreaAsignada",
        ""
    );
}

function clearAttachmentInputs(
    archivoInputId,
    carpetaInputId
) {
    [
        archivoInputId,
        carpetaInputId
    ].forEach((id) => {
        const input =
            document.getElementById(id);

        if (input) {
            input.value = "";

            input.classList.remove(
                "is-invalid"
            );
        }
    });
}

function getTicketAttachment(ticket) {
    if (!ticket) {
        return null;
    }

    const adjunto =
        ticket.archivoAdjunto ||
        ticket.archivo ||
        ticket.attachment ||
        ticket.file ||
        null;

    if (!adjunto) {
        return null;
    }

    if (
        typeof adjunto ===
        "string"
    ) {
        return {
            id: "",
            tipoAdjunto:
                "archivo",
            nombre:
                "Archivo adjunto",
            tipo: "",
            cantidadArchivos: 0,
            tamano: 0,
            enlace:
                adjunto
        };
    }

    const tipo =
        adjunto.tipo ||
        adjunto.mimeType ||
        adjunto.mimetype ||
        "";

    return {
        id:
            adjunto.id ||
            adjunto.fileId ||
            adjunto.googleDriveId ||
            "",

        tipoAdjunto:
            adjunto.tipoAdjunto ||
            (
                tipo ===
                "application/vnd.google-apps.folder"
                    ? "carpeta"
                    : "archivo"
            ),

        nombre:
            adjunto.nombre ||
            adjunto.name ||
            adjunto.originalName ||
            adjunto.originalname ||
            "Adjunto",

        tipo,

        cantidadArchivos:
            Number(
                adjunto.cantidadArchivos ||
                0
            ),

        tamano:
            Number(
                adjunto.tamano ||
                adjunto.size ||
                0
            ),

        enlace:
            adjunto.webViewLink ||
            adjunto.enlaceVisualizacion ||
            adjunto.url ||
            adjunto.link ||
            adjunto.enlace ||
            ""
    };
}

function getAttachmentDescription(
    adjunto
) {
    if (!adjunto) {
        return "Sin adjunto";
    }

    if (
        adjunto.tipoAdjunto ===
        "carpeta"
    ) {
        const cantidad =
            adjunto.cantidadArchivos ||
            0;

        return cantidad > 0
            ? `Carpeta de Google Drive · ${cantidad} archivo${cantidad === 1 ? "" : "s"}`
            : "Carpeta de Google Drive";
    }

    return (
        adjunto.tipo ||
        "Archivo de Google Drive"
    );
}

function setUsuarioIdActual() {
    const inputUsuarioId =
        document.getElementById(
            "usuarioId"
        );

    if (inputUsuarioId) {
        inputUsuarioId.value =
            getUsuarioIdActual();
    }
}

function getUsuarioActual() {
    const usuarioGuardado =
        localStorage.getItem(
            "usuarioCRM"
        );

    if (!usuarioGuardado) {
        return null;
    }

    try {
        return JSON.parse(
            usuarioGuardado
        );
    } catch (error) {
        console.error(
            "Error obteniendo usuario actual:",
            error
        );

        return null;
    }
}

function getUsuarioIdActual() {
    const usuario =
        getUsuarioActual();

    return (
        usuario?.id ||
        usuario?.usuarioId ||
        usuario?.google_id ||
        ""
    );
}

function getRolUsuarioActual() {
    const usuario = getUsuarioActual();

    if (!usuario) {
        return "";
    }

    if (Array.isArray(usuario.roles)) {
        const rolAdmin = usuario.roles
            .map((rol) => String(rol || "").trim().toLowerCase())
            .find((rol) => rol === "admin");

        return rolAdmin || "";
    }

    return String(
        usuario.rol ||
        usuario.role ||
        usuario.tipoRol ||
        usuario.tipo_usuario ||
        ""
    )
        .trim()
        .toLowerCase();
}

function checkUsuarioAdmin() {
    return getRolUsuarioActual() === "admin";
}

async function submitTicketForm() {
    const form =
        document.getElementById(
            "formAgregarTicket"
        );

    const btnGuardar =
        document.getElementById(
            "btnGuardarTicket"
        );

    if (!form || !btnGuardar) {
        return;
    }

    hideFormAlert();

    const payload =
        buildTicketPayload();

    const seleccionAdjunto =
        getAttachmentSelection(
            "archivoAdjunto",
            "carpetaAdjunta"
        );

    const mensajeValidacion =
        validateTicketPayload(
            payload
        );

    if (mensajeValidacion) {
        form.classList.add(
            "was-validated"
        );

        showFormAlert(
            mensajeValidacion
        );

        return;
    }

    const validacionAdjunto =
        validateAttachmentSelection(
            seleccionAdjunto
        );

    if (!validacionAdjunto.valido) {
        markAttachmentInvalid(
            seleccionAdjunto,
            true
        );

        showFormAlert(
            validacionAdjunto.mensaje
        );

        return;
    }

    markAttachmentInvalid(
        seleccionAdjunto,
        false
    );

    try {
        setButtonLoading(
            btnGuardar,
            true,
            "Guardando..."
        );

        const formData =
            buildTicketFormData(
                payload,
                seleccionAdjunto
            );

        const response =
            await fetch(
                TICKETS_URL,
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await readResponseData(
                response
            );

        if (
            !response.ok ||
            !data.ok
        ) {
            throw new Error(
                data.mensaje ||
                "No fue posible crear el ticket."
            );
        }

        modalAgregarTicket?.hide();

        await loadTickets();

        Swal.fire({
            icon: "success",
            title: "Ticket creado",
            text:
                getAttachmentSuccessMessage(
                    seleccionAdjunto,
                    false
                )
        });
    } catch (error) {
        console.error(
            "Error creando ticket:",
            error
        );

        showFormAlert(
            error.message ||
            "No fue posible crear el ticket."
        );
    } finally {
        setButtonLoading(
            btnGuardar,
            false,
            "Guardar Ticket",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

async function submitEditTicketForm() {
    const form =
        document.getElementById(
            "formEditarTicket"
        );

    const btnActualizar =
        document.getElementById(
            "btnActualizarTicket"
        );

    const ticketId =
        document
            .getElementById(
                "editarTicketId"
            )
            ?.value ||
        "";

    if (!form || !btnActualizar) {
        return;
    }

    hideEditFormAlert();

    const payload =
        buildEditTicketPayload();

    const seleccionAdjunto =
        getAttachmentSelection(
            "editarArchivoAdjunto",
            "editarCarpetaAdjunta"
        );

    if (!ticketId) {
        showEditFormAlert(
            "No se encontró el id del ticket."
        );

        return;
    }

    const mensajeValidacion =
        validateTicketPayload(
            payload
        );

    if (mensajeValidacion) {
        form.classList.add(
            "was-validated"
        );

        showEditFormAlert(
            mensajeValidacion
        );

        return;
    }

    const validacionAdjunto =
        validateAttachmentSelection(
            seleccionAdjunto
        );

    if (!validacionAdjunto.valido) {
        markAttachmentInvalid(
            seleccionAdjunto,
            true
        );

        showEditFormAlert(
            validacionAdjunto.mensaje
        );

        return;
    }

    markAttachmentInvalid(
        seleccionAdjunto,
        false
    );

    try {
        setButtonLoading(
            btnActualizar,
            true,
            "Guardando..."
        );

        const formData =
            buildTicketFormData(
                payload,
                seleccionAdjunto
            );

        const response =
            await fetch(
                `${TICKETS_URL}/${encodeURIComponent(ticketId)}`,
                {
                    method: "PUT",
                    body: formData
                }
            );

        const data =
            await readResponseData(
                response
            );

        if (
            !response.ok ||
            !data.ok
        ) {
            throw new Error(
                data.mensaje ||
                "No fue posible actualizar el ticket."
            );
        }

        modalEditarTicket?.hide();

        await loadTickets();

        Swal.fire({
            icon: "success",
            title:
                "Ticket actualizado",
            text:
                getAttachmentSuccessMessage(
                    seleccionAdjunto,
                    true
                )
        });
    } catch (error) {
        console.error(
            "Error actualizando ticket:",
            error
        );

        showEditFormAlert(
            error.message ||
            "No fue posible actualizar el ticket."
        );
    } finally {
        setButtonLoading(
            btnActualizar,
            false,
            "Guardar Cambios",
            "fa-solid fa-floppy-disk me-2"
        );
    }
}

async function deleteTicket(ticket) {
    const usuario = getUsuarioActual();

    if (!checkUsuarioAdmin()) {
        Swal.fire({
            icon: "warning",
            title: "Acceso denegado",
            text: "Solo los empleados con rol admin pueden borrar tickets."
        });

        return;
    }

    const confirmacion = await Swal.fire({
        icon: "warning",
        title: "¿Borrar ticket?",
        text: `Se eliminará el ticket ${ticket.numeroTicket || ticket.id}.`,
        showCancelButton: true,
        confirmButtonText: "Sí, borrar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc3545"
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${TICKETS_URL}/${encodeURIComponent(ticket.id)}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usuarioId:
                        usuario?.id ||
                        usuario?.usuarioId ||
                        "",

                    googleId:
                        usuario?.google_id ||
                        usuario?.googleId ||
                        "",

                    correo:
                        usuario?.correo ||
                        usuario?.email ||
                        ""
                })
            }
        );

        const data = await readResponseData(
            response
        );

        if (!response.ok || !data.ok) {
            throw new Error(
                data.mensaje ||
                "No fue posible eliminar el ticket."
            );
        }

        await loadTickets();

        Swal.fire({
            icon: "success",
            title: "Ticket eliminado",
            text: "El ticket fue eliminado correctamente."
        });
    } catch (error) {
        console.error(
            "Error eliminando ticket:",
            error
        );

        Swal.fire({
            icon: "error",
            title: "Error",
            text:
                error.message ||
                "No fue posible eliminar el ticket."
        });
    }
}

function validateTicketPayload(
    payload
) {
    if (!payload.titulo) {
        return (
            "Debe ingresar el título del ticket."
        );
    }

    if (!payload.clienteId) {
        return (
            "Debe seleccionar un cliente."
        );
    }

    if (!payload.areaId) {
        return (
            "Debe seleccionar un área."
        );
    }

    if (!payload.empleadoId) {
        return (
            "Debe asignar un empleado."
        );
    }

    return "";
}

function buildTicketFormData(
    payload,
    seleccionAdjunto
) {
    const formData =
        new FormData();

    Object
        .entries(payload)
        .forEach(
            ([clave, valor]) => {
                if (
                    valor !== null &&
                    valor !== undefined
                ) {
                    formData.append(
                        clave,
                        String(valor)
                    );
                }
            }
        );

    appendAttachmentToFormData(
        formData,
        seleccionAdjunto
    );

    return formData;
}

function setButtonLoading(
    button,
    loading,
    texto,
    iconClass =
        "fa-solid fa-spinner fa-spin me-2"
) {
    button.disabled = loading;

    button.innerHTML = `
        <i class="${iconClass}"></i>
        ${texto}
    `;
}

async function readResponseData(
    response
) {
    const contentType =
        response.headers.get(
            "content-type"
        ) ||
        "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        return response.json();
    }

    return {
        ok: false,
        mensaje:
            await response.text()
    };
}

function getAttachmentSuccessMessage(
    seleccion,
    esEdicion
) {
    if (seleccion.archivo) {
        return esEdicion
            ? "El ticket y el archivo fueron actualizados correctamente."
            : "El ticket y el archivo fueron guardados correctamente.";
    }

    if (
        seleccion
            .archivosCarpeta
            .length >
        0
    ) {
        return esEdicion
            ? "El ticket y la carpeta fueron actualizados correctamente."
            : "El ticket y la carpeta fueron guardados correctamente.";
    }

    return esEdicion
        ? "Los cambios fueron guardados correctamente."
        : "El ticket fue creado correctamente.";
}

function buildTicketPayload() {
    const usuario =
        getUsuarioActual();

    const empleadoId =
        getValue(
            "empleadoAsignado"
        );

    const areaId =
        getValue(
            "areaAsignada"
        );

    const clienteSelect =
        document.getElementById(
            "clienteAsignado"
        );

    const clienteOption =
        clienteSelect
            ?.options
            ?.[
                clienteSelect
                    .selectedIndex
            ];

    const clienteId =
        clienteSelect
            ?.value
            .trim() ||
        clienteOption
            ?.dataset
            ?.clienteId ||
        "";

    return {
        usuarioId:
            getValue(
                "usuarioId"
            ),

        usuarioNombre:
            usuario?.nombre ||
            usuario?.correo ||
            "Usuario",

        titulo:
            getValue(
                "titulo"
            ),

        descripcion:
            getValue(
                "descripcion"
            ),

        prioridad:
            getValue(
                "prioridad"
            ) ||
            "media",

        fechaVencimiento:
            getValue(
                "fechaVencimiento"
            ),

        empleadoId,

        empleadoNombre:
            getEmployeeNameById(
                empleadoId
            ),

        clienteId,

        clienteNombre:
            clienteOption
                ?.dataset
                ?.clienteNombre ||
            getClientNameById(
                clienteId
            ),

        areaId,

        areaName:
            getAreaNameById(
                areaId
            )
    };
}

function buildEditTicketPayload() {
    const empleadoId =
        getValue(
            "editarEmpleadoAsignado"
        );

    const clienteId =
        getValue(
            "editarClienteAsignado"
        );

    const areaId =
        getValue(
            "editarAreaAsignada"
        );

    return {
        titulo:
            getValue(
                "editarTitulo"
            ),

        descripcion:
            getValue(
                "editarDescripcion"
            ),

        prioridad:
            getValue(
                "editarPrioridad"
            ) ||
            "media",

        estado:
            getValue(
                "editarEstado"
            ) ||
            "abierto",

        fechaVencimiento:
            getValue(
                "editarFechaVencimiento"
            ) ||
            null,

        empleadoId,

        empleadoNombre:
            getEmployeeNameById(
                empleadoId
            ),

        clienteId,

        clienteNombre:
            getClientNameById(
                clienteId
            ),

        areaId,

        areaName:
            getAreaNameById(
                areaId
            )
    };
}

function getValue(id) {
    return (
        document
            .getElementById(id)
            ?.value
            ?.trim() ||
        ""
    );
}

function showFormAlert(message) {
    showAlert(
        "alertaFormularioTicket",
        message
    );
}

function hideFormAlert() {
    hideAlert(
        "alertaFormularioTicket"
    );
}

function showEditFormAlert(message) {
    showAlert(
        "alertaFormularioEditarTicket",
        message
    );
}

function hideEditFormAlert() {
    hideAlert(
        "alertaFormularioEditarTicket"
    );
}

function showAlert(
    id,
    message
) {
    const alerta =
        document.getElementById(id);

    if (!alerta) {
        return;
    }

    alerta.textContent =
        message;

    alerta.classList.remove(
        "d-none"
    );
}

function hideAlert(id) {
    const alerta =
        document.getElementById(id);

    if (!alerta) {
        return;
    }

    alerta.textContent = "";

    alerta.classList.add(
        "d-none"
    );
}

async function loadTickets() {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    try {
        destroyDataTable();

        tbody.innerHTML = "";

        const response =
            await fetch(
                TICKETS_URL
            );

        const data =
            await readResponseData(
                response
            );

        if (
            !response.ok ||
            !data.ok
        ) {
            throw new Error(
                data.mensaje ||
                "No fue posible obtener los tickets."
            );
        }

        ticketsCache =
            Array.isArray(
                data.tickets
            )
                ? data.tickets
                : [];

        renderTickets(
            ticketsCache
        );

        mensajeTablaVacia =
            "No hay tickets registrados.";

        initDataTable();
    } catch (error) {
        console.error(
            "Error cargando tickets:",
            error
        );

        ticketsCache = [];

        destroyDataTable();

        tbody.innerHTML = "";

        mensajeTablaVacia =
            error.message ||
            "No fue posible cargar los tickets.";

        initDataTable();
    }
}

function renderTickets(tickets) {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    if (!tickets.length) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML =
        tickets
            .map(
                (ticket) => `
                    <tr>
                        <td>
                            ${escapeHtml(ticket.id || "")}
                        </td>

                        <td>
                            ${escapeHtml(ticket.numeroTicket || "")}
                        </td>

                        <td>
                            ${escapeHtml(ticket.titulo || "")}
                        </td>

                        <td>
                            ${escapeHtml(
                                ticket.clienteNombre ||
                                "No asignado"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                ticket.areaName ||
                                ticket.areaNombre ||
                                "No asignada"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                getEmployeeName(ticket)
                            )}
                        </td>

                        <td>
                            ${renderEstado(ticket)}
                        </td>

                        <td>
                            ${renderPrioridad(ticket.prioridad)}
                        </td>

                        <td>
                            ${formatDate(
                                ticket.expirationDate ||
                                ticket.fechaVencimiento
                            )}
                        </td>

                        <td>
                            ${renderAdjunto(ticket)}
                        </td>

                        <td>
                            <div
                                class="btn-group btn-group-sm"
                                role="group"
                            >
                                <button
                                    type="button"
                                    class="btn btn-outline-info btn-ver-ticket"
                                    data-id="${escapeHtml(ticket.id || "")}"
                                >
                                    Ver
                                </button>

                                <button
                                    type="button"
                                    class="btn btn-outline-warning btn-editar-ticket"
                                    data-id="${escapeHtml(ticket.id || "")}"
                                >
                                    Editar
                                </button>

                                ${renderDeleteTicketButton(ticket)}
                            </div>
                        </td>
                    </tr>
                `
            )
            .join("");
}

function renderDeleteTicketButton(ticket) {
    if (!checkUsuarioAdmin()) {
        return "";
    }

    return `
        <button
            type="button"
            class="btn btn-outline-danger btn-eliminar-ticket"
            data-id="${escapeHtml(ticket.id || "")}"
        >
            Borrar
        </button>
    `;
}

function renderAdjunto(ticket) {
    const adjunto =
        getTicketAttachment(ticket);

    if (!adjunto?.enlace) {
        return `
            <span class="text-muted">
                Sin adjunto
            </span>
        `;
    }

    const esCarpeta =
        adjunto.tipoAdjunto ===
        "carpeta";

    const icono =
        esCarpeta
            ? "fa-folder-open"
            : "fa-paperclip";

    const texto =
        esCarpeta
            ? "Abrir carpeta"
            : "Ver archivo";

    return `
        <a
            href="${escapeHtml(adjunto.enlace)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-secondary btn-sm"
        >
            <i class="fa-solid ${icono} me-1"></i>
            ${texto}
        </a>
    `;
}

function destroyDataTable() {
    if (
        $.fn.DataTable.isDataTable(
            "#tablaTickets"
        )
    ) {
        $("#tablaTickets")
            .DataTable()
            .destroy();
    }
}

function initDataTable() {
    $("#tablaTickets")
        .DataTable({
            responsive: true,
            autoWidth: false,
            pageLength: 10,

            order: [
                [
                    1,
                    "desc"
                ]
            ],

            language: {
                emptyTable:
                    mensajeTablaVacia,

                search:
                    "Buscar:",

                lengthMenu:
                    "Mostrar _MENU_ registros",

                zeroRecords:
                    "No se encontraron registros",

                info:
                    "Mostrando _START_ a _END_ de _TOTAL_ registros",

                infoEmpty:
                    "No hay registros disponibles",

                infoFiltered:
                    "(filtrado de _MAX_ registros totales)",

                paginate: {
                    previous:
                        "Anterior",

                    next:
                        "Siguiente"
                }
            }
        });
}

function renderEstado(ticket) {
    const texto =
        ticket.estadoNombre ||
        (
            ticket.isCompleted
                ? "Completado"
                : "Abierto"
        );

    const clase =
        ticket.isCompleted
            ? "bg-success"
            : "bg-warning text-dark";

    return `
        <span class="badge ${clase}">
            ${escapeHtml(texto)}
        </span>
    `;
}

function renderPrioridad(
    prioridad
) {
    const valor =
        String(
            prioridad ||
            "media"
        ).toLowerCase();

    let clase =
        "bg-secondary";

    if (valor === "baja") {
        clase =
            "bg-info text-dark";
    }

    if (valor === "media") {
        clase =
            "bg-primary";
    }

    if (valor === "alta") {
        clase =
            "bg-warning text-dark";
    }

    if (
        valor === "critica" ||
        valor === "crítica"
    ) {
        clase =
            "bg-danger";
    }

    return `
        <span
            class="badge ${clase} text-uppercase"
        >
            ${escapeHtml(valor)}
        </span>
    `;
}

function getEmployeeName(ticket) {
    if (ticket.empleadoNombre) {
        return ticket.empleadoNombre;
    }

    if (ticket.employeeName) {
        return ticket.employeeName;
    }

    const empleadoId =
        ticket.empleadoId ||
        ticket.employeeId ||
        ticket.assignedEmployeeId ||
        "";

    return empleadoId
        ? getEmployeeNameById(
            empleadoId
        )
        : "No asignado";
}

function getEmployeeNameById(
    empleadoId
) {
    if (!empleadoId) {
        return "No asignado";
    }

    const empleado =
        empleadosCache.find(
            (item) => {
                const id =
                    item.id ||
                    item.employeeId ||
                    "";

                return (
                    String(id) ===
                    String(empleadoId)
                );
            }
        );

    return (
        empleado?.nombre ||
        empleado?.name ||
        empleado?.correo ||
        empleado?.email ||
        "No asignado"
    );
}

function getClientNameById(
    clienteId
) {
    if (!clienteId) {
        return "No asignado";
    }

    const cliente =
        clientesCache.find(
            (item) => {
                const id =
                    String(
                        item._cliente_id ||
                        item.id ||
                        item.clienteId ||
                        item.clientId ||
                        ""
                    );

                return (
                    id ===
                    String(clienteId)
                );
            }
        );

    return (
        cliente?.nombre ||
        cliente?.name ||
        cliente?.clienteNombre ||
        cliente?.email ||
        "No asignado"
    );
}

function getAreaNameById(
    areaId
) {
    if (!areaId) {
        return "No asignada";
    }

    const area =
        areasCache.find(
            (item) => {
                const id =
                    item.id ||
                    item.areaId ||
                    "";

                return (
                    String(id) ===
                    String(areaId)
                );
            }
        );

    return (
        area?.nombre ||
        area?.name ||
        area?.areaName ||
        "No asignada"
    );
}

function parseDateValue(valor) {
    if (!valor) {
        return null;
    }

    let fecha;

    if (
        typeof valor ===
            "object" &&
        typeof valor.seconds ===
            "number"
    ) {
        fecha =
            new Date(
                valor.seconds *
                1000
            );
    } else if (
        typeof valor ===
            "object" &&
        typeof valor._seconds ===
            "number"
    ) {
        fecha =
            new Date(
                valor._seconds *
                1000
            );
    } else if (
        valor instanceof Date
    ) {
        fecha = valor;
    } else {
        fecha =
            new Date(valor);
    }

    return Number.isNaN(
        fecha.getTime()
    )
        ? null
        : fecha;
}

function formatDate(valor) {
    const fecha =
        parseDateValue(valor);

    return fecha
        ? fecha.toLocaleDateString(
            "es-CR"
        )
        : "Sin fecha";
}

function formatDateTime(valor) {
    const fecha =
        parseDateValue(valor);

    return fecha
        ? fecha.toLocaleString(
            "es-CR"
        )
        : "Sin fecha";
}

function formatDateForInput(valor) {
    const fecha =
        parseDateValue(valor);

    if (!fecha) {
        return "";
    }

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() +
            1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        );

    return (
        `${year}-${month}-${day}`
    );
}

function setTextValue(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ||
            "-";
    }
}

function setInputValue(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value ??
            "";
    }
}

function setSelectValue(
    id,
    value
) {
    setInputValue(
        id,
        value || ""
    );
}

function capitalizeText(text) {
    const value =
        String(
            text ||
            ""
        ).trim();

    return value
        ? value
            .charAt(0)
            .toUpperCase() +
            value.slice(1)
        : "-";
}

function escapeHtml(texto) {
    return String(texto)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#39;"
        );
}

function validateTicketFile(
    archivo
) {
    if (!archivo) {
        return {
            valido: true,
            mensaje: ""
        };
    }

    if (
        archivo.size >
        MAX_FILE_SIZE
    ) {
        return {
            valido: false,
            mensaje:
                "Cada archivo no puede superar los 10 MB."
        };
    }

    const nombre =
        String(
            archivo.name ||
            ""
        ).toLowerCase();

    const extensionPermitida =
        ALLOWED_FILE_EXTENSIONS
            .some(
                (extension) =>
                    nombre.endsWith(
                        extension
                    )
            );

    const tipoPermitido =
        ALLOWED_FILE_TYPES
            .includes(
                archivo.type
            );

    if (
        !tipoPermitido &&
        !extensionPermitida
    ) {
        return {
            valido: false,
            mensaje:
                "El formato del archivo seleccionado no está permitido."
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}

function getAttachmentSelection(
    archivoInputId,
    carpetaInputId
) {
    const archivoInput =
        document.getElementById(
            archivoInputId
        );

    const carpetaInput =
        document.getElementById(
            carpetaInputId
        );

    return {
        archivo:
            archivoInput
                ?.files
                ?.[0] ||
            null,

        archivosCarpeta:
            Array.from(
                carpetaInput
                    ?.files ||
                []
            ),

        archivoInput,
        carpetaInput
    };
}

function validateAttachmentSelection(
    seleccion
) {
    const {
        archivo,
        archivosCarpeta
    } = seleccion;

    if (
        archivo &&
        archivosCarpeta.length >
        0
    ) {
        return {
            valido: false,
            mensaje:
                "Seleccione un archivo individual o una carpeta, no ambos."
        };
    }

    if (archivo) {
        return validateTicketFile(
            archivo
        );
    }

    if (
        archivosCarpeta.length ===
        0
    ) {
        return {
            valido: true,
            mensaje: ""
        };
    }

    if (
        archivosCarpeta.length >
        MAX_FOLDER_FILES
    ) {
        return {
            valido: false,
            mensaje:
                `La carpeta no puede contener más de ${MAX_FOLDER_FILES} archivos.`
        };
    }

    let tamanoTotal = 0;

    for (
        const archivoCarpeta
        of archivosCarpeta
    ) {
        const validacion =
            validateTicketFile(
                archivoCarpeta
            );

        if (!validacion.valido) {
            return {
                valido: false,
                mensaje:
                    `${archivoCarpeta.name}: ${validacion.mensaje}`
            };
        }

        tamanoTotal +=
            archivoCarpeta.size;
    }

    if (
        tamanoTotal >
        MAX_FOLDER_TOTAL_SIZE
    ) {
        return {
            valido: false,
            mensaje:
                "La carpeta no puede superar los 100 MB en total."
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}

function markAttachmentInvalid(
    seleccion,
    invalid
) {
    seleccion
        .archivoInput
        ?.classList
        .toggle(
            "is-invalid",
            invalid
        );

    seleccion
        .carpetaInput
        ?.classList
        .toggle(
            "is-invalid",
            invalid
        );
}

function appendAttachmentToFormData(
    formData,
    seleccion
) {
    if (seleccion.archivo) {
        formData.append(
            "archivo",
            seleccion.archivo
        );

        return;
    }

    if (
        seleccion
            .archivosCarpeta
            .length ===
        0
    ) {
        return;
    }

    const rutasCarpeta =
        seleccion
            .archivosCarpeta
            .map(
                (archivo) =>
                    archivo.webkitRelativePath ||
                    archivo.name
            );

    seleccion
        .archivosCarpeta
        .forEach(
            (archivo) => {
                formData.append(
                    "carpetaArchivos",
                    archivo,
                    archivo.name
                );
            }
        );

    formData.append(
        "rutasCarpeta",
        JSON.stringify(
            rutasCarpeta
        )
    );
}

function getRolUsuarioActual() {
    const usuario = getUsuarioActual();

    if (!usuario) {
        return "";
    }

    if (Array.isArray(usuario.roles)) {
        const rolAdmin = usuario.roles
            .map((rol) => String(rol || "").trim().toLowerCase())
            .find((rol) => rol === "admin");

        return rolAdmin || "";
    }

    return String(
        usuario.rol ||
        usuario.role ||
        usuario.tipoRol ||
        usuario.tipo_usuario ||
        ""
    )
        .trim()
        .toLowerCase();
}

function checkUsuarioAdmin() {
    return getRolUsuarioActual() === "admin";
}

function renderDeleteTicketButton(ticket) {
    if (!checkUsuarioAdmin()) {
        return "";
    }

    return `
        <button
            type="button"
            class="btn btn-outline-danger btn-eliminar-ticket"
            data-id="${escapeHtml(ticket.id || "")}"
        >
            Borrar
        </button>
    `;
}