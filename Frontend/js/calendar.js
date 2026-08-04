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

const EMPLOYEES_URL =
    `${API_BASE_URL}/employees`;

const CALENDAR_CONNECT_URL =
    `${API_BASE_URL}/calendar/conectar`;

let empleadosCalendarCache =
    [];

let modalConectarCalendar =
    null;

let modalEstadoCalendar =
    null;

window.addEventListener(
    "load",
    inicializarCalendar
);

async function inicializarCalendar() {
    try {
        await cargarModalesCalendar();

        inicializarModalesCalendar();
        configurarBotonConectar();
        configurarConfirmacionCalendar();

        /*
         * Los empleados se cargan antes de procesar
         * los parámetros del callback de Google.
         *
         * De esta manera se puede mostrar correctamente
         * el nombre del empleado conectado.
         */
        await cargarEmpleadosCalendar();

        configurarEstadoInicial();
    } catch (error) {
        console.error(
            "Error inicializando Google Calendar:",
            error
        );

        mostrarEstado(
            error.message ||
            "No fue posible cargar la pantalla de Google Calendar.",
            "danger"
        );
    }
}

async function cargarModalesCalendar() {
    const modales = [
        {
            contenedorId:
                "contenedorModalConectarCalendar",

            ruta:
                `${COMPONENTS_BASE_URL}/calendar/modal-connect-calendar.html`
        },
        {
            contenedorId:
                "contenedorModalEstadoCalendar",

            ruta:
                `${COMPONENTS_BASE_URL}/Calendar/modal-calendar-status.html`
        }
    ];

    for (
        const modal
        of modales
    ) {
        const contenedor =
            document.getElementById(
                modal.contenedorId
            );

        if (!contenedor) {
            console.warn(
                `No existe el contenedor ${modal.contenedorId}.`
            );

            continue;
        }

        const response =
            await fetch(
                modal.ruta,
                {
                    method:
                        "GET",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `No fue posible cargar ${modal.ruta}.`
            );
        }

        contenedor.innerHTML =
            await response.text();
    }
}

function inicializarModalesCalendar() {
    const BootstrapModal =
        window.bootstrap?.Modal;

    if (!BootstrapModal) {
        console.warn(
            "Bootstrap JS no está cargado. Los modales no se podrán abrir."
        );

        return;
    }

    const modalConectarElement =
        document.getElementById(
            "modalConectarCalendar"
        );

    const modalEstadoElement =
        document.getElementById(
            "modalEstadoCalendar"
        );

    if (modalConectarElement) {
        modalConectarCalendar =
            new BootstrapModal(
                modalConectarElement
            );
    }

    if (modalEstadoElement) {
        modalEstadoCalendar =
            new BootstrapModal(
                modalEstadoElement
            );
    }
}

async function cargarEmpleadosCalendar() {
    const selectEmpleado =
        document.getElementById(
            "selectEmpleadoCalendar"
        );

    const btnConectarCalendar =
        document.getElementById(
            "btnConectarCalendar"
        );

    if (!selectEmpleado) {
        return;
    }

    try {
        if (btnConectarCalendar) {
            btnConectarCalendar.disabled =
                true;
        }

        selectEmpleado.innerHTML = `
            <option value="">
                Cargando empleados...
            </option>
        `;

        const data =
            await requestJson(
                EMPLOYEES_URL,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );

        empleadosCalendarCache =
            Array.isArray(
                data.employees
            )
                ? data.employees
                : Array.isArray(
                    data.empleados
                )
                    ? data.empleados
                    : [];

        selectEmpleado.innerHTML = `
            <option value="">
                Seleccione un empleado
            </option>
        `;

        empleadosCalendarCache.forEach(
            (
                empleado
            ) => {
                const option =
                    document.createElement(
                        "option"
                    );

                const empleadoId =
                    getEmployeeId(
                        empleado
                    );

                const nombre =
                    empleado.nombre ||
                    empleado.name ||
                    "Empleado";

                const correo =
                    empleado.correo ||
                    empleado.email ||
                    empleado.google_correo ||
                    "";

                const calendarConectado =
                    employeeTieneCalendar(
                        empleado
                    );

                option.value =
                    empleadoId;

                option.textContent =
                    [
                        nombre,
                        correo,

                        calendarConectado
                            ? "Calendar conectado"
                            : "Calendar sin conectar"
                    ]
                        .filter(
                            Boolean
                        )
                        .join(
                            " | "
                        );

                option.dataset
                    .calendarConectado =
                    String(
                        calendarConectado
                    );

                selectEmpleado.appendChild(
                    option
                );
            }
        );

        const params =
            new URLSearchParams(
                window.location.search
            );

        const empleadoIdUrl =
            params.get(
                "empleadoId"
            );

        if (empleadoIdUrl) {
            selectEmpleado.value =
                empleadoIdUrl;
        }

        if (btnConectarCalendar) {
            btnConectarCalendar.disabled =
                false;
        }
    } catch (error) {
        console.error(
            "Error cargando empleados:",
            error
        );

        empleadosCalendarCache =
            [];

        selectEmpleado.innerHTML = `
            <option value="">
                Error al cargar empleados
            </option>
        `;

        mostrarEstado(
            error.message ||
            "No fue posible cargar los empleados.",
            "danger"
        );

        if (btnConectarCalendar) {
            btnConectarCalendar.disabled =
                true;
        }
    }
}

