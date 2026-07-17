export const API_BASE_URL =
    "https://crm-c40k.onrender.com";

export const CLIENTS_URL =
    `${API_BASE_URL}/clients`;

export const clientsState = {
    mensajeTablaVacia:
        "No hay clientes registrados.",

    clientes: [],

    modals: {
        agregar: null,
        editar: null,
        ver: null,
        eliminar: null
    }
};