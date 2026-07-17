import {
    getClients
} from "./clients.api.js";

import {
    clientsState
} from "./clients.state.js";

import {
    escapeHtml,
    formatDateTime,
    formatPhone,
    getClientId
} from "./clients.utils.js";

export function getClientsTbody() {
    return document.querySelector(
        "#tablaClientes tbody"
    );
}

export function findClientById(
    id
) {
    return (
        clientsState
            .clientesCache
            .find(
                (cliente) =>
                    String(
                        getClientId(cliente)
                    ) ===
                    String(id)
            ) ||
        null
    );
}

export async function loadClients() {
    const tbody =
        getClientsTbody();

    if (!tbody) {
        return;
    }

    try {
        destroyDataTable();

        tbody.innerHTML =
            "";

        const clientes =
            await getClients();

        clientsState.clientesCache =
            clientes;

        clientsState.mensajeTablaVacia =
            "No hay clientes registrados.";

        renderClients(
            clientes
        );

        initDataTable();
    } catch (error) {
        console.error(
            "Error cargando clientes:",
            error
        );

        clientsState.clientesCache =
            [];

        clientsState.mensajeTablaVacia =
            error.message ||
            "No fue posible cargar los clientes.";

        destroyDataTable();

        tbody.innerHTML =
            "";

        initDataTable();
    }
}

export function renderClients(
    clientes
) {
    const tbody =
        getClientsTbody();

    if (!tbody) {
        return;
    }

    if (!clientes.length) {
        tbody.innerHTML =
            "";

        return;
    }

    tbody.innerHTML =
        clientes
            .map(
                (cliente) => {
                    const clienteId =
                        getClientId(
                            cliente
                        );

                    return `
                        <tr>
                            <td>
                                ${escapeHtml(
                                    cliente.nombre ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    cliente.correo ||
                                    ""
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatPhone(
                                        cliente.codigo_area,
                                        cliente.telefono
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    cliente.empresa ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    cliente.identificacion ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${renderEstadoCliente(
                                    cliente.estado
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatDateTime(
                                        cliente.fecha_creacion ||
                                        cliente.createdAt
                                    )
                                )}
                            </td>

                            <td>
                                <div
                                    class="btn-group btn-group-sm"
                                    role="group"
                                >
                                    <button
                                        type="button"
                                        class="btn btn-outline-info btn-ver-cliente"
                                        data-id="${escapeHtml(clienteId)}"
                                    >
                                        Ver
                                    </button>

                                    <button
                                        type="button"
                                        class="btn btn-outline-warning btn-editar-cliente"
                                        data-id="${escapeHtml(clienteId)}"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        class="btn btn-outline-danger btn-eliminar-cliente"
                                        data-id="${escapeHtml(clienteId)}"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            )
            .join("");
}

export function destroyDataTable() {
    const jquery =
        window.jQuery ||
        window.$;

    if (
        !jquery ||
        !jquery.fn?.DataTable ||
        !jquery.fn.DataTable.isDataTable(
            "#tablaClientes"
        )
    ) {
        return;
    }

    jquery(
        "#tablaClientes"
    )
        .DataTable()
        .destroy();
}

export function initDataTable() {
    const jquery =
        window.jQuery ||
        window.$;

    if (
        !jquery ||
        !jquery.fn?.DataTable
    ) {
        console.warn(
            "DataTables no está disponible. La tabla se mostrará sin paginación."
        );

        return;
    }

    jquery(
        "#tablaClientes"
    ).DataTable({
        responsive: true,
        autoWidth: false,
        pageLength: 10,

        order: [
            [
                0,
                "asc"
            ]
        ],

        language: {
            emptyTable:
                clientsState
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

function renderEstadoCliente(
    estado
) {
    const valor =
        String(
            estado ||
            "activo"
        ).toLowerCase();

    let clase =
        "bg-success";

    let texto =
        "Activo";

    if (valor === "inactivo") {
        clase =
            "bg-secondary";

        texto =
            "Inactivo";
    }

    if (valor === "prospecto") {
        clase =
            "bg-warning text-dark";

        texto =
            "Prospecto";
    }

    return `
        <span class="badge ${clase}">
            ${escapeHtml(texto)}
        </span>
    `;
}