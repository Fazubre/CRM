export const API_BASE_URL =
    "https://crm-c40k.onrender.com";

export const TICKETS_URL =
    `${API_BASE_URL}/tickets`;

export const EMPLEADOS_URL =
    `${API_BASE_URL}/employees`;

export const CLIENTES_URL =
    `${API_BASE_URL}/clients`;

export const AREAS_URL =
    `${API_BASE_URL}/areas`;

export const MAX_FILE_SIZE =
    10 * 1024 * 1024;

export const MAX_FOLDER_FILES =
    100;

export const MAX_FOLDER_TOTAL_SIZE =
    100 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "text/plain"
];

export const ALLOWED_FILE_EXTENSIONS = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".png",
    ".jpg",
    ".jpeg",
    ".txt"
];

export const ticketsState = {
    mensajeTablaVacia:
        "No hay tickets registrados.",

    tickets: [],
    empleados: [],
    clientes: [],
    areas: [],

    modals: {
        agregar: null,
        ver: null,
        editar: null
    }
};