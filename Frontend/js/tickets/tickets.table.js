import {
    getTickets
} from "./tickets.api.js";

import {
    getEmployeeName
} from "./tickets.catalogs.js";

import {
    getTicketAttachment
} from "./tickets.attachments.js";

import {
    ticketsState
} from "./tickets.state.js";

import {
    checkUsuarioAdmin,
    escapeHtml,
    formatDate,
    isTicketCompleted
} from "./tickets.utils.js";

const TABLE_SELECTOR =
    "#tablaTickets";

const TABLE_BODY_ID =
    "ticketsTableBody";

const EXPECTED_COLUMN_COUNT =
    10;

export function findTicketById(
    id
) {
    return (
        ticketsState
            .tickets
            .find((ticket) => {
                return (
                    String(ticket.id) ===
                    String(id)
                );
            }) ||
        null
    );
}

export async function loadTickets() {
    const tbody =
        document.getElementById(
            TABLE_BODY_ID
        );

    if (!tbody) {
        console.error(
            `No existe el elemento #${TABLE_BODY_ID}.`
        );

        return;
    }

    try {
        destroyDataTable();

        tbody.innerHTML =
            "";

        ticketsState.tickets =
            await getTickets();

        ticketsState.mensajeTablaVacia =
            "No hay tickets registrados.";

        renderTickets(
            ticketsState.tickets
        );

        validateTableStructure();

        initDataTable();
    } catch (error) {
        console.error(
            "Error cargando tickets:",
            error
        );

        ticketsState.tickets =
            [];

        ticketsState.mensajeTablaVacia =
            error.message ||
            "No fue posible cargar los tickets.";

        renderTableError(
            ticketsState
                .mensajeTablaVacia
        );
    }
}

export function renderTickets(
    tickets
) {
    const tbody =
        document.getElementById(
            TABLE_BODY_ID
        );

    if (!tbody) {
        return;
    }

    if (
        !Array.isArray(
            tickets
        ) ||
        tickets.length ===
        0
    ) {
        tbody.innerHTML =
            "";

        return;
    }

    tbody.innerHTML =
        tickets
            .map(
                renderTicketRow
            )
            .join("");
}

function renderTicketRow(
    ticket
) {
    return `
        <tr>
            <td>
                ${escapeHtml(
                    ticket.titulo ||
                    ""
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
                    getEmployeeName(
                        ticket
                    )
                )}
            </td>

            <td>
                ${renderEstado(
                    ticket
                )}
            </td>

            <td>
                ${renderPrioridad(
                    ticket.prioridad
                )}
            </td>

            <td>
                ${escapeHtml(
                    formatDate(
                        ticket.expirationDate ||
                        ticket.fechaVencimiento
                    )
                )}
            </td>

            <td>
                ${renderAdjunto(
                    ticket
                )}
            </td>

            <td>
                ${renderTicketActions(
                    ticket
                )}
            </td>

            <td>
                ${escapeHtml(
                    ticket.id ||
                    ""
                )}
            </td>
        </tr>
    `;
}

function renderTicketActions(
    ticket
) {
    return `
        <div
            class="d-flex flex-wrap gap-1"
            role="group"
        >
            <button
                type="button"
                class="btn btn-outline-info btn-sm btn-ver-ticket"
                data-id="${escapeHtml(ticket.id || "")}"
            >
                Ver
            </button>

            <button
                type="button"
                class="btn btn-outline-primary btn-sm btn-comentarios-ticket"
                data-id="${escapeHtml(ticket.id || "")}"
            >
                <i class="fa-solid fa-comment-dots me-1"></i>
                Agregar Comentario
            </button>

            <button
                type="button"
                class="btn btn-outline-warning btn-sm btn-editar-ticket"
                data-id="${escapeHtml(ticket.id || "")}"
            >
                Editar
            </button>

            ${renderDeleteTicketButton(
                ticket
            )}
        </div>
    `;
}

function renderDeleteTicketButton(
    ticket
) {
    if (!checkUsuarioAdmin()) {
        return "";
    }

    return `
        <button
            type="button"
            class="btn btn-outline-danger btn-sm btn-eliminar-ticket"
            data-id="${escapeHtml(ticket.id || "")}"
        >
            Borrar
        </button>
    `;
}

function renderAdjunto(
    ticket
) {
    const attachment =
        getTicketAttachment(
            ticket
        );

    if (!attachment?.enlace) {
        return `
            <span class="text-muted">
                Sin adjunto
            </span>
        `;
    }

    const isFolder =
        attachment.tipoAdjunto ===
        "carpeta";

    const icon =
        isFolder
            ? "fa-folder-open"
            : "fa-paperclip";

    const text =
        isFolder
            ? "Abrir carpeta"
            : "Ver archivo";

    return `
        <a
            href="${escapeHtml(attachment.enlace)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-secondary btn-sm"
        >
            <i class="fa-solid ${icon} me-1"></i>
            ${escapeHtml(text)}
        </a>
    `;
}

