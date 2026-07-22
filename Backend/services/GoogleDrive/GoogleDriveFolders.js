const {
    GOOGLE_DRIVE_FOLDER_ID,
    createDriveClient
} = require("./GoogleDriveClient");

const {
    addPublicReadPermission
} = require("./GoogleDrivePermissions");

const {
    sanitizeDriveName,
    buildTicketFolderName,
    mapDriveFolder
} = require("./GoogleDriveUtils");

async function createDriveFolder(
    drive,
    folderName,
    parentId
) {
    if (!drive) {
        throw new Error(
            "No se recibió el cliente de Google Drive."
        );
    }

    if (!parentId) {
        throw new Error(
            "No se recibió la carpeta padre de Google Drive."
        );
    }

    const response =
        await drive.files.create({
            requestBody: {
                name:
                    sanitizeDriveName(
                        folderName,
                        "Carpeta"
                    ),

                mimeType:
                    "application/vnd.google-apps.folder",

                parents: [
                    parentId
                ]
            },

            fields:
                "id, name, mimeType, parents, webViewLink",

            supportsAllDrives:
                true
        });

    return response.data;
}

async function createDriveFolderWithOAuth(
    folderName,
    parentId,
    refreshToken,
    makePublic = false
) {
    const drive =
        createDriveClient(
            refreshToken
        );

    const folder =
        await createDriveFolder(
            drive,
            folderName,
            parentId
        );

    if (makePublic) {
        await addPublicReadPermission(
            drive,
            folder.id
        );
    }

    return folder;
}

async function createTicketDriveStructureWithOAuth({
    ticketId,
    ticketNumber,
    ticketTitle,
    employeeName,
    refreshToken
}) {
    if (!ticketId) {
        throw new Error(
            "Falta el id del ticket para crear su carpeta."
        );
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    const ticketFolderName =
        buildTicketFolderName(
            ticketId,
            ticketNumber,
            ticketTitle,
            employeeName
        );

    const ticketFolder =
        await createDriveFolder(
            drive,
            ticketFolderName,
            GOOGLE_DRIVE_FOLDER_ID
        );

    await addPublicReadPermission(
        drive,
        ticketFolder.id
    );

    const ticketAttachmentFolder =
        await createDriveFolder(
            drive,
            "Adjunto-Ticket",
            ticketFolder.id
        );

    const commentsFolder =
        await createDriveFolder(
            drive,
            "Comentarios",
            ticketFolder.id
        );

    return {
        ticketFolder:
            mapDriveFolder(
                ticketFolder
            ),

        ticketAttachmentFolder:
            mapDriveFolder(
                ticketAttachmentFolder
            ),

        commentsFolder:
            mapDriveFolder(
                commentsFolder
            )
    };
}

async function createCommentDriveFolderWithOAuth({
    commentId,
    commentsFolderId,
    refreshToken
}) {
    if (!commentId) {
        throw new Error(
            "Falta el id del comentario."
        );
    }

    if (!commentsFolderId) {
        throw new Error(
            "Falta la carpeta de comentarios del ticket."
        );
    }

    const folder =
        await createDriveFolderWithOAuth(
            `Comentario-${commentId}`,
            commentsFolderId,
            refreshToken,
            false
        );

    return mapDriveFolder(
        folder
    );
}

module.exports = {
    createDriveFolder,
    createDriveFolderWithOAuth,
    createTicketDriveStructureWithOAuth,
    createCommentDriveFolderWithOAuth
};