async function addPublicReadPermission(
    drive,
    fileId
) {
    if (!drive) {
        throw new Error(
            "No se recibió el cliente de Google Drive."
        );
    }

    if (!fileId) {
        throw new Error(
            "No se recibió el id del elemento de Google Drive."
        );
    }

    try {
        await drive.permissions.create({
            fileId,

            requestBody: {
                role:
                    "reader",

                type:
                    "anyone"
            },

            supportsAllDrives:
                true
        });
    } catch (error) {
        const status =
            error.response?.status ||
            error.code;

        const reason =
            error
                .response
                ?.data
                ?.error
                ?.errors
                ?.[0]
                ?.reason ||
            "";

        if (
            status === 409 ||
            reason === "alreadyExists"
        ) {
            return;
        }

        console.error(
            "Error agregando permiso público:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    addPublicReadPermission
};