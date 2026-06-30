const API_BASE_URL = "https://crm-c40k.onrender.com";
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
        "./components/Employees/modal-add-employee.html",
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
        const data = await leerRespuestaJson(respuesta);

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
                <td colspan="8" class="text-center text-muted py-4">
                    No hay employees registrados.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = employees.map((employee) => {
        const employeeId = getEmployeeId(employee);

        return `
            <tr>
                <td>${escapeHtml(employee.nombre || "-")}</td>

                <td>${escapeHtml(employee.correo || employee.google_correo || "-")}</td>

                <td>${formatearTexto(employee.rol || "-")}</td>

                <td>
                    <span class="badge ${employee.activo ? "text-bg-success" : "text-bg-secondary"}">
                        ${employee.activo ? "Activo" : "Inactivo"}
                    </span>
                </td>

                <td>
                    ${renderGoogleStatus(employee)}
                </td>

                <td>
                    ${renderCalendarStatus(employee)}
                </td>

                <td>${formatearFecha(employee.ultimo_login)}</td>

                <td>
                    <div class="d-flex gap-2 flex-wrap">
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            onclick="verEmployee('${escapeHtml(employeeId)}')"
                            title="Ver employee"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>

                        <button
                            class="btn btn-sm btn-outline-primary"
                            onclick="editarEmployee('${escapeHtml(employeeId)}')"
                            title="Editar employee"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                            class="btn btn-sm btn-outline-warning"
                            onclick="abrirModalEstadoEmployee('${escapeHtml(employeeId)}', ${Boolean(employee.activo)})"
                            title="Cambiar estado"
                        >
                            <i class="fa-solid fa-power-off"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

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

function getEmployeeId(employee) {
    return String(
        employee?.employee_id ||
        employee?.id ||
        employee?.employeeId ||
        ""
    );
}

function setInputValueIfExists(id, value) {
    const input = document.getElementById(id);

    if (!input) {
        return;
    }

    input.value = value ?? "";
}

function getInputValueIfExists(id, defaultValue = "") {
    const input = document.getElementById(id);

    if (!input) {
        return defaultValue;
    }

    return String(input.value || "").trim();
}

function setPlaceholderIfExists(id, value) {
    const input = document.getElementById(id);

    if (!input) {
        return;
    }

    input.placeholder = value;
}

function employeeTieneGoogle(employee) {
    return (
        employee?.google_conectado === true ||
        Boolean(employee?.google_id) ||
        Boolean(employee?.google_correo) ||
        Boolean(employee?.google_nombre)
    );
}

function employeeTieneCalendar(employee) {
    const googleCalendar = employee?.google_calendar || {};

    return (
        employee?.google_calendar_conectado === true ||
        employee?.calendar_habilitado === true ||
        googleCalendar?.conectado === true ||
        Boolean(googleCalendar?.refresh_token) ||
        Boolean(employee?.google_refresh_token)
    );
}

function obtenerRefreshTokenCalendar(employee) {
    return (
        employee?.google_refresh_token ||
        employee?.google_calendar?.refresh_token ||
        ""
    );
}

function renderGoogleStatus(employee) {
    if (employeeTieneGoogle(employee)) {
        return `
            <span class="badge text-bg-primary">
                Conectado
            </span>
        `;
    }

    return `
        <span class="badge text-bg-light">
            Pendiente
        </span>
    `;
}

function renderCalendarStatus(employee) {
    if (employeeTieneCalendar(employee)) {
        return `
            <span class="badge text-bg-success">
                Sí
            </span>
        `;
    }

    return `
        <span class="badge text-bg-light">
            No
        </span>
    `;
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
        calendar_id: document.getElementById("calendar_id").value.trim() || "primary",
        timezone: document.getElementById("timezone").value.trim() || "America/Costa_Rica"
    };

    const refreshToken = limpiarToken(
        document.getElementById("google_refresh_token").value
    );

    if (refreshToken) {
        payload.google_refresh_token = refreshToken;
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
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await leerRespuestaJson(respuesta);

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
        const respuesta = await fetch(`${API_URL}/${encodeURIComponent(employeeId)}`);
        const data = await leerRespuestaJson(respuesta);

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener el employee.");
        }

        const employee = data.employee;
        const id = getEmployeeId(employee);
        const tieneCalendar = employeeTieneCalendar(employee);

        setInputValueIfExists("editEmployeeId", id);
        setInputValueIfExists("editNombre", employee.nombre || "");
        setInputValueIfExists("editCorreo", employee.correo || employee.google_correo || "");
        setInputValueIfExists("editGoogleId", employee.google_id || "");
        setInputValueIfExists("editFotoUrl", employee.foto_url || "");
        setInputValueIfExists("editRol", employee.rol || "employee");
        setInputValueIfExists("editActivo", String(Boolean(employee.activo)));
        setInputValueIfExists("editCorreoVerificado", String(Boolean(employee.correo_verificado)));

        setInputValueIfExists("editCalendarHabilitado", String(tieneCalendar));
        setInputValueIfExists("editCalendarId", employee.calendar_id || "primary");
        setInputValueIfExists("editTimezone", employee.timezone || "America/Costa_Rica");

        setInputValueIfExists("editGoogleRefreshToken", "");

        if (obtenerRefreshTokenCalendar(employee)) {
            setPlaceholderIfExists(
                "editGoogleRefreshToken",
                "Ya existe un refresh token guardado. Escribe uno nuevo solo si deseas reemplazarlo."
            );
        } else {
            setPlaceholderIfExists(
                "editGoogleRefreshToken",
                "Se usará después para Calendar"
            );
        }

        modalEditEmployee.show();
    } catch (error) {
        console.error("Error al cargar employee para editar:", error);
        mostrarAlerta(error.message || "No fue posible cargar el employee.", "danger");
    }
}

async function guardarEdicionEmployee(event) {
    event.preventDefault();

    const employeeId = getInputValueIfExists("editEmployeeId");

    const payload = {
        nombre: getInputValueIfExists("editNombre"),
        correo: getInputValueIfExists("editCorreo"),
        google_id: getInputValueIfExists("editGoogleId"),
        foto_url: getInputValueIfExists("editFotoUrl"),
        rol: getInputValueIfExists("editRol", "employee"),
        activo: getInputValueIfExists("editActivo", "true") === "true",
        correo_verificado: getInputValueIfExists("editCorreoVerificado", "false") === "true"
    };

    if (document.getElementById("editCalendarHabilitado")) {
        payload.calendar_habilitado =
            getInputValueIfExists("editCalendarHabilitado", "false") === "true";
    }

    if (document.getElementById("editCalendarId")) {
        payload.calendar_id =
            getInputValueIfExists("editCalendarId", "primary") || "primary";
    }

    if (document.getElementById("editTimezone")) {
        payload.timezone =
            getInputValueIfExists("editTimezone", "America/Costa_Rica") ||
            "America/Costa_Rica";
    }

    const refreshToken = limpiarToken(
        getInputValueIfExists("editGoogleRefreshToken")
    );

    if (refreshToken) {
        payload.google_refresh_token = refreshToken;
    }

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
        const respuesta = await fetch(`${API_URL}/${encodeURIComponent(employeeId)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await leerRespuestaJson(respuesta);

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
        const respuesta = await fetch(`${API_URL}/${encodeURIComponent(employeeId)}`);
        const data = await leerRespuestaJson(respuesta);

        if (!respuesta.ok || !data.ok) {
            throw new Error(data.mensaje || "No fue posible obtener el employee.");
        }

        const employee = data.employee;
        const tieneCalendar = employeeTieneCalendar(employee);
        const tieneRefreshToken = Boolean(obtenerRefreshTokenCalendar(employee));

        document.getElementById("viewNombre").textContent = employee.nombre || "-";
        document.getElementById("viewCorreo").textContent = employee.correo || employee.google_correo || "-";
        document.getElementById("viewGoogleId").textContent = employee.google_id || "-";
        document.getElementById("viewRol").textContent = formatearTexto(employee.rol || "-");
        document.getElementById("viewActivo").textContent = employee.activo ? "Activo" : "Inactivo";
        document.getElementById("viewCorreoVerificado").textContent = employee.correo_verificado ? "Sí" : "No";
        document.getElementById("viewCalendarHabilitado").textContent = tieneCalendar ? "Sí" : "No";
        document.getElementById("viewCalendarId").textContent = employee.calendar_id || "primary";
        document.getElementById("viewTimezone").textContent = employee.timezone || "America/Costa_Rica";
        document.getElementById("viewUltimoLogin").textContent = formatearFecha(employee.ultimo_login);
        document.getElementById("viewFechaCreacion").textContent = formatearFecha(employee.fecha_creacion);
        document.getElementById("viewFechaActualizacion").textContent = formatearFecha(employee.fecha_actualizacion);
        document.getElementById("viewFotoUrl").textContent = employee.foto_url || "-";
        document.getElementById("viewGoogleRefreshToken").textContent = tieneRefreshToken ? "Registrado" : "-";

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
        const respuesta = await fetch(`${API_URL}/${encodeURIComponent(employeeId)}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ activo })
        });

        const data = await leerRespuestaJson(respuesta);

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

async function leerRespuestaJson(respuesta) {
    const contentType = respuesta.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await respuesta.json();
    }

    const texto = await respuesta.text();

    return {
        ok: false,
        mensaje: texto || "El servidor no devolvió una respuesta JSON."
    };
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

    let fecha = null;

    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {
        fecha = new Date(valor.seconds * 1000);
    } else if (
        typeof valor === "object" &&
        typeof valor._seconds === "number"
    ) {
        fecha = new Date(valor._seconds * 1000);
    } else {
        fecha = new Date(valor);
    }

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
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

    const usuarioGuardado = localStorage.getItem("usuarioCRM");

    if (!usuarioGuardado) {
        nombreUsuario.textContent = "Usuario";
        return;
    }

    try {
        const usuario = JSON.parse(usuarioGuardado);

        nombreUsuario.textContent =
            usuario.nombre ||
            usuario.correo ||
            "Usuario";
    } catch (error) {
        console.error("Error leyendo usuarioCRM:", error);
        nombreUsuario.textContent = "Usuario";
    }
}

window.verEmployee = verEmployee;
window.editarEmployee = editarEmployee;
window.abrirModalEstadoEmployee = abrirModalEstadoEmployee;