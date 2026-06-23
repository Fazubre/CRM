const BACKEND_URL = "https://crm-c40k.onrender.com";

let empleadosCalendarCache = [];
let modalConectarCalendar = null;
let modalEstadoCalendar = null;

window.addEventListener("load", async () => {
    try {
        await cargarModalesCalendar();

        inicializarModalesCalendar();
        configurarEstadoInicial();

        await cargarEmpleadosCalendar();

        configurarBotonConectar();
        configurarConfirmacionCalendar();
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
});

async function cargarModalesCalendar() {
    const modales = [
        {
            contenedorId: "contenedorModalConectarCalendar",
            ruta: "./components/Calendar/modal-connect-calendar.html"
        },
        {
            contenedorId: "contenedorModalEstadoCalendar",
            ruta: "./components/Calendar/modal-calendar-status.html"
        }
    ];

    for (const modal of modales) {
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
            await fetch(modal.ruta);

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
    const modalConectarElement =
        document.getElementById(
            "modalConectarCalendar"
        );

    const modalEstadoElement =
        document.getElementById(
            "modalEstadoCalendar"
        );

    if (
        typeof bootstrap === "undefined"
    ) {
        console.warn(
            "Bootstrap JS no está cargado. Los modales no se podrán abrir."
        );

        return;
    }

    if (modalConectarElement) {
        modalConectarCalendar =
            new bootstrap.Modal(
                modalConectarElement
            );
    }

    if (modalEstadoElement) {
        modalEstadoCalendar =
            new bootstrap.Modal(
                modalEstadoElement
            );
    }
}

function configurarEstadoInicial() {
    const params =
        new URLSearchParams(
            window.location.search
        );

    const estado =
        params.get("estado");

    const mensaje =
        params.get("mensaje");

    const correo =
        params.get("correo");

    const empleadoId =
        params.get("empleadoId");

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
            tipo: "success",
            mensaje: mensajeExito,
            empleadoId,
            correo,
            resultado: "Conexión completada"
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
            tipo: "danger",
            mensaje: mensajeError,
            empleadoId,
            correo,
            resultado: "Error de conexión"
        });

        limpiarParametrosUrl();

        return;
    }

    mostrarEstado(
        "Selecciona un empleado para conectar su Google Calendar.",
        "info"
    );
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
            btnConectarCalendar.disabled = true;
        }

        selectEmpleado.innerHTML =
            `<option value="">Cargando empleados...</option>`;

        const response =
            await fetch(
                `${BACKEND_URL}/employees`
            );

        const data =
            await leerRespuesta(response);

        if (!response.ok || !data.ok) {
            throw new Error(
                data.mensaje ||
                "No fue posible cargar los empleados."
            );
        }

        empleadosCalendarCache =
            Array.isArray(data.employees)
                ? data.employees
                : [];

        selectEmpleado.innerHTML =
            `<option value="">Seleccione un empleado</option>`;

        empleadosCalendarCache.forEach((empleado) => {
            const option =
                document.createElement("option");

            const empleadoId =
                empleado.id ||
                empleado.employeeId ||
                "";

            const nombre =
                empleado.nombre ||
                empleado.name ||
                "Empleado";

            const correo =
                empleado.correo ||
                empleado.email ||
                "";

            const calendarConectado =
                empleado.google_calendar?.conectado === true;

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
                    .filter(Boolean)
                    .join(" | ");

            if (calendarConectado) {
                option.dataset.calendarConectado =
                    "true";
            }

            selectEmpleado.appendChild(option);
        });

        const params =
            new URLSearchParams(
                window.location.search
            );

        const empleadoIdUrl =
            params.get("empleadoId");

        if (empleadoIdUrl) {
            selectEmpleado.value =
                empleadoIdUrl;
        }

        if (btnConectarCalendar) {
            btnConectarCalendar.disabled = false;
        }
    } catch (error) {
        console.error(
            "Error cargando empleados:",
            error
        );

        empleadosCalendarCache = [];

        selectEmpleado.innerHTML =
            `<option value="">Error al cargar empleados</option>`;

        mostrarEstado(
            error.message ||
            "No fue posible cargar los empleados.",
            "danger"
        );

        if (btnConectarCalendar) {
            btnConectarCalendar.disabled = true;
        }
    }
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

    if (!btnConectarCalendar || !selectEmpleado) {
        return;
    }

    btnConectarCalendar.addEventListener("click", () => {
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
    });
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

    if (!btnConfirmar || !selectEmpleado) {
        return;
    }

    btnConfirmar.addEventListener("click", () => {
        const empleadoId =
            selectEmpleado.value;

        if (!empleadoId) {
            mostrarAlertaModalCalendar(
                "Primero debes seleccionar un empleado."
            );

            return;
        }

        btnConfirmar.disabled = true;
        btnConfirmar.textContent =
            "Conectando...";

        redirigirAConexionCalendar(
            empleadoId
        );
    });
}

function redirigirAConexionCalendar(empleadoId) {
    window.location.href =
        `${BACKEND_URL}/calendar/conectar?empleadoId=${encodeURIComponent(empleadoId)}`;
}

function llenarModalConectarCalendar(empleado) {
    const nombre =
        empleado?.nombre ||
        empleado?.name ||
        "Empleado";

    const correo =
        empleado?.correo ||
        empleado?.email ||
        "Sin correo registrado";

    const conectado =
        empleado?.google_calendar?.conectado === true;

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
            ? "Calendar ya está conectado. Puedes reconectarlo si necesitas actualizar permisos."
            : "Calendar sin conectar."
    );

    const alerta =
        document.getElementById(
            "alertaModalCalendar"
        );

    if (alerta) {
        alerta.textContent = "";
        alerta.classList.add("d-none");
    }

    const btnConfirmar =
        document.getElementById(
            "btnConfirmarConectarCalendar"
        );

    if (btnConfirmar) {
        btnConfirmar.disabled = false;
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
        correo || "-"
    );

    setTextValue(
        "modalEstadoCalendarResultado",
        resultado || "-"
    );

    if (modalEstadoCalendar) {
        modalEstadoCalendar.show();
    }
}

function mostrarAlertaModalCalendar(mensaje) {
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

function buscarEmpleadoPorId(empleadoId) {
    if (!empleadoId) {
        return null;
    }

    return (
        empleadosCalendarCache.find((empleado) => {
            const id =
                empleado.id ||
                empleado.employeeId ||
                "";

            return String(id) === String(empleadoId);
        }) ||
        null
    );
}

async function leerRespuesta(response) {
    const contentType =
        response.headers.get("content-type") || "";

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

function mostrarEstado(mensaje, tipo) {
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

function setTextValue(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value || "-";
    }
}

function limpiarParametrosUrl() {
    if (!window.history?.replaceState) {
        return;
    }

    const urlLimpia =
        `${window.location.origin}${window.location.pathname}`;

    window.history.replaceState(
        {},
        document.title,
        urlLimpia
    );
}