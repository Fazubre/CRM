function sanitizeDriveName(
    value,
    fallback = "Elemento"
) {
    const normalized =
        String(
            value ||
            fallback
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[\\/:*?"<>|]/g,
                "-"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    return (
        normalized ||
        fallback
    );
}

function normalizeRelativePath(
    relativePath
) {
    return String(
        relativePath ||
        ""
    )
        .replaceAll(
            "\\",
            "/"
        )
        .split("/")
        .filter(Boolean);
}

function buildTicketFolderName(
    ticketId,
    ticketNumber
) {
    if (
        ticketNumber !== null &&
        ticketNumber !== undefined &&
        ticketNumber !== ""
    ) {
        return `Ticket-${sanitizeDriveName(
            ticketNumber,
            "SinNumero"
        )}`;
    }

    return `Ticket-${sanitizeDriveName(
        ticketId,
        "SinId"
    )}`;
}

function mapDriveFolder(
    folder
) {
    if (!folder) {
        return null;
    }

    return {
        id:
            folder.id ||
            "",

        nombre:
            folder.name ||
            "Carpeta",

        webViewLink:
            folder.webViewLink ||
            ""
    };
}

module.exports = {
    sanitizeDriveName,
    normalizeRelativePath,
    buildTicketFolderName,
    mapDriveFolder
};