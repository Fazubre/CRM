const config =
    window.CRM_CONFIG;

if (!config?.API_BASE_URL) {
    throw new Error(
        "CRM_CONFIG no está disponible. Carga config.js antes de dashboard.js."
    );
}

const API_BASE_URL =
    String(
        config.API_BASE_URL
    ).replace(
        /\/$/,
        ""
    );

const DASHBOARD_URL =
    `${API_BASE_URL}/tickets/dashboard`;

const TICKETS_PAGE_URL =
    config.TICKETS_URL ||
    "/CRM/Frontend/Views/tickets.html";

const MAX_TICKETS =
    10;

let usuarioActual =
    null;

let diasProximos =
    7;

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarDashboard,
        {
            once:
                true
        }
    );
} else {
    inicializarDashboard();
}

async function inicializarDashboard() {
    configurarBotonRecargar();
    mostrarCargando();

    await cargarDashboard();
}

async function cargarDashboard(
    boton = null
) {
    cambiarEstadoBoton(
        boton,
        true
    );

    mostrarCargando();

    try {
        const response =
            await fetch(
                DASHBOARD_URL,
                {
                    method:
                        "GET",

                    credentials:
                        "include",

                    cache:
                        "no-store",

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );

        const data =
            await leerRespuesta(
                response
            );

        if (
            !response.ok ||
            !data.ok
        ) {
            throw new Error(
                data.mensaje ||
                "No fue posible cargar el dashboard."
            );
        }

        usuarioActual =
            data.usuario ||
            null;

        diasProximos =
            Number(
                data.diasProximos ||
                7
            );

        if (!usuarioActual) {
            throw new Error(
                "El servidor no devolvió la información del usuario."
            );
        }

        localStorage.setItem(
            "usuarioCRM",
            JSON.stringify(
                usuarioActual
            )
        );

        mostrarUsuario(
            usuarioActual
        );

        crearEncabezadoPersonalizado(
            usuarioActual,
            data.alcance
        );

        const tickets =
            Array.isArray(
                data.tickets
            )
                ? data.tickets
                : [];

        renderizarResumen(
            data.resumen,
            tickets
        );

        renderizarIndicadores(
            data.resumen,
            tickets
        );

        renderizarTabla(
            tickets
        );
    } catch (error) {
        console.error(
            "Error cargando dashboard:",
            error
        );

        renderizarResumen(
            null,
            []
        );

        renderizarIndicadores(
            null,
            []
        );

        mostrarError(
            error.message ||
            "No fue posible cargar el dashboard."
        );
    } finally {
        cambiarEstadoBoton(
            boton,
            false
        );
    }
}

function configurarBotonRecargar() {
    const boton =
        document.getElementById(
            "btnRecargarTickets"
        );

    if (
        !boton ||
        boton.dataset
            .dashboardConfigured ===
            "true"
    ) {
        return;
    }

    boton.dataset
        .dashboardConfigured =
        "true";

    boton.addEventListener(
        "click",
        async () => {
            await cargarDashboard(
                boton
            );
        }
    );
}

function crearEncabezadoPersonalizado(
    usuario,
    alcance
) {
    let contenedor =
        document.getElementById(
            "dashboardPersonalizado"
        );

    if (!contenedor) {
        contenedor =
            document.createElement(
                "section"
            );

        contenedor.id =
            "dashboardPersonalizado";

        const destino =
            document.querySelector(
                "main .container-fluid"
            ) ||
            document.querySelector(
                "main"
            ) ||
            document.querySelector(
                ".main-content .container-fluid"
            ) ||
            document.querySelector(
                ".container-fluid"
            ) ||
            document.body;

        destino.prepend(
            contenedor
        );
    }

    const nombre =
        usuario?.nombre ||
        usuario?.correo ||
        "Usuario";

    const primerNombre =
        String(nombre)
            .trim()
            .split(/\s+/)[0] ||
        "Usuario";

    const administrador =
        esAdmin(
            usuario
        );

    const descripcion =
        alcance === "general" ||
        administrador
            ? "Estás viendo el resumen general de todos los tickets del CRM."
            : "Estás viendo únicamente los tickets asignados a tu usuario.";

    contenedor.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
                <div
                    class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                >
                    <div class="d-flex align-items-center gap-3">
                        ${crearAvatar(
                            usuario,
                            nombre
                        )}

                        <div>
                            <div
                                class="d-flex flex-wrap align-items-center gap-2"
                            >
                                <h1 class="h3 mb-0">
                                    Hola, ${escapeHtml(
                                        primerNombre
                                    )}
                                </h1>

                                <span
                                    class="badge ${
                                        administrador
                                            ? "text-bg-dark"
                                            : "text-bg-primary"
                                    }"
                                >
                                    ${
                                        administrador
                                            ? "Administrador"
                                            : "Empleado"
                                    }
                                </span>
                            </div>

                            <p class="text-muted mb-0 mt-1">
                                ${escapeHtml(
                                    descripcion
                                )}
                            </p>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-2">
                        <a
                            href="${escapeHtml(
                                TICKETS_PAGE_URL
                            )}"
                            class="btn btn-primary"
                        >
                            <i
                                class="fa-solid fa-ticket me-2"
                            ></i>

                            Ir a tickets
                        </a>

                        <button
                            type="button"
                            id="btnActualizarDashboard"
                            class="btn btn-outline-secondary"
                        >
                            <i
                                class="fa-solid fa-rotate me-2"
                            ></i>

                            Actualizar
                        </button>
                    </div>
                </div>

                <div
                    id="indicadoresDashboardPersonalizado"
                    class="row g-3 mt-2"
                ></div>
            </div>
        </div>
    `;

    document
        .getElementById(
            "btnActualizarDashboard"
        )
        ?.addEventListener(
            "click",
            async (
                event
            ) => {
                await cargarDashboard(
                    event.currentTarget
                );
            }
        );
}

function crearAvatar(
    usuario,
    nombre
) {
    const foto =
        obtenerFotoSegura(
            usuario
        );

    if (foto) {
        return `
            <img
                src="${escapeHtml(
                    foto
                )}"
                alt="Foto de ${escapeHtml(
                    nombre
                )}"
                class="rounded-circle border"
                width="64"
                height="64"
                style="object-fit: cover;"
            >
        `;
    }

    return `
        <div
            class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
            style="width: 64px; height: 64px; font-size: 1.25rem;"
        >
            ${escapeHtml(
                obtenerIniciales(
                    nombre
                )
            )}
        </div>
    `;
}

function mostrarUsuario(usuario) {
    const nombre =
        usuario?.nombre ||
        usuario?.correo ||
        "Usuario";

    establecerTexto(
        "nombreUsuario",
        nombre
    );

    establecerTexto(
        "dashboardNombreUsuario",
        nombre
    );

    establecerTexto(
        "dashboardRolUsuario",
        esAdmin(usuario)
            ? "Administrador"
            : "Empleado"
    );
}

function renderizarResumen(
    resumen,
    tickets
) {
    const datos =
        resumen &&
        typeof resumen === "object"
            ? resumen
            : construirResumenLocal(
                tickets
            );

    establecerTexto(
        "totalTickets",
        Number(
            datos.total ||
            0
        )
    );

    establecerTexto(
        "ticketsAbiertos",
        Number(
            datos.abiertos ||
            0
        )
    );

    establecerTexto(
        "ticketsCompletados",
        Number(
            datos.completados ||
            0
        )
    );

    establecerTexto(
        "ticketsAltaPrioridad",
        Number(
            datos.altaPrioridad ||
            0
        )
    );
}

function renderizarIndicadores(
    resumen,
    tickets
) {
    const contenedor =
        document.getElementById(
            "indicadoresDashboardPersonalizado"
        );

    if (!contenedor) {
        return;
    }

    const datos =
        resumen &&
        typeof resumen === "object"
            ? resumen
            : construirResumenLocal(
                tickets
            );

    contenedor.innerHTML = `
        ${crearIndicador(
            "Vencidos",
            Number(
                datos.vencidos ||
                0
            ),
            "fa-triangle-exclamation",
            "text-danger"
        )}

        ${crearIndicador(
            `Próximos ${diasProximos} días`,
            Number(
                datos.proximos ||
                0
            ),
            "fa-clock",
            "text-warning"
        )}

        ${crearIndicador(
            "Sin fecha límite",
            Number(
                datos.sinFecha ||
                0
            ),
            "fa-calendar-xmark",
            "text-secondary"
        )}
    `;
}

function crearIndicador(
    etiqueta,
    valor,
    icono,
    clase
) {
    return `
        <div class="col-12 col-sm-4">
            <div
                class="border rounded p-3 h-100 bg-light-subtle"
            >
                <div
                    class="d-flex justify-content-between align-items-center gap-3"
                >
                    <div>
                        <div class="small text-muted">
                            ${escapeHtml(
                                etiqueta
                            )}
                        </div>

                        <div class="fs-4 fw-bold">
                            ${escapeHtml(
                                valor
                            )}
                        </div>
                    </div>

                    <i
                        class="fa-solid ${escapeHtml(
                            icono
                        )} ${escapeHtml(
                            clase
                        )} fs-3"
                    ></i>
                </div>
            </div>
        </div>
    `;
}

function renderizarTabla(tickets) {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    const visibles =
        tickets.slice(
            0,
            MAX_TICKETS
        );

    if (!visibles.length) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="text-center text-muted py-4"
                >
                    ${
                        esAdmin(
                            usuarioActual
                        )
                            ? "No hay tickets registrados."
                            : "No tienes tickets asignados actualmente."
                    }
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        visibles
            .map(
                (
                    ticket
                ) => `
                    <tr
                        class="${claseFila(
                            ticket
                        )}"
                    >
                        <td>
                            ${escapeHtml(
                                ticket.numeroTicket ||
                                ticket.id ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                ticket.titulo ||
                                "Sin título"
                            )}
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
                                ticket.empleadoNombre ||
                                ticket.employeeName ||
                                "No asignado"
                            )}
                        </td>

                        <td>
                            ${renderizarEstado(
                                ticket
                            )}
                        </td>

                        <td>
                            ${renderizarPrioridad(
                                ticket.prioridad
                            )}
                        </td>

                        <td>
                            ${renderizarArchivo(
                                ticket
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                formatearFecha(
                                    ticket.createdAt,
                                    true
                                )
                            )}
                        </td>

                        <td>
                            ${renderizarVencimiento(
                                ticket
                            )}
                        </td>
                    </tr>
                `
            )
            .join("");
}

function claseFila(ticket) {
    if (
        estaVencido(
            ticket
        )
    ) {
        return "table-danger";
    }

    if (
        vencePronto(
            ticket
        )
    ) {
        return "table-warning";
    }

    return "";
}

function renderizarEstado(ticket) {
    const completado =
        estaCompletado(
            ticket
        );

    const texto =
        ticket.estadoNombre ||
        ticket.estado ||
        (
            completado
                ? "Completado"
                : "Abierto"
        );

    return `
        <span
            class="badge ${
                completado
                    ? "bg-success"
                    : "bg-warning text-dark"
            }"
        >
            ${escapeHtml(
                texto
            )}
        </span>
    `;
}

function renderizarPrioridad(
    prioridad
) {
    const valor =
        normalizar(
            prioridad ||
            "media"
        );

    let clase =
        "bg-secondary";

    if (
        valor === "baja"
    ) {
        clase =
            "bg-info text-dark";
    }

    if (
        valor === "media"
    ) {
        clase =
            "bg-primary";
    }

    if (
        valor === "alta"
    ) {
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
            ${escapeHtml(
                valor
            )}
        </span>
    `;
}

