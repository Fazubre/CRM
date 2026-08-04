const config =
    window.CRM_CONFIG ||
    {};

const IS_RENDER_HOST =
    window.location.hostname
        .toLowerCase()
        .endsWith(
            ".onrender.com"
        );

export const API_BASE_URL =
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

export const TICKETS_URL =
    `${API_BASE_URL}/tickets`;

export const EMPLEADOS_URL =
    `${API_BASE_URL}/employees`;

export const CLIENTES_URL =
    `${API_BASE_URL}/clients`;

export const AREAS_URL =
    `${API_BASE_URL}/areas`;

export const MAX_FILE_SIZE =
    50 * 1024 * 1024;

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
    "text/plain",
    "image/svg+xml",
    "image/gif",
    "video/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/mp3"
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
    ".txt",
    ".svg",
    ".gif",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".mp3",
    ".wav",
    ".xml"
];

export const ticketsState = {
    mensajeTablaVacia:
        "No hay tickets registrados.",

    tickets:
        [],

    empleados:
        [],

    clientes:
        [],

    areas:
        [],

    comentarios:
        [],

    ticketComentariosActual:
        null,

    comentarioEditando:
        null,

    modals: {
        agregar:
            null,

        ver:
            null,

        editar:
            null,

        comentarios:
            null
    }
};