function renderEstado(
    ticket
) {
    const completed =
        isTicketCompleted(
            ticket
        );

    const text =
        ticket.estadoNombre ||
        (
            completed
                ? "Completado"
                : "Abierto"
        );

    const cssClass =
        completed
            ? "bg-success"
            : "bg-warning text-dark";

    return `
        <span class="badge ${cssClass}">
            ${escapeHtml(text)}
        </span>
    `;
}

function renderPrioridad(
    prioridad
) {
    const value =
        String(
            prioridad ||
            "media"
        )
            .trim()
            .toLowerCase();

    let cssClass =
        "bg-secondary";

    if (value === "baja") {
        cssClass =
            "bg-info text-dark";
    } else if (
        value === "media"
    ) {
        cssClass =
            "bg-primary";
    } else if (
        value === "alta"
    ) {
        cssClass =
            "bg-warning text-dark";
    } else if (
        value === "critica" ||
        value === "crítica"
    ) {
        cssClass =
            "bg-danger";
    }

    return `
        <span
            class="badge ${cssClass} text-uppercase"
        >
            ${escapeHtml(value)}
        </span>
    `;
}

function validateTableStructure() {
    const table =
        document.querySelector(
            TABLE_SELECTOR
        );

    if (!table) {
        throw new Error(
            "No existe la tabla #tablaTickets."
        );
    }

    const headerColumns =
        table.querySelectorAll(
            "thead tr:first-child th"
        );

    if (
        headerColumns.length !==
        EXPECTED_COLUMN_COUNT
    ) {
        throw new Error(
            (
                `La tabla tiene ${headerColumns.length} encabezados ` +
                `y debería tener ${EXPECTED_COLUMN_COUNT}.`
            )
        );
    }

    const rows =
        table.querySelectorAll(
            "tbody tr"
        );

    rows.forEach(
        (
            row,
            index
        ) => {
            const bodyColumns =
                row.querySelectorAll(
                    ":scope > td"
                );

            if (
                bodyColumns.length !==
                EXPECTED_COLUMN_COUNT
            ) {
                throw new Error(
                    (
                        `La fila ${index + 1} tiene ` +
                        `${bodyColumns.length} columnas y debería tener ` +
                        `${EXPECTED_COLUMN_COUNT}.`
                    )
                );
            }
        }
    );
}

function getJQuery() {
    return (
        window.jQuery ||
        window.$ ||
        null
    );
}

export function destroyDataTable() {
    const jquery =
        getJQuery();

    if (
        !jquery ||
        !jquery.fn?.DataTable
    ) {
        return;
    }

    const table =
        document.querySelector(
            TABLE_SELECTOR
        );

    if (!table) {
        return;
    }

    try {
        if (
            jquery
                .fn
                .DataTable
                .isDataTable(
                    table
                )
        ) {
            jquery(
                table
            )
                .DataTable()
                .clear()
                .destroy();
        }
    } catch (error) {
        console.warn(
            "No fue posible destruir DataTables:",
            error
        );
    }
}

export function initDataTable() {
    const jquery =
        getJQuery();

    if (
        !jquery ||
        !jquery.fn?.DataTable
    ) {
        console.warn(
            "DataTables no está disponible."
        );

        return;
    }

    const table =
        document.querySelector(
            TABLE_SELECTOR
        );

    if (!table) {
        throw new Error(
            "No existe la tabla #tablaTickets."
        );
    }

    validateTableStructure();

    if (
        jquery
            .fn
            .DataTable
            .isDataTable(
                table
            )
    ) {
        return;
    }

    jquery(
        table
    ).DataTable({
        responsive:
            true,

        autoWidth:
            false,

        pageLength:
            10,

        order: [
            [
                0,
                "asc"
            ]
        ],

        columnDefs: [
            {
                targets:
                    8,

                orderable:
                    false,

                searchable:
                    false
            },
            {
                targets:
                    9,

                visible:
                    false,

                searchable:
                    true
            }
        ],

        language: {
            emptyTable:
                ticketsState
                    .mensajeTablaVacia,

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

function renderTableError(
    message
) {
    const tbody =
        document.getElementById(
            TABLE_BODY_ID
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td
                colspan="${EXPECTED_COLUMN_COUNT}"
                class="text-center text-danger py-4"
            >
                ${escapeHtml(message)}
            </td>
        </tr>
    `;
}