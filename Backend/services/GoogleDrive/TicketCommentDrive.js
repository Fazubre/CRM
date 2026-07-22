const {
    createCommentDriveFolderWithOAuth,
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth,
    deleteDriveItemWithOAuth
} = require(
    "./GoogleDriveOAuth"
);

const {
    calculateTotalSize,
    getAttachmentDriveId
} = require(
    "./TicketDrive"
);

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

function normalizeCommentDriveData(
    googleDrive
) {
    if (!googleDrive) {
        return null;
    }

    const commentFolder =
        googleDrive.commentFolder ||
        googleDrive.folder ||
        null;

    if (!commentFolder) {
        return null;
    }

    return {
        commentFolder: {
            id:
                commentFolder.id ||
                googleDrive.commentFolderId ||
                "",

            nombre:
                commentFolder.nombre ||
                commentFolder.name ||
                "Carpeta del comentario",

            webViewLink:
                commentFolder.webViewLink ||
                commentFolder.enlace ||
                ""
        }
    };
}

function getCommentFolderId(
    googleDrive
) {
    const normalizedData =
        normalizeCommentDriveData(
            googleDrive
        );

    return (
        normalizedData
            ?.commentFolder
            ?.id ||
        ""
    );
}

function hasNewAttachment({
    individualFile,
    folderFiles
}) {
    return Boolean(
        individualFile
    ) ||
    (
        Array.isArray(
            folderFiles
        ) &&
        folderFiles.length > 0
    );
}

