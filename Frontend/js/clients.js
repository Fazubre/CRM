const CLIENTS_URL = "http://localhost:3000/clients";

let mensajeTablaVacia = "No hay clientes registrados.";
let modalAgregarCliente = null;
let modalEditarCliente = null;
let modalVerCliente = null;
let modalEliminarCliente = null;
let clientesCache = [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        prepareClientModalsArea();
        await loadModalsHtml();
        initializeModals();
        loadUserData();
        setupEvents();
        await loadClients();
    } catch (error) {
        console.error("Error inicializando la vista de clientes:", error);
        showGlobalMessage("danger", error.message || "No fue posible cargar la pantalla de clientes.");
    }
});

function prepareClientModalsArea() {
    removeOldInlineModals();
    ensureModalContainers();
}

function removeOldInlineModals() {
    const idsViejos = [
        "modalCliente",
        "modalAgregarCliente",
        "modalEditarCliente",
        "modalVerCliente",
        "modalEliminarCliente"
    ];

    idsViejos.forEach((id) => {
        const element = document.getElementById(id);

        if (element) {
            element.remove();
        }
    });
}

function ensureModalContainers() {
    const configuracion = [
        "contenedorModalAgregarCliente",
        "contenedorModalEditarCliente",
        "contenedorModalVerCliente",
        "contenedorModalEliminarCliente"
    ];

    configuracion.forEach((id) => {
        if (!document.getElementById(id)) {
            const div = document.createElement("div");
            div.id = id;
            document.body.appendChild(div);
        }
    });
}

