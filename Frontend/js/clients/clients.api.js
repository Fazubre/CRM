import {
    CLIENTS_URL
} from "./clients.state.js";

async function readResponseData(response) {
    const responseText =
        await response.text();

    if (!responseText) {
        return {
            ok: response.ok
        };
    }

    try {
        return JSON.parse(responseText);
    } catch (error) {
        return {
            ok: false,
            mensaje: responseText
        };
    }
}

async function request(
    url,
    options = {}
) {
    const response =
        await fetch(url, options);

    const data =
        await readResponseData(response);

    if (
        !response.ok ||
        data.ok === false
    ) {
        throw new Error(
            data.mensaje ||
            "No fue posible completar la operación solicitada."
        );
    }

    return data;
}

export async function getClients() {
    const data =
        await request(CLIENTS_URL);

    if (Array.isArray(data.clientes)) {
        return data.clientes;
    }

    if (Array.isArray(data.clients)) {
        return data.clients;
    }

    return [];
}

export async function createClient(
    payload
) {
    return request(
        CLIENTS_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify(payload)
        }
    );
}

export async function updateClient(
    clienteId,
    payload
) {
    return request(
        `${CLIENTS_URL}/${encodeURIComponent(clienteId)}`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify(payload)
        }
    );
}

export async function deleteClient(
    clienteId
) {
    return request(
        `${CLIENTS_URL}/${encodeURIComponent(clienteId)}`,
        {
            method: "DELETE"
        }
    );
}