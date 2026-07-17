import {
    AREAS_URL,
    CLIENTES_URL,
    EMPLEADOS_URL,
    TICKETS_URL
} from "./tickets.state.js";

export async function readResponseData(
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

    const text =
        await response.text();

    return {
        ok: false,

        mensaje:
            text ||
            "El servidor devolvió una respuesta vacía."
    };
}

async function request(
    url,
    options = {},
    defaultErrorMessage
) {
    const response =
    await fetch(
        url,
        {
            ...options,
            credentials:
                "include"
        }
    );

    const data =
        await readResponseData(
            response
        );

    if (
        !response.ok ||
        data.ok === false
    ) {
        throw new Error(
            data.mensaje ||
            defaultErrorMessage ||
            "No fue posible completar la operación."
        );
    }

    return data;
}

async function fetchCollection(
    url,
    keys,
    errorMessage
) {
    const data =
        await request(
            url,
            {},
            errorMessage
        );

    for (const key of keys) {
        if (
            Array.isArray(
                data[key]
            )
        ) {
            return data[key];
        }
    }

    return [];
}

export async function getTickets() {
    const data =
        await request(
            TICKETS_URL,
            {},
            "No fue posible obtener los tickets."
        );

    return Array.isArray(
        data.tickets
    )
        ? data.tickets
        : [];
}

export function getEmployees() {
    return fetchCollection(
        EMPLEADOS_URL,
        [
            "employees",
            "empleados"
        ],
        "No fue posible obtener los empleados."
    );
}

export function getClients() {
    return fetchCollection(
        CLIENTES_URL,
        [
            "clients",
            "clientes"
        ],
        "No fue posible obtener los clientes."
    );
}

export function getAreas() {
    return fetchCollection(
        AREAS_URL,
        [
            "areas",
            "areasData"
        ],
        "No fue posible obtener las áreas."
    );
}

export function createTicket(
    formData
) {
    return request(
        TICKETS_URL,
        {
            method: "POST",
            body: formData
        },
        "No fue posible crear el ticket."
    );
}

export function updateTicket(
    ticketId,
    formData
) {
    return request(
        `${TICKETS_URL}/${encodeURIComponent(ticketId)}`,
        {
            method: "PUT",
            body: formData
        },
        "No fue posible actualizar el ticket."
    );
}

export function deleteTicketRequest(
    ticketId,
    usuario
) {
    return request(
        `${TICKETS_URL}/${encodeURIComponent(ticketId)}`,
        {
            method:
                "DELETE",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({
                    usuarioId:
                        usuario?.id ||
                        usuario?.usuarioId ||
                        usuario?.employeeId ||
                        "",

                    googleId:
                        usuario?.google_id ||
                        usuario?.googleId ||
                        "",

                    correo:
                        usuario?.correo ||
                        usuario?.email ||
                        ""
                })
        },
        "No fue posible eliminar el ticket."
    );
}