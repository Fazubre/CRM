const fs = require("fs");
const path = require("path");

const {
    GOOGLE_DRIVE_FOLDER_ID,
    createDriveClient
} = require("./GoogleDriveClient");

const {
    addPublicReadPermission
} = require("./GoogleDrivePermissions");

const {
    createDriveFolder
} = require("./GoogleDriveFolders");

const {
    sanitizeDriveName,
    normalizeRelativePath
} = require("./GoogleDriveUtils");

async function uploadFileToDriveFolder(
    drive,
    file,
    parentId,
    fileName
) {
    if (!drive) {
        throw new Error(
            "No se recibió el cliente de Google Drive."
        );
    }

    if (!file?.path) {
        throw new Error(
            "El archivo temporal no tiene una ruta válida."
        );
    }

    if (!parentId) {
        throw new Error(
            "No se recibió la carpeta de destino."
        );
    }

    const response =
        await drive.files.create({
            requestBody: {
                name:
                    sanitizeDriveName(
                        fileName ||
                        file.originalname,
                        "Archivo"
                    ),

                parents: [
                    parentId
                ]
            },

            media: {
                mimeType:
                    file.mimetype ||
                    "application/octet-stream",

                body:
                    fs.createReadStream(
                        file.path
                    )
            },

            fields:
                "id, name, mimeType, size, parents, webViewLink, webContentLink",

            supportsAllDrives:
                true
        });

    return response.data;
}

async function uploadTicketFileWithOAuth(
    file,
    refreshToken,
    parentId =
        GOOGLE_DRIVE_FOLDER_ID
) {
    if (!file) {
        return null;
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    const originalName =
        path.basename(
            file.originalname ||
            "archivo"
        );

    const uploadedFile =
        await uploadFileToDriveFolder(
            drive,
            file,
            parentId,
            `${Date.now()}-${originalName}`
        );

    await addPublicReadPermission(
        drive,
        uploadedFile.id
    );

    return {
        id:
            uploadedFile.id,

        nombre:
            uploadedFile.name,

        mimeType:
            uploadedFile.mimeType ||
            file.mimetype ||
            "",

        webViewLink:
            uploadedFile.webViewLink ||
            "",

        webContentLink:
            uploadedFile.webContentLink ||
            "",

        parents:
            uploadedFile.parents ||
            []
    };
}

async function uploadTicketFolderWithOAuth(
    files,
    relativePaths,
    refreshToken,
    parentId =
        GOOGLE_DRIVE_FOLDER_ID,
    folderNamePrefix = ""
) {
    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        return null;
    }

    if (
        !Array.isArray(
            relativePaths
        ) ||
        relativePaths.length !==
        files.length
    ) {
        throw new Error(
            "Las rutas de la carpeta no coinciden con los archivos recibidos."
        );
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    const firstPath =
        normalizeRelativePath(
            relativePaths[0]
        );

    const originalFolderName =
        firstPath.length > 1
            ? firstPath[0]
            : "Carpeta";

    const prefix =
        folderNamePrefix
            ? `${sanitizeDriveName(
                folderNamePrefix
            )}-`
            : `${Date.now()}-`;

    const rootFolder =
        await createDriveFolder(
            drive,
            `${prefix}${originalFolderName}`,
            parentId
        );

    const createdFolders =
        new Map();

    createdFolders.set(
        "",
        rootFolder.id
    );

    for (
        let index = 0;
        index < files.length;
        index += 1
    ) {
        const file =
            files[index];

        const pathParts =
            normalizeRelativePath(
                relativePaths[index]
            );

        const fileName =
            pathParts.pop() ||
            file.originalname ||
            `archivo-${index + 1}`;

        let directories =
            pathParts;

        if (
            directories.length > 0 &&
            directories[0] ===
            originalFolderName
        ) {
            directories =
                directories.slice(1);
        }

        let currentParentId =
            rootFolder.id;

        let accumulatedPath =
            "";

        for (
            const directoryName
            of directories
        ) {
            accumulatedPath =
                accumulatedPath
                    ? `${accumulatedPath}/${directoryName}`
                    : directoryName;

            if (
                !createdFolders.has(
                    accumulatedPath
                )
            ) {
                const createdFolder =
                    await createDriveFolder(
                        drive,
                        directoryName,
                        currentParentId
                    );

                createdFolders.set(
                    accumulatedPath,
                    createdFolder.id
                );
            }

            currentParentId =
                createdFolders.get(
                    accumulatedPath
                );
        }

        await uploadFileToDriveFolder(
            drive,
            file,
            currentParentId,
            fileName
        );
    }

    await addPublicReadPermission(
        drive,
        rootFolder.id
    );

    return {
        id:
            rootFolder.id,

        nombre:
            rootFolder.name,

        webViewLink:
            rootFolder.webViewLink ||
            "",

        cantidadArchivos:
            files.length,

        parentId
    };
}

async function getDriveItemWithOAuth(
    itemId,
    refreshToken
) {
    if (!itemId) {
        return null;
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    const response =
        await drive.files.get({
            fileId:
                itemId,

            fields:
                "id, name, mimeType, size, parents, webViewLink, webContentLink, trashed",

            supportsAllDrives:
                true
        });

    return response.data;
}

async function moveDriveItemWithOAuth(
    itemId,
    newParentId,
    refreshToken
) {
    if (!itemId) {
        throw new Error(
            "Falta el id del elemento de Google Drive."
        );
    }

    if (!newParentId) {
        throw new Error(
            "Falta la carpeta destino de Google Drive."
        );
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    const currentItemResponse =
        await drive.files.get({
            fileId:
                itemId,

            fields:
                "id, name, mimeType, size, parents, webViewLink, webContentLink",

            supportsAllDrives:
                true
        });

    const currentItem =
        currentItemResponse.data;

    const previousParents =
        currentItem.parents ||
        [];

    if (
        previousParents.includes(
            newParentId
        )
    ) {
        return currentItem;
    }

    const updatedResponse =
        await drive.files.update({
            fileId:
                itemId,

            addParents:
                newParentId,

            removeParents:
                previousParents.length
                    ? previousParents.join(",")
                    : undefined,

            fields:
                "id, name, mimeType, size, parents, webViewLink, webContentLink",

            supportsAllDrives:
                true
        });

    return updatedResponse.data;
}

async function deleteDriveItemWithOAuth(
    itemId,
    refreshToken
) {
    if (!itemId) {
        return false;
    }

    const drive =
        createDriveClient(
            refreshToken
        );

    try {
        await drive.files.delete({
            fileId:
                itemId,

            supportsAllDrives:
                true
        });

        return true;
    } catch (error) {
        const status =
            error.response?.status ||
            error.code;

        if (
            status === 404 ||
            status === "404"
        ) {
            return false;
        }

        console.error(
            "Error eliminando elemento de Google Drive:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    uploadFileToDriveFolder,
    uploadTicketFileWithOAuth,
    uploadTicketFolderWithOAuth,
    getDriveItemWithOAuth,
    moveDriveItemWithOAuth,
    deleteDriveItemWithOAuth
};