function renderizarVencimiento(
    ticket
) {
    const fecha =
        obtenerFechaVencimiento(
            ticket
        );

    if (!fecha) {
        return `
            <span class="text-muted">
                Sin fecha
            </span>
        `;
    }

    const texto =
        fecha.toLocaleDateString(
            "es-CR"
        );

    if (
        estaVencido(
            ticket
        )
    ) {
        return `
            <span
                class="badge text-bg-danger"
            >
                ${escapeHtml(
                    texto
                )} · Vencido
            </span>
        `;
    }

    if (
        vencePronto(
            ticket
        )
    ) {
        return `
            <span
                class="badge text-bg-warning"
            >
                ${escapeHtml(
                    texto
                )} · Próximo
            </span>
        `;
    }

    return escapeHtml(
        texto
    );
}

function renderizarArchivo(ticket) {
    const archivo =
        obtenerArchivo(
            ticket
        );

    if (
        !archivo?.enlace
    ) {
        return `
            <span class="text-muted">
                Sin archivo
            </span>
        `;
    }

    const esCarpeta =
        archivo.tipoAdjunto ===
        "carpeta";

    return `
        <a
            href="${escapeHtml(
                archivo.enlace
            )}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-secondary btn-sm"
        >
            <i
                class="fa-solid ${
                    esCarpeta
                        ? "fa-folder-open"
                        : "fa-paperclip"
                } me-1"
            ></i>

            ${
                esCarpeta
                    ? "Abrir"
                    : "Ver"
            }
        </a>
    `;
}

