const API_BASE_URL = "https://crm-hyb1.onrender.com";
const API_URL = `${API_BASE_URL}/employees`;


let tablaEmployees = null;
let modalAddEmployee = null;
let modalEditEmployee = null;
let modalViewEmployee = null;
let modalStatusEmployee = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await cargarModalesEmployees();
        inicializarModales();
        inicializarEventos();
        await cargarEmployees();
        cargarNombreUsuario();
    } catch (error) {
        console.error("Error al inicializar Employees:", error);
        mostrarAlerta("No fue posible inicializar la vista de employees.", "danger");
    }
});

async function cargarModalesEmployees() {
    const contenedor = document.getElementById("employeesModalsContainer");

    if (!contenedor) {
        throw new Error("No se encontró el contenedor de modales de employees.");
    }

    const rutas = [
        "./components//Employees/modal-add-employee.html",
        "./components/Employees/modal-edit-employee.html",
        "./components/Employees/modal-view-employee.html",
        "./components/Employees/modal-status-employee.html"
    ];

    const respuestas = await Promise.all(
        rutas.map(async (ruta) => {
            const respuesta = await fetch(ruta);

            if (!respuesta.ok) {
                throw new Error(`No se pudo cargar el componente ${ruta}`);
            }

            return await respuesta.text();
        })
    );

    contenedor.innerHTML = respuestas.join("\n");
}

function inicializarModales() {
    modalAddEmployee = new bootstrap.Modal(document.getElementById("modalEmployee"));
    modalEditEmployee = new bootstrap.Modal(document.getElementById("modalEditEmployee"));
    modalViewEmployee = new bootstrap.Modal(document.getElementById("modalViewEmployee"));
    modalStatusEmployee = new bootstrap.Modal(document.getElementById("modalStatusEmployee"));
}

function inicializarEventos() {
    const btnNuevoEmployee = document.getElementById("btnNuevoEmployee");
    const btnRecargarEmployees = document.getElementById("btnRecargarEmployees");

    const formEmployee = document.getElementById("formEmployee");
    const formEditEmployee = document.getElementById("formEditEmployee");
    const btnConfirmarStatusEmployee = document.getElementById("btnConfirmarStatusEmployee");

    if (btnNuevoEmployee) {
        btnNuevoEmployee.addEventListener("click", abrirModalNuevoEmployee);
    }

    if (btnRecargarEmployees) {
        btnRecargarEmployees.addEventListener("click", cargarEmployees);
    }

    if (formEmployee) {
        formEmployee.addEventListener("submit", guardarNuevoEmployee);
    }

    if (formEditEmployee) {
        formEditEmployee.addEventListener("submit", guardarEdicionEmployee);
    }

    if (btnConfirmarStatusEmployee) {
        btnConfirmarStatusEmployee.addEventListener("click", cambiarEstadoEmployee);
    }
}

async function cargarEmployees() {
    try {
        const respuesta = await fetch(API_URL);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible cargar los employees.");
        }

        renderizarTablaEmployees(data.employees || []);
    } catch (error) {
        console.error("Error al cargar employees:", error);
        mostrarAlerta(error.message || "Error al cargar employees.", "danger");
        renderizarTablaEmployees([]);
    }
}

function renderizarTablaEmployees(employees) {
    const tbody = document.querySelector("#tablaEmployees tbody");

    if (!tbody) {
        return;
    }

    if (tablaEmployees) {
        tablaEmployees.destroy();
        tablaEmployees = null;
    }

    tbody.innerHTML = "";

    if (!employees.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">No hay employees registrados.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map((employee) => `
        <tr>
            <td>${escapeHtml(employee.nombre || "-")}</td>
            <td>${escapeHtml(employee.correo || "-")}</td>
            <td>${formatearTexto(employee.rol || "-")}</td>
            <td>
                <span class="badge ${employee.activo ? "text-bg-success" : "text-bg-secondary"}">
                    ${employee.activo ? "Activo" : "Inactivo"}
                </span>
            </td>
            <td>
                <span class="badge ${employee.google_id ? "text-bg-primary" : "text-bg-light"}">
                    ${employee.google_id ? "Conectado" : "Pendiente"}
                </span>
            </td>
            <td>
                <span class="badge ${employee.calendar_habilitado ? "text-bg-info" : "text-bg-light"}">
                    ${employee.calendar_habilitado ? "Habilitado" : "No"}
                </span>
            </td>
            <td>${formatearFecha(employee.ultimo_login)}</td>
            <td>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-outline-secondary" onclick="verEmployee('${employee.employee_id}')">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarEmployee('${employee.employee_id}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="abrirModalEstadoEmployee('${employee.employee_id}', ${employee.activo})">
                        <i class="fa-solid fa-power-off"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");

    tablaEmployees = $("#tablaEmployees").DataTable({
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json"
        },
        responsive: true,
        destroy: true,
        pageLength: 10,
        order: []
    });
}