function configurarEstadoInicial() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const estado =
        params.get(
            "estado"
        );

    const mensaje =
        params.get(
            "mensaje"
        );

    const correo =
        params.get(
            "correo"
        );

    const empleadoId =
        params.get(
            "empleadoId"
        );

    if (estado === "ok") {
        const mensajeExito =
            correo
                ? `Google Calendar conectado correctamente con ${correo}.`
                : "Google Calendar conectado correctamente.";

        mostrarEstado(
            mensajeExito,
            "success"
        );

        mostrarModalEstadoCalendar({
            tipo:
                "success",

            mensaje:
                mensajeExito,

            empleadoId,

            correo,

            resultado:
                "Conexión completada"
        });

        limpiarParametrosUrl();

        return;
    }

    if (estado === "error") {
        const mensajeError =
            mensaje ||
            "No fue posible conectar Google Calendar.";

        mostrarEstado(
            mensajeError,
            "danger"
        );

        mostrarModalEstadoCalendar({
            tipo:
                "danger",

            mensaje:
                mensajeError,

            empleadoId,

            correo,

            resultado:
                "Error de conexión"
        });

        limpiarParametrosUrl();

        return;
    }

    mostrarEstado(
        "Selecciona un empleado para conectar su Google Calendar.",
        "info"
    );
}

function configurarBotonConectar() {
    const btnConectarCalendar =
        document.getElementById(
            "btnConectarCalendar"
        );

    const selectEmpleado =
        document.getElementById(
            "selectEmpleadoCalendar"
        );

    if (
        !btnConectarCalendar ||
        !selectEmpleado
    ) {
        return;
    }

    btnConectarCalendar.addEventListener(
        "click",
        () => {
            const empleadoId =
                selectEmpleado.value;

            if (!empleadoId) {
                mostrarEstado(
                    "Primero debes seleccionar un empleado.",
                    "warning"
                );

                return;
            }

            const empleado =
                buscarEmpleadoPorId(
                    empleadoId
                );

            llenarModalConectarCalendar(
                empleado
            );

            if (modalConectarCalendar) {
                modalConectarCalendar.show();

                return;
            }

            redirigirAConexionCalendar(
                empleadoId
            );
        }
    );
}

function configurarConfirmacionCalendar() {
    const btnConfirmar =
        document.getElementById(
            "btnConfirmarConectarCalendar"
        );

    const selectEmpleado =
        document.getElementById(
            "selectEmpleadoCalendar"
        );

    if (
        !btnConfirmar ||
        !selectEmpleado
    ) {
        return;
    }

    btnConfirmar.addEventListener(
        "click",
        () => {
            const empleadoId =
                selectEmpleado.value;

            if (!empleadoId) {
                mostrarAlertaModalCalendar(
                    "Primero debes seleccionar un empleado."
                );

                return;
            }

            btnConfirmar.disabled =
                true;

            btnConfirmar.textContent =
                "Conectando...";

            redirigirAConexionCalendar(
                empleadoId
            );
        }
    );
}

function redirigirAConexionCalendar(
    empleadoId
) {
    const url =
        (
            `${CALENDAR_CONNECT_URL}?empleadoId=` +
            `${encodeURIComponent(empleadoId)}`
        );

    window.location.assign(
        url
    );
}