function obtenerArchivo(ticket) {
    const archivo =
        ticket?.archivoAdjunto ||
        ticket?.archivo ||
        ticket?.attachment ||
        ticket?.file ||
        null;

    if (!archivo) {
        return null;
    }

    if (
        typeof archivo ===
        "string"
    ) {
        return {
            tipoAdjunto:
                "archivo",

            enlace:
                archivo
        };
    }

    const tipo =
        archivo.tipo ||
        archivo.mimeType ||
        archivo.mimetype ||
        "";

    return {
        tipoAdjunto:
            archivo.tipoAdjunto ||
            (
                tipo ===
                "application/vnd.google-apps.folder"
                    ? "carpeta"
                    : "archivo"
            ),

        enlace:
            archivo.webViewLink ||
            archivo.enlaceVisualizacion ||
            archivo.url ||
            archivo.link ||
            archivo.enlace ||
            ""
    };
}

function construirResumenLocal(
    tickets
) {
    const resumen = {
        total:
            tickets.length,

        abiertos:
            0,

        completados:
            0,

        altaPrioridad:
            0,

        vencidos:
            0,

        proximos:
            0,

        sinFecha:
            0
    };

    tickets.forEach(
        (ticket) => {
            if (
                estaCompletado(
                    ticket
                )
            ) {
                resumen.completados +=
                    1;
            } else {
                resumen.abiertos +=
                    1;
            }

            const prioridad =
                normalizar(
                    ticket?.prioridad
                );

            if (
                prioridad === "alta" ||
                prioridad === "critica" ||
                prioridad === "crítica"
            ) {
                resumen.altaPrioridad +=
                    1;
            }

            if (
                estaVencido(
                    ticket
                )
            ) {
                resumen.vencidos +=
                    1;
            }

            if (
                vencePronto(
                    ticket
                )
            ) {
                resumen.proximos +=
                    1;
            }

            if (
                !obtenerFechaVencimiento(
                    ticket
                )
            ) {
                resumen.sinFecha +=
                    1;
            }
        }
    );

    return resumen;
}

