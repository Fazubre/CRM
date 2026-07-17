import {
    getAreas,
    getClients,
    getEmployees
} from "./tickets.api.js";

import {
    ticketsState
} from "./tickets.state.js";

import {
    escapeHtml,
    setSelectOptions
} from "./tickets.utils.js";

export async function loadCatalogs() {
    await Promise.all([
        loadEmployees(),
        loadClients(),
        loadAreas()
    ]);
}

export async function loadEmployees() {
    try {
        ticketsState.empleados =
            await getEmployees();
    } catch (error) {
        console.error(
            "Error cargando empleados:",
            error
        );

        ticketsState.empleados =
            [];
    }

    fillEmployeeSelects();
}

export async function loadClients() {
    try {
        ticketsState.clientes =
            await getClients();
    } catch (error) {
        console.error(
            "Error cargando clientes:",
            error
        );

        ticketsState.clientes =
            [];
    }

    fillClientSelects();
}

export async function loadAreas() {
    try {
        ticketsState.areas =
            await getAreas();
    } catch (error) {
        console.error(
            "Error cargando áreas:",
            error
        );

        ticketsState.areas =
            [];
    }

    fillAreaSelects();
}

export function fillEmployeeSelects() {
    const options = `
        <option value="">
            Seleccione un empleado
        </option>

        ${ticketsState.empleados
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
        options
    );

    setSelectOptions(
        "editarEmpleadoAsignado",
        options
    );
}

export function fillClientSelects() {
    const options = `
        <option value="">
            Seleccione un cliente
        </option>

        ${ticketsState.clientes
            .map((cliente) => {
                const id =
                    String(
                        cliente._cliente_id ||
                        cliente.cliente_id ||
                        cliente.id ||
                        cliente.clienteId ||
                        cliente.clientId ||
                        ""
                    );

                const nombre =
                    String(
                        cliente.nombre ||
                        cliente.name ||
                        cliente.clienteNombre ||
                        cliente.correo ||
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
        options
    );

    setSelectOptions(
        "editarClienteAsignado",
        options
    );
}

export function fillAreaSelects() {
    const options = `
        <option value="">
            Seleccione un área
        </option>

        ${ticketsState.areas
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
        options
    );

    setSelectOptions(
        "editarAreaAsignada",
        options
    );
}

export function getEmployeeName(
    ticket
) {
    if (
        ticket?.empleadoNombre
    ) {
        return ticket.empleadoNombre;
    }

    if (
        ticket?.employeeName
    ) {
        return ticket.employeeName;
    }

    const empleadoId =
        ticket?.empleadoId ||
        ticket?.employeeId ||
        ticket?.assignedEmployeeId ||
        "";

    return empleadoId
        ? getEmployeeNameById(
            empleadoId
        )
        : "No asignado";
}

export function getEmployeeNameById(
    empleadoId
) {
    if (!empleadoId) {
        return "No asignado";
    }

    const empleado =
        ticketsState.empleados.find(
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

export function getClientNameById(
    clienteId
) {
    if (!clienteId) {
        return "No asignado";
    }

    const cliente =
        ticketsState.clientes.find(
            (item) => {
                const id =
                    String(
                        item._cliente_id ||
                        item.cliente_id ||
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
        cliente?.correo ||
        cliente?.email ||
        "No asignado"
    );
}

export function getAreaNameById(
    areaId
) {
    if (!areaId) {
        return "No asignada";
    }

    const area =
        ticketsState.areas.find(
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