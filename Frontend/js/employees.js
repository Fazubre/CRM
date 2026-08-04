const config =
    window.CRM_CONFIG ||
    {};

const IS_RENDER_HOST =
    window.location.hostname
        .toLowerCase()
        .endsWith(
            ".onrender.com"
        );

const API_BASE_URL =
    String(
        IS_RENDER_HOST
            ? window.location.origin
            : (
                config.API_BASE_URL ||
                "https://crm-c40k.onrender.com"
            )
    ).replace(
        /\/$/,
        ""
    );

const LOGIN_URL =
    config.LOGIN_URL ||
    (
        IS_RENDER_HOST
            ? "/Views/LogIn.html"
            : "/CRM/Frontend/Views/LogIn.html"
    );

const COMPONENTS_BASE_URL =
    config.COMPONENTS_URL ||
    (
        IS_RENDER_HOST
            ? "/Views/components"
            : "/CRM/Frontend/Views/components"
    );

const API_URL =
    `${API_BASE_URL}/employees`;

let tablaEmployees =
    null;

let modalAddEmployee =
    null;

let modalEditEmployee =
    null;

let modalViewEmployee =
    null;

let modalStatusEmployee =
    null;

document.addEventListener(
    "DOMContentLoaded",
    inicializarEmployees,
    {
        once:
            true
    }
);

async function inicializarEmployees() {
    try {
        await cargarModalesEmployees();

        inicializarModales();
        inicializarEventos();

        await cargarEmployees();

        cargarNombreUsuario();
    } catch (error) {
        console.error(
            "Error al inicializar Employees:",
            error
        );

        mostrarAlerta(
            error.message ||
            "No fue posible inicializar la vista de employees.",
            "danger"
        );
    }
}

async function cargarModalesEmployees() {
    const contenedor =
        document.getElementById(
            "employeesModalsContainer"
        );

    if (!contenedor) {
        throw new Error(
            "No se encontró el contenedor de modales de employees."
        );
    }

    const rutas = [
        `${COMPONENTS_BASE_URL}/employees/modal-add-employee.html`,
        `${COMPONENTS_BASE_URL}/employees/modal-edit-employee.html`,
        `${COMPONENTS_BASE_URL}/employees/modal-view-employee.html`,
        `${COMPONENTS_BASE_URL}/employees/modal-status-employee.html`
    ];

    const respuestas =
        await Promise.all(
            rutas.map(
                async (
                    ruta
                ) => {
                    const respuesta =
                        await fetch(
                            ruta,
                            {
                                method:
                                    "GET",

                                credentials:
                                    "same-origin",

                                cache:
                                    "no-store"
                            }
                        );

                    if (!respuesta.ok) {
                        throw new Error(
                            `No se pudo cargar el componente ${ruta}`
                        );
                    }

                    return respuesta.text();
                }
            )
        );

    contenedor.innerHTML =
        respuestas.join(
            "\n"
        );
}

function inicializarModales() {
    const BootstrapModal =
        window.bootstrap?.Modal;

    if (!BootstrapModal) {
        throw new Error(
            "Bootstrap no está disponible para inicializar los modales."
        );
    }

    const addElement =
        document.getElementById(
            "modalEmployee"
        );

    const editElement =
        document.getElementById(
            "modalEditEmployee"
        );

    const viewElement =
        document.getElementById(
            "modalViewEmployee"
        );

    const statusElement =
        document.getElementById(
            "modalStatusEmployee"
        );

    if (addElement) {
        modalAddEmployee =
            new BootstrapModal(
                addElement
            );
    }

    if (editElement) {
        modalEditEmployee =
            new BootstrapModal(
                editElement
            );
    }

    if (viewElement) {
        modalViewEmployee =
            new BootstrapModal(
                viewElement
            );
    }

    if (statusElement) {
        modalStatusEmployee =
            new BootstrapModal(
                statusElement
            );
    }
}

function inicializarEventos() {
    document
        .getElementById(
            "btnNuevoEmployee"
        )
        ?.addEventListener(
            "click",
            abrirModalNuevoEmployee
        );

    document
        .getElementById(
            "btnRecargarEmployees"
        )
        ?.addEventListener(
            "click",
            cargarEmployees
        );

    document
        .getElementById(
            "formEmployee"
        )
        ?.addEventListener(
            "submit",
            guardarNuevoEmployee
        );

    document
        .getElementById(
            "formEditEmployee"
        )
        ?.addEventListener(
            "submit",
            guardarEdicionEmployee
        );

    document
        .getElementById(
            "btnConfirmarStatusEmployee"
        )
        ?.addEventListener(
            "click",
            cambiarEstadoEmployee
        );
}

async function cargarEmployees() {
    try {
        const data =
            await requestJson(
                API_URL,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );

        const employees =
            Array.isArray(
                data.employees
            )
                ? data.employees
                : Array.isArray(
                    data.empleados
                )
                    ? data.empleados
                    : [];

        renderizarTablaEmployees(
            employees
        );
    } catch (error) {
        console.error(
            "Error al cargar employees:",
            error
        );

        mostrarAlerta(
            error.message ||
            "Error al cargar employees.",
            "danger"
        );

        renderizarTablaEmployees(
            []
        );
    }
}

function renderizarTablaEmployees(
    employees
) {
    const tbody =
        document.querySelector(
            "#tablaEmployees tbody"
        );

    if (!tbody) {
        return;
    }

    destruirDataTable();

    tbody.innerHTML =
        "";

    if (
        !Array.isArray(
            employees
        ) ||
        employees.length === 0
    ) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="text-center text-muted py-4"
                >
                    No hay employees registrados.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        employees
            .map(
                (
                    employee
                ) => {
                    const employeeId =
                        getEmployeeId(
                            employee
                        );

                    return `
                        <tr>
                            <td>
                                ${escapeHtml(
                                    employee.nombre ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    employee.correo ||
                                    employee.google_correo ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatearTexto(
                                        employee.rol ||
                                        "-"
                                    )
                                )}
                            </td>

                            <td>
                                <span
                                    class="badge ${
                                        employee.activo
                                            ? "text-bg-success"
                                            : "text-bg-secondary"
                                    }"
                                >
                                    ${
                                        employee.activo
                                            ? "Activo"
                                            : "Inactivo"
                                    }
                                </span>
                            </td>

                            <td>
                                ${renderGoogleStatus(
                                    employee
                                )}
                            </td>

                            <td>
                                ${renderCalendarStatus(
                                    employee
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatearFecha(
                                        employee.ultimo_login
                                    )
                                )}
                            </td>

                            <td>
                                <div
                                    class="d-flex gap-2 flex-wrap"
                                >
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-secondary"
                                        onclick="verEmployee('${escapeHtml(employeeId)}')"
                                        title="Ver employee"
                                    >
                                        <i class="fa-solid fa-eye"></i>
                                    </button>

                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-primary"
                                        onclick="editarEmployee('${escapeHtml(employeeId)}')"
                                        title="Editar employee"
                                    >
                                        <i class="fa-solid fa-pen"></i>
                                    </button>

                                    <button
                                        type="button"
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
                }
            )
            .join("");

    inicializarDataTable();
}

function destruirDataTable() {
    if (tablaEmployees) {
        try {
            tablaEmployees
                .clear()
                .destroy();
        } catch (error) {
            console.warn(
                "No fue posible destruir DataTables:",
                error
            );
        }

        tablaEmployees =
            null;
    }
}

function inicializarDataTable() {
    const jquery =
        window.jQuery ||
        window.$;

    if (
        !jquery ||
        !jquery.fn?.DataTable
    ) {
        console.warn(
            "DataTables no está disponible."
        );

        return;
    }

    tablaEmployees =
        jquery(
            "#tablaEmployees"
        ).DataTable({
            language: {
                url:
                    "https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-ES.json"
            },

            responsive:
                true,

            destroy:
                true,

            pageLength:
                10,

            order:
                []
        });
}

function getEmployeeId(
    employee
) {
    return String(
        employee?.employee_id ||
        employee?.id ||
        employee?.employeeId ||
        ""
    );
}

function setInputValueIfExists(
    id,
    value
) {
    const input =
        document.getElementById(
            id
        );

    if (input) {
        input.value =
            value ??
            "";
    }
}

function getInputValueIfExists(
    id,
    defaultValue = ""
) {
    const input =
        document.getElementById(
            id
        );

    if (!input) {
        return defaultValue;
    }

    return String(
        input.value ||
        ""
    ).trim();
}

function setTextValueIfExists(
    id,
    value
) {
    const element =
        document.getElementById(
            id
        );

    if (element) {
        element.textContent =
            value === null ||
            value === undefined ||
            value === ""
                ? "-"
                : String(value);
    }
}

function setPlaceholderIfExists(
    id,
    value
) {
    const input =
        document.getElementById(
            id
        );

    if (input) {
        input.placeholder =
            value;
    }
}

function employeeTieneGoogle(
    employee
) {
    return (
        employee?.google_conectado ===
            true ||
        Boolean(
            employee?.google_id
        ) ||
        Boolean(
            employee?.google_correo
        ) ||
        Boolean(
            employee?.google_nombre
        )
    );
}

function employeeTieneCalendar(
    employee
) {
    const googleCalendar =
        employee?.google_calendar ||
        {};

    return (
        employee?.google_calendar_conectado ===
            true ||
        employee?.calendar_habilitado ===
            true ||
        googleCalendar.conectado ===
            true ||
        Boolean(
            googleCalendar.refresh_token
        ) ||
        Boolean(
            employee?.google_refresh_token
        )
    );
}

function obtenerRefreshTokenCalendar(
    employee
) {
    return (
        employee?.google_refresh_token ||
        employee?.google_calendar
            ?.refresh_token ||
        ""
    );
}

function renderGoogleStatus(
    employee
) {
    if (
        employeeTieneGoogle(
            employee
        )
    ) {
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

function renderCalendarStatus(
    employee
) {
    if (
        employeeTieneCalendar(
            employee
        )
    ) {
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

    modalAddEmployee?.show();
}

async function guardarNuevoEmployee(
    event
) {
    event.preventDefault();

    const payload = {
        nombre:
            getInputValueIfExists(
                "nombre"
            ),

        correo:
            getInputValueIfExists(
                "correo"
            ),

        google_id:
            getInputValueIfExists(
                "google_id"
            ),

        foto_url:
            getInputValueIfExists(
                "foto_url"
            ),

        rol:
            getInputValueIfExists(
                "rol",
                "employee"
            ) ||
            "employee",

        activo:
            getInputValueIfExists(
                "activo",
                "true"
            ) ===
            "true",

        correo_verificado:
            getInputValueIfExists(
                "correo_verificado",
                "false"
            ) ===
            "true",

        calendar_habilitado:
            getInputValueIfExists(
                "calendar_habilitado",
                "false"
            ) ===
            "true",

        calendar_id:
            getInputValueIfExists(
                "calendar_id",
                "primary"
            ) ||
            "primary",

        timezone:
            getInputValueIfExists(
                "timezone",
                "America/Costa_Rica"
            ) ||
            "America/Costa_Rica"
    };

    const refreshToken =
        limpiarToken(
            getInputValueIfExists(
                "google_refresh_token"
            )
        );

    if (refreshToken) {
        payload.google_refresh_token =
            refreshToken;
    }

    if (!payload.nombre) {
        mostrarAlerta(
            "El nombre del employee es obligatorio.",
            "warning"
        );

        return;
    }

    if (!payload.correo) {
        mostrarAlerta(
            "El correo del employee es obligatorio.",
            "warning"
        );

        return;
    }

    try {
        const data =
            await requestJson(
                API_URL,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        modalAddEmployee?.hide();

        mostrarAlerta(
            data.mensaje ||
            "Employee creado correctamente.",
            "success"
        );

        await cargarEmployees();
    } catch (error) {
        console.error(
            "Error al crear employee:",
            error
        );

        mostrarAlerta(
            error.message ||
            "Error al crear employee.",
            "danger"
        );
    }
}

async function editarEmployee(
    employeeId
) {
    try {
        const data =
            await requestJson(
                (
                    `${API_URL}/` +
                    `${encodeURIComponent(employeeId)}`
                ),
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );

        const employee =
            data.employee;

        if (!employee) {
            throw new Error(
                "El servidor no devolvió el employee."
            );
        }

        const id =
            getEmployeeId(
                employee
            );

        const tieneCalendar =
            employeeTieneCalendar(
                employee
            );

        setInputValueIfExists(
            "editEmployeeId",
            id
        );

        setInputValueIfExists(
            "editNombre",
            employee.nombre ||
            ""
        );

        setInputValueIfExists(
            "editCorreo",

            employee.correo ||
            employee.google_correo ||
            ""
        );

        setInputValueIfExists(
            "editGoogleId",
            employee.google_id ||
            ""
        );

        setInputValueIfExists(
            "editFotoUrl",
            employee.foto_url ||
            ""
        );

        setInputValueIfExists(
            "editRol",
            employee.rol ||
            "employee"
        );

        setInputValueIfExists(
            "editActivo",
            String(
                Boolean(
                    employee.activo
                )
            )
        );

        setInputValueIfExists(
            "editCorreoVerificado",
            String(
                Boolean(
                    employee.correo_verificado
                )
            )
        );

        setInputValueIfExists(
            "editCalendarHabilitado",
            String(
                tieneCalendar
            )
        );

        setInputValueIfExists(
            "editCalendarId",
            employee.calendar_id ||
            "primary"
        );

        setInputValueIfExists(
            "editTimezone",
            employee.timezone ||
            "America/Costa_Rica"
        );

        setInputValueIfExists(
            "editGoogleRefreshToken",
            ""
        );

        setPlaceholderIfExists(
            "editGoogleRefreshToken",

            obtenerRefreshTokenCalendar(
                employee
            )
                ? "Ya existe un refresh token guardado. Escribe uno nuevo solamente para reemplazarlo."
                : "Se usará después para Calendar"
        );

        modalEditEmployee?.show();
    } catch (error) {
        console.error(
            "Error al cargar employee para editar:",
            error
        );

        mostrarAlerta(
            error.message ||
            "No fue posible cargar el employee.",
            "danger"
        );
    }
}

async function guardarEdicionEmployee(
    event
) {
    event.preventDefault();

    const employeeId =
        getInputValueIfExists(
            "editEmployeeId"
        );

    const payload = {
        nombre:
            getInputValueIfExists(
                "editNombre"
            ),

        correo:
            getInputValueIfExists(
                "editCorreo"
            ),

        google_id:
            getInputValueIfExists(
                "editGoogleId"
            ),

        foto_url:
            getInputValueIfExists(
                "editFotoUrl"
            ),

        rol:
            getInputValueIfExists(
                "editRol",
                "employee"
            ),

        activo:
            getInputValueIfExists(
                "editActivo",
                "true"
            ) ===
            "true",

        correo_verificado:
            getInputValueIfExists(
                "editCorreoVerificado",
                "false"
            ) ===
            "true"
    };

    if (
        document.getElementById(
            "editCalendarHabilitado"
        )
    ) {
        payload.calendar_habilitado =
            getInputValueIfExists(
                "editCalendarHabilitado",
                "false"
            ) ===
            "true";
    }

    if (
        document.getElementById(
            "editCalendarId"
        )
    ) {
        payload.calendar_id =
            getInputValueIfExists(
                "editCalendarId",
                "primary"
            ) ||
            "primary";
    }

    if (
        document.getElementById(
            "editTimezone"
        )
    ) {
        payload.timezone =
            getInputValueIfExists(
                "editTimezone",
                "America/Costa_Rica"
            ) ||
            "America/Costa_Rica";
    }

    const refreshToken =
        limpiarToken(
            getInputValueIfExists(
                "editGoogleRefreshToken"
            )
        );

    if (refreshToken) {
        payload.google_refresh_token =
            refreshToken;
    }

    if (!employeeId) {
        mostrarAlerta(
            "No se encontró el ID del employee a editar.",
            "warning"
        );

        return;
    }

    if (!payload.nombre) {
        mostrarAlerta(
            "El nombre del employee es obligatorio.",
            "warning"
        );

        return;
    }

    if (!payload.correo) {
        mostrarAlerta(
            "El correo del employee es obligatorio.",
            "warning"
        );

        return;
    }

    try {
        const data =
            await requestJson(
                (
                    `${API_URL}/` +
                    `${encodeURIComponent(employeeId)}`
                ),
                {
                    method:
                        "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

        modalEditEmployee?.hide();

        mostrarAlerta(
            data.mensaje ||
            "Employee actualizado correctamente.",
            "success"
        );

        await cargarEmployees();
    } catch (error) {
        console.error(
            "Error al actualizar employee:",
            error
        );

        mostrarAlerta(
            error.message ||
            "Error al actualizar employee.",
            "danger"
        );
    }
}

async function verEmployee(
    employeeId
) {
    try {
        const data =
            await requestJson(
                (
                    `${API_URL}/` +
                    `${encodeURIComponent(employeeId)}`
                ),
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );

        const employee =
            data.employee;

        if (!employee) {
            throw new Error(
                "El servidor no devolvió el employee."
            );
        }

        const tieneCalendar =
            employeeTieneCalendar(
                employee
            );

        const tieneRefreshToken =
            Boolean(
                obtenerRefreshTokenCalendar(
                    employee
                )
            );

        setTextValueIfExists(
            "viewNombre",
            employee.nombre
        );

        setTextValueIfExists(
            "viewCorreo",

            employee.correo ||
            employee.google_correo
        );

        setTextValueIfExists(
            "viewGoogleId",
            employee.google_id
        );

        setTextValueIfExists(
            "viewRol",
            formatearTexto(
                employee.rol
            )
        );

        setTextValueIfExists(
            "viewActivo",
            employee.activo
                ? "Activo"
                : "Inactivo"
        );

        setTextValueIfExists(
            "viewCorreoVerificado",

            employee.correo_verificado
                ? "Sí"
                : "No"
        );

        setTextValueIfExists(
            "viewCalendarHabilitado",

            tieneCalendar
                ? "Sí"
                : "No"
        );

        setTextValueIfExists(
            "viewCalendarId",

            employee.calendar_id ||
            "primary"
        );

        setTextValueIfExists(
            "viewTimezone",

            employee.timezone ||
            "America/Costa_Rica"
        );

        setTextValueIfExists(
            "viewUltimoLogin",
            formatearFecha(
                employee.ultimo_login
            )
        );

        setTextValueIfExists(
            "viewFechaCreacion",
            formatearFecha(
                employee.fecha_creacion
            )
        );

        setTextValueIfExists(
            "viewFechaActualizacion",
            formatearFecha(
                employee.fecha_actualizacion
            )
        );

        setTextValueIfExists(
            "viewFotoUrl",
            employee.foto_url
        );

        setTextValueIfExists(
            "viewGoogleRefreshToken",

            tieneRefreshToken
                ? "Registrado"
                : "-"
        );

        modalViewEmployee?.show();
    } catch (error) {
        console.error(
            "Error al ver employee:",
            error
        );

        mostrarAlerta(
            error.message ||
            "No fue posible obtener el detalle del employee.",
            "danger"
        );
    }
}

function abrirModalEstadoEmployee(
    employeeId,
    activoActual
) {
    setInputValueIfExists(
        "statusEmployeeId",
        employeeId
    );

    setInputValueIfExists(
        "nuevoStatusEmployee",
        String(
            !activoActual
        )
    );

    setTextValueIfExists(
        "textoStatusEmployee",

        (
            `Vas a cambiar el estado del employee a ` +
            `${!activoActual ? "Activo" : "Inactivo"}.`
        )
    );

    modalStatusEmployee?.show();
}

async function cambiarEstadoEmployee() {
    const employeeId =
        getInputValueIfExists(
            "statusEmployeeId"
        );

    const activo =
        getInputValueIfExists(
            "nuevoStatusEmployee"
        ) ===
        "true";

    if (!employeeId) {
        mostrarAlerta(
            "No se encontró el ID del employee.",
            "warning"
        );

        return;
    }

    try {
        const data =
            await requestJson(
                (
                    `${API_URL}/` +
                    `${encodeURIComponent(employeeId)}` +
                    "/status"
                ),
                {
                    method:
                        "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            activo
                        })
                }
            );

        modalStatusEmployee?.hide();

        mostrarAlerta(
            data.mensaje ||
            "Estado del employee actualizado correctamente.",
            "success"
        );

        await cargarEmployees();
    } catch (error) {
        console.error(
            "Error al cambiar estado del employee:",
            error
        );

        mostrarAlerta(
            error.message ||
            "Error al cambiar el estado del employee.",
            "danger"
        );
    }
}

function limpiarFormularioNuevoEmployee() {
    setInputValueIfExists(
        "nombre",
        ""
    );

    setInputValueIfExists(
        "correo",
        ""
    );

    setInputValueIfExists(
        "google_id",
        ""
    );

    setInputValueIfExists(
        "foto_url",
        ""
    );

    setInputValueIfExists(
        "rol",
        "employee"
    );

    setInputValueIfExists(
        "activo",
        "true"
    );

    setInputValueIfExists(
        "correo_verificado",
        "false"
    );

    setInputValueIfExists(
        "calendar_habilitado",
        "false"
    );

    setInputValueIfExists(
        "calendar_id",
        "primary"
    );

    setInputValueIfExists(
        "timezone",
        "America/Costa_Rica"
    );

    setInputValueIfExists(
        "google_refresh_token",
        ""
    );
}

function limpiarToken(
    valor
) {
    const texto =
        String(
            valor ||
            ""
        ).trim();

    return (
        texto ||
        null
    );
}

async function requestJson(
    url,
    options = {}
) {
    const respuesta =
        await fetch(
            url,
            {
                ...options,

                credentials:
                    "include",

                headers: {
                    Accept:
                        "application/json",

                    ...(
                        options.headers ||
                        {}
                    )
                }
            }
        );

    const data =
        await leerRespuestaJson(
            respuesta
        );

    if (respuesta.status === 401) {
        localStorage.removeItem(
            "usuarioCRM"
        );

        window.location.replace(
            LOGIN_URL
        );

        throw new Error(
            "La sesión ha expirado."
        );
    }

    if (
        !respuesta.ok ||
        data.ok === false
    ) {
        const error =
            new Error(
                data.mensaje ||
                "No fue posible completar la operación."
            );

        error.status =
            respuesta.status;

        throw error;
    }

    return data;
}

async function leerRespuestaJson(
    respuesta
) {
    const contentType =
        respuesta.headers.get(
            "content-type"
        ) ||
        "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        return respuesta.json();
    }

    const texto =
        await respuesta.text();

    return {
        ok:
            false,

        mensaje:
            texto ||
            "El servidor no devolvió una respuesta JSON."
    };
}

function mostrarAlerta(
    mensaje,
    tipo = "info"
) {
    const alertContainer =
        document.getElementById(
            "alertContainer"
        );

    if (!alertContainer) {
        console.log(
            mensaje
        );

        return;
    }

    alertContainer.innerHTML = `
        <div
            class="alert alert-${escapeHtml(tipo)} alert-dismissible fade show"
            role="alert"
        >
            ${escapeHtml(
                mensaje
            )}

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Cerrar"
            ></button>
        </div>
    `;
}

function formatearFecha(
    valor
) {
    if (!valor) {
        return "-";
    }

    let fecha =
        null;

    if (
        typeof valor === "object" &&
        typeof valor.seconds === "number"
    ) {
        fecha =
            new Date(
                valor.seconds *
                1000
            );
    } else if (
        typeof valor === "object" &&
        typeof valor._seconds === "number"
    ) {
        fecha =
            new Date(
                valor._seconds *
                1000
            );
    } else if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {
        fecha =
            valor.toDate();
    } else {
        fecha =
            new Date(
                valor
            );
    }

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return String(
            valor
        );
    }

    return fecha.toLocaleString(
        "es-CR"
    );
}

function formatearTexto(
    valor
) {
    if (!valor) {
        return "-";
    }

    return String(
        valor
    )
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            (
                letra
            ) => {
                return letra.toUpperCase();
            }
        );
}

function cargarNombreUsuario() {
    const nombreUsuario =
        document.getElementById(
            "nombreUsuario"
        );

    if (!nombreUsuario) {
        return;
    }

    const usuarioGuardado =
        localStorage.getItem(
            "usuarioCRM"
        );

    if (!usuarioGuardado) {
        nombreUsuario.textContent =
            "Usuario";

        return;
    }

    try {
        const usuario =
            JSON.parse(
                usuarioGuardado
            );

        nombreUsuario.textContent =
            usuario.nombre ||
            usuario.correo ||
            "Usuario";
    } catch (error) {
        console.error(
            "Error leyendo usuarioCRM:",
            error
        );

        nombreUsuario.textContent =
            "Usuario";
    }
}

function escapeHtml(
    texto
) {
    return String(
        texto ??
        ""
    )
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
            "&#039;"
        );
}

window.verEmployee =
    verEmployee;

window.editarEmployee =
    editarEmployee;

window.abrirModalEstadoEmployee =
    abrirModalEstadoEmployee;