function estaCompletado(ticket) {
    if (
        ticket?.isCompleted ===
        true
    ) {
        return true;
    }

    return [
        "completado",
        "completa",
        "cerrado",
        "cerrada"
    ].includes(
        normalizar(
            ticket?.estadoNombre ||
            ticket?.estado
        )
    );
}

function estaVencido(ticket) {
    if (
        estaCompletado(
            ticket
        )
    ) {
        return false;
    }

    const fecha =
        obtenerFechaVencimiento(
            ticket
        );

    return Boolean(
        fecha &&
        fecha <
        inicioDeHoy()
    );
}

function vencePronto(ticket) {
    if (
        estaCompletado(
            ticket
        ) ||
        estaVencido(
            ticket
        )
    ) {
        return false;
    }

    const fecha =
        obtenerFechaVencimiento(
            ticket
        );

    if (!fecha) {
        return false;
    }

    const hoy =
        inicioDeHoy();

    const limite =
        new Date(hoy);

    limite.setDate(
        limite.getDate() +
        diasProximos
    );

    return (
        fecha >= hoy &&
        fecha <= limite
    );
}

function obtenerFechaVencimiento(
    ticket
) {
    return convertirFecha(
        ticket?.expirationDate ||
        ticket?.fechaVencimiento ||
        ticket?.dueDate
    );
}