function validateAttachmentSelection({
    individualFile,
    folderFiles,
    relativePaths
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

    if (!hasFolder) {
        return;
    }

    if (
        !Array.isArray(
            relativePaths
        )
    ) {
        throw new Error(
            "La estructura de la carpeta no tiene un formato válido."
        );
    }

    if (
        relativePaths.length !==
        folderFiles.length
    ) {
        throw new Error(
            "La cantidad de rutas no coincide con la cantidad de archivos recibidos."
        );
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
}

async function createCommentDriveStorage({
    commentId,
    commentsFolderId
}) {
    if (!commentId) {
        throw new Error(
            "Falta el id del comentario."
        );
    }

    if (!commentsFolderId) {
        throw new Error(
            "Falta la carpeta general de comentarios del ticket."
        );
    }

    const refreshToken =
        getDriveRefreshToken();

    const commentFolder =
        await createCommentDriveFolderWithOAuth({
            commentId,
            commentsFolderId,
            refreshToken
        });

    if (!commentFolder?.id) {
        throw new Error(
            "Google Drive no devolvió la carpeta del comentario."
        );
    }

    return {
        commentFolder: {
            id:
                commentFolder.id,

            nombre:
                commentFolder.nombre ||
                commentFolder.name ||
                `Comentario-${commentId}`,

            webViewLink:
                commentFolder.webViewLink ||
                ""
        }
    };
}

async function ensureCommentDriveStorage({
    commentId,
    commentsFolderId,
    currentGoogleDrive = null
}) {
    const currentDriveData =
        normalizeCommentDriveData(
            currentGoogleDrive
        );

    if (
        currentDriveData
            ?.commentFolder
            ?.id
    ) {
        return {
            created:
                false,

            googleDrive:
                currentDriveData
        };
    }

    const newDriveData =
        await createCommentDriveStorage({
            commentId,
            commentsFolderId
        });

    return {
        created:
            true,

        googleDrive:
            newDriveData
    };
}

async function uploadCommentAttachment({
    individualFile = null,
    folderFiles = [],
    relativePaths = [],
    commentFolderId
}) {
    validateAttachmentSelection({
        individualFile,
        folderFiles,
        relativePaths
    });

    const attachmentSelected =
        hasNewAttachment({
            individualFile,
            folderFiles
        });

    if (!attachmentSelected) {
        return null;
    }

    if (!commentFolderId) {
        throw new Error(
            "No existe la carpeta de Google Drive del comentario."
        );
    }

    const refreshToken =
        getDriveRefreshToken();

    if (individualFile) {
        const uploadedFile =
            await uploadTicketFileWithOAuth(
                individualFile,
                refreshToken,
                commentFolderId
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
                commentFolderId,

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

    const uploadedFolder =
        await uploadTicketFolderWithOAuth(
            folderFiles,
            relativePaths,
            refreshToken,
            commentFolderId
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
            commentFolderId,

        nombre:
            uploadedFolder.nombre ||
            "Carpeta del comentario",

        tipo:
            "application/vnd.google-apps.folder",

        tamano:
            calculateTotalSize(
                folderFiles
            ),

        cantidadArchivos:
            uploadedFolder
                .cantidadArchivos ||
            folderFiles.length,

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

async function prepareCommentAttachmentReplacement({
    commentId,
    commentsFolderId,
    currentGoogleDrive = null,
    currentAttachment = null,
    individualFile = null,
    folderFiles = [],
    relativePaths = []
}) {
    const attachmentSelected =
        hasNewAttachment({
            individualFile,
            folderFiles
        });

    if (!attachmentSelected) {
        return {
            archivoAdjunto:
                currentAttachment,

            googleDrive:
                normalizeCommentDriveData(
                    currentGoogleDrive
                ),

            reemplazado:
                false,

            adjuntoAnteriorId:
                "",

            nuevaCarpetaCreada:
                false,

            nuevoAdjuntoId:
                ""
        };
    }

    const storageResult =
        await ensureCommentDriveStorage({
            commentId,
            commentsFolderId,
            currentGoogleDrive
        });

    const commentFolderId =
        storageResult
            .googleDrive
            .commentFolder
            .id;

    try {
        const newAttachment =
            await uploadCommentAttachment({
                individualFile,
                folderFiles,
                relativePaths,
                commentFolderId
            });

        return {
            archivoAdjunto:
                newAttachment,

            googleDrive:
                storageResult
                    .googleDrive,

            reemplazado:
                true,

            adjuntoAnteriorId:
                getAttachmentDriveId(
                    currentAttachment
                ),

            nuevaCarpetaCreada:
                storageResult.created,

            nuevoAdjuntoId:
                getAttachmentDriveId(
                    newAttachment
                )
        };
    } catch (error) {
        if (storageResult.created) {
            try {
                await deleteCommentDriveStorage(
                    storageResult
                        .googleDrive
                );
            } catch (
                cleanupError
            ) {
                console.error(
                    "No fue posible eliminar la carpeta incompleta del comentario:",
                    cleanupError.message
                );
            }
        }

        throw error;
    }
}

async function deleteCommentAttachment(
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

async function deleteCommentDriveStorage(
    commentOrGoogleDrive
) {
    const googleDrive =
        commentOrGoogleDrive
            ?.googleDrive ||
        commentOrGoogleDrive;

    const commentFolderId =
        getCommentFolderId(
            googleDrive
        );

    if (!commentFolderId) {
        return false;
    }

    const refreshToken =
        getDriveRefreshToken();

    return deleteDriveItemWithOAuth(
        commentFolderId,
        refreshToken
    );
}

async function rollbackCommentAttachmentReplacement(
    replacementResult
) {
    if (
        !replacementResult ||
        !replacementResult.reemplazado
    ) {
        return false;
    }

    if (
        replacementResult
            .nuevaCarpetaCreada
    ) {
        return deleteCommentDriveStorage(
            replacementResult
                .googleDrive
        );
    }

    return deleteCommentAttachment(
        replacementResult
            .nuevoAdjuntoId
    );
}

async function finalizeCommentAttachmentReplacement(
    replacementResult
) {
    if (
        !replacementResult ||
        !replacementResult.reemplazado ||
        !replacementResult
            .adjuntoAnteriorId
    ) {
        return false;
    }

    return deleteCommentAttachment(
        replacementResult
            .adjuntoAnteriorId
    );
}

module.exports = {
    normalizeCommentDriveData,
    getCommentFolderId,
    createCommentDriveStorage,
    ensureCommentDriveStorage,
    uploadCommentAttachment,
    prepareCommentAttachmentReplacement,
    deleteCommentAttachment,
    deleteCommentDriveStorage,
    rollbackCommentAttachmentReplacement,
    finalizeCommentAttachmentReplacement
};