function llenarModalConectarCalendar(
    empleado
) {
    const nombre =
        empleado?.nombre ||
        empleado?.name ||
        "Empleado";

    const correo =
        empleado?.correo ||
        empleado?.email ||
        empleado?.google_correo ||
        "Sin correo registrado";

    const conectado =
        employeeTieneCalendar(
            empleado
        );

    setTextValue(
        "modalCalendarEmpleadoNombre",
        nombre
    );

    setTextValue(
        "modalCalendarEmpleadoCorreo",
        correo
    );

    setTextValue(
        "modalCalendarEmpleadoEstado",

        conectado
            ? "Calendar ya está conectado. Puedes reconectarlo para actualizar sus permisos."
            : "Calendar sin conectar."
    );

    const alerta =
        document.getElementById(
            "alertaModalCalendar"
        );

    if (alerta) {
        alerta.textContent =
            "";

        alerta.classList.add(
            "d-none"
        );
    }

    const btnConfirmar =
        document.getElementById(
            "btnConfirmarConectarCalendar"
        );

    if (btnConfirmar) {
        btnConfirmar.disabled =
            false;

        btnConfirmar.textContent =
            conectado
                ? "Reconectar Calendar"
                : "Conectar Calendar";
    }
}

function mostrarModalEstadoCalendar({
    tipo,
    mensaje,
    empleadoId,
    correo,
    resultado
}) {
    const empleado =
        buscarEmpleadoPorId(
            empleadoId
        );

    const nombreEmpleado =
        empleado?.nombre ||
        empleado?.name ||
        empleadoId ||
        "-";

    const alerta =
        document.getElementById(
            "modalEstadoCalendarAlert"
        );

    if (alerta) {
        alerta.className =
            `alert alert-${tipo || "info"}`;

        alerta.textContent =
            mensaje ||
            "Estado de Google Calendar actualizado.";
    }

    setTextValue(
        "modalEstadoCalendarEmpleado",
        nombreEmpleado
    );

    setTextValue(
        "modalEstadoCalendarCorreo",
        correo ||
        "-"
    );

    setTextValue(
        "modalEstadoCalendarResultado",
        resultado ||
        "-"
    );

    if (modalEstadoCalendar) {
        modalEstadoCalendar.show();
    }
}

function mostrarAlertaModalCalendar(
    mensaje
) {
    const alerta =
        document.getElementById(
            "alertaModalCalendar"
        );

    if (!alerta) {
        return;
    }

    alerta.textContent =
        mensaje;

    alerta.classList.remove(
        "d-none"
    );
}

function buscarEmpleadoPorId(
    empleadoId
) {
    if (!empleadoId) {
        return null;
    }

    return (
        empleadosCalendarCache.find(
            (
                empleado
            ) => {
                return (
                    String(
                        getEmployeeId(
                            empleado
                        )
                    ) ===
                    String(
                        empleadoId
                    )
                );
            }
        ) ||
        null
    );
}

function getEmployeeId(
    empleado
) {
    return String(
        empleado?.employee_id ||
        empleado?.id ||
        empleado?.employeeId ||
        ""
    );
}

function employeeTieneCalendar(
    empleado
) {
    const googleCalendar =
        empleado?.google_calendar ||
        {};

    return (
        empleado?.google_calendar_conectado ===
            true ||
        empleado?.calendar_habilitado ===
            true ||
        googleCalendar.conectado ===
            true ||
        Boolean(
            googleCalendar.refresh_token
        ) ||
        Boolean(
            empleado?.google_refresh_token
        )
    );
}

async function requestJson(
    url,
    options = {}
) {
    const response =
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
        await leerRespuesta(
            response
        );

    if (response.status === 401) {
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
        !response.ok ||
        data.ok === false
    ) {
        const error =
            new Error(
                data.mensaje ||
                "No fue posible completar la operación."
            );

        error.status =
            response.status;

        throw error;
    }

    return data;
}

async function leerRespuesta(
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
        ok:
            false,

        mensaje:
            await response.text() ||
            "El servidor no devolvió una respuesta válida."
    };
}

function mostrarEstado(
    mensaje,
    tipo
) {
    const calendarStatus =
        document.getElementById(
            "calendarStatus"
        );

    if (!calendarStatus) {
        return;
    }

    calendarStatus.className =
        `alert alert-${tipo}`;

    calendarStatus.textContent =
        mensaje;
}

function setTextValue(
    id,
    value
) {
    const element =
        document.getElementById(
            id
        );

    if (element) {
        element.textContent =
            value ||
            "-";
    }
}

function limpiarParametrosUrl() {
    if (
        !window.history
            ?.replaceState
    ) {
        return;
    }

    const urlLimpia =
        (
            `${window.location.origin}` +
            `${window.location.pathname}`
        );

    window.history.replaceState(
        {},
        document.title,
        urlLimpia
    );
}