async function loadModalsHtml() {
    const modales = [
        {
            contenedorId: "contenedorModalAgregarCliente",
            ruta: "./components/Clients/modal-add-client.html"
        },
        {
            contenedorId: "contenedorModalEditarCliente",
            ruta: "./components/Clients/modal-edit-client.html"
        },
        {
            contenedorId: "contenedorModalVerCliente",
            ruta: "./components/Clients/modal-view-client.html"
        },
        {
            contenedorId: "contenedorModalEliminarCliente",
            ruta: "./components/Clients/modal-elimin-client.html"
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
    const modalAgregarElement = document.getElementById("modalAgregarCliente");
    const modalEditarElement = document.getElementById("modalEditarCliente");
    const modalVerElement = document.getElementById("modalVerCliente");
    const modalEliminarElement = document.getElementById("modalEliminarCliente");

    if (modalAgregarElement) {
        modalAgregarCliente = new bootstrap.Modal(modalAgregarElement);

        modalAgregarElement.addEventListener("hidden.bs.modal", () => {
            resetAddClientForm();
        });
    }

    if (modalEditarElement) {
        modalEditarCliente = new bootstrap.Modal(modalEditarElement);

        modalEditarElement.addEventListener("hidden.bs.modal", () => {
            resetEditClientForm();
        });
    }

    if (modalVerElement) {
        modalVerCliente = new bootstrap.Modal(modalVerElement);
    }

    if (modalEliminarElement) {
        modalEliminarCliente = new bootstrap.Modal(modalEliminarElement);

        modalEliminarElement.addEventListener("hidden.bs.modal", () => {
            resetDeleteClientModal();
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
    const btnNuevoCliente = document.getElementById("btnNuevoCliente");
    const btnRecargarClientes = document.getElementById("btnRecargarClientes");
    const formAgregarCliente = document.getElementById("formAgregarCliente");
    const formEditarCliente = document.getElementById("formEditarCliente");
    const btnEliminarCliente = document.getElementById("btnEliminarCliente");

    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener("click", () => {
            openAddClientModal();
        });
    }

    if (btnRecargarClientes) {
        btnRecargarClientes.addEventListener("click", async () => {
            await loadClients();
        });
    }

    if (formAgregarCliente) {
        formAgregarCliente.addEventListener("submit", async (event) => {
            event.preventDefault();
            await submitAddClientForm();
        });
    }

    if (formEditarCliente) {
        formEditarCliente.addEventListener("submit", async (event) => {
            event.preventDefault();
            await submitEditClientForm();
        });
    }

    if (btnEliminarCliente) {
        btnEliminarCliente.addEventListener("click", async () => {
            await submitDeleteClient();
        });
    }

    $(document).on("click", ".btn-ver-cliente", function () {
        const id = $(this).data("id");
        const cliente = findClientById(id);

        if (!cliente) {
            showGlobalMessage("warning", "No fue posible encontrar el cliente seleccionado.");
            return;
        }

        openViewClientModal(cliente);
    });

    $(document).on("click", ".btn-editar-cliente", function () {
        const id = $(this).data("id");
        const cliente = findClientById(id);

        if (!cliente) {
            showGlobalMessage("warning", "No fue posible encontrar el cliente seleccionado.");
            return;
        }

        openEditClientModal(cliente);
    });

    $(document).on("click", ".btn-eliminar-cliente", function () {
        const id = $(this).data("id");
        const cliente = findClientById(id);

        if (!cliente) {
            showGlobalMessage("warning", "No fue posible encontrar el cliente seleccionado.");
            return;
        }

        openDeleteClientModal(cliente);
    });
}

function getClientsTbody() {
    return document.querySelector("#tablaClientes tbody");
}

function findClientById(id) {
    return clientesCache.find((cliente) => String(getClientId(cliente)) === String(id)) || null;
}

function openAddClientModal() {
    resetAddClientForm();
    setClienteCreadoPorActual();

    if (modalAgregarCliente) {
        modalAgregarCliente.show();
    }
}

function openViewClientModal(cliente) {
    fillViewClientModal(cliente);

    if (modalVerCliente) {
        modalVerCliente.show();
    }
}

function openEditClientModal(cliente) {
    fillEditClientForm(cliente);

    if (modalEditarCliente) {
        modalEditarCliente.show();
    }
}

function openDeleteClientModal(cliente) {
    const idInput = document.getElementById("eliminarClienteId");
    const nombreSpan = document.getElementById("nombreClienteEliminar");

    if (idInput) {
        idInput.value = getClientId(cliente);
    }

    if (nombreSpan) {
        nombreSpan.textContent = cliente.nombre || "Cliente";
    }

    if (modalEliminarCliente) {
        modalEliminarCliente.show();
    }
}

function fillViewClientModal(cliente) {
    setTextValue("verClienteId", getClientId(cliente) || "-");
    setTextValue("verClienteEstado", capitalizeText(cliente.estado || "activo"));
    setTextValue("verClienteNombre", cliente.nombre || "-");
    setTextValue("verClienteCorreo", cliente.correo || "-");
    setTextValue("verClienteTelefono", cliente.telefono || "-");
    setTextValue("verClienteEmpresa", cliente.empresa || "-");
    setTextValue("verClienteIdentificacion", cliente.identificacion || "-");
    setTextValue("verClienteDireccion", cliente.direccion || "-");
    setTextValue("verClienteCreadoPor", cliente.creado_por || "-");
    setTextValue("verClienteFechaCreacion", formatDateTime(cliente.fecha_creacion || cliente.createdAt));
    setTextValue("verClienteFechaActualizacion", formatDateTime(cliente.fecha_actualizacion || cliente.updatedAt));

    const notas = document.getElementById("verClienteNotas");
    if (notas) {
        notas.value = cliente.notas || "";
    }
}

function fillEditClientForm(cliente) {
    const id = getClientId(cliente);

    setInputValue("editarClienteId", id);
    setInputValue("editarClienteCodigo", id);
    setInputValue("editarClienteEstado", cliente.estado || "activo");
    setInputValue("editarClienteNombre", cliente.nombre || "");
    setInputValue("editarClienteCorreo", cliente.correo || "");
    setInputValue("editarClienteTelefono", cliente.telefono || "");
    setInputValue("editarClienteEmpresa", cliente.empresa || "");
    setInputValue("editarClienteIdentificacion", cliente.identificacion || "");
    setInputValue("editarClienteDireccion", cliente.direccion || "");
    setInputValue("editarClienteNotas", cliente.notas || "");

    hideAddFormAlert();
    hideEditFormAlert();

    const form = document.getElementById("formEditarCliente");
    if (form) {
        form.classList.remove("was-validated");
    }
}

function resetAddClientForm() {
    const form = document.getElementById("formAgregarCliente");

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    hideAddFormAlert();
    setClienteCreadoPorActual();

    const estado = document.getElementById("clienteEstado");
    if (estado) {
        estado.value = "activo";
    }
}

function resetEditClientForm() {
    const form = document.getElementById("formEditarCliente");

    if (form) {
        form.reset();
        form.classList.remove("was-validated");
    }

    hideEditFormAlert();
}

function resetDeleteClientModal() {
    setInputValue("eliminarClienteId", "");
    setTextValue("nombreClienteEliminar", "-");
}

function setClienteCreadoPorActual() {
    const input = document.getElementById("clienteCreadoPor");
    if (!input) return;

    input.value = getUsuarioNombreActual();
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

function getUsuarioNombreActual() {
    const usuario = getUsuarioActual();

    if (!usuario) return "Usuario";

    return usuario.nombre || usuario.correo || usuario.google_id || "Usuario";
}

async function submitAddClientForm() {
    const form = document.getElementById("formAgregarCliente");
    const btnGuardar = document.getElementById("btnGuardarCliente");

    if (!form || !btnGuardar) return;

    hideAddFormAlert();

    const payload = buildAddClientPayload();

    if (!payload.nombre || !payload.correo) {
        form.classList.add("was-validated");
        showAddFormAlert("Debe ingresar al menos el nombre y el correo del cliente.");
        return;
    }

    try {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...`;

        const response = await fetch(CLIENTS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible crear el cliente.");
        }

        if (modalAgregarCliente) {
            modalAgregarCliente.hide();
        }

        await loadClients();
        showGlobalMessage("success", "El cliente fue creado correctamente.");
    } catch (error) {
        console.error("Error creando cliente:", error);
        showAddFormAlert(error.message || "No fue posible crear el cliente.");
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cliente`;
    }
}

async function submitEditClientForm() {
    const form = document.getElementById("formEditarCliente");
    const btnActualizar = document.getElementById("btnActualizarCliente");
    const clienteId = document.getElementById("editarClienteId")?.value || "";

    if (!form || !btnActualizar) return;

    hideEditFormAlert();

    const payload = buildEditClientPayload();

    if (!clienteId) {
        showEditFormAlert("No se encontró el id del cliente.");
        return;
    }

    if (!payload.nombre || !payload.correo) {
        form.classList.add("was-validated");
        showEditFormAlert("Debe ingresar al menos el nombre y el correo del cliente.");
        return;
    }

    try {
        btnActualizar.disabled = true;
        btnActualizar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Guardando...`;

        const response = await fetch(`${CLIENTS_URL}/${encodeURIComponent(clienteId)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible actualizar el cliente.");
        }

        if (modalEditarCliente) {
            modalEditarCliente.hide();
        }

        await loadClients();
        showGlobalMessage("success", "Los cambios del cliente fueron guardados correctamente.");
    } catch (error) {
        console.error("Error actualizando cliente:", error);
        showEditFormAlert(error.message || "No fue posible actualizar el cliente.");
    } finally {
        btnActualizar.disabled = false;
        btnActualizar.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`;
    }
}

async function submitDeleteClient() {
    const btnEliminar = document.getElementById("btnEliminarCliente");
    const clienteId = document.getElementById("eliminarClienteId")?.value || "";

    if (!btnEliminar) return;

    if (!clienteId) {
        showGlobalMessage("warning", "No se encontró el cliente a eliminar.");
        return;
    }

    try {
        btnEliminar.disabled = true;
        btnEliminar.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i>Eliminando...`;

        const response = await fetch(`${CLIENTS_URL}/${encodeURIComponent(clienteId)}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible eliminar el cliente.");
        }

        if (modalEliminarCliente) {
            modalEliminarCliente.hide();
        }

        await loadClients();
        showGlobalMessage("success", "El cliente fue eliminado correctamente.");
    } catch (error) {
        console.error("Error eliminando cliente:", error);
        showGlobalMessage("danger", error.message || "No fue posible eliminar el cliente.");
    } finally {
        btnEliminar.disabled = false;
        btnEliminar.innerHTML = `<i class="fa-solid fa-trash-can me-2"></i>Eliminar`;
    }
}

function buildAddClientPayload() {
    return {
        nombre: getInputValue("clienteNombre"),
        correo: getInputValue("clienteCorreo").toLowerCase(),
        telefono: getInputValue("clienteTelefono"),
        empresa: getInputValue("clienteEmpresa"),
        identificacion: getInputValue("clienteIdentificacion"),
        direccion: getInputValue("clienteDireccion"),
        estado: getInputValue("clienteEstado") || "activo",
        notas: getInputValue("clienteNotas"),
        creado_por: getInputValue("clienteCreadoPor") || getUsuarioNombreActual()
    };
}

function buildEditClientPayload() {
    return {
        nombre: getInputValue("editarClienteNombre"),
        correo: getInputValue("editarClienteCorreo").toLowerCase(),
        telefono: getInputValue("editarClienteTelefono"),
        empresa: getInputValue("editarClienteEmpresa"),
        identificacion: getInputValue("editarClienteIdentificacion"),
        direccion: getInputValue("editarClienteDireccion"),
        estado: getInputValue("editarClienteEstado") || "activo",
        notas: getInputValue("editarClienteNotas")
    };
}

function showAddFormAlert(message) {
    const alerta = document.getElementById("alertaFormularioCliente");
    if (!alerta) return;

    alerta.textContent = message;
    alerta.classList.remove("d-none");
}

function hideAddFormAlert() {
    const alerta = document.getElementById("alertaFormularioCliente");
    if (!alerta) return;

    alerta.textContent = "";
    alerta.classList.add("d-none");
}

function showEditFormAlert(message) {
    const alerta = document.getElementById("alertaFormularioEditarCliente");
    if (!alerta) return;

    alerta.textContent = message;
    alerta.classList.remove("d-none");
}

function hideEditFormAlert() {
    const alerta = document.getElementById("alertaFormularioEditarCliente");
    if (!alerta) return;

    alerta.textContent = "";
    alerta.classList.add("d-none");
}

async function loadClients() {
    const tbody = getClientsTbody();

    if (!tbody) return;

    try {
        destroyDataTable();

        tbody.innerHTML = "";

        const response = await fetch(CLIENTS_URL);
        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener los clientes.");
        }

        const clientes = Array.isArray(data.clientes)
            ? data.clientes
            : Array.isArray(data.clients)
                ? data.clients
                : [];

        clientesCache = clientes;

        renderClients(clientes);

        mensajeTablaVacia = "No hay clientes registrados.";
        initDataTable();
    } catch (error) {
        console.error("Error cargando clientes:", error);

        clientesCache = [];
        destroyDataTable();

        tbody.innerHTML = "";
        mensajeTablaVacia = error.message || "No fue posible cargar los clientes.";
        initDataTable();
    }
}

function renderClients(clientes) {
    const tbody = getClientsTbody();

    if (!tbody) return;

    if (!clientes.length) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML = clientes.map((cliente) => {
        const id = getClientId(cliente);

        return `
            <tr>
                <td>${escapeHtml(cliente.nombre || "")}</td>
                <td>${escapeHtml(cliente.correo || "")}</td>
                <td>${escapeHtml(cliente.telefono || "-")}</td>
                <td>${escapeHtml(cliente.empresa || "-")}</td>
                <td>${escapeHtml(cliente.identificacion || "-")}</td>
                <td>${renderEstadoCliente(cliente.estado)}</td>
                <td>${escapeHtml(formatDateTime(cliente.fecha_creacion || cliente.createdAt))}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button
                            type="button"
                            class="btn btn-outline-info btn-ver-cliente"
                            data-id="${escapeHtml(id)}">
                            Ver
                        </button>
                        <button
                            type="button"
                            class="btn btn-outline-warning btn-editar-cliente"
                            data-id="${escapeHtml(id)}">
                            Editar
                        </button>
                        <button
                            type="button"
                            class="btn btn-outline-danger btn-eliminar-cliente"
                            data-id="${escapeHtml(id)}">
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function destroyDataTable() {
    if ($.fn.DataTable.isDataTable("#tablaClientes")) {
        $("#tablaClientes").DataTable().destroy();
    }
}

function initDataTable() {
    $("#tablaClientes").DataTable({
        responsive: true,
        autoWidth: false,
        pageLength: 10,
        order: [[0, "asc"]],
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

function renderEstadoCliente(estado) {
    const valor = String(estado || "activo").toLowerCase();

    let clase = "bg-success";
    let texto = "Activo";

    if (valor === "inactivo") {
        clase = "bg-secondary";
        texto = "Inactivo";
    }

    if (valor === "prospecto") {
        clase = "bg-warning text-dark";
        texto = "Prospecto";
    }

    return `<span class="badge ${clase}">${escapeHtml(texto)}</span>`;
}

function getClientId(cliente) {
    return (
        cliente?.cliente_id ||
        cliente?.id ||
        cliente?.client_id ||
        cliente?.clientId ||
        ""
    );
}

function parseDateValue(valor) {
    if (!valor) return null;

    let fecha = null;

    if (typeof valor === "object" && typeof valor.seconds === "number") {
        fecha = new Date(valor.seconds * 1000);
    } else if (typeof valor === "object" && typeof valor.toDate === "function") {
        fecha = valor.toDate();
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

function formatDateTime(valor) {
    const fecha = parseDateValue(valor);

    if (!fecha) return "Sin fecha";

    return fecha.toLocaleString("es-CR");
}

function setTextValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = value || "-";
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;

    element.value = value || "";
}

function getInputValue(id) {
    const element = document.getElementById(id);
    if (!element) return "";

    return String(element.value || "").trim();
}

function capitalizeText(text) {
    const value = String(text || "").trim();

    if (!value) return "-";

    return value.charAt(0).toUpperCase() + value.slice(1);
}

function showGlobalMessage(type, message) {
    if (window.Swal) {
        const icon = type === "danger" ? "error" : type;
        window.Swal.fire({
            icon,
            title: buildMessageTitle(type),
            text: message
        });
        return;
    }

    const alertContainer = document.getElementById("alertContainer");

    if (!alertContainer) {
        alert(message);
        return;
    }

    const bootstrapType = normalizeBootstrapAlertType(type);

    alertContainer.innerHTML = `
        <div class="alert alert-${bootstrapType} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;

    setTimeout(() => {
        alertContainer.innerHTML = "";
    }, 5000);
}

function buildMessageTitle(type) {
    if (type === "success") return "Éxito";
    if (type === "warning") return "Atención";
    if (type === "danger") return "Error";
    return "Información";
}

function normalizeBootstrapAlertType(type) {
    if (type === "danger") return "danger";
    if (type === "success") return "success";
    if (type === "warning") return "warning";
    return "info";
}

function escapeHtml(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}