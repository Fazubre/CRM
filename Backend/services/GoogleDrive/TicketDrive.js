const {
    createTicketDriveStructureWithOAuth,
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth,
    moveDriveItemWithOAuth,
    deleteDriveItemWithOAuth
} = require("./GoogleDriveOAuth");

const MAX_FOLDER_TOTAL_SIZE =
    100 * 1024 * 1024;

function getDriveRefreshToken() {
    const refreshToken =
        process.env
            .GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!refreshToken) {
        throw new Error(
            "Falta GOOGLE_DRIVE_REFRESH_TOKEN en las variables de entorno."
        );
    }

    return refreshToken;
}

function calculateTotalSize(
    files
) {
    if (!Array.isArray(files)) {
        return 0;
    }

    return files.reduce(
        (total, file) => {
            return (
                total +
                Number(
                    file?.size ||
                    0
                )
            );
        },
        0
    );
}

function getAttachmentDriveId(
    attachment
) {
    if (!attachment) {
        return "";
    }

    if (
        typeof attachment ===
        "string"
    ) {
        return "";
    }

    return (
        attachment.googleDriveId ||
        attachment.id ||
        attachment.fileId ||
        ""
    );
}

function normalizeDriveStructure(
    driveData
) {
    if (!driveData) {
        return null;
    }

    return {
        ticketFolder: {
            id:
                driveData
                    .ticketFolder
                    ?.id ||
                driveData
                    .ticketFolderId ||
                "",

            nombre:
                driveData
                    .ticketFolder
                    ?.nombre ||
                driveData
                    .ticketFolderName ||
                "Carpeta del ticket",

            webViewLink:
                driveData
                    .ticketFolder
                    ?.webViewLink ||
                driveData
                    .ticketFolderLink ||
                ""
        },

        ticketAttachmentFolder: {
            id:
                driveData
                    .ticketAttachmentFolder
                    ?.id ||
                driveData
                    .ticketAttachmentFolderId ||
                "",

            nombre:
                driveData
                    .ticketAttachmentFolder
                    ?.nombre ||
                "Adjunto-Ticket",

            webViewLink:
                driveData
                    .ticketAttachmentFolder
                    ?.webViewLink ||
                ""
        },

        commentsFolder: {
            id:
                driveData
                    .commentsFolder
                    ?.id ||
                driveData
                    .commentsFolderId ||
                "",

            nombre:
                driveData
                    .commentsFolder
                    ?.nombre ||
                "Comentarios",

            webViewLink:
                driveData
                    .commentsFolder
                    ?.webViewLink ||
                ""
        }
    };
}

function getTicketDriveStructure(
    ticket
) {
    if (!ticket) {
        return null;
    }

    const driveData =
        ticket.googleDrive ||
        ticket.drive ||
        ticket.driveStructure ||
        null;

    return normalizeDriveStructure(
        driveData
    );
}

function hasCompleteDriveStructure(
    driveStructure
) {
    return Boolean(
        driveStructure
            ?.ticketFolder
            ?.id &&
        driveStructure
            ?.ticketAttachmentFolder
            ?.id &&
        driveStructure
            ?.commentsFolder
            ?.id
    );
}

async function createTicketDriveStorage(
    ticket
) {
    if (!ticket?.id) {
        throw new Error(
            "No se recibió un ticket válido para crear su estructura en Google Drive."
        );
    }

    const refreshToken =
        getDriveRefreshToken();

    const driveStructure =
    await createTicketDriveStructureWithOAuth({
        ticketId:
            ticket.id,

        ticketNumber:
            ticket.numeroTicket ||
            "",

        ticketTitle:
            ticket.titulo ||
            "Sin titulo",

        employeeName:
            ticket.empleadoNombre ||
            "No asignado",

        refreshToken
    });

    return normalizeDriveStructure(
        driveStructure
    );
}

async function uploadTicketAttachment({
    individualFile = null,
    folderFiles = [],
    relativePaths = [],
    attachmentFolderId
}) {
    const hasIndividualFile =
        Boolean(
            individualFile
        );

    const hasFolder =
        Array.isArray(
            folderFiles
        ) &&
        folderFiles.length > 0;

    if (
        hasIndividualFile &&
        hasFolder
    ) {
        throw new Error(
            "Seleccione un archivo individual o una carpeta, no ambos."
        );
    }

    if (
        !hasIndividualFile &&
        !hasFolder
    ) {
        return null;
    }

    if (!attachmentFolderId) {
        throw new Error(
            "No existe la carpeta de adjuntos del ticket."
        );
    }

    const refreshToken =
        getDriveRefreshToken();

    if (hasIndividualFile) {
        const uploadedFile =
            await uploadTicketFileWithOAuth(
                individualFile,
                refreshToken,
                attachmentFolderId
            );

        if (!uploadedFile?.id) {
            throw new Error(
                "Google Drive no devolvió la información del archivo."
            );
        }

        return {
            tipoAdjunto:
                "archivo",

            id:
                uploadedFile.id,

            googleDriveId:
                uploadedFile.id,

            parentId:
                attachmentFolderId,

            nombre:
                uploadedFile.nombre ||
                individualFile.originalname ||
                "Archivo",

            tipo:
                uploadedFile.mimeType ||
                individualFile.mimetype ||
                "",

            tamano:
                Number(
                    individualFile.size ||
                    0
                ),

            cantidadArchivos:
                1,

            webViewLink:
                uploadedFile.webViewLink ||
                "",

            webContentLink:
                uploadedFile.webContentLink ||
                "",

            url:
                uploadedFile.webViewLink ||
                "",

            enlace:
                uploadedFile.webViewLink ||
                "",

            fechaSubida:
                new Date()
                    .toISOString()
        };
    }

    const totalSize =
        calculateTotalSize(
            folderFiles
        );

    if (
        totalSize >
        MAX_FOLDER_TOTAL_SIZE
    ) {
        throw new Error(
            "La carpeta no puede superar los 100 MB en total."
        );
    }

    if (
        !Array.isArray(
            relativePaths
        ) ||
        relativePaths.length !==
        folderFiles.length
    ) {
        throw new Error(
            "La cantidad de rutas no coincide con la cantidad de archivos recibidos."
        );
    }

    const uploadedFolder =
        await uploadTicketFolderWithOAuth(
            folderFiles,
            relativePaths,
            refreshToken,
            attachmentFolderId
        );

    if (!uploadedFolder?.id) {
        throw new Error(
            "Google Drive no devolvió la información de la carpeta."
        );
    }

    return {
        tipoAdjunto:
            "carpeta",

        id:
            uploadedFolder.id,

        googleDriveId:
            uploadedFolder.id,

        parentId:
            attachmentFolderId,

        nombre:
            uploadedFolder.nombre ||
            "Carpeta del ticket",

        tipo:
            "application/vnd.google-apps.folder",

        cantidadArchivos:
            uploadedFolder
                .cantidadArchivos ||
            folderFiles.length,

        tamano:
            totalSize,

        webViewLink:
            uploadedFolder.webViewLink ||
            "",

        webContentLink:
            "",

        url:
            uploadedFolder.webViewLink ||
            "",

        enlace:
            uploadedFolder.webViewLink ||
            "",

        fechaSubida:
            new Date()
                .toISOString()
    };
}

async function migrateLegacyAttachment({
    attachment,
    attachmentFolderId
}) {
    if (!attachment) {
        return null;
    }

    const attachmentId =
        getAttachmentDriveId(
            attachment
        );

    if (!attachmentId) {
        return attachment;
    }

    if (!attachmentFolderId) {
        throw new Error(
            "No existe la carpeta destino para migrar el adjunto."
        );
    }

    const refreshToken =
        getDriveRefreshToken();

    const movedItem =
        await moveDriveItemWithOAuth(
            attachmentId,
            attachmentFolderId,
            refreshToken
        );

    return {
        ...attachment,

        id:
            movedItem.id ||
            attachmentId,

        googleDriveId:
            movedItem.id ||
            attachmentId,

        parentId:
            attachmentFolderId,

        webViewLink:
            movedItem.webViewLink ||
            attachment.webViewLink ||
            "",

        webContentLink:
            movedItem.webContentLink ||
            attachment.webContentLink ||
            "",

        url:
            movedItem.webViewLink ||
            attachment.url ||
            "",

        enlace:
            movedItem.webViewLink ||
            attachment.enlace ||
            ""
    };
}

async function ensureTicketDriveStorage(
    ticket
) {
    if (!ticket?.id) {
        throw new Error(
            "No se recibió un ticket válido."
        );
    }

    const existingStructure =
        getTicketDriveStructure(
            ticket
        );

    if (
        hasCompleteDriveStructure(
            existingStructure
        )
    ) {
        return {
            created:
                false,

            googleDrive:
                existingStructure,

            archivoAdjunto:
                ticket.archivoAdjunto ||
                null
        };
    }

    const newStructure =
        await createTicketDriveStorage(
            ticket
        );

    try {
        const migratedAttachment =
            await migrateLegacyAttachment({
                attachment:
                    ticket.archivoAdjunto ||
                    null,

                attachmentFolderId:
                    newStructure
                        .ticketAttachmentFolder
                        .id
            });

        return {
            created:
                true,

            googleDrive:
                newStructure,

            archivoAdjunto:
                migratedAttachment
        };
    } catch (error) {
        try {
            await deleteTicketDriveStorage({
                googleDrive:
                    newStructure
            });
        } catch (
            cleanupError
        ) {
            console.error(
                "No fue posible eliminar la estructura de Drive después del error:",
                cleanupError.message
            );
        }

        throw error;
    }
}

async function prepareTicketAttachmentReplacement({
    currentAttachment = null,
    individualFile = null,
    folderFiles = [],
    relativePaths = [],
    attachmentFolderId
}) {
    const hasNewAttachment =
        Boolean(individualFile) ||
        (
            Array.isArray(folderFiles) &&
            folderFiles.length > 0
        );

    if (!hasNewAttachment) {
        return {
            archivoAdjunto:
                currentAttachment,

            reemplazado:
                false,

            adjuntoAnteriorId:
                ""
        };
    }

    const newAttachment =
        await uploadTicketAttachment({
            individualFile,
            folderFiles,
            relativePaths,
            attachmentFolderId
        });

    return {
        archivoAdjunto:
            newAttachment,

        reemplazado:
            true,

        adjuntoAnteriorId:
            getAttachmentDriveId(
                currentAttachment
            )
    };
}

async function deleteTicketAttachment(
    attachmentOrId
) {
    const attachmentId =
        typeof attachmentOrId ===
        "string"
            ? attachmentOrId
            : getAttachmentDriveId(
                attachmentOrId
            );

    if (!attachmentId) {
        return false;
    }

    const refreshToken =
        getDriveRefreshToken();

    return deleteDriveItemWithOAuth(
        attachmentId,
        refreshToken
    );
}

async function deleteTicketDriveStorage(
    ticket
) {
    const driveStructure =
        getTicketDriveStructure(
            ticket
        ) ||
        normalizeDriveStructure(
            ticket?.googleDrive
        );

    const ticketFolderId =
        driveStructure
            ?.ticketFolder
            ?.id ||
        "";

    if (!ticketFolderId) {
        return false;
    }

    const refreshToken =
        getDriveRefreshToken();

    return deleteDriveItemWithOAuth(
        ticketFolderId,
        refreshToken
    );
}

module.exports = {
    calculateTotalSize,
    getAttachmentDriveId,
    getTicketDriveStructure,
    hasCompleteDriveStructure,
    createTicketDriveStorage,
    uploadTicketAttachment,
    migrateLegacyAttachment,
    ensureTicketDriveStorage,
    prepareTicketAttachmentReplacement,
    deleteTicketAttachment,
    deleteTicketDriveStorage
};