function abrirModalNuevoEmployee() {
    limpiarFormularioNuevoEmployee();
    modalAddEmployee.show();
}

async function guardarNuevoEmployee(event) {
    event.preventDefault();

    const payload = {
        nombre: document.getElementById("nombre").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        google_id: document.getElementById("google_id").value.trim(),
        foto_url: document.getElementById("foto_url").value.trim(),
        rol: document.getElementById("rol").value,
        activo: document.getElementById("activo").value === "true",
        correo_verificado: document.getElementById("correo_verificado").value === "true",
        calendar_habilitado: document.getElementById("calendar_habilitado").value === "true",
        calendar_id: document.getElementById("calendar_id").value.trim(),
        timezone: document.getElementById("timezone").value.trim(),
        google_refresh_token: limpiarToken(document.getElementById("google_refresh_token").value)
    };

    if (!payload.nombre) {
        mostrarAlerta("El nombre del employee es obligatorio.", "warning");
        return;
    }

    if (!payload.correo) {
        mostrarAlerta("El correo del employee es obligatorio.", "warning");
        return;
    }

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible crear el employee.");
        }

        modalAddEmployee.hide();
        mostrarAlerta(data.mensaje || "Employee creado correctamente.", "success");
        await cargarEmployees();
    } catch (error) {
        console.error("Error al crear employee:", error);
        mostrarAlerta(error.message || "Error al crear employee.", "danger");
    }
}

async function editarEmployee(employeeId) {
    try {
        const respuesta = await fetch(`${API_URL}/${employeeId}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener el employee.");
        }

        const employee = data.employee;

        document.getElementById("editEmployeeId").value = employee.employee_id || "";
        document.getElementById("editNombre").value = employee.nombre || "";
        document.getElementById("editCorreo").value = employee.correo || "";
        document.getElementById("editGoogleId").value = employee.google_id || "";
        document.getElementById("editFotoUrl").value = employee.foto_url || "";
        document.getElementById("editRol").value = employee.rol || "employee";
        document.getElementById("editActivo").value = String(Boolean(employee.activo));
        document.getElementById("editCorreoVerificado").value = String(Boolean(employee.correo_verificado));
        document.getElementById("editCalendarHabilitado").value = String(Boolean(employee.calendar_habilitado));
        document.getElementById("editCalendarId").value = employee.calendar_id || "primary";
        document.getElementById("editTimezone").value = employee.timezone || "America/Costa_Rica";
        document.getElementById("editGoogleRefreshToken").value = employee.google_refresh_token || "";

        modalEditEmployee.show();
    } catch (error) {
        console.error("Error al cargar employee para editar:", error);
        mostrarAlerta(error.message || "No fue posible cargar el employee.", "danger");
    }
}

async function guardarEdicionEmployee(event) {
    event.preventDefault();

    const employeeId = document.getElementById("editEmployeeId").value.trim();

    const payload = {
        nombre: document.getElementById("editNombre").value.trim(),
        correo: document.getElementById("editCorreo").value.trim(),
        google_id: document.getElementById("editGoogleId").value.trim(),
        foto_url: document.getElementById("editFotoUrl").value.trim(),
        rol: document.getElementById("editRol").value,
        activo: document.getElementById("editActivo").value === "true",
        correo_verificado: document.getElementById("editCorreoVerificado").value === "true",
        calendar_habilitado: document.getElementById("editCalendarHabilitado").value === "true",
        calendar_id: document.getElementById("editCalendarId").value.trim(),
        timezone: document.getElementById("editTimezone").value.trim(),
        google_refresh_token: limpiarToken(document.getElementById("editGoogleRefreshToken").value)
    };

    if (!employeeId) {
        mostrarAlerta("No se encontró el ID del employee a editar.", "warning");
        return;
    }

    if (!payload.nombre) {
        mostrarAlerta("El nombre del employee es obligatorio.", "warning");
        return;
    }

    if (!payload.correo) {
        mostrarAlerta("El correo del employee es obligatorio.", "warning");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/${employeeId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible actualizar el employee.");
        }

        modalEditEmployee.hide();
        mostrarAlerta(data.mensaje || "Employee actualizado correctamente.", "success");
        await cargarEmployees();
    } catch (error) {
        console.error("Error al actualizar employee:", error);
        mostrarAlerta(error.message || "Error al actualizar employee.", "danger");
    }
}

async function verEmployee(employeeId) {
    try {
        const respuesta = await fetch(`${API_URL}/${employeeId}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener el employee.");
        }

        const employee = data.employee;

        document.getElementById("viewNombre").textContent = employee.nombre || "-";
        document.getElementById("viewCorreo").textContent = employee.correo || "-";
        document.getElementById("viewGoogleId").textContent = employee.google_id || "-";
        document.getElementById("viewRol").textContent = formatearTexto(employee.rol || "-");
        document.getElementById("viewActivo").textContent = employee.activo ? "Activo" : "Inactivo";
        document.getElementById("viewCorreoVerificado").textContent = employee.correo_verificado ? "Sí" : "No";
        document.getElementById("viewCalendarHabilitado").textContent = employee.calendar_habilitado ? "Sí" : "No";
        document.getElementById("viewCalendarId").textContent = employee.calendar_id || "-";
        document.getElementById("viewTimezone").textContent = employee.timezone || "-";
        document.getElementById("viewUltimoLogin").textContent = formatearFecha(employee.ultimo_login);
        document.getElementById("viewFechaCreacion").textContent = formatearFecha(employee.fecha_creacion);
        document.getElementById("viewFechaActualizacion").textContent = formatearFecha(employee.fecha_actualizacion);
        document.getElementById("viewFotoUrl").textContent = employee.foto_url || "-";
        document.getElementById("viewGoogleRefreshToken").textContent = employee.google_refresh_token || "-";

        modalViewEmployee.show();
    } catch (error) {
        console.error("Error al ver employee:", error);
        mostrarAlerta(error.message || "No fue posible obtener el detalle del employee.", "danger");
    }
}

function abrirModalEstadoEmployee(employeeId, activoActual) {
    document.getElementById("statusEmployeeId").value = employeeId;
    document.getElementById("nuevoStatusEmployee").value = String(!activoActual);
    document.getElementById("textoStatusEmployee").textContent =
        `Vas a cambiar el estado del employee a ${!activoActual ? "Activo" : "Inactivo"}.`;

    modalStatusEmployee.show();
}

async function cambiarEstadoEmployee() {
    const employeeId = document.getElementById("statusEmployeeId").value.trim();
    const activo = document.getElementById("nuevoStatusEmployee").value === "true";

    if (!employeeId) {
        mostrarAlerta("No se encontró el ID del employee.", "warning");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/${employeeId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ activo })
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible cambiar el estado del employee.");
        }

        modalStatusEmployee.hide();
        mostrarAlerta(data.mensaje || "Estado del employee actualizado correctamente.", "success");
        await cargarEmployees();
    } catch (error) {
        console.error("Error al cambiar estado del employee:", error);
        mostrarAlerta(error.message || "Error al cambiar el estado del employee.", "danger");
    }
}

function limpiarFormularioNuevoEmployee() {
    document.getElementById("nombre").value = "";
    document.getElementById("correo").value = "";
    document.getElementById("google_id").value = "";
    document.getElementById("foto_url").value = "";
    document.getElementById("rol").value = "employee";
    document.getElementById("activo").value = "true";
    document.getElementById("correo_verificado").value = "false";
    document.getElementById("calendar_habilitado").value = "false";
    document.getElementById("calendar_id").value = "primary";
    document.getElementById("timezone").value = "America/Costa_Rica";
    document.getElementById("google_refresh_token").value = "";
}

function limpiarToken(valor) {
    const texto = String(valor || "").trim();
    return texto || null;
}

function mostrarAlerta(mensaje, tipo = "info") {
    const alertContainer = document.getElementById("alertContainer");

    if (!alertContainer) {
        return;
    }

    alertContainer.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${escapeHtml(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;
}

function formatearFecha(valor) {
    if (!valor) {
        return "-";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return fecha.toLocaleString("es-CR");
}

function formatearTexto(valor) {
    if (!valor) {
        return "-";
    }

    return String(valor)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function escapeHtml(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cargarNombreUsuario() {
    const nombreUsuario = document.getElementById("nombreUsuario");

    if (!nombreUsuario) {
        return;
    }

    nombreUsuario.textContent = "Usuario";
}

window.verEmployee = verEmployee;
window.editarEmployee = editarEmployee;
window.abrirModalEstadoEmployee = abrirModalEstadoEmployee;