function convertirFecha(valor) {
    if (!valor) {
        return null;
    }

    let fecha;

    if (
        typeof valor === "object" &&
        typeof valor.toDate === "function"
    ) {
        fecha =
            valor.toDate();
    } else if (
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
    } else {
        fecha =
            new Date(valor);
    }

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }

    return fecha;
}

function formatearFecha(
    valor,
    incluirHora = false
) {
    const fecha =
        convertirFecha(
            valor
        );

    if (!fecha) {
        return "Sin fecha";
    }

    return incluirHora
        ? fecha.toLocaleString(
            "es-CR"
        )
        : fecha.toLocaleDateString(
            "es-CR"
        );
}

function inicioDeHoy() {
    const fecha =
        new Date();

    fecha.setHours(
        0,
        0,
        0,
        0
    );

    return fecha;
}

function esAdmin(usuario) {
    return (
        normalizar(
            usuario?.rol
        ) ===
        "admin"
    );
}

function normalizar(valor) {
    return String(
        valor ??
        ""
    )
        .trim()
        .toLowerCase();
}

function obtenerFotoSegura(
    usuario
) {
    const foto =
        usuario?.foto_url ||
        usuario?.picture ||
        usuario?.foto ||
        "";

    if (!foto) {
        return "";
    }

    try {
        const url =
            new URL(
                foto,
                window.location.origin
            );

        return [
            "http:",
            "https:"
        ].includes(
            url.protocol
        )
            ? url.href
            : "";
    } catch (error) {
        return "";
    }
}

function obtenerIniciales(nombre) {
    return (
        String(
            nombre ||
            "U"
        )
            .trim()
            .split(/\s+/)
            .filter(
                Boolean
            )
            .slice(
                0,
                2
            )
            .map(
                (parte) => {
                    return parte
                        .charAt(0)
                        .toUpperCase();
                }
            )
            .join("") ||
        "U"
    );
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

function mostrarCargando() {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="text-center text-muted py-4"
            >
                <span
                    class="spinner-border spinner-border-sm me-2"
                ></span>

                Cargando dashboard...
            </td>
        </tr>
    `;
}

function mostrarError(mensaje) {
    const tbody =
        document.getElementById(
            "ticketsTableBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="text-center text-danger py-4"
            >
                ${escapeHtml(
                    mensaje
                )}
            </td>
        </tr>
    `;
}

function cambiarEstadoBoton(
    boton,
    cargando
) {
    if (!boton) {
        return;
    }

    if (cargando) {
        if (
            !boton.dataset
                .originalHtml
        ) {
            boton.dataset
                .originalHtml =
                boton.innerHTML;
        }

        boton.disabled =
            true;

        boton.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-2"
            ></span>

            Actualizando...
        `;

        return;
    }

    boton.disabled =
        false;

    if (
        boton.dataset
            .originalHtml
    ) {
        boton.innerHTML =
            boton.dataset
                .originalHtml;

        delete boton.dataset
            .originalHtml;
    }
}

function establecerTexto(
    id,
    valor
) {
    const elemento =
        document.getElementById(
            id
        );

    if (elemento) {
        elemento.textContent =
            valor ??
            "";
    }
}

function escapeHtml(texto) {
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
            "&#39